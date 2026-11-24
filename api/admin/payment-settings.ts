import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { platformSettings } from '../../lib/db/schema.js';
import { requireAdmin } from '../../lib/admin-access.js';

export const DEFAULT_SELLER_TEST_AMOUNT_UZS = 1000;

export async function getSellerTestAmountUzs(): Promise<number> {
  const [setting] = await db.select({ value: platformSettings.value }).from(platformSettings)
    .where(eq(platformSettings.key, 'seller_test_payment_amount_uzs')).limit(1);
  if (!setting) return DEFAULT_SELLER_TEST_AMOUNT_UZS;
  const amount = Number(setting.value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : DEFAULT_SELLER_TEST_AMOUNT_UZS;
}

export default async function paymentSettings(req: Request, res: Response) {
  try {
    if (!(await requireAdmin(req, res))) return;
    if (req.method === 'GET') {
      res.status(200).json({ testPaymentAmountUzs: await getSellerTestAmountUzs() });
      return;
    }
    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'GET, PUT');
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const amount = Number(body.testPaymentAmountUzs);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100_000_000) {
      res.status(400).json({ error: 'INVALID_TEST_PAYMENT_AMOUNT' });
      return;
    }
    const [setting] = await db.insert(platformSettings)
      .values({ key: 'seller_test_payment_amount_uzs', value: String(amount), updatedAt: new Date() })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value: String(amount), updatedAt: new Date() } })
      .returning({ value: platformSettings.value });
    res.status(200).json({ testPaymentAmountUzs: Number(setting.value) });
  } catch {
    res.status(500).json({ error: 'PAYMENT_SETTINGS_FAILED' });
  }
}
