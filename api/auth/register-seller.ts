import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth.js';
import { db } from '../../lib/db/index.js';
import { authUsers } from '../../lib/db/schema.js';

export default async function registerSeller(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) {
      res.status(401).json({ error: 'AUTH_REQUIRED' });
      return;
    }
    const [user] = await db.select({ role: authUsers.role }).from(authUsers).where(eq(authUsers.id, session.user.id)).limit(1);
    if (!user || user.role === 'admin') {
      res.status(403).json({ error: 'SELLER_REGISTRATION_NOT_ALLOWED' });
      return;
    }
    await db.update(authUsers).set({ role: 'seller', updatedAt: new Date() }).where(eq(authUsers.id, session.user.id));
    res.status(200).json({ ok: true });
  } catch {
    res.status(500).json({ error: 'SELLER_REGISTRATION_FAILED' });
  }
}
