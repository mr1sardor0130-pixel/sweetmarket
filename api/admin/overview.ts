import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth.js';
import { db } from '../../lib/db/index.js';
import { authUsers, marketplaceShops } from '../../lib/db/schema.js';

export default async function adminOverview(req: Request, res: Response) {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) return res.status(401).json({ error: 'AUTH_REQUIRED' });
    const [user] = await db.select({ role: authUsers.role }).from(authUsers).where(eq(authUsers.id, session.user.id)).limit(1);
    if (user?.role !== 'admin') return res.status(403).json({ error: 'ADMIN_REQUIRED' });

    const shops = await db.select({ status: marketplaceShops.status }).from(marketplaceShops);
    const approved = shops.filter((shop) => shop.status === 'approved').length;
    res.status(200).json({
      dataSourceNotice: 'Production view includes seller applications only. Orders, catalog, and other CRM records still use the existing local-file backend.',
      metrics: {
        totalGmvUzs: 0, deliveredGmvUzs: 0, totalCommissionUzs: 0,
        totalOrdersCount: 0, activeOrdersCount: 0, deliveredOrdersCount: 0, cancelledOrdersCount: 0,
        bakeriesCount: shops.length, verifiedBakeriesCount: approved,
        productsCount: 0, publishedProductsCount: 0,
        sellerAccountsCount: shops.length, activeSellerAccountsCount: approved,
        promotionsCount: 0, reviewsCount: 0, messagesCount: 0, unansweredMessagesCount: 0,
      },
      settings: {
        commissionPercent: 10, defaultDeliveryFeeUzs: 15000, freeDeliveryThresholdUzs: 250000,
        requireDeliveryPin: false, announcementEnabled: false, announcementUz: '', announcementRu: '', updatedAt: new Date().toISOString(),
      },
      bakeries: [], products: [], orders: [], sellerAccounts: [], promotions: [], reviews: [], messages: [], stories: [],
    });
  } catch {
    res.status(500).json({ error: 'ADMIN_OVERVIEW_FAILED' });
  }
}
