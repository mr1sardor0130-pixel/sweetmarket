import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth.js';
import { db } from '../../lib/db/index.js';
import { authUsers, marketplaceShops, sellerAccessPayments } from '../../lib/db/schema.js';
import { getSellerTestAmountUzs } from '../admin/payment-settings.js';
const paidStatuses = new Set(['paid', 'completed', 'confirmed']);
const failedStatuses = new Set(['failed', 'cancelled', 'canceled', 'expired', 'rejected']);

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function providerStatus(value: unknown, expectedAmount: number): 'paid' | 'failed' | 'pending' {
  const root = record(value);
  const data = record(root.data);
  const payment = record(data.payment ?? root.payment ?? data);
  const status = String(payment.payment_status ?? payment.status ?? data.payment_status ?? root.payment_status ?? root.status ?? '').toLowerCase();
  const amount = payment.amount ?? root.amount;
  if (amount !== undefined && Number(amount) !== expectedAmount) return 'failed';
  if (payment.paid === true || root.paid === true || paidStatuses.has(status)) return 'paid';
  if (failedStatuses.has(status)) return 'failed';
  return 'pending';
}

function getBaseUrl(req: Request): string {
  const configured = process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    process.env.V0_RUNTIME_URL;
  if (configured) return configured.replace(/\/$/, '');
  const host = req.get('host');
  return `${req.protocol}://${host}`;
}

async function lookupPaymentStatus(orderId: string): Promise<'paid' | 'failed' | 'pending'> {
  const apiKey = process.env.TOLOVGO_API_KEY;
  if (!apiKey) throw new Error('TOLOVGO_NOT_CONFIGURED');
  const response = await fetch(`https://pay.tolovgo.uz/api/status/${encodeURIComponent(orderId)}`, {
    headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('TOLOVGO_STATUS_UNAVAILABLE');
  const [payment] = await db.select({ amountUzs: sellerAccessPayments.amountUzs })
    .from(sellerAccessPayments).where(eq(sellerAccessPayments.providerOrderId, orderId)).limit(1);
  return providerStatus(await response.json(), payment?.amountUzs ?? 0);
}

async function refreshPaymentStatus(paymentId: string): Promise<'paid' | 'failed' | 'pending'> {
  const [payment] = await db.select().from(sellerAccessPayments).where(eq(sellerAccessPayments.id, paymentId)).limit(1);
  if (!payment?.providerOrderId) return 'pending';
  const status = await lookupPaymentStatus(payment.providerOrderId);
  if (status !== payment.status) {
    await db.update(sellerAccessPayments).set({ status, updatedAt: new Date() }).where(eq(sellerAccessPayments.id, payment.id));
  }
  return status;
}

async function createPayment(req: Request, res: Response) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  const [user] = await db.select({ role: authUsers.role }).from(authUsers).where(eq(authUsers.id, session.user.id)).limit(1);
  if (user?.role !== 'seller') return res.status(403).json({ error: 'SELLER_ROLE_REQUIRED' });
  const [shop] = await db.select({ id: marketplaceShops.id }).from(marketplaceShops)
    .where(eq(marketplaceShops.ownerUserId, session.user.id)).limit(1);
  if (!shop) return res.status(409).json({ error: 'SELLER_SHOP_REQUIRED' });

  const apiKey = process.env.TOLOVGO_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'PAYMENT_NOT_CONFIGURED' });
  const amountUzs = await getSellerTestAmountUzs();
  if (amountUzs <= 0) return res.status(409).json({ error: 'TEST_PAYMENT_DISABLED' });
  const paymentId = randomUUID();
  const callbackUrl = new URL('/api/seller/payment', getBaseUrl(req));
  callbackUrl.searchParams.set('callback', '1');
  callbackUrl.searchParams.set('paymentId', paymentId);

  await db.insert(sellerAccessPayments).values({
    id: paymentId,
    ownerUserId: session.user.id,
    shopId: shop.id,
    amountUzs,
    status: 'pending',
  });

  try {
    const body = new URLSearchParams({
      amount: String(amountUzs),
      note: `SweetMarket seller test ${paymentId}`,
      callback_url: callbackUrl.toString(),
    });
    const response = await fetch('https://pay.tolovgo.uz/api/create', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    const payload = record(await response.json().catch(() => ({})));
    const data = record(payload.data);
    const orderId = String(data.order_id ?? payload.order_id ?? data.id ?? payload.id ?? '');
    const payUrl = String(data.pay_url ?? payload.pay_url ?? data.payment_url ?? payload.payment_url ?? '');
    if (!response.ok || !orderId || !/^https:\/\//i.test(payUrl)) {
      await db.update(sellerAccessPayments).set({ status: 'failed', updatedAt: new Date() }).where(eq(sellerAccessPayments.id, paymentId));
      return res.status(502).json({ error: 'PAYMENT_CREATE_FAILED' });
    }
    await db.update(sellerAccessPayments).set({ providerOrderId: orderId, paymentUrl: payUrl, updatedAt: new Date() })
      .where(eq(sellerAccessPayments.id, paymentId));
    return res.status(201).json({ paymentId, paymentUrl: payUrl, amountUzs });
  } catch (error) {
    console.error('[TolovGo] Payment creation failed:', error);
    await db.update(sellerAccessPayments).set({ status: 'failed', updatedAt: new Date() }).where(eq(sellerAccessPayments.id, paymentId));
    return res.status(502).json({ error: 'PAYMENT_CREATE_FAILED' });
  }
}

async function verifyPayment(req: Request, res: Response) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  const paymentId = typeof req.query.paymentId === 'string' ? req.query.paymentId : '';
  if (!paymentId) return res.status(400).json({ error: 'PAYMENT_ID_REQUIRED' });
  const [payment] = await db.select({ id: sellerAccessPayments.id, status: sellerAccessPayments.status })
    .from(sellerAccessPayments)
    .where(and(eq(sellerAccessPayments.id, paymentId), eq(sellerAccessPayments.ownerUserId, session.user.id)))
    .limit(1);
  if (!payment) return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
  if (payment.status === 'paid' || payment.status === 'failed') return res.status(200).json({ status: payment.status });
  const status = await refreshPaymentStatus(payment.id);
  return res.status(200).json({ status });
}

async function handleCallback(req: Request, res: Response) {
  const paymentId = typeof req.query.paymentId === 'string' ? req.query.paymentId : '';
  if (!paymentId) return res.status(400).json({ error: 'PAYMENT_ID_REQUIRED' });
  const [payment] = await db.select({ id: sellerAccessPayments.id, providerOrderId: sellerAccessPayments.providerOrderId })
    .from(sellerAccessPayments).where(eq(sellerAccessPayments.id, paymentId)).limit(1);
  if (!payment?.providerOrderId) return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
  try {
    const status = await refreshPaymentStatus(payment.id);
    return res.status(200).json({ received: true, status });
  } catch (error) {
    console.error('[TolovGo] Callback status verification failed:', error);
    return res.status(503).json({ error: 'PAYMENT_STATUS_UNAVAILABLE' });
  }
}

export default async function sellerPayment(req: Request, res: Response) {
  try {
    if (req.query.callback === '1') {
      if (req.method !== 'POST' && req.method !== 'GET') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      }
      return await handleCallback(req, res);
    }
    if (req.method === 'POST') return await createPayment(req, res);
    if (req.method === 'GET') return await verifyPayment(req, res);
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (error) {
    console.error('[TolovGo] Seller payment request failed:', error);
    return res.status(500).json({ error: 'PAYMENT_REQUEST_FAILED' });
  }
}
