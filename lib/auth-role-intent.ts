import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

const cookieName = 'sweetmarket_google_role';
const maxAgeSeconds = 600;
const allowedRoles = new Set(['customer', 'seller']);

type RoleIntent = 'customer' | 'seller';

function sign(role: RoleIntent, issuedAt: number): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('Authentication secret is required');
  return createHmac('sha256', secret).update(`${role}.${issuedAt}`).digest('base64url');
}

function cookieValue(req: Request): string | null {
  const entry = (req.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  return entry ? entry.slice(cookieName.length + 1) : null;
}

function cookieAttributes(maxAge: number): string {
  return `${cookieName}=; Path=/api/auth/complete-social; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.origin;
  const forwardedHost = req.headers['x-forwarded-host'];
  const hostHeader = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  const host = hostHeader?.split(',')[0].trim() || req.headers.host;
  const forwardedProtocol = req.headers['x-forwarded-proto'];
  const protocolHeader = Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol;
  const protocol = protocolHeader?.split(',')[0].trim() || req.protocol;

  if (!origin || !host || !protocol) return false;
  try {
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}

export function setGoogleRoleIntent(res: Response, role: RoleIntent): void {
  const issuedAt = Date.now();
  const value = `${role}.${issuedAt}.${sign(role, issuedAt)}`;
  res.setHeader('Set-Cookie', `${cookieName}=${value}; Path=/api/auth/complete-social; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`);
}

export function getGoogleRoleIntent(req: Request): RoleIntent | null {
  const value = cookieValue(req);
  if (!value) return null;

  const [role, issuedAtValue, signature, ...extra] = value.split('.');
  const issuedAt = Number(issuedAtValue);
  if (extra.length || !allowedRoles.has(role) || !Number.isSafeInteger(issuedAt)) return null;
  if (issuedAt > Date.now() || Date.now() - issuedAt > maxAgeSeconds * 1000) return null;

  const expected = Buffer.from(sign(role as RoleIntent, issuedAt), 'base64url');
  const received = Buffer.from(signature ?? '', 'base64url');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return role as RoleIntent;
}

export function clearGoogleRoleIntent(res: Response): void {
  res.setHeader('Set-Cookie', cookieAttributes(0));
}

export function isAllowedGoogleRole(value: unknown): value is RoleIntent {
  return typeof value === 'string' && allowedRoles.has(value);
}
