import { doublePrecision, integer, pgSchema, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const authSchema = pgSchema('sweetmarket_auth');

export const authUsers = authSchema.table('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
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
  googleMapsUrl: text('google_maps_url'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('marketplace_shops_owner_user_id_unique').on(table.ownerUserId)]);

export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sellerAccessPayments = pgTable('seller_access_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUserId: text('owner_user_id').notNull(),
  shopId: uuid('shop_id').notNull(),
  providerOrderId: text('provider_order_id'),
  paymentUrl: text('payment_url'),
  amountUzs: integer('amount_uzs').notNull().default(1000),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('seller_access_payments_provider_order_id_unique').on(table.providerOrderId)]);
