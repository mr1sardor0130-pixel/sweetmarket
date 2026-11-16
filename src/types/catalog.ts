import { GeoPoint, LocalizedText, MoneyAmount } from './common';
import { UserRole } from './auth';

export enum ProductCategory {
  CAKES = 'cakes',
  BENTO_CAKES = 'bento_cakes',
  PASTRIES = 'pastries',
  EASTERN_SWEETS = 'eastern_sweets',
  CHOCOLATES = 'chocolates',
  MACARONS_ECLAIRS = 'macarons_eclairs',
  DIETARY = 'dietary',
  GIFT_BOXES = 'gift_boxes',
  WEDDING_CAKES = 'wedding_cakes',
  BREAKFAST_BAKES = 'breakfast_bakes',
  HALVA_NAVVOT = 'halva_navvot',
}

export enum DietaryOption {
  HALAL = 'halal',
  SUGAR_FREE = 'sugar_free',
  GLUTEN_FREE = 'gluten_free',
  VEGAN = 'vegan',
  NUT_FREE = 'nut_free',
}

export type CatalogSortOption =
  | 'popular'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'fastest';

export interface CompanyProfile {
  id: string;
  ownerUid: string;
  sellerType: UserRole.CONFECTIONER | UserRole.HOME_BAKER | UserRole.BAKERY;
  slug: string;
  name: string;
  bio: LocalizedText;
  logoUrl: string | null;
  coverUrl: string | null;
  location: GeoPoint;
  isVerified: boolean;
  acceptsCustomOrders: boolean;
  leadTimeHours: number;
  ratingAverage: number;
  reviewCount: number;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  label: LocalizedText;
  weightGrams: number;
  price: MoneyAmount;
  isAvailable: boolean;
}

export interface Product {
  id: string;
  companyId: string;
  title: LocalizedText;
  description: LocalizedText;
  category: ProductCategory;
  dietaryTags: DietaryOption[];
  imageUrls: string[];
  variants: ProductVariant[];
  basePrice: MoneyAmount;
  leadTimeHours: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductMediaKey =
  | 'hero_pastry'
  | 'truffles'
  | 'celebration_cake'
  | 'bento_cake'
  | 'macarons'
  | 'medovik'
  | 'halva'
  | 'berry_tart'
  | 'eclairs';

export interface ProductVariantItem {
  id: string;
  label: LocalizedText;
  weightGrams: number;
  priceUzs: number;
}

export type MarketplaceBusinessType =
  | 'confectioner'
  | 'home_baker'
  | 'bakery'
  | 'restaurant'
  | 'cafe'
  | 'grocery'
  | 'home_kitchen'
  | 'other';

export interface BakerySummary {
  id: string;
  name: string;
  sellerType: MarketplaceBusinessType;
  districtId: string;
  district: LocalizedText;
  address: LocalizedText;
  bio: LocalizedText;
  workingHours: string;
  isOpenNow: boolean;
  deliveryFeeUzs: number;
  freeDeliveryFromUzs: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  acceptsCustomOrders: boolean;
  productCount: number;
  coverMediaKey: ProductMediaKey;
}

export type OccasionCollectionId = 'birthday' | 'romantic' | 'wedding' | 'gift_sets';

export interface ShowcaseProduct {
  id: string;
  mediaKey: ProductMediaKey;
  galleryKeys: ProductMediaKey[];
  category: ProductCategory;
  title: LocalizedText;
  description: LocalizedText;
  bakeryId: string;
  bakeryName: string;
  bakeryOpenNow: boolean;
  bakeryWorkingHours: string;
  districtId: string;
  district: LocalizedText;
  priceUzs: number;
  weightGrams: number;
  variants: ProductVariantItem[];
  prepHours: number;
  rating: number;
  reviewCount: number;
  dietaryTags: DietaryOption[];
  occasions?: OccasionCollectionId[];
  isPublished?: boolean;
  isSellerCreated?: boolean;
}

export interface CategorySummary {
  id: ProductCategory;
  count: number;
}

export interface StoryPollOption {
  id: string;
  label: LocalizedText;
  votes: number;
}

export interface StoryPoll {
  question: LocalizedText;
  options: StoryPollOption[];
}

export interface BakeryStory {
  id: string;
  bakeryId: string;
  bakeryName: string;
  bakeryDistrict: LocalizedText;
  bakeryOpenNow: boolean;
  bakeryCoverMediaKey: ProductMediaKey;
  featuredProductId: string;
  mediaKey: ProductMediaKey;
  postedMinutesAgo: number;
  caption: LocalizedText;
  likesCount: number;
  poll: StoryPoll;
}

export interface BakeryReel {
  id: string;
  bakeryId: string;
  bakeryName: string;
  bakeryDistrict: LocalizedText;
  featuredProductId: string;
  mediaKey: ProductMediaKey;
  durationSec: number;
  viewsCount: number;
  title: LocalizedText;
}

export interface BakeryReview {
  id: string;
  bakeryId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SavedDeliveryAddress {
  id: string;
  label: string;
  districtId: string;
  address: string;
  note?: string;
  isDefault: boolean;
}

export interface SellerPromotion {
  id: string;
  bakeryId: string;
  code: string;
  title: LocalizedText;
  discountPercent: number;
  minOrderUzs: number;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerInquiryMessage {
  id: string;
  bakeryId: string;
  bakeryName: string;
  customerName: string;
  customerPhone: string;
  message: string;
  reply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface SellerDashboardMetrics {
  totalRevenueUzs: number;
  deliveredRevenueUzs: number;
  commissionRate: number;
  commissionUzs: number;
  netPayoutUzs: number;
  totalOrdersCount: number;
  activeOrdersCount: number;
  deliveredOrdersCount: number;
  averageRating: number;
  reviewCount: number;
  activeProductsCount: number;
}



