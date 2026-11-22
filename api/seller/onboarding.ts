import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth.js';
import { db } from '../../lib/db/index.js';
import { authUsers, marketplaceShops } from '../../lib/db/schema.js';

const shopTypes = new Set(['bakery', 'confectionery', 'restaurant', 'cafe', 'home_kitchen', 'grocery', 'other']);

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function createShopSlug(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${normalized || 'shop'}-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export async function saveSellerOnboarding(req: Request, res: Response) {
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

    const [user] = await db
      .select({ role: authUsers.role })
      .from(authUsers)
      .where(eq(authUsers.id, session.user.id))
      .limit(1);

    if (user?.role !== 'seller') {
      res.status(403).json({ error: 'SELLER_ROLE_REQUIRED' });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const name = cleanText(body.name, 100);
    const shopType = cleanText(body.shopType, 32);
    const contactPhone = cleanText(body.phone, 32);
    const district = cleanText(body.district, 80);
    const address = cleanText(body.address, 300);
    const description = cleanText(body.description, 600);
    const phoneDigits = contactPhone.replace(/\D/g, '');
    const phoneCharactersAreValid = /^[+()\d\s-]+$/.test(contactPhone);

    if (name.length < 2 || !shopTypes.has(shopType) || !phoneCharactersAreValid || phoneDigits.length < 7 || phoneDigits.length > 15 || !district || !address) {
      res.status(400).json({ error: 'INVALID_SELLER_DETAILS' });
      return;
    }

    await db.transaction(async (transaction) => {
      const [existingShop] = await transaction
        .select({ id: marketplaceShops.id })
        .from(marketplaceShops)
        .where(eq(marketplaceShops.ownerUserId, session.user.id))
        .limit(1);

      const values = {
        name,
        shopType,
        contactPhone,
        district,
        address,
        description,
        updatedAt: new Date(),
      };

      if (existingShop) {
        await transaction
          .update(marketplaceShops)
          .set(values)
          .where(and(eq(marketplaceShops.id, existingShop.id), eq(marketplaceShops.ownerUserId, session.user.id)));
        return;
      }

      await transaction.insert(marketplaceShops).values({
        ownerUserId: session.user.id,
        name,
        slug: createShopSlug(name),
        shopType,
        contactPhone,
        district,
        address,
        description,
      });
    });

    res.status(200).json({ ok: true });
  } catch {
    res.status(500).json({ error: 'SELLER_DETAILS_SAVE_FAILED' });
  }
}

export default saveSellerOnboarding;
