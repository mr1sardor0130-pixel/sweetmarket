import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth.js';
import { db } from '../../lib/db/index.js';
import { authUsers, marketplaceShops } from '../../lib/db/schema.js';

export default async function sellerApplicationStatus(req: Request, res: Response) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) return res.status(401).json({ error: 'AUTH_REQUIRED' });
    const [user] = await db.select({ role: authUsers.role }).from(authUsers).where(eq(authUsers.id, session.user.id)).limit(1);
    if (user?.role !== 'seller') return res.status(403).json({ error: 'SELLER_ROLE_REQUIRED' });
    const [shop] = await db.select({ status: marketplaceShops.status }).from(marketplaceShops)
      .where(eq(marketplaceShops.ownerUserId, session.user.id)).limit(1);
    if (!shop) return res.status(404).json({ error: 'SELLER_APPLICATION_NOT_FOUND' });
    return res.status(200).json({ status: shop.status });
  } catch {
    return res.status(500).json({ error: 'SELLER_APPLICATION_STATUS_FAILED' });
  }
}
