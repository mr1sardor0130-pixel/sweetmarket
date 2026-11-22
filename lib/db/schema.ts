import { pgSchema, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const authSchema = pgSchema('sweetmarket_auth');

export const authUsers = authSchema.table('user', {
  id: text('id').primaryKey(),
  role: text('role').notNull(),
  sellerAccountId: text('sellerAccountId'),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

export const marketplaceShops = pgTable('marketplace_shops', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUserId: text('owner_user_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  shopType: text('shop_type').notNull(),
  description: text('description').notNull().default(''),
  address: text('address'),
  city: text('city').notNull().default('Samarqand'),
  status: text('status').notNull().default('pending'),
  contactPhone: text('contact_phone'),
  district: text('district'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
