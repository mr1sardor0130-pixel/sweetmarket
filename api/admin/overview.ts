import type { Request, Response } from 'express';
import { db } from '../../lib/db/index.js';
import { marketplaceShops } from '../../lib/db/schema.js';
import { requireAdmin } from '../../lib/admin-access.js';

export default async function adminOverview(req: Request, res: Response) {
  try {
    if (!(await requireAdmin(req, res))) return;

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
