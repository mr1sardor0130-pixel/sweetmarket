import type { Request, Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { authUsers, marketplaceShops } from '../../lib/db/schema.js';
import { requireAdmin } from '../../lib/admin-access.js';
export async function sellerApplications(req: Request, res: Response) {
  try {
    if (!(await requireAdmin(req, res))) return;
    if (req.method === 'GET') {
      const applications = await db.select({
        id: marketplaceShops.id,
        ownerUserId: marketplaceShops.ownerUserId,
        shopName: marketplaceShops.name,
        shopType: marketplaceShops.shopType,
        phone: marketplaceShops.contactPhone,
        district: marketplaceShops.district,
        address: marketplaceShops.address,
        description: marketplaceShops.description,
        status: marketplaceShops.status,
        createdAt: marketplaceShops.createdAt,
        applicantName: authUsers.name,
        email: authUsers.email,
      }).from(marketplaceShops)
        .innerJoin(authUsers, eq(marketplaceShops.ownerUserId, authUsers.id))
        .orderBy(desc(marketplaceShops.createdAt));
      res.status(200).json({ applications });
      return;
    }
    if (req.method === 'PATCH') {
      const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
      const id = typeof body.id === 'string' ? body.id : '';
      const status = body.status === 'approved' || body.status === 'rejected' ? body.status : '';
      if (!id || !status) {
        res.status(400).json({ error: 'INVALID_APPLICATION_UPDATE' });
        return;
      }
      const [updated] = await db.update(marketplaceShops)
        .set({ status, updatedAt: new Date() })
        .where(eq(marketplaceShops.id, id))
        .returning({ id: marketplaceShops.id, status: marketplaceShops.status });
      if (!updated) {
        res.status(404).json({ error: 'APPLICATION_NOT_FOUND' });
        return;
      }
      res.status(200).json(updated);
      return;
    }
    res.setHeader('Allow', 'GET, PATCH');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch {
    res.status(500).json({ error: 'SELLER_APPLICATIONS_FAILED' });
  }
}

export default sellerApplications;
