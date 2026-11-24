import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { db } from './db/index.js';
import { authUsers } from './db/schema.js';

export function isConfiguredAdmin(email?: string | null, emailVerified = false): boolean {
  const configuredEmail = process.env.SWEETMARKET_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configuredEmail && emailVerified && email?.trim().toLowerCase() === configuredEmail);
}

export async function promoteConfiguredAdmin(userId: string, email?: string | null, emailVerified = false): Promise<boolean> {
  if (!isConfiguredAdmin(email, emailVerified)) return false;
  await db.update(authUsers)
    .set({ role: 'admin', updatedAt: new Date() })
    .where(eq(authUsers.id, userId));
  return true;
}

export async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) {
    res.status(401).json({ error: 'AUTH_REQUIRED' });
    return false;
  }

  if (await promoteConfiguredAdmin(session.user.id, session.user.email, session.user.emailVerified)) return true;

  const [user] = await db.select({ role: authUsers.role })
    .from(authUsers)
    .where(eq(authUsers.id, session.user.id))
    .limit(1);
  if (user?.role !== 'admin') {
    res.status(403).json({ error: 'ADMIN_REQUIRED' });
    return false;
  }
  return true;
}
