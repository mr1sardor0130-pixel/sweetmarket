import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomUUID } from 'crypto';
import { auth, authBaseUrl, authPool } from './lib/auth';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { hashPassword, verifyPassword } from 'better-auth/crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

const DATA_DIR = path.resolve(__dirname, '.data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const STORY_INTERACTIONS_FILE = path.join(DATA_DIR, 'story-interactions.json');
const SELLER_PRODUCTS_FILE = path.join(DATA_DIR, 'seller-products.json');
const PRODUCT_OVERRIDES_FILE = path.join(DATA_DIR, 'product-overrides.json');
const PROMOTIONS_FILE = path.join(DATA_DIR, 'promotions.json');
const BAKERY_OVERRIDES_FILE = path.join(DATA_DIR, 'bakery-overrides.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const SELLER_ACCOUNTS_FILE = path.join(DATA_DIR, 'seller-accounts.json');
const SELLER_SESSIONS_FILE = path.join(DATA_DIR, 'seller-sessions.json');
const CUSTOM_BAKERIES_FILE = path.join(DATA_DIR, 'custom-bakeries.json');
const PLATFORM_SETTINGS_FILE = path.join(DATA_DIR, 'platform-settings.json');

interface LocalizedString {
  uz: string;
  ru: string;
}

interface ServerBakery {
  id: string;
  name: string;
  sellerType: 'confectioner' | 'home_baker' | 'bakery' | 'restaurant' | 'cafe' | 'grocery' | 'home_kitchen' | 'other';
  districtId: string;
  district: LocalizedString;
  address: LocalizedString;
  bio: LocalizedString;
  openHour: number;
  closeHour: number;
  workingHours: string;
  deliveryFeeUzs: number;
  freeDeliveryFromUzs: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  acceptsCustomOrders: boolean;
  coverMediaKey: string;
}

interface ServerVariant {
  id: string;
  label: LocalizedString;
  weightGrams: number;
  priceUzs: number;
}

interface ServerShowcaseProduct {
  id: string;
  mediaKey: string;
  galleryKeys: string[];
  category: string;
  title: LocalizedString;
  description: LocalizedString;
  bakeryId: string;
  variants: ServerVariant[];
  prepHours: number;
  rating: number;
  reviewCount: number;
  dietaryTags: string[];
  occasions: string[];
}

const ALL_CATEGORIES = [
  'cakes',
  'bento_cakes',
  'pastries',
  'eastern_sweets',
  'chocolates',
  'macarons_eclairs',
  'dietary',
  'gift_boxes',
  'wedding_cakes',
  'breakfast_bakes',
  'halva_navvot',
] as const;

const SAMARKAND_BAKERIES: ServerBakery[] = [
  {
    id: 'bakery-zarafshon',
    name: 'Zarafshon Patisserie',
    sellerType: 'bakery',
    districtId: 'universitet',
    district: { uz: 'Universitet xiyoboni', ru: 'Университетский бульвар' },
    address: {
      uz: 'Universitet xiyoboni, 14-uy',
      ru: 'Университетский бульвар, д. 14',
    },
    bio: {
      uz: 'Fransuz va klassik tortlar, za’faronli medovik hamda har kungi yangi eklerlar ustaxonasi.',
      ru: 'Кондитерская авторских тортов, шафранного медовика и свежих французских эклеров.',
    },
    openHour: 8,
    closeHour: 22,
    workingHours: '08:00 – 22:00',
    deliveryFeeUzs: 15000,
    freeDeliveryFromUzs: 250000,
    rating: 4.9,
    reviewCount: 214,
    isVerified: true,
    acceptsCustomOrders: true,
    coverMediaKey: 'medovik',
  },
  {
    id: 'bakery-registon-choc',
    name: 'Registon Chocolatier',
    sellerType: 'confectioner',
    districtId: 'registon',
    district: { uz: 'Registon markazi', ru: 'Центр / Регистан' },
    address: {
      uz: 'Registon ko‘chasi, 28-uy',
      ru: 'ул. Регистан, д. 28',
    },
    bio: {
      uz: 'Belgiya qora shokoladi va Samarqand pistasi asosidagi qo‘lbola tryufellar laboratoriyasi.',
      ru: 'Шоколадная мастерская трюфелей ручной работы из бельгийского шоколада и фисташки.',
    },
    openHour: 9,
    closeHour: 21,
    workingHours: '09:00 – 21:00',
    deliveryFeeUzs: 12000,
    freeDeliveryFromUzs: 200000,
    rating: 5.0,
    reviewCount: 162,
    isVerified: true,
    acceptsCustomOrders: false,
    coverMediaKey: 'truffles',
  },
  {
    id: 'bakery-bibixonim',
    name: 'Bibixonim Atelier',
    sellerType: 'confectioner',
    districtId: 'registon',
    district: { uz: 'Registon markazi', ru: 'Центр / Регистан' },
    address: {
      uz: 'Toshkent ko‘chasi, 45-uy',
      ru: 'ул. Ташкентская, д. 45',
    },
    bio: {
      uz: 'To‘y, nikoh va tantanali marosimlar uchun ko‘p qavatli buyurtma tortlar studiyasi.',
      ru: 'Студия многоярусных свадебных и праздничных тортов на заказ.',
    },
    openHour: 9,
    closeHour: 20,
    workingHours: '09:00 – 20:00',
    deliveryFeeUzs: 25000,
    freeDeliveryFromUzs: 500000,
    rating: 4.9,
    reviewCount: 89,
    isVerified: true,
    acceptsCustomOrders: true,
    coverMediaKey: 'celebration_cake',
  },
  {
    id: 'bakery-dilnoza',
    name: 'Dilnoza Home Bakery',
    sellerType: 'home_baker',
    districtId: 'sartepa',
    district: { uz: 'Sartepa', ru: 'Сартепа' },
    address: {
      uz: 'Sartepa massivi, 12-mavze',
      ru: 'массив Сартепа, квартал 12',
    },
    bio: {
      uz: 'Kichik partiyalarda yangi pishirilgan bento tortlar va uy nonushta pishiriqlari.',
      ru: 'Домашняя пекарня свежих бенто-тортов и утренней выпечки малыми партиями.',
    },
    openHour: 8,
    closeHour: 20,
    workingHours: '08:00 – 20:00',
    deliveryFeeUzs: 15000,
    freeDeliveryFromUzs: 180000,
    rating: 4.8,
    reviewCount: 103,
    isVerified: true,
    acceptsCustomOrders: true,
    coverMediaKey: 'bento_cake',
  },
  {
    id: 'bakery-siyob',
    name: 'Siyob Shirinliklari',
    sellerType: 'bakery',
    districtId: 'siyob',
    district: { uz: 'Siyob', ru: 'Сиаб' },
    address: {
      uz: 'Shohizinda ko‘chasi, 9-uy',
      ru: 'ул. Шахи-Зинда, д. 9',
    },
    bio: {
      uz: 'Samarqand an’anaviy qaymoqli holvasi, bodom nugasi va 36 qavatli pista paxlava.',
      ru: 'Традиционная самаркандская сливочная халва, миндальная нуга и 36-слойная пахлава.',
    },
    openHour: 7,
    closeHour: 21,
    workingHours: '07:00 – 21:00',
    deliveryFeeUzs: 15000,
    freeDeliveryFromUzs: 220000,
    rating: 4.9,
    reviewCount: 251,
    isVerified: true,
    acceptsCustomOrders: false,
    coverMediaKey: 'halva',
  },
  {
    id: 'bakery-sof',
    name: 'Sof Qandolat',
    sellerType: 'confectioner',
    districtId: 'sogdiana',
    district: { uz: 'So‘g‘diyona', ru: 'Согдиана' },
    address: {
      uz: 'So‘g‘diyona massivi, 31-uy',
      ru: 'массив Согдиана, д. 31',
    },
    bio: {
      uz: 'Shakarsiz, glyutensiz va mualliflik makaron sovg‘a to‘plamlari.',
      ru: 'Десерты без сахара, без глютена и подарочные наборы авторских макарон.',
    },
    openHour: 9,
    closeHour: 21,
    workingHours: '09:00 – 21:00',
    deliveryFeeUzs: 15000,
    freeDeliveryFromUzs: 200000,
    rating: 4.9,
    reviewCount: 117,
    isVerified: true,
    acceptsCustomOrders: true,
    coverMediaKey: 'berry_tart',
  },
];

const SHOWCASE_CATALOG: ServerShowcaseProduct[] = [
  {
    id: 'sm-prod-01',
    mediaKey: 'medovik',
    galleryKeys: ['medovik', 'hero_pastry'],
    category: 'cakes',
    title: {
      uz: 'Za’faronli klassik asal torti (Medovik)',
      ru: 'Классический медовик с шафраном',
    },
    description: {
      uz: 'Tog‘ asali, qaymoqli smetana kremi va yupqa karamel qatlamlari bilan tayyorlangan.',
      ru: 'Тонкие медовые коржи с горным мёдом, нежным сметанным кремом и лёгкой карамелью.',
    },
    bakeryId: 'bakery-zarafshon',
    variants: [
      { id: 'v-600g', label: { uz: '600 g (4–5 kishi)', ru: '600 г (4–5 порций)' }, weightGrams: 600, priceUzs: 115000 },
      { id: 'v-1200g', label: { uz: '1.2 kg (8–10 kishi)', ru: '1.2 кг (8–10 порций)' }, weightGrams: 1200, priceUzs: 210000 },
      { id: 'v-2000g', label: { uz: '2.0 kg (14–16 kishi)', ru: '2.0 кг (14–16 порций)' }, weightGrams: 2000, priceUzs: 340000 },
    ],
    prepHours: 2,
    rating: 4.9,
    reviewCount: 84,
    dietaryTags: ['halal'],
    occasions: ['birthday', 'gift_sets'],
  },
  {
    id: 'sm-prod-02',
    mediaKey: 'bento_cake',
    galleryKeys: ['bento_cake', 'celebration_cake'],
    category: 'bento_cakes',
    title: {
      uz: 'Samarqand pistali bento torti',
      ru: 'Бенто-торт с самаркандской фисташкой',
    },
    description: {
      uz: 'Ikki kishilik ixcham vanilli biskvit, tvorogli krem va qovurilgan pista sepilgan.',
      ru: 'Компактный ванильный бисквит на двоих с творожным кремом и дроблёной фисташкой.',
    },
    bakeryId: 'bakery-dilnoza',
    variants: [
      { id: 'v-450g', label: { uz: '450 g (standart bento)', ru: '450 г (стандарт)' }, weightGrams: 450, priceUzs: 95000 },
      { id: 'v-700g', label: { uz: '700 g (kattaroq)', ru: '700 г (увеличенный)' }, weightGrams: 700, priceUzs: 140000 },
    ],
    prepHours: 2,
    rating: 4.8,
    reviewCount: 62,
    dietaryTags: ['halal'],
    occasions: ['birthday', 'romantic'],
  },
  {
    id: 'sm-prod-03',
    mediaKey: 'truffles',
    galleryKeys: ['truffles', 'macarons'],
    category: 'chocolates',
    title: {
      uz: 'Qora shokolad va pista tryufel to‘plami',
      ru: 'Набор трюфелей из тёмного шоколада с фисташкой',
    },
    description: {
      uz: '70% Belgiya qora shokoladi, qaymoqli ganash va maydalangan yashil pista qobiqli tryufellar.',
      ru: 'Трюфели из 70% бельгийского тёмного шоколада с нежным ганашем и обсыпкой из фисташки.',
    },
    bakeryId: 'bakery-registon-choc',
    variants: [
      { id: 'v-9pcs', label: { uz: '9 dona (270 g)', ru: '9 шт. (270 г)' }, weightGrams: 270, priceUzs: 145000 },
      { id: 'v-16pcs', label: { uz: '16 dona (480 g)', ru: '16 шт. (480 г)' }, weightGrams: 480, priceUzs: 245000 },
    ],
    prepHours: 1,
    rating: 5.0,
    reviewCount: 118,
    dietaryTags: ['halal', 'gluten_free'],
    occasions: ['romantic', 'gift_sets'],
  },
  {
    id: 'sm-prod-04',
    mediaKey: 'celebration_cake',
    galleryKeys: ['celebration_cake', 'bento_cake'],
    category: 'wedding_cakes',
    title: {
      uz: 'Anjir va pista bezakli ikki qavatli tantana torti',
      ru: 'Двухъярусный праздничный торт с инжиром и фисташкой',
    },
    description: {
      uz: 'To‘y va katta marosimlar uchun maskarpone kremi hamda yangi anjir bilan bezatilgan buyurtma tort.',
      ru: 'Авторский торт для торжеств с кремом маскарпоне, свежим инжиром и фисташковым акцентом.',
    },
    bakeryId: 'bakery-bibixonim',
    variants: [
      { id: 'v-3500g', label: { uz: '3.5 kg (20–25 kishi)', ru: '3.5 кг (20–25 гостей)' }, weightGrams: 3500, priceUzs: 680000 },
      { id: 'v-5000g', label: { uz: '5.0 kg (35–40 kishi)', ru: '5.0 кг (35–40 гостей)' }, weightGrams: 5000, priceUzs: 940000 },
    ],
    prepHours: 24,
    rating: 4.9,
    reviewCount: 41,
    dietaryTags: ['halal'],
    occasions: ['wedding', 'birthday'],
  },
  {
    id: 'sm-prod-05',
    mediaKey: 'macarons',
    galleryKeys: ['macarons', 'eclairs'],
    category: 'gift_boxes',
    title: {
      uz: 'Mualliflik makaron sovg‘a qutisi',
      ru: 'Подарочная коробка авторских макарон',
    },
    description: {
      uz: 'Pista, malina, vanil va espresso ta’mlaridagi bodom unli fransuz makaronlari to‘plami.',
      ru: 'Ассорти французских макарон на миндальной муке: фисташка, малина, ваниль и эспрессо.',
    },
    bakeryId: 'bakery-sof',
    variants: [
      { id: 'v-6pcs', label: { uz: '6 dona (180 g)', ru: '6 шт. (180 г)' }, weightGrams: 180, priceUzs: 90000 },
      { id: 'v-12pcs', label: { uz: '12 dona (360 g)', ru: '12 шт. (360 г)' }, weightGrams: 360, priceUzs: 165000 },
    ],
    prepHours: 2,
    rating: 4.9,
    reviewCount: 95,
    dietaryTags: ['halal', 'gluten_free'],
    occasions: ['romantic', 'gift_sets'],
  },
  {
    id: 'sm-prod-06',
    mediaKey: 'eclairs',
    galleryKeys: ['eclairs', 'macarons'],
    category: 'macarons_eclairs',
    title: {
      uz: 'Shokolad va pistali fransuz eklerlari',
      ru: 'Французские эклеры с шоколадом и фисташкой',
    },
    description: {
      uz: 'Madagaskar vanili, qora shokolad va Eron pistasi kremi solingan xushta’m eklerlar.',
      ru: 'Заварные эклеры с кремом из мадагаскарской ванили, тёмного шоколада и фисташки.',
    },
    bakeryId: 'bakery-zarafshon',
    variants: [
      { id: 'v-4pcs', label: { uz: '4 dona (320 g)', ru: '4 шт. (320 г)' }, weightGrams: 320, priceUzs: 88000 },
      { id: 'v-8pcs', label: { uz: '8 dona (640 g)', ru: '8 шт. (640 г)' }, weightGrams: 640, priceUzs: 168000 },
    ],
    prepHours: 1,
    rating: 4.8,
    reviewCount: 73,
    dietaryTags: ['halal'],
    occasions: ['romantic', 'gift_sets'],
  },
  {
    id: 'sm-prod-07',
    mediaKey: 'berry_tart',
    galleryKeys: ['berry_tart', 'truffles'],
    category: 'dietary',
    title: {
      uz: 'Shakarsiz malinali qora shokolad tarti',
      ru: 'Тарталетка без сахара с малиной и тёмным шоколадом',
    },
    description: {
      uz: 'Shakar qo‘shilmagan bodom xamiri, tabiiy eritritol asosidagi ganash va yangi rezavorlar.',
      ru: 'Миндальная основа без добавления сахара, шоколадный ганаш и свежая малина с ежевикой.',
    },
    bakeryId: 'bakery-sof',
    variants: [
      { id: 'v-220g', label: { uz: '2 dona (220 g)', ru: '2 шт. (220 г)' }, weightGrams: 220, priceUzs: 72000 },
      { id: 'v-440g', label: { uz: '4 dona (440 g)', ru: '4 шт. (440 г)' }, weightGrams: 440, priceUzs: 138000 },
    ],
    prepHours: 2,
    rating: 4.9,
    reviewCount: 54,
    dietaryTags: ['halal', 'sugar_free'],
    occasions: ['romantic', 'birthday'],
  },
  {
    id: 'sm-prod-08',
    mediaKey: 'halva',
    galleryKeys: ['halva', 'hero_pastry'],
    category: 'halva_navvot',
    title: {
      uz: 'Samarqand qaymoqli pista holva va bodom nugasi',
      ru: 'Самаркандская сливочная халва с фисташкой и миндальная нуга',
    },
    description: {
      uz: 'An’anaviy Samarqand retsepti asosida qaymoq, qovurilgan pista va yirik bodomdan tayyorlangan.',
      ru: 'Приготовлено по традиционному самаркандскому рецепту со сливками, фисташкой и цельным миндалём.',
    },
    bakeryId: 'bakery-siyob',
    variants: [
      { id: 'v-500g', label: { uz: '500 g quti', ru: 'Коробка 500 г' }, weightGrams: 500, priceUzs: 115000 },
      { id: 'v-1000g', label: { uz: '1.0 kg quti', ru: 'Коробка 1.0 кг' }, weightGrams: 1000, priceUzs: 215000 },
    ],
    prepHours: 1,
    rating: 4.9,
    reviewCount: 142,
    dietaryTags: ['halal'],
    occasions: ['gift_sets', 'wedding'],
  },
  {
    id: 'sm-prod-09',
    mediaKey: 'hero_pastry',
    galleryKeys: ['hero_pastry', 'halva'],
    category: 'eastern_sweets',
    title: {
      uz: 'Yupqa qatlama pista paxlava va asal torti to‘plami',
      ru: 'Слоёная фисташковая пахлава и медовый десерт',
    },
    description: {
      uz: '36 qavatli qo‘lda yoyilgan xamir, asal siropi va yuqori navli yashil pista mag‘zi.',
      ru: '36 слоёв тончайшего теста ручной раскатки с цветочным мёдом и зелёной фисташкой.',
    },
    bakeryId: 'bakery-siyob',
    variants: [
      { id: 'v-750g', label: { uz: '750 g (12 bo‘lak)', ru: '750 г (12 кусочков)' }, weightGrams: 750, priceUzs: 155000 },
      { id: 'v-1500g', label: { uz: '1.5 kg (24 bo‘lak)', ru: '1.5 кг (24 кусочка)' }, weightGrams: 1500, priceUzs: 295000 },
    ],
    prepHours: 2,
    rating: 4.9,
    reviewCount: 109,
    dietaryTags: ['halal'],
    occasions: ['gift_sets', 'wedding'],
  },
  {
    id: 'sm-prod-10',
    mediaKey: 'medovik',
    galleryKeys: ['medovik', 'bento_cake'],
    category: 'breakfast_bakes',
    title: {
      uz: 'Ertalabki karamelli asalli pirog',
      ru: 'Утренний медово-карамельный пирог к чаю',
    },
    description: {
      uz: 'Oilaviy choy dasturxoni uchun yangi pishirilgan yumshoq asalli biskvit.',
      ru: 'Свежая утренняя выпечка с натуральным мёдом и мягким карамельным слоем.',
    },
    bakeryId: 'bakery-dilnoza',
    variants: [
      { id: 'v-800g', label: { uz: '800 g (butun pirog)', ru: '800 г (целый пирог)' }, weightGrams: 800, priceUzs: 120000 },
    ],
    prepHours: 2,
    rating: 4.7,
    reviewCount: 38,
    dietaryTags: ['halal'],
    occasions: ['birthday'],
  },
  {
    id: 'sm-prod-11',
    mediaKey: 'eclairs',
    galleryKeys: ['eclairs', 'berry_tart'],
    category: 'pastries',
    title: {
      uz: 'Qaymoqli pishiriqlar va eklerlar assortisi',
      ru: 'Ассорти заварной выпечки и эклеров',
    },
    description: {
      uz: 'Har kuni ertalab yangi pishiriladigan pishiriqlar to‘plami.',
      ru: 'Свежая утренняя партия заварных пирожных из натурального сливочного масла.',
    },
    bakeryId: 'bakery-zarafshon',
    variants: [
      { id: 'v-400g', label: { uz: '400 g (5 dona)', ru: '400 г (5 шт.)' }, weightGrams: 400, priceUzs: 98000 },
      { id: 'v-800g', label: { uz: '800 g (10 dona)', ru: '800 г (10 шт.)' }, weightGrams: 800, priceUzs: 185000 },
    ],
    prepHours: 1,
    rating: 4.8,
    reviewCount: 61,
    dietaryTags: ['halal'],
    occasions: ['gift_sets', 'birthday'],
  },
];

function isBakeryOpenInSamarkand(openHour: number, closeHour: number): boolean {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const samarkandHour = (utcHours + 5) % 24;
  return samarkandHour >= openHour && samarkandHour < closeHour;
}

const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

function normalizeSearchText(input: string): string {
  const lowered = input.toLowerCase().replace(/['‘’`]/g, '');
  let result = '';
  for (const ch of lowered) {
    result += CYR_TO_LAT[ch] ?? ch;
  }
  return result
    .replace(/kh/g, 'x')
    .replace(/h/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

interface SellerProductRecord extends ServerShowcaseProduct {
  isPublished?: boolean;
  isSellerCreated?: boolean;
}

interface ProductOverrideRecord {
  priceUzs?: number;
  prepHours?: number;
  isPublished?: boolean;
}

interface BakeryOverrideRecord {
  workingHours?: string;
  deliveryFeeUzs?: number;
  freeDeliveryFromUzs?: number;
  acceptsCustomOrders?: boolean;
  isVerified?: boolean;
  isSuspended?: boolean;
  bio?: LocalizedString;
}

interface SellerAccountServerRecord {
  id: string;
  fullName: string;
  login: string;
  phone: string;
  password?: string;
  bakeryId: string;
  roleLabel?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface SellerSessionServerRecord {
  token: string;
  accountId: string;
  bakeryId: string;
  createdAt: string;
}

interface PlatformSettingsServerRecord {
  commissionPercent: number;
  defaultDeliveryFeeUzs: number;
  freeDeliveryThresholdUzs: number;
  requireDeliveryPin: boolean;
  announcementEnabled: boolean;
  announcementUz: string;
  announcementRu: string;
  updatedAt: string;
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsServerRecord = {
  commissionPercent: 10,
  defaultDeliveryFeeUzs: 15000,
  freeDeliveryThresholdUzs: 250000,
  requireDeliveryPin: false,
  announcementEnabled: false,
  announcementUz: 'Samarqand shahri bo‘ylab 250 000 so‘mdan yuqori buyurtmalarga yetkazib berish bepul!',
  announcementRu: 'Бесплатная доставка по городу Самарканд при заказе от 250 000 сум!',
  updatedAt: '2026-11-14T00:00:00.000Z',
};

interface SellerPromotionRecord {
  id: string;
  bakeryId: string;
  code: string;
  title: LocalizedString;
  discountPercent: number;
  minOrderUzs: number;
  isActive: boolean;
  createdAt: string;
}

interface CustomerInquiryRecord {
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

function getPlatformSettings(): PlatformSettingsServerRecord {
  return readJsonStore<PlatformSettingsServerRecord>(
    PLATFORM_SETTINGS_FILE,
    DEFAULT_PLATFORM_SETTINGS,
  );
}

function getSellerAccounts(): SellerAccountServerRecord[] {
  const list = readJsonStore<SellerAccountServerRecord[]>(SELLER_ACCOUNTS_FILE, []);
  return Array.isArray(list) ? list : [];
}

function getSellerSessions(): SellerSessionServerRecord[] {
  const list = readJsonStore<SellerSessionServerRecord[]>(SELLER_SESSIONS_FILE, []);
  return Array.isArray(list) ? list : [];
}

function sellerAuthEmail(login: string): string {
  const digest = createHash('sha256').update(login.trim().toLowerCase()).digest('hex').slice(0, 32);
  return `seller-${digest}@accounts.sweetmarket.invalid`;
}

async function resolveSellerFromRequest(req: Request): Promise<SellerAccountServerRecord | null> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) return null;
  const user = session.user as typeof session.user & { role?: string; sellerAccountId?: string | null };
  if (user.role !== 'seller' || !user.sellerAccountId) return null;
  const account = getSellerAccounts().find((item) => item.id === user.sellerAccountId);
  if (!account || !account.isActive) return null;
  return account;
}

function getResolvedBakeries(includeSuspended = false): (ServerBakery & { isSuspended?: boolean })[] {
  const customBakeries = readJsonStore<ServerBakery[]>(CUSTOM_BAKERIES_FILE, []);
  const allBase = [...SAMARKAND_BAKERIES, ...(Array.isArray(customBakeries) ? customBakeries : [])];
  const overrides = readJsonStore<Record<string, BakeryOverrideRecord>>(BAKERY_OVERRIDES_FILE, {});
  return allBase
    .map((b) => {
      const ov = overrides[b.id];
      if (!ov) return b;
      return {
        ...b,
        ...(typeof ov.workingHours === 'string' && ov.workingHours ? { workingHours: ov.workingHours } : {}),
        ...(typeof ov.deliveryFeeUzs === 'number' ? { deliveryFeeUzs: ov.deliveryFeeUzs } : {}),
        ...(typeof ov.freeDeliveryFromUzs === 'number' ? { freeDeliveryFromUzs: ov.freeDeliveryFromUzs } : {}),
        ...(typeof ov.acceptsCustomOrders === 'boolean' ? { acceptsCustomOrders: ov.acceptsCustomOrders } : {}),
        ...(typeof ov.isVerified === 'boolean' ? { isVerified: ov.isVerified } : {}),
        ...(typeof ov.isSuspended === 'boolean' ? { isSuspended: ov.isSuspended } : {}),
        ...(ov.bio ? { bio: ov.bio } : {}),
      };
    })
    .filter((b) => includeSuspended || (b as ServerBakery & { isSuspended?: boolean }).isSuspended !== true);
}

function getAllCatalogProducts(): SellerProductRecord[] {
  const sellerProducts = readJsonStore<SellerProductRecord[]>(SELLER_PRODUCTS_FILE, []);
  const overrides = readJsonStore<Record<string, ProductOverrideRecord>>(PRODUCT_OVERRIDES_FILE, {});

  const mergedBase: SellerProductRecord[] = SHOWCASE_CATALOG.map((item) => {
    const ov = overrides[item.id];
    const variants =
      ov && typeof ov.priceUzs === 'number' && ov.priceUzs > 0
        ? item.variants.map((v, idx) => (idx === 0 ? { ...v, priceUzs: ov.priceUzs! } : v))
        : item.variants;
    return {
      ...item,
      variants,
      prepHours: ov && typeof ov.prepHours === 'number' ? ov.prepHours : item.prepHours,
      isPublished: ov && typeof ov.isPublished === 'boolean' ? ov.isPublished : true,
      isSellerCreated: false,
    };
  });

  const mergedSeller = (Array.isArray(sellerProducts) ? sellerProducts : []).map((item) => {
    const ov = overrides[item.id];
    const variants =
      ov && typeof ov.priceUzs === 'number' && ov.priceUzs > 0
        ? item.variants.map((v, idx) => (idx === 0 ? { ...v, priceUzs: ov.priceUzs! } : v))
        : item.variants;
    return {
      ...item,
      variants,
      prepHours: ov && typeof ov.prepHours === 'number' ? ov.prepHours : item.prepHours,
      isPublished:
        ov && typeof ov.isPublished === 'boolean'
          ? ov.isPublished
          : item.isPublished !== false,
      isSellerCreated: true,
    };
  });

  return [...mergedSeller, ...mergedBase];
}

function buildEnrichedCatalog(includeUnpublished = false) {
  const bakeries = getResolvedBakeries();
  const bakeryMap = new Map(bakeries.map((b) => [b.id, b]));
  return getAllCatalogProducts()
    .filter((item) => includeUnpublished || item.isPublished !== false)
    .map((item) => {
      const bakery = bakeryMap.get(item.bakeryId) ?? bakeries[0];
      const baseVariant = item.variants[0];
      return {
        ...item,
        bakeryName: bakery.name,
        bakeryOpenNow: isBakeryOpenInSamarkand(bakery.openHour, bakery.closeHour),
        bakeryWorkingHours: bakery.workingHours,
        districtId: bakery.districtId,
        district: bakery.district,
        priceUzs: baseVariant.priceUzs,
        weightGrams: baseVariant.weightGrams,
      };
    });
}

interface ServerReview {
  id: string;
  bakeryId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface StoryInteractionRecord {
  likesOffset: number;
  pollVotes: Record<string, number>;
}

const DEFAULT_REVIEWS: ServerReview[] = [
  {
    id: 'rev-01',
    bakeryId: 'bakery-zarafshon',
    authorName: 'Dilshoda R.',
    rating: 5,
    comment: 'Za’faronli medovik juda yumshoq va ta’mi a’lo darajada. Vaqtida yetkazib berishdi!',
    createdAt: '2026-11-10T10:20:00.000Z',
  },
  {
    id: 'rev-02',
    bakeryId: 'bakery-registon-choc',
    authorName: 'Timur A.',
    rating: 5,
    comment: 'Sovg‘a uchun tryufel to‘plamini oldim — Belgiya shokoladi juda mazali ekan.',
    createdAt: '2026-11-11T14:15:00.000Z',
  },
  {
    id: 'rev-03',
    bakeryId: 'bakery-bibixonim',
    authorName: 'Madina S.',
    rating: 5,
    comment: 'To‘yimizga 2 qavatli anjirli tort tayyorlab berishdi, barcha mehmonlarga yoqdi.',
    createdAt: '2026-11-09T17:40:00.000Z',
  },
  {
    id: 'rev-04',
    bakeryId: 'bakery-dilnoza',
    authorName: 'Aziza N.',
    rating: 5,
    comment: 'Bento tort 2 soatda issiqqina holatda yetib keldi, yozuvi ham chiroyli chiqibdi.',
    createdAt: '2026-11-12T08:30:00.000Z',
  },
  {
    id: 'rev-05',
    bakeryId: 'bakery-siyob',
    authorName: 'Shohruh M.',
    rating: 5,
    comment: '36 qavatli pista paxlava va qaymoqli holvasi xuddi Samarqand an’anaviy ta’mida.',
    createdAt: '2026-11-11T11:10:00.000Z',
  },
  {
    id: 'rev-06',
    bakeryId: 'bakery-sof',
    authorName: 'Nargiza K.',
    rating: 5,
    comment: 'Shakarsiz malinali tart parhezda bo‘lganlar uchun ajoyib tanlov!',
    createdAt: '2026-11-12T12:00:00.000Z',
  },
];

const CUSTOM_CAKE_TIERS: Record<
  string,
  { weightGrams: number; priceUzs: number; label: LocalizedString }
> = {
  'tier-1500': {
    weightGrams: 1500,
    priceUzs: 280000,
    label: { uz: '1.5 kg · 1 qavat (8–10 kishi)', ru: '1.5 кг · 1 ярус (8–10 гостей)' },
  },
  'tier-2500': {
    weightGrams: 2500,
    priceUzs: 440000,
    label: { uz: '2.5 kg · 1 qavat (14–18 kishi)', ru: '2.5 кг · 1 ярус (14–18 гостей)' },
  },
  'tier-4000': {
    weightGrams: 4000,
    priceUzs: 720000,
    label: { uz: '4.0 kg · 2 qavat (25–30 kishi)', ru: '4.0 кг · 2 яруса (25–30 гостей)' },
  },
};

const CUSTOM_CAKE_FILLINGS: Record<
  string,
  { extraPriceUzs: number; label: LocalizedString }
> = {
  vanilla_berry: {
    extraPriceUzs: 0,
    label: { uz: 'Vanil va yangi malina', ru: 'Ваниль и свежая малина' },
  },
  chocolate_pistachio: {
    extraPriceUzs: 45000,
    label: { uz: 'Belgiya shokoladi va pista', ru: 'Бельгийский шоколад и фисташка' },
  },
  honey_saffron: {
    extraPriceUzs: 30000,
    label: { uz: 'Tog‘ asali va za’faron', ru: 'Горный мёд и шафран' },
  },
  red_velvet_cream: {
    extraPriceUzs: 25000,
    label: { uz: 'Qizil baxmal va maskarpone', ru: 'Красный бархат и маскарпоне' },
  },
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonStore<T>(filePath: string, fallback: T): T {
  try {
    ensureDir();
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStore(filePath: string, data: unknown) {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function ensureOrdersStore(): Record<string, unknown>[] {
  const data = readJsonStore<unknown[]>(ORDERS_FILE, []);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

function saveOrderReceipt(receipt: Record<string, unknown>) {
  const existing = ensureOrdersStore();
  existing.unshift(receipt);
  writeJsonStore(ORDERS_FILE, existing.slice(0, 200));
}

interface TolovGoPayment {
  orderId: string | number;
  payUrl: string;
}

async function createTolovGoPayment(amount: number, batchId: string): Promise<TolovGoPayment> {
  const apiKey = process.env.TOLOVGO_API_KEY;
  if (!apiKey) throw new Error('TOLOVGO_NOT_CONFIGURED');
  if (!authBaseUrl) throw new Error('PUBLIC_APP_URL_NOT_CONFIGURED');

  const callbackUrl = new URL('/api/payments/tolovgo/webhook', authBaseUrl).toString();
  const response = await fetch('https://pay.tolovgo.uz/api/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      amount,
      note: `SweetMarket order ${batchId}`,
      callback_url: callbackUrl,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        status?: string;
        order_id?: string | number;
        amount?: number;
        pay_url?: string;
      }
    | null;
  const hasValidOrderId =
    (typeof result?.order_id === 'number' && Number.isInteger(result.order_id)) ||
    (typeof result?.order_id === 'string' && result.order_id.trim().length > 0);
  if (
    !response.ok ||
    !result?.ok ||
    !result.pay_url ||
    result.status !== 'pending' ||
    Number(result.amount) !== amount ||
    !hasValidOrderId
  ) {
    throw new Error('TOLOVGO_PAYMENT_CREATION_FAILED');
  }

  const payUrl = new URL(result.pay_url);
  if (payUrl.protocol !== 'https:' || payUrl.hostname !== 'pay.tolovgo.uz') {
    throw new Error('TOLOVGO_INVALID_PAYMENT_URL');
  }

  return {
    orderId: result.order_id ?? batchId,
    payUrl: payUrl.toString(),
  };
}

function computeLiveOrderStatus(order: Record<string, unknown>): string {
  if (order.status === 'cancelled') return 'cancelled';
  if (order.paymentMethod === 'tolovgo' && order.paymentStatus !== 'paid') return 'pending';
  if (order.status === 'delivered') return 'delivered';
  if (typeof order.manualStatus === 'string' && order.manualStatus) {
    return order.manualStatus;
  }
  const createdMs = Date.parse(String(order.createdAt || ''));
  if (!Number.isFinite(createdMs)) return 'confirmed';
  const elapsedMin = (Date.now() - createdMs) / 60000;
  if (elapsedMin >= 20) return 'delivered';
  if (elapsedMin >= 8) return 'out_for_delivery';
  if (elapsedMin >= 2) return 'preparing';
  return 'confirmed';
}

function buildStoriesWithInteractions() {
  const bakeryMap = new Map(SAMARKAND_BAKERIES.map((b) => [b.id, b]));
  const interactions = readJsonStore<Record<string, StoryInteractionRecord>>(
    STORY_INTERACTIONS_FILE,
    {},
  );

  const baseStories = [
    {
      id: 'story-zarafshon',
      bakeryId: 'bakery-zarafshon',
      featuredProductId: 'sm-prod-01',
      mediaKey: 'medovik',
      postedMinutesAgo: 35,
      baseLikes: 48,
      caption: {
        uz: 'Ertalabki partiyadan yangi za’faronli medovik — hozirgina krem bilan yopildi.',
        ru: 'Свежий шафранный медовик из утренней партии — только что пропитан сметанным кремом.',
      },
      poll: {
        question: {
          uz: 'Bugungi choyga qaysi ta’mni tanlaysiz?',
          ru: 'Какой вкус выберете сегодня к чаю?',
        },
        options: [
          { id: 'opt-a', label: { uz: 'Za’faronli medovik', ru: 'Шафранный медовик' }, baseVotes: 24 },
          { id: 'opt-b', label: { uz: 'Pistali eklerlar', ru: 'Фисташковые эклеры' }, baseVotes: 19 },
        ],
      },
    },
    {
      id: 'story-registon',
      bakeryId: 'bakery-registon-choc',
      featuredProductId: 'sm-prod-03',
      mediaKey: 'truffles',
      postedMinutesAgo: 55,
      baseLikes: 64,
      caption: {
        uz: '70% Belgiya shokoladi va yashil pista bilan yangi tryufel qutilari tayyor.',
        ru: 'Новые коробочки трюфелей из 70% бельгийского шоколада и зелёной фисташки уже готовы.',
      },
      poll: {
        question: {
          uz: 'Qaysi to‘plam hajmi qulayroq?',
          ru: 'Какой размер коробки удобнее?',
        },
        options: [
          { id: 'opt-a', label: { uz: '9 dona (270 g)', ru: '9 шт. (270 г)' }, baseVotes: 31 },
          { id: 'opt-b', label: { uz: '16 dona (480 g)', ru: '16 шт. (480 г)' }, baseVotes: 27 },
        ],
      },
    },
    {
      id: 'story-bibixonim',
      bakeryId: 'bakery-bibixonim',
      featuredProductId: 'sm-prod-04',
      mediaKey: 'celebration_cake',
      postedMinutesAgo: 90,
      baseLikes: 39,
      caption: {
        uz: 'Bugungi nikoh marosimi uchun anjir va pista bezakli 2 qavatli tort.',
        ru: 'Двухъярусный торт с инжиром и фисташкой для сегодняшнего торжества в Самарканде.',
      },
      poll: {
        question: {
          uz: 'Marosim torti uchun sevimli ichki ta’m?',
          ru: 'Любимая начинка для праздничного торта?',
        },
        options: [
          { id: 'opt-a', label: { uz: 'Maskarpone va anjir', ru: 'Маскарпоне и инжир' }, baseVotes: 18 },
          { id: 'opt-b', label: { uz: 'Shokolad va pista', ru: 'Шоколад и фисташка' }, baseVotes: 22 },
        ],
      },
    },
    {
      id: 'story-dilnoza',
      bakeryId: 'bakery-dilnoza',
      featuredProductId: 'sm-prod-02',
      mediaKey: 'bento_cake',
      postedMinutesAgo: 120,
      baseLikes: 52,
      caption: {
        uz: 'Ikki kishilik issiqqina vanil-pistali bento tortlar 2 soatda yetkaziladi.',
        ru: 'Свежие ванильно-фисташковые бенто-торты на двоих с доставкой за 2 часа.',
      },
      poll: {
        question: {
          uz: 'Bento tort ustiga yozuv kerakmi?',
          ru: 'Добавить праздничную надпись на бенто-торт?',
        },
        options: [
          { id: 'opt-a', label: { uz: 'Ha, tabrik yozuvi', ru: 'Да, с надписью' }, baseVotes: 36 },
          { id: 'opt-b', label: { uz: 'Minimalistik bezak', ru: 'Минималистичный декор' }, baseVotes: 15 },
        ],
      },
    },
    {
      id: 'story-siyob',
      bakeryId: 'bakery-siyob',
      featuredProductId: 'sm-prod-09',
      mediaKey: 'hero_pastry',
      postedMinutesAgo: 150,
      baseLikes: 71,
      caption: {
        uz: '36 qavatli Samarqand pista paxlavasi tandirdan chiqdi va asal siropiga botirildi.',
        ru: '36-слойная самаркандская фисташковая пахлава только из печи с цветочным мёдом.',
      },
      poll: {
        question: {
          uz: 'Mehmondorchilik uchun eng yaxshisi?',
          ru: 'Что лучше к праздничному столу?',
        },
        options: [
          { id: 'opt-a', label: { uz: 'Pista paxlava', ru: 'Фисташковая пахлава' }, baseVotes: 44 },
          { id: 'opt-b', label: { uz: 'Qaymoqli holva', ru: 'Сливочная халва' }, baseVotes: 29 },
        ],
      },
    },
    {
      id: 'story-sof',
      bakeryId: 'bakery-sof',
      featuredProductId: 'sm-prod-07',
      mediaKey: 'berry_tart',
      postedMinutesAgo: 185,
      baseLikes: 43,
      caption: {
        uz: 'Shakarsiz malinali qora shokolad tarti va glyutensiz makaronlar vitrinada.',
        ru: 'Тарталетки без сахара с малиной и безглютеновые макарон уже на витрине.',
      },
      poll: {
        question: {
          uz: 'Parhezboz shirinliklardan qaysi biri?',
          ru: 'Какой полезный десерт предпочитаете?',
        },
        options: [
          { id: 'opt-a', label: { uz: 'Shakarsiz tart', ru: 'Тарт без сахара' }, baseVotes: 21 },
          { id: 'opt-b', label: { uz: 'Bodomli makaron', ru: 'Миндальные макарон' }, baseVotes: 25 },
        ],
      },
    },
  ];

  return baseStories.map((story) => {
    const bakery = bakeryMap.get(story.bakeryId)!;
    const saved = interactions[story.id];
    const likesCount = Math.max(0, story.baseLikes + (saved?.likesOffset ?? 0));
    return {
      id: story.id,
      bakeryId: story.bakeryId,
      bakeryName: bakery.name,
      bakeryDistrict: bakery.district,
      bakeryOpenNow: isBakeryOpenInSamarkand(bakery.openHour, bakery.closeHour),
      bakeryCoverMediaKey: bakery.coverMediaKey,
      featuredProductId: story.featuredProductId,
      mediaKey: story.mediaKey,
      postedMinutesAgo: story.postedMinutesAgo,
      caption: story.caption,
      likesCount,
      poll: {
        question: story.poll.question,
        options: story.poll.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          votes: opt.baseVotes + (saved?.pollVotes?.[opt.id] ?? 0),
        })),
      },
    };
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  const betterAuthHandler = toNodeHandler(auth);
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/auth/')) return next();
    return betterAuthHandler(req, res);
  });

  const legalPagesPath = path.resolve(__dirname, isProduction ? 'dist' : 'public');
  app.get(['/privacy', '/privacy/'], (_req: Request, res: Response) => {
    res.sendFile(path.join(legalPagesPath, 'privacy.html'));
  });
  app.get(['/terms', '/terms/'], (_req: Request, res: Response) => {
    res.sendFile(path.join(legalPagesPath, 'terms.html'));
  });

  app.get('/api/session', async (req: Request, res: Response) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    res.json({ user: session?.user ?? null });
  });

  app.get('/api/customer/profile', async (req: Request, res: Response) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) {
      res.status(401).json({ error: 'AUTH_REQUIRED' });
      return;
    }
    const result = await authPool.query(
      'SELECT phone, "districtId", address, "birthDate", "preferredPayment", "notifyOrders", "notifyPromos", "savedAddresses" FROM customer_profile WHERE "userId" = $1 LIMIT 1',
      [session.user.id],
    );
    res.json({ profile: result.rows[0] ?? null, fullName: session.user.name });
  });

  app.put('/api/customer/profile', async (req: Request, res: Response) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) {
      res.status(401).json({ error: 'AUTH_REQUIRED' });
      return;
    }
    const body = req.body ?? {};
    const phone = typeof body.phone === 'string' ? body.phone.slice(0, 32) : '';
    const districtId = typeof body.districtId === 'string' ? body.districtId.slice(0, 80) : 'registon';
    const address = typeof body.address === 'string' ? body.address.slice(0, 500) : '';
    const birthDate = typeof body.birthDate === 'string' ? body.birthDate.slice(0, 20) : '';
    const preferredPayment = body.preferredPayment === 'card_on_delivery' ? 'card_on_delivery' : 'cash_on_delivery';
    const notifyOrders = body.notifyOrders !== false;
    const notifyPromos = body.notifyPromos !== false;
    const savedAddresses = Array.isArray(body.savedAddresses) ? body.savedAddresses.slice(0, 20) : [];
    await authPool.query(
      'INSERT INTO customer_profile ("userId", phone, "districtId", address, "birthDate", "preferredPayment", "notifyOrders", "notifyPromos", "savedAddresses", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now()) ON CONFLICT ("userId") DO UPDATE SET phone=EXCLUDED.phone, "districtId"=EXCLUDED."districtId", address=EXCLUDED.address, "birthDate"=EXCLUDED."birthDate", "preferredPayment"=EXCLUDED."preferredPayment", "notifyOrders"=EXCLUDED."notifyOrders", "notifyPromos"=EXCLUDED."notifyPromos", "savedAddresses"=EXCLUDED."savedAddresses", "updatedAt"=now()',
      [session.user.id, phone, districtId, address, birthDate, preferredPayment, notifyOrders, notifyPromos, JSON.stringify(savedAddresses)],
    );
    if (typeof body.fullName === 'string' && body.fullName.trim()) {
      await authPool.query('UPDATE "user" SET name = $2, "updatedAt" = now() WHERE id = $1', [session.user.id, body.fullName.trim().slice(0, 100)]);
    }
    res.json({ ok: true });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'sweetmarket-runtime',
      region: 'Samarkand, UZ',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/companies', (_req: Request, res: Response) => {
    const catalog = getAllCatalogProducts().filter((p) => p.isPublished !== false);
    const companies = getResolvedBakeries().map((b) => ({
      id: b.id,
      name: b.name,
      sellerType: b.sellerType,
      districtId: b.districtId,
      district: b.district,
      address: b.address,
      bio: b.bio,
      workingHours: b.workingHours,
      isOpenNow: isBakeryOpenInSamarkand(b.openHour, b.closeHour),
      deliveryFeeUzs: b.deliveryFeeUzs,
      freeDeliveryFromUzs: b.freeDeliveryFromUzs,
      rating: b.rating,
      reviewCount: b.reviewCount,
      isVerified: b.isVerified,
      acceptsCustomOrders: b.acceptsCustomOrders,
      productCount: catalog.filter((p) => p.bakeryId === b.id).length,
      coverMediaKey: b.coverMediaKey,
    }));
    res.json({ items: companies, total: companies.length });
  });

  app.get('/api/stories', (_req: Request, res: Response) => {
    const stories = buildStoriesWithInteractions();
    res.json({ items: stories, total: stories.length });
  });

  app.post('/api/stories/:id/react', (req: Request, res: Response) => {
    const storyId = req.params.id;
    const body = req.body ?? {};
    const action = body.action;
    const optionId = typeof body.optionId === 'string' ? body.optionId : '';

    const currentStories = buildStoriesWithInteractions();
    const target = currentStories.find((s) => s.id === storyId);
    if (!target) {
      res.status(404).json({ error: 'STORY_NOT_FOUND' });
      return;
    }

    const interactions = readJsonStore<Record<string, StoryInteractionRecord>>(
      STORY_INTERACTIONS_FILE,
      {},
    );
    const entry: StoryInteractionRecord = interactions[storyId] ?? {
      likesOffset: 0,
      pollVotes: {},
    };

    if (action === 'like') {
      entry.likesOffset += 1;
    } else if (action === 'unlike') {
      entry.likesOffset -= 1;
    } else if (action === 'vote' && target.poll.options.some((o) => o.id === optionId)) {
      entry.pollVotes[optionId] = (entry.pollVotes[optionId] ?? 0) + 1;
    } else {
      res.status(400).json({ error: 'INVALID_REACTION' });
      return;
    }

    interactions[storyId] = entry;
    writeJsonStore(STORY_INTERACTIONS_FILE, interactions);

    const updated = buildStoriesWithInteractions().find((s) => s.id === storyId)!;
    res.json(updated);
  });

  app.get('/api/reels', (_req: Request, res: Response) => {
    const bakeryMap = new Map(SAMARKAND_BAKERIES.map((b) => [b.id, b]));
    const reels = [
      {
        id: 'reel-01',
        bakeryId: 'bakery-zarafshon',
        featuredProductId: 'sm-prod-01',
        mediaKey: 'medovik',
        durationSec: 24,
        viewsCount: 1420,
        title: {
          uz: 'Za’faronli medovik qatlamlarini yig‘ish jarayoni',
          ru: 'Сборка слоёв шафранного медовика в нашей мастерской',
        },
      },
      {
        id: 'reel-02',
        bakeryId: 'bakery-registon-choc',
        featuredProductId: 'sm-prod-03',
        mediaKey: 'truffles',
        durationSec: 18,
        viewsCount: 2180,
        title: {
          uz: '70% shokolad ganash va pista qobiqli tryufellar',
          ru: 'Приготовление трюфелей в обсыпке из зелёной фисташки',
        },
      },
      {
        id: 'reel-03',
        bakeryId: 'bakery-bibixonim',
        featuredProductId: 'sm-prod-04',
        mediaKey: 'celebration_cake',
        durationSec: 32,
        viewsCount: 980,
        title: {
          uz: 'Anjir va pista bilan 2 qavatli to‘y tortini bezash',
          ru: 'Декорирование двухъярусного торта инжиром и фисташкой',
        },
      },
      {
        id: 'reel-04',
        bakeryId: 'bakery-siyob',
        featuredProductId: 'sm-prod-09',
        mediaKey: 'hero_pastry',
        durationSec: 27,
        viewsCount: 3110,
        title: {
          uz: '36 qavatli Samarqand pista paxlavasini yoyish sirlari',
          ru: 'Раскатка 36 слоёв тонкого теста для самаркандской пахлавы',
        },
      },
    ].map((reel) => {
      const bakery = bakeryMap.get(reel.bakeryId)!;
      return {
        ...reel,
        bakeryName: bakery.name,
        bakeryDistrict: bakery.district,
      };
    });
    res.json({ items: reels, total: reels.length });
  });

  app.get('/api/companies/:id/reviews', (req: Request, res: Response) => {
    const bakeryId = req.params.id;
    const bakeryExists = getResolvedBakeries(true).some((b) => b.id === bakeryId);
    if (!bakeryExists) {
      res.status(404).json({ error: 'BAKERY_NOT_FOUND' });
      return;
    }
    const allReviews = readJsonStore<ServerReview[]>(REVIEWS_FILE, DEFAULT_REVIEWS);
    const items = allReviews
      .filter((r) => r.bakeryId === bakeryId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const avg =
      items.length > 0
        ? Number((items.reduce((sum, r) => sum + r.rating, 0) / items.length).toFixed(1))
        : 5.0;
    res.json({ items, averageRating: avg, total: items.length });
  });

  app.post('/api/companies/:id/reviews', (req: Request, res: Response) => {
    const bakeryId = req.params.id;
    const bakeryExists = getResolvedBakeries(true).some((b) => b.id === bakeryId);
    if (!bakeryExists) {
      res.status(404).json({ error: 'BAKERY_NOT_FOUND' });
      return;
    }

    const body = req.body ?? {};
    const authorName = typeof body.authorName === 'string' ? body.authorName.trim() : '';
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    const rating = Number(body.rating);

    if (authorName.length < 2 || authorName.length > 60) {
      res.status(400).json({ error: 'INVALID_AUTHOR' });
      return;
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'INVALID_RATING' });
      return;
    }
    if (comment.length < 5 || comment.length > 300) {
      res.status(400).json({ error: 'INVALID_COMMENT' });
      return;
    }

    const allReviews = readJsonStore<ServerReview[]>(REVIEWS_FILE, DEFAULT_REVIEWS);
    const newReview: ServerReview = {
      id: `rev-${Date.now()}`,
      bakeryId,
      authorName,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    allReviews.unshift(newReview);
    writeJsonStore(REVIEWS_FILE, allReviews.slice(0, 300));
    res.status(201).json(newReview);
  });

  app.get('/api/catalog/showcase', (req: Request, res: Response) => {
    const categoryParam = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const queryParam = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const districtParam = typeof req.query.district === 'string' ? req.query.district.trim() : '';
    const bakeryParam = typeof req.query.bakeryId === 'string' ? req.query.bakeryId.trim() : '';
    const dietaryParam = typeof req.query.dietary === 'string' ? req.query.dietary.trim() : '';
    const occasionParam = typeof req.query.occasion === 'string' ? req.query.occasion.trim() : '';
    const fastOnlyParam = req.query.fastOnly === 'true';
    const sortParam = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'popular';

    const enriched = buildEnrichedCatalog();
    const normalizedQuery = normalizeSearchText(queryParam);

    const filtered = enriched.filter((item) => {
      if (categoryParam && categoryParam !== 'all' && item.category !== categoryParam) {
        return false;
      }
      if (
        districtParam &&
        districtParam !== 'all' &&
        item.districtId !== districtParam &&
        item.district.uz !== districtParam &&
        item.district.ru !== districtParam
      ) {
        return false;
      }
      if (bakeryParam && bakeryParam !== 'all' && item.bakeryId !== bakeryParam) {
        return false;
      }
      if (dietaryParam && dietaryParam !== 'all' && !item.dietaryTags.includes(dietaryParam)) {
        return false;
      }
      if (occasionParam && occasionParam !== 'all' && !item.occasions.includes(occasionParam)) {
        return false;
      }
      if (fastOnlyParam && item.prepHours > 2) {
        return false;
      }
      if (normalizedQuery) {
        const rawHaystack = [
          item.title.uz,
          item.title.ru,
          item.description.uz,
          item.description.ru,
          item.bakeryName,
          item.district.uz,
          item.district.ru,
        ].join(' ');
        const normalizedHaystack = normalizeSearchText(rawHaystack);
        if (
          !rawHaystack.toLowerCase().includes(queryParam.toLowerCase()) &&
          !normalizedHaystack.includes(normalizedQuery)
        ) {
          return false;
        }
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortParam) {
        case 'price_asc':
          return a.priceUzs - b.priceUzs;
        case 'price_desc':
          return b.priceUzs - a.priceUzs;
        case 'rating':
          return b.rating - a.rating || b.reviewCount - a.reviewCount;
        case 'fastest':
          return a.prepHours - b.prepHours || b.rating - a.rating;
        case 'popular':
        default:
          return b.reviewCount - a.reviewCount;
      }
    });

    const categories = ALL_CATEGORIES.map((categoryId) => ({
      id: categoryId,
      count: enriched.filter((item) => item.category === categoryId).length,
    }));

    res.json({
      items: sorted,
      categories,
      total: sorted.length,
    });
  });

  app.get('/api/platform/config', (_req: Request, res: Response) => {
    const settings = getPlatformSettings();
    res.json(settings);
  });

  const acknowledgeTolovGoWebhook = (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    res.status(202).json({ accepted: true, paymentStatusUpdated: false });
  };

  app.get('/api/payments/tolovgo/webhook', acknowledgeTolovGoWebhook);
  app.post('/api/payments/tolovgo/webhook', acknowledgeTolovGoWebhook);

  app.post('/api/orders', async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
    const districtId = typeof body.districtId === 'string' ? body.districtId.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const courierNote = typeof body.courierNote === 'string' ? body.courierNote.trim().slice(0, 200) : '';
    const rawCoords = body.coordinates;
    const coordinates =
      rawCoords &&
      typeof rawCoords === 'object' &&
      Number.isFinite(Number(rawCoords.lat)) &&
      Number.isFinite(Number(rawCoords.lng))
        ? { lat: Number(rawCoords.lat), lng: Number(rawCoords.lng) }
        : undefined;
    const deliverySlot = typeof body.deliverySlot === 'string' ? body.deliverySlot.trim() : '';
    const paymentMethod = body.paymentMethod === 'tolovgo' ? 'tolovgo' : 'cash_on_delivery';
    if (body.paymentMethod !== undefined && !['cash_on_delivery', 'tolovgo'].includes(body.paymentMethod)) {
      res.status(400).json({ error: 'INVALID_PAYMENT_METHOD' });
      return;
    }
    const itemsInput = Array.isArray(body.items) ? body.items : [];
    const sellerDeliveryMethods =
      body.sellerDeliveryMethods && typeof body.sellerDeliveryMethods === 'object'
        ? (body.sellerDeliveryMethods as Record<string, string>)
        : {};

    if (customerName.length < 2 || customerName.length > 80) {
      res.status(400).json({ error: 'INVALID_NAME' });
      return;
    }

    const digits = customerPhone.replace(/\D/g, '');
    if (!/^998\d{9}$/.test(digits)) {
      res.status(400).json({ error: 'INVALID_PHONE' });
      return;
    }

    if (!districtId || itemsInput.length === 0) {
      res.status(400).json({ error: 'EMPTY_OR_INVALID_ORDER' });
      return;
    }

    const productMap = new Map(getAllCatalogProducts().map((p) => [p.id, p]));
    const bakeryMap = new Map(getResolvedBakeries().map((b) => [b.id, b]));
    const groupedByBakery = new Map<
      string,
      {
        productId: string;
        title: LocalizedString;
        variantLabel: LocalizedString;
        quantity: number;
        unitPriceUzs: number;
        lineTotalUzs: number;
        customNote?: string;
      }[]
    >();

    for (const rawItem of itemsInput) {
      const productId = typeof rawItem?.productId === 'string' ? rawItem.productId : '';
      const variantId = typeof rawItem?.variantId === 'string' ? rawItem.variantId : '';
      const quantity = Number(rawItem?.quantity);
      const customNote =
        typeof rawItem?.customNote === 'string' ? rawItem.customNote.trim().slice(0, 160) : '';

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        res.status(400).json({ error: 'INVALID_CART_ITEM' });
        return;
      }

      if (productId === 'custom-cake') {
        const targetBakeryId =
          typeof rawItem?.bakeryId === 'string' ? rawItem.bakeryId : '';
        const targetBakery = bakeryMap.get(targetBakeryId);
        const tierId =
          typeof rawItem?.customCake?.tierId === 'string'
            ? rawItem.customCake.tierId
            : '';
        const fillingId =
          typeof rawItem?.customCake?.fillingId === 'string'
            ? rawItem.customCake.fillingId
            : '';

        const tier = CUSTOM_CAKE_TIERS[tierId];
        const filling = CUSTOM_CAKE_FILLINGS[fillingId];

        if (!targetBakery || !targetBakery.acceptsCustomOrders || !tier || !filling) {
          res.status(400).json({ error: 'INVALID_CUSTOM_CAKE' });
          return;
        }

        const unitPriceUzs = tier.priceUzs + filling.extraPriceUzs;
        const lineTotalUzs = unitPriceUzs * quantity;

        const list = groupedByBakery.get(targetBakery.id) ?? [];
        list.push({
          productId: 'custom-cake',
          title: {
            uz: `Maxsus buyurtma tort (${filling.label.uz})`,
            ru: `Торт на заказ (${filling.label.ru})`,
          },
          variantLabel: tier.label,
          quantity,
          unitPriceUzs,
          lineTotalUzs,
          ...(customNote ? { customNote } : {}),
        });
        groupedByBakery.set(targetBakery.id, list);
        continue;
      }

      const product = productMap.get(productId);
      if (!product) {
        res.status(400).json({ error: 'INVALID_CART_ITEM' });
        return;
      }

      const variant =
        product.variants.find((v) => v.id === variantId) ?? product.variants[0];
      const lineTotalUzs = variant.priceUzs * quantity;

      const list = groupedByBakery.get(product.bakeryId) ?? [];
      list.push({
        productId: product.id,
        title: product.title,
        variantLabel: variant.label,
        quantity,
        unitPriceUzs: variant.priceUzs,
        lineTotalUzs,
        ...(customNote ? { customNote } : {}),
      });
      groupedByBakery.set(product.bakeryId, list);
    }

    const hasAnyCourier = Array.from(groupedByBakery.keys()).some(
      (bId) => sellerDeliveryMethods[bId] !== 'pickup',
    );
    if (hasAnyCourier && address.length < 4) {
      res.status(400).json({ error: 'ADDRESS_REQUIRED' });
      return;
    }

    const batchSuffix = Math.floor(1000 + Math.random() * 9000);
    const batchId = `SM-${batchSuffix}`;
    let grandTotalUzs = 0;

    const sellerOrders = Array.from(groupedByBakery.entries()).map(([bakeryId, items], idx) => {
      const bakery = bakeryMap.get(bakeryId)!;
      const method = sellerDeliveryMethods[bakeryId] === 'pickup' ? 'pickup' : 'courier';
      const subtotalUzs = items.reduce((sum, i) => sum + i.lineTotalUzs, 0);
      const deliveryFeeUzs =
        method === 'pickup' || subtotalUzs >= bakery.freeDeliveryFromUzs
          ? 0
          : bakery.deliveryFeeUzs;
      const totalUzs = subtotalUzs + deliveryFeeUzs;
      grandTotalUzs += totalUzs;

      return {
        orderNumber: `${batchId}-${idx + 1}`,
        bakeryId,
        bakeryName: bakery.name,
        deliveryMethod: method,
        subtotalUzs,
        deliveryFeeUzs,
        totalUzs,
        items,
      };
    });

    const nowIso = new Date().toISOString();
    const trackingCode = `SM-TRK-${Math.floor(1000 + Math.random() * 9000)}`;
    const handoverPin = String(Math.floor(1000 + Math.random() * 9000));
    let payment: TolovGoPayment | null = null;
    if (paymentMethod === 'tolovgo') {
      try {
        payment = await createTolovGoPayment(grandTotalUzs, batchId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : '';
        const notConfigured = reason === 'TOLOVGO_NOT_CONFIGURED' || reason === 'PUBLIC_APP_URL_NOT_CONFIGURED';
        res.status(notConfigured ? 503 : 502).json({
          error: notConfigured ? 'PAYMENT_NOT_CONFIGURED' : 'PAYMENT_CREATION_FAILED',
        });
        return;
      }
    }

    const receipt = {
      batchId,
      trackingCode,
      handoverPin,
      createdAt: nowIso,
      status: paymentMethod === 'tolovgo' ? 'pending' : 'confirmed',
      statusUpdatedAt: nowIso,
      customerName,
      customerPhone: `+${digits}`,
      districtId,
      address: address || '-',
      ...(coordinates ? { coordinates } : {}),
      ...(courierNote ? { courierNote } : {}),
      deliverySlot: deliverySlot || 'today_14_17',
      paymentMethod,
      ...(payment
        ? {
            paymentStatus: 'pending',
            paymentProviderOrderId: payment.orderId,
            paymentAmountUzs: grandTotalUzs,
            paymentUrl: payment.payUrl,
          }
        : {}),
      grandTotalUzs,
      sellerOrders,
    };

    saveOrderReceipt(receipt);
    res.status(201).json(receipt);
  });

  app.get('/api/orders/:batchId', (req: Request, res: Response) => {
    const batchId = req.params.batchId;
    const orders = ensureOrdersStore();
    const found = orders.find((o) => o.batchId === batchId);
    if (!found) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND' });
      return;
    }
    const liveStatus = computeLiveOrderStatus(found);
    res.json({ ...found, status: liveStatus });
  });

  app.post('/api/orders/:batchId/cancel', (req: Request, res: Response) => {
    const batchId = req.params.batchId;
    const orders = ensureOrdersStore();
    const idx = orders.findIndex((o) => o.batchId === batchId);
    if (idx < 0) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND' });
      return;
    }
    const target = orders[idx];
    const currentStatus = computeLiveOrderStatus(target);
    if (currentStatus === 'out_for_delivery' || currentStatus === 'delivered') {
      res.status(400).json({ error: 'CANCELLATION_WINDOW_CLOSED' });
      return;
    }
    const updated = {
      ...target,
      status: 'cancelled',
      manualStatus: 'cancelled',
      statusUpdatedAt: new Date().toISOString(),
    };
    orders[idx] = updated;
    writeJsonStore(ORDERS_FILE, orders);
    res.json(updated);
  });

  // --- Seller Dashboard & Customer Messaging APIs ---

  const DEFAULT_PROMOTIONS: SellerPromotionRecord[] = [
    {
      id: 'promo-default-01',
      bakeryId: 'bakery-zarafshon',
      code: 'SAMARQAND10',
      title: {
        uz: 'Birinchi buyurtma uchun 10% chegirma',
        ru: 'Скидка 10% на первый заказ',
      },
      discountPercent: 10,
      minOrderUzs: 150000,
      isActive: true,
      createdAt: '2026-11-10T09:00:00.000Z',
    },
    {
      id: 'promo-default-02',
      bakeryId: 'bakery-dilnoza',
      code: 'BENTO15',
      title: {
        uz: 'Bento tortlar uchun 15% bayram aksiyasi',
        ru: 'Праздничная скидка 15% на бенто-торты',
      },
      discountPercent: 15,
      minOrderUzs: 120000,
      isActive: true,
      createdAt: '2026-11-11T10:00:00.000Z',
    },
  ];

  const DEFAULT_MESSAGES: CustomerInquiryRecord[] = [
    {
      id: 'msg-default-01',
      bakeryId: 'bakery-zarafshon',
      bakeryName: 'Zarafshon Patisserie',
      customerName: 'Madina A.',
      customerPhone: '+998901234567',
      message: 'Assalomu alaykum! 2 kg za’faronli medovikni soat 17:00 gacha yetkazib bera olasizlarmi?',
      reply: 'Vaalaykum assalom! Ha, soat 14:00 gacha tasdiqlasangiz 17:00 gacha kuryerimiz yetkazib beradi.',
      repliedAt: '2026-11-12T09:15:00.000Z',
      createdAt: '2026-11-12T08:50:00.000Z',
    },
  ];

  app.post('/api/seller/login', async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const rawLogin = typeof body.login === 'string' ? body.login.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!rawLogin || !password) {
      res.status(400).json({ error: 'CREDENTIALS_REQUIRED' });
      return;
    }

    const normalizedLogin = rawLogin.toLowerCase();
    const loginDigits = rawLogin.replace(/\D/g, '');
    const accounts = getSellerAccounts();
    const accountIdx = accounts.findIndex((account) => {
      const phoneDigits = account.phone.replace(/\D/g, '');
      return account.login.toLowerCase() === normalizedLogin || (loginDigits.length >= 9 && phoneDigits === loginDigits);
    });
    if (accountIdx < 0) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }
    const account = accounts[accountIdx];
    if (!account.isActive) {
      res.status(403).json({ error: 'ACCOUNT_DISABLED' });
      return;
    }
    if (account.password && account.password !== password) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }

    const authEmail = sellerAuthEmail(account.login);
    const existing = await authPool.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [authEmail]);
    if (!existing.rowCount && !account.password) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }
    const authOrigin = authBaseUrl ?? `${req.protocol}://${req.get('host')}`;
    const endpoint = existing.rowCount ? 'sign-in/email' : 'sign-up/email';
    const authResponse = await auth.handler(new Request(`${authOrigin}/api/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: authOrigin },
      body: JSON.stringify(existing.rowCount
        ? { email: authEmail, password }
        : { email: authEmail, password, name: account.fullName }),
    }));
    if (!authResponse.ok) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }
    const cookies = authResponse.headers.getSetCookie?.() ?? [authResponse.headers.get('set-cookie')].filter((value): value is string => Boolean(value));
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    const authResult = await authResponse.json() as { user?: { id?: string } };
    const userId = authResult.user?.id ?? (await authPool.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [authEmail])).rows[0]?.id;
    if (!userId) {
      res.status(500).json({ error: 'AUTH_SETUP_FAILED' });
      return;
    }
    await authPool.query('UPDATE "user" SET role = $2, "sellerAccountId" = $3, "updatedAt" = now() WHERE id = $1', [userId, 'seller', account.id]);

    const lastLoginAt = new Date().toISOString();
    const updatedAccount = { ...account, password: undefined, lastLoginAt };
    accounts[accountIdx] = updatedAccount;
    writeJsonStore(SELLER_ACCOUNTS_FILE, accounts);
    const bakery = getResolvedBakeries(true).find((item) => item.id === account.bakeryId);
    res.json({
      account: {
        id: account.id,
        fullName: account.fullName,
        login: account.login,
        phone: account.phone,
        bakeryId: account.bakeryId,
        bakeryName: bakery?.name ?? account.bakeryId,
        roleLabel: account.roleLabel,
        isActive: account.isActive,
        createdAt: account.createdAt,
        lastLoginAt,
      },
    });
  });

  app.post('/api/seller/link', async (req: Request, res: Response) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) {
      res.status(401).json({ error: 'AUTH_REQUIRED' });
      return;
    }

    const body = req.body ?? {};
    const rawLogin = typeof body.login === 'string' ? body.login.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!rawLogin || !password) {
      res.status(400).json({ error: 'CREDENTIALS_REQUIRED' });
      return;
    }

    const normalizedLogin = rawLogin.toLowerCase();
    const loginDigits = rawLogin.replace(/\D/g, '');
    const accounts = getSellerAccounts();
    const accountIdx = accounts.findIndex((account) => {
      const phoneDigits = account.phone.replace(/\D/g, '');
      return account.login.toLowerCase() === normalizedLogin || (loginDigits.length >= 9 && phoneDigits === loginDigits);
    });
    if (accountIdx < 0) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }

    const account = accounts[accountIdx];
    if (!account.isActive) {
      res.status(403).json({ error: 'ACCOUNT_DISABLED' });
      return;
    }

    const currentUser = session.user as typeof session.user & { role?: string; sellerAccountId?: string | null };
    if (
      currentUser.role === 'admin' ||
      (currentUser.role === 'seller' && currentUser.sellerAccountId && currentUser.sellerAccountId !== account.id)
    ) {
      res.status(403).json({ error: 'SELLER_ACCOUNT_CONFLICT' });
      return;
    }

    const authEmail = sellerAuthEmail(account.login);
    const sellerUserResult = await authPool.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [authEmail]);
    const sellerUserId = sellerUserResult.rows[0]?.id as string | undefined;
    const credentialResult = sellerUserId
      ? await authPool.query('SELECT password FROM account WHERE "userId" = $1 AND "providerId" = $2 LIMIT 1', [sellerUserId, 'credential'])
      : { rows: [], rowCount: 0 };
    const storedHash = credentialResult.rows[0]?.password as string | null | undefined;
    const passwordVerified = account.password === password || Boolean(storedHash && await verifyPassword({ hash: storedHash, password }));
    if (!passwordVerified) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }

    let linkedSellerUserId = sellerUserId;
    if (!linkedSellerUserId) {
      linkedSellerUserId = randomUUID();
      const passwordHash = await hashPassword(password);
      await authPool.query(
        'INSERT INTO "user" (id, name, email, "emailVerified", role, "sellerAccountId", "createdAt", "updatedAt") VALUES ($1,$2,$3,false,$4,$5,now(),now())',
        [linkedSellerUserId, account.fullName, authEmail, 'seller', account.id],
      );
      await authPool.query(
        'INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,now(),now())',
        [randomUUID(), linkedSellerUserId, 'credential', linkedSellerUserId, passwordHash],
      );
    } else if (!storedHash) {
      const passwordHash = await hashPassword(password);
      if (credentialResult.rowCount) {
        await authPool.query(
          'UPDATE account SET password = $2, "updatedAt" = now() WHERE "userId" = $1 AND "providerId" = $3',
          [linkedSellerUserId, passwordHash, 'credential'],
        );
      } else {
        await authPool.query(
          'INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,now(),now())',
          [randomUUID(), linkedSellerUserId, 'credential', linkedSellerUserId, passwordHash],
        );
      }
    }

    await authPool.query(
      'UPDATE "user" SET role = $2, "sellerAccountId" = $3, "updatedAt" = now() WHERE id = $1',
      [session.user.id, 'seller', account.id],
    );
    await authPool.query(
      'UPDATE "user" SET role = $2, "sellerAccountId" = $3, "updatedAt" = now() WHERE id = $1',
      [linkedSellerUserId, 'seller', account.id],
    );

    const lastLoginAt = new Date().toISOString();
    accounts[accountIdx] = { ...account, password: undefined, lastLoginAt };
    writeJsonStore(SELLER_ACCOUNTS_FILE, accounts);
    const bakery = getResolvedBakeries(true).find((item) => item.id === account.bakeryId);
    res.json({
      account: {
        id: account.id,
        fullName: account.fullName,
        login: account.login,
        phone: account.phone,
        bakeryId: account.bakeryId,
        bakeryName: bakery?.name ?? account.bakeryId,
        roleLabel: account.roleLabel,
        isActive: account.isActive,
        createdAt: account.createdAt,
        lastLoginAt,
      },
    });
  });

  app.post('/api/seller/logout', async (req: Request, res: Response) => {
    const authOrigin = authBaseUrl ?? `${req.protocol}://${req.get('host')}`;
    const response = await auth.handler(new Request(`${authOrigin}/api/auth/sign-out`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: authOrigin, cookie: req.headers.cookie ?? '' },
      body: JSON.stringify({}),
    }));
    const cookies = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie')].filter((value): value is string => Boolean(value));
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.json({ ok: true });
  });

  app.get('/api/seller/me', async (req: Request, res: Response) => {
    const account = await resolveSellerFromRequest(req);
    if (!account) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }
    const bakery = getResolvedBakeries(true).find((b) => b.id === account.bakeryId);
    res.json({
      account: {
        id: account.id,
        fullName: account.fullName,
        login: account.login,
        phone: account.phone,
        bakeryId: account.bakeryId,
        bakeryName: bakery?.name ?? account.bakeryId,
        roleLabel: account.roleLabel,
        isActive: account.isActive,
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt,
      },
    });
  });

  app.get('/api/seller/dashboard', async (req: Request, res: Response) => {
    const sellerAccount = await resolveSellerFromRequest(req);
    if (!sellerAccount) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }

    const bakeries = getResolvedBakeries(true);
    const bakery = bakeries.find((b) => b.id === sellerAccount.bakeryId) ?? bakeries[0];

    const allOrders = ensureOrdersStore();
    const sellerOrdersList = allOrders
      .filter((order) => {
        const subOrders = Array.isArray(order.sellerOrders)
          ? (order.sellerOrders as Record<string, unknown>[])
          : [];
        return subOrders.some((so) => so.bakeryId === bakery.id);
      })
      .map((order): Record<string, unknown> => ({
        ...order,
        status: computeLiveOrderStatus(order),
      }));

    const products = buildEnrichedCatalog(true).filter((p) => p.bakeryId === bakery.id);

    const allReviews = readJsonStore<ServerReview[]>(REVIEWS_FILE, DEFAULT_REVIEWS);
    const bakeryReviews = allReviews
      .filter((r) => r.bakeryId === bakery.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    const allPromos = readJsonStore<SellerPromotionRecord[]>(PROMOTIONS_FILE, DEFAULT_PROMOTIONS);
    const bakeryPromos = allPromos.filter((p) => p.bakeryId === bakery.id);

    const allMessages = readJsonStore<CustomerInquiryRecord[]>(MESSAGES_FILE, DEFAULT_MESSAGES);
    const bakeryMessages = allMessages
      .filter((m) => m.bakeryId === bakery.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    let totalRevenueUzs = 0;
    let deliveredRevenueUzs = 0;
    let activeOrdersCount = 0;
    let deliveredOrdersCount = 0;

    for (const order of sellerOrdersList) {
      const status = String(order.status || 'confirmed');
      if (status === 'cancelled') continue;
      const subOrders = Array.isArray(order.sellerOrders)
        ? (order.sellerOrders as { bakeryId?: string; totalUzs?: number }[])
        : [];
      const bakerySubTotal = subOrders
        .filter((so) => so.bakeryId === bakery.id)
        .reduce((sum, so) => sum + Number(so.totalUzs || 0), 0);

      totalRevenueUzs += bakerySubTotal;
      if (status === 'delivered') {
        deliveredRevenueUzs += bakerySubTotal;
        deliveredOrdersCount += 1;
      } else {
        activeOrdersCount += 1;
      }
    }

    const platformSettings = getPlatformSettings();
    const commissionRate = (platformSettings.commissionPercent || 10) / 100;
    const commissionUzs = Math.round(totalRevenueUzs * commissionRate);
    const netPayoutUzs = Math.max(0, totalRevenueUzs - commissionUzs);

    const avgRating =
      bakeryReviews.length > 0
        ? Number(
            (
              bakeryReviews.reduce((sum, r) => sum + r.rating, 0) / bakeryReviews.length
            ).toFixed(1),
          )
        : bakery.rating;

    res.json({
      bakery: {
        ...bakery,
        isOpenNow: isBakeryOpenInSamarkand(bakery.openHour, bakery.closeHour),
        productCount: products.filter((p) => p.isPublished !== false).length,
      },
      metrics: {
        totalRevenueUzs,
        deliveredRevenueUzs,
        commissionRate,
        commissionUzs,
        netPayoutUzs,
        totalOrdersCount: sellerOrdersList.filter((o) => o.status !== 'cancelled').length,
        activeOrdersCount,
        deliveredOrdersCount,
        averageRating: avgRating,
        reviewCount: bakeryReviews.length || bakery.reviewCount,
        activeProductsCount: products.filter((p) => p.isPublished !== false).length,
      },
      orders: sellerOrdersList,
      products,
      promotions: bakeryPromos,
      messages: bakeryMessages,
      reviews: bakeryReviews,
    });
  });

  app.patch('/api/seller/orders/:batchId/status', async (req: Request, res: Response) => {
    const sellerAccount = await resolveSellerFromRequest(req);
    if (!sellerAccount) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }

    const batchId = req.params.batchId;
    const body = req.body ?? {};
    const nextStatus = typeof body.status === 'string' ? body.status.trim() : '';
    const handoverPinInput = typeof body.handoverPin === 'string' ? body.handoverPin.trim() : '';
    const allowedStatuses = [
      'confirmed',
      'preparing',
      'ready_for_delivery',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ];
    if (!allowedStatuses.includes(nextStatus)) {
      res.status(400).json({ error: 'INVALID_STATUS' });
      return;
    }

    const orders = ensureOrdersStore();
    const idx = orders.findIndex((o) => o.batchId === batchId);
    if (idx < 0) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND' });
      return;
    }

    const order = orders[idx];
    const subOrders = Array.isArray(order.sellerOrders)
      ? (order.sellerOrders as { bakeryId?: string }[])
      : [];
    if (!subOrders.some((so) => so.bakeryId === sellerAccount.bakeryId)) {
      res.status(403).json({ error: 'FORBIDDEN_BAKERY' });
      return;
    }
    if (
      order.paymentMethod === 'tolovgo' &&
      order.paymentStatus !== 'paid' &&
      nextStatus !== 'cancelled'
    ) {
      res.status(409).json({ error: 'PAYMENT_NOT_CONFIRMED' });
      return;
    }

    const settings = getPlatformSettings();
    if (
      nextStatus === 'delivered' &&
      settings.requireDeliveryPin &&
      typeof order.handoverPin === 'string' &&
      order.handoverPin &&
      handoverPinInput !== order.handoverPin
    ) {
      res.status(400).json({ error: 'INVALID_HANDOVER_PIN' });
      return;
    }

    const updated = {
      ...order,
      status: nextStatus,
      manualStatus: nextStatus,
      statusUpdatedAt: new Date().toISOString(),
    };
    orders[idx] = updated;
    writeJsonStore(ORDERS_FILE, orders);
    res.json(updated);
  });

  app.post('/api/seller/products', async (req: Request, res: Response) => {
    const sellerAccount = await resolveSellerFromRequest(req);
    if (!sellerAccount) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }
    const body = req.body ?? {};
    const bakeryId = sellerAccount.bakeryId;
    const titleUz = typeof body.titleUz === 'string' ? body.titleUz.trim() : '';
    const titleRu = typeof body.titleRu === 'string' ? body.titleRu.trim() : '';
    const descUz = typeof body.descriptionUz === 'string' ? body.descriptionUz.trim() : '';
    const descRu = typeof body.descriptionRu === 'string' ? body.descriptionRu.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : 'cakes';
    const mediaKey = typeof body.mediaKey === 'string' ? body.mediaKey.trim() : 'medovik';
    const priceUzs = Number(body.priceUzs);
    const weightGrams = Number(body.weightGrams);
    const prepHours = Number(body.prepHours);
    const dietaryTags = Array.isArray(body.dietaryTags)
      ? body.dietaryTags.filter((t: unknown): t is string => typeof t === 'string')
      : ['halal'];
    const occasions = Array.isArray(body.occasions)
      ? body.occasions.filter((o: unknown): o is string => typeof o === 'string')
      : ['birthday'];

    const bakeryExists = getResolvedBakeries(true).some((b) => b.id === bakeryId);
    if (!bakeryExists) {
      res.status(400).json({ error: 'INVALID_BAKERY' });
      return;
    }
    if (titleUz.length < 3 || !Number.isFinite(priceUzs) || priceUzs < 10000) {
      res.status(400).json({ error: 'INVALID_PRODUCT_DATA' });
      return;
    }

    const safeWeight = Number.isFinite(weightGrams) && weightGrams >= 50 ? Math.round(weightGrams) : 600;
    const safePrep = Number.isFinite(prepHours) && prepHours >= 1 ? Math.round(prepHours) : 2;
    const newId = `sm-seller-${Date.now()}`;

    const newRecord: SellerProductRecord = {
      id: newId,
      mediaKey,
      galleryKeys: [mediaKey],
      category: (ALL_CATEGORIES as readonly string[]).includes(category) ? category : 'cakes',
      title: {
        uz: titleUz,
        ru: titleRu || titleUz,
      },
      description: {
        uz: descUz || `${titleUz} — yangi tayyorlangan Samarqand shirinligi.`,
        ru: descRu || `${titleRu || titleUz} — свежий десерт самаркандской мастерской.`,
      },
      bakeryId,
      variants: [
        {
          id: `v-${safeWeight}g`,
          label: { uz: `${safeWeight} g`, ru: `${safeWeight} г` },
          weightGrams: safeWeight,
          priceUzs: Math.round(priceUzs),
        },
      ],
      prepHours: safePrep,
      rating: 5.0,
      reviewCount: 1,
      dietaryTags: dietaryTags.length > 0 ? dietaryTags : ['halal'],
      occasions,
      isPublished: true,
      isSellerCreated: true,
    };

    const existing = readJsonStore<SellerProductRecord[]>(SELLER_PRODUCTS_FILE, []);
    const list = Array.isArray(existing) ? existing : [];
    list.unshift(newRecord);
    writeJsonStore(SELLER_PRODUCTS_FILE, list);

    const enriched = buildEnrichedCatalog(true).find((p) => p.id === newId);
    res.status(201).json(enriched);
  });

  app.patch('/api/seller/products/:id', async (req: Request, res: Response) => {
    const sellerAccount = await resolveSellerFromRequest(req);
    if (!sellerAccount) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }
    const productId = req.params.id;
    const body = req.body ?? {};
    const product = getAllCatalogProducts().find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
      return;
    }
    if (product.bakeryId !== sellerAccount.bakeryId) {
      res.status(403).json({ error: 'FORBIDDEN_BAKERY' });
      return;
    }

    const overrides = readJsonStore<Record<string, ProductOverrideRecord>>(PRODUCT_OVERRIDES_FILE, {});
    const current = overrides[productId] ?? {};
    if (typeof body.isPublished === 'boolean') {
      current.isPublished = body.isPublished;
    }
    if (typeof body.priceUzs === 'number' && Number.isFinite(body.priceUzs) && body.priceUzs >= 10000) {
      current.priceUzs = Math.round(body.priceUzs);
    }
    if (typeof body.prepHours === 'number' && Number.isFinite(body.prepHours) && body.prepHours >= 1) {
      current.prepHours = Math.round(body.prepHours);
    }
    overrides[productId] = current;
    writeJsonStore(PRODUCT_OVERRIDES_FILE, overrides);

    const updated = buildEnrichedCatalog(true).find((p) => p.id === productId);
    res.json(updated);
  });

  app.delete('/api/seller/products/:id', async (req: Request, res: Response) => {
    const sellerAccount = await resolveSellerFromRequest(req);
    if (!sellerAccount) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }
    const productId = req.params.id;
    const existing = readJsonStore<SellerProductRecord[]>(SELLER_PRODUCTS_FILE, []);
    const list = Array.isArray(existing) ? existing : [];
    const target = list.find((p) => p.id === productId);
    if (!target) {
      res.status(400).json({ error: 'CANNOT_DELETE_CORE_ITEM' });
      return;
    }
    if (target.bakeryId !== sellerAccount.bakeryId) {
      res.status(403).json({ error: 'FORBIDDEN_BAKERY' });
      return;
    }
    const nextList = list.filter((p) => p.id !== productId);
    writeJsonStore(SELLER_PRODUCTS_FILE, nextList);
    res.json({ deletedId: productId });
  });

  app.post('/api/seller/promotions', async (req: Request, res: Response) => {
    const sellerAccount = await resolveSellerFromRequest(req);
    if (!sellerAccount) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }
    const body = req.body ?? {};
    const bakeryId = sellerAccount.bakeryId;
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const titleUz = typeof body.titleUz === 'string' ? body.titleUz.trim() : '';
    const titleRu = typeof body.titleRu === 'string' ? body.titleRu.trim() : '';
    const discountPercent = Number(body.discountPercent);
    const minOrderUzs = Number(body.minOrderUzs);

    if (!bakeryId || code.length < 3 || !titleUz || !Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 70) {
      res.status(400).json({ error: 'INVALID_PROMOTION' });
      return;
    }

    const promo: SellerPromotionRecord = {
      id: `promo-${Date.now()}`,
      bakeryId,
      code,
      title: { uz: titleUz, ru: titleRu || titleUz },
      discountPercent: Math.round(discountPercent),
      minOrderUzs: Number.isFinite(minOrderUzs) && minOrderUzs >= 0 ? Math.round(minOrderUzs) : 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const existing = readJsonStore<SellerPromotionRecord[]>(PROMOTIONS_FILE, DEFAULT_PROMOTIONS);
    const list = Array.isArray(existing) ? existing : [];
    list.unshift(promo);
    writeJsonStore(PROMOTIONS_FILE, list);
    res.status(201).json(promo);
  });

  app.patch('/api/seller/promotions/:id', async (req: Request, res: Response) => {
    const sellerAccount = await resolveSellerFromRequest(req);
    if (!sellerAccount) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }
    const promoId = req.params.id;
    const body = req.body ?? {};
    const list = readJsonStore<SellerPromotionRecord[]>(PROMOTIONS_FILE, DEFAULT_PROMOTIONS);
    const idx = list.findIndex((p) => p.id === promoId);
    if (idx < 0) {
      res.status(404).json({ error: 'PROMOTION_NOT_FOUND' });
      return;
    }
    if (list[idx].bakeryId !== sellerAccount.bakeryId) {
      res.status(403).json({ error: 'FORBIDDEN_BAKERY' });
      return;
    }
    const updated = {
      ...list[idx],
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    };
    list[idx] = updated;
    writeJsonStore(PROMOTIONS_FILE, list);
    res.json(updated);
  });

  app.delete('/api/seller/promotions/:id', async (req: Request, res: Response) => {
    const sellerAccount = await resolveSellerFromRequest(req);
    if (!sellerAccount) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }
    const promoId = req.params.id;
    const list = readJsonStore<SellerPromotionRecord[]>(PROMOTIONS_FILE, DEFAULT_PROMOTIONS);
    const target = list.find((p) => p.id === promoId);
    if (target && target.bakeryId !== sellerAccount.bakeryId) {
      res.status(403).json({ error: 'FORBIDDEN_BAKERY' });
      return;
    }
    const nextList = list.filter((p) => p.id !== promoId);
    writeJsonStore(PROMOTIONS_FILE, nextList);
    res.json({ deletedId: promoId });
  });

  app.patch('/api/seller/bakery/:bakeryId', async (req: Request, res: Response) => {
    const sellerAccount = await resolveSellerFromRequest(req);
    if (!sellerAccount) {
      res.status(401).json({ error: 'SELLER_AUTH_REQUIRED' });
      return;
    }
    const bakeryId = sellerAccount.bakeryId;
    const bakeryExists = getResolvedBakeries(true).some((b) => b.id === bakeryId);
    if (!bakeryExists) {
      res.status(404).json({ error: 'BAKERY_NOT_FOUND' });
      return;
    }
    const body = req.body ?? {};
    const overrides = readJsonStore<Record<string, BakeryOverrideRecord>>(BAKERY_OVERRIDES_FILE, {});
    const current = overrides[bakeryId] ?? {};

    if (typeof body.workingHours === 'string' && body.workingHours.trim()) {
      current.workingHours = body.workingHours.trim().slice(0, 30);
    }
    if (typeof body.deliveryFeeUzs === 'number' && Number.isFinite(body.deliveryFeeUzs) && body.deliveryFeeUzs >= 0) {
      current.deliveryFeeUzs = Math.round(body.deliveryFeeUzs);
    }
    if (typeof body.freeDeliveryFromUzs === 'number' && Number.isFinite(body.freeDeliveryFromUzs) && body.freeDeliveryFromUzs >= 0) {
      current.freeDeliveryFromUzs = Math.round(body.freeDeliveryFromUzs);
    }
    if (typeof body.acceptsCustomOrders === 'boolean') {
      current.acceptsCustomOrders = body.acceptsCustomOrders;
    }
    if (body.bio && typeof body.bio.uz === 'string') {
      current.bio = {
        uz: body.bio.uz.trim(),
        ru: typeof body.bio.ru === 'string' && body.bio.ru.trim() ? body.bio.ru.trim() : body.bio.uz.trim(),
      };
    }

    overrides[bakeryId] = current;
    writeJsonStore(BAKERY_OVERRIDES_FILE, overrides);
    const updated = getResolvedBakeries(true).find((b) => b.id === bakeryId)!;
    res.json(updated);
  });

  // --- Admin Panel APIs (Unprotected for now per Admin Panel setup) ---

  app.get('/api/admin/overview', (_req: Request, res: Response) => {
    const settings = getPlatformSettings();
    const bakeries = getResolvedBakeries(true).map((b) => ({
      ...b,
      isOpenNow: isBakeryOpenInSamarkand(b.openHour, b.closeHour),
      productCount: getAllCatalogProducts().filter((p) => p.bakeryId === b.id && p.isPublished !== false).length,
    }));
    const bakeryMap = new Map(bakeries.map((b) => [b.id, b]));
    const products = buildEnrichedCatalog(true);
    const allOrders = ensureOrdersStore().map((order): Record<string, unknown> => ({
      ...order,
      status: computeLiveOrderStatus(order),
    }));
    const sellerAccounts = getSellerAccounts().map(({ password: _password, ...account }) => ({
      ...account,
      bakeryName: bakeryMap.get(account.bakeryId)?.name ?? account.bakeryId,
    }));
    const promotions = readJsonStore<SellerPromotionRecord[]>(PROMOTIONS_FILE, DEFAULT_PROMOTIONS);
    const reviews = readJsonStore<ServerReview[]>(REVIEWS_FILE, DEFAULT_REVIEWS).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    const messages = readJsonStore<CustomerInquiryRecord[]>(MESSAGES_FILE, DEFAULT_MESSAGES).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    const stories = buildStoriesWithInteractions();

    let totalGmvUzs = 0;
    let deliveredGmvUzs = 0;
    let activeOrdersCount = 0;
    let deliveredOrdersCount = 0;
    let cancelledOrdersCount = 0;

    for (const order of allOrders) {
      const status = String(order.status || 'confirmed');
      const total = Number(order.grandTotalUzs || 0);
      if (status === 'cancelled') {
        cancelledOrdersCount += 1;
        continue;
      }
      totalGmvUzs += total;
      if (status === 'delivered') {
        deliveredGmvUzs += total;
        deliveredOrdersCount += 1;
      } else {
        activeOrdersCount += 1;
      }
    }

    const commissionRate = (settings.commissionPercent || 10) / 100;
    const totalCommissionUzs = Math.round(totalGmvUzs * commissionRate);

    res.json({
      metrics: {
        totalGmvUzs,
        deliveredGmvUzs,
        totalCommissionUzs,
        totalOrdersCount: allOrders.length,
        activeOrdersCount,
        deliveredOrdersCount,
        cancelledOrdersCount,
        bakeriesCount: bakeries.length,
        verifiedBakeriesCount: bakeries.filter((b) => b.isVerified).length,
        productsCount: products.length,
        publishedProductsCount: products.filter((p) => p.isPublished !== false).length,
        sellerAccountsCount: sellerAccounts.length,
        activeSellerAccountsCount: sellerAccounts.filter((s) => s.isActive).length,
        promotionsCount: promotions.length,
        reviewsCount: reviews.length,
        messagesCount: messages.length,
        unansweredMessagesCount: messages.filter((m) => !m.reply).length,
      },
      settings,
      bakeries,
      products,
      orders: allOrders,
      sellerAccounts,
      promotions,
      reviews,
      messages,
      stories,
    });
  });

  app.post('/api/admin/sellers', async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const login = typeof body.login === 'string' ? body.login.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const bakeryId = typeof body.bakeryId === 'string' ? body.bakeryId.trim() : '';
    const roleLabel = typeof body.roleLabel === 'string' ? body.roleLabel.trim() : 'Sotuvchi';

    if (fullName.length < 2 || login.length < 3 || password.length < 8 || !bakeryId) {
      res.status(400).json({ error: 'INVALID_SELLER_ACCOUNT' });
      return;
    }

    const accounts = getSellerAccounts();
    if (accounts.some((account) => account.login.toLowerCase() === login.toLowerCase())) {
      res.status(409).json({ error: 'LOGIN_ALREADY_EXISTS' });
      return;
    }

    const sellerId = `sel-${Date.now()}`;
    const email = sellerAuthEmail(login);
    const existingUser = await authPool.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [email]);
    if (existingUser.rowCount) {
      res.status(409).json({ error: 'LOGIN_ALREADY_EXISTS' });
      return;
    }
    const authOrigin = authBaseUrl ?? `${req.protocol}://${req.get('host')}`;
    const authResponse = await auth.handler(new Request(`${authOrigin}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: authOrigin },
      body: JSON.stringify({ email, password, name: fullName }),
    }));
    const authResult = await authResponse.json() as { user?: { id?: string } };
    if (!authResponse.ok || !authResult.user?.id) {
      res.status(400).json({ error: 'SELLER_AUTH_SETUP_FAILED' });
      return;
    }
    await authPool.query('UPDATE "user" SET role = $2, "sellerAccountId" = $3, "updatedAt" = now() WHERE id = $1', [authResult.user.id, 'seller', sellerId]);

    const newAccount: SellerAccountServerRecord = {
      id: sellerId,
      fullName,
      login,
      phone: phone || '+998',
      bakeryId,
      roleLabel,
      isActive: body.isActive !== false,
      createdAt: new Date().toISOString(),
    };
    accounts.unshift(newAccount);
    writeJsonStore(SELLER_ACCOUNTS_FILE, accounts);
    res.status(201).json(newAccount);
  });

  app.patch('/api/admin/sellers/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body ?? {};
    const accounts = getSellerAccounts();
    const idx = accounts.findIndex((account) => account.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'SELLER_NOT_FOUND' });
      return;
    }
    const requestedPassword = typeof body.password === 'string' ? body.password : '';
    if (requestedPassword && requestedPassword.length < 8) {
      res.status(400).json({ error: 'PASSWORD_TOO_SHORT' });
      return;
    }
    const updated: SellerAccountServerRecord = {
      ...accounts[idx],
      ...(typeof body.fullName === 'string' && body.fullName.trim() ? { fullName: body.fullName.trim() } : {}),
      ...(typeof body.phone === 'string' && body.phone.trim() ? { phone: body.phone.trim() } : {}),
      ...(typeof body.bakeryId === 'string' && body.bakeryId.trim() ? { bakeryId: body.bakeryId.trim() } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    };
    if (requestedPassword) {
      const email = sellerAuthEmail(updated.login);
      let authUser = await authPool.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [email]);
      if (!authUser.rowCount) {
        const authOrigin = authBaseUrl ?? `${req.protocol}://${req.get('host')}`;
        const response = await auth.handler(new Request(`${authOrigin}/api/auth/sign-up/email`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: authOrigin },
          body: JSON.stringify({ email, password: requestedPassword, name: updated.fullName }),
        }));
        if (!response.ok) {
          res.status(400).json({ error: 'SELLER_AUTH_SETUP_FAILED' });
          return;
        }
        authUser = await authPool.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [email]);
      } else {
        const userId = authUser.rows[0].id as string;
        const passwordHash = await hashPassword(requestedPassword);
        const credential = await authPool.query(
          'UPDATE account SET password = $2, "updatedAt" = now() WHERE "userId" = $1 AND "providerId" = $3',
          [userId, passwordHash, 'credential'],
        );
        if (!credential.rowCount) {
          await authPool.query(
            'INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,now(),now())',
            [createHash('sha256').update(`${userId}:${Date.now()}`).digest('hex'), userId, 'credential', userId, passwordHash],
          );
        }
      }
      if (authUser.rowCount) {
        await authPool.query('UPDATE "user" SET role = $2, "sellerAccountId" = $3, "updatedAt" = now() WHERE id = $1', [authUser.rows[0].id, 'seller', id]);
      }
    }
    accounts[idx] = updated;
    writeJsonStore(SELLER_ACCOUNTS_FILE, accounts);
    if (!updated.isActive) {
      const sessions = getSellerSessions().filter((session) => session.accountId !== id);
      writeJsonStore(SELLER_SESSIONS_FILE, sessions);
    }
    res.json(updated);
  });

  app.delete('/api/admin/sellers/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const accounts = getSellerAccounts();
    const next = accounts.filter((a) => a.id !== id);
    writeJsonStore(SELLER_ACCOUNTS_FILE, next);
    const sessions = getSellerSessions().filter((s) => s.accountId !== id);
    writeJsonStore(SELLER_SESSIONS_FILE, sessions);
    res.json({ deletedId: id });
  });

  app.post('/api/admin/bakeries', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const sellerTypes = ['confectioner', 'home_baker', 'bakery', 'restaurant', 'cafe', 'grocery', 'home_kitchen', 'other'] as const;
    const sellerType = sellerTypes.includes(body.sellerType) ? body.sellerType : 'bakery';
    const districtId = typeof body.districtId === 'string' ? body.districtId.trim() : 'registon';
    const addressText = typeof body.address === 'string' ? body.address.trim() : 'Samarqand shahri';
    const workingHours = typeof body.workingHours === 'string' && body.workingHours.trim() ? body.workingHours.trim() : '09:00 – 21:00';
    const deliveryFeeUzs = Number.isFinite(Number(body.deliveryFeeUzs)) ? Math.max(0, Number(body.deliveryFeeUzs)) : 15000;
    const freeDeliveryFromUzs = Number.isFinite(Number(body.freeDeliveryFromUzs)) ? Math.max(0, Number(body.freeDeliveryFromUzs)) : 250000;
    const bioUz = typeof body.bioUz === 'string' && body.bioUz.trim() ? body.bioUz.trim() : `${name} — Samarqand qandolat ustaxonasi.`;
    const bioRu = typeof body.bioRu === 'string' && body.bioRu.trim() ? body.bioRu.trim() : `${name} — самаркандская кондитерская мастерская.`;
    const coverMediaKey = typeof body.coverMediaKey === 'string' && body.coverMediaKey.trim() ? body.coverMediaKey.trim() : 'medovik';

    if (name.length < 2) {
      res.status(400).json({ error: 'INVALID_BAKERY_NAME' });
      return;
    }

    const districtLabels: Record<string, LocalizedString> = {
      registon: { uz: 'Registon markazi', ru: 'Центр / Регистан' },
      universitet: { uz: 'Universitet xiyoboni', ru: 'Университетский бульвар' },
      siyob: { uz: 'Siyob bozori', ru: 'Сиабский базар' },
      sartepa: { uz: 'Sartepa massivi', ru: 'Сартепа' },
      sogdiana: { uz: 'So‘g‘diyona', ru: 'Согдиана' },
    };

    const newBakery: ServerBakery = {
      id: `bakery-custom-${Date.now()}`,
      name,
      sellerType,
      districtId,
      district: districtLabels[districtId] ?? districtLabels.registon,
      address: { uz: addressText, ru: addressText },
      bio: { uz: bioUz, ru: bioRu },
      openHour: 9,
      closeHour: 21,
      workingHours,
      deliveryFeeUzs: Math.round(deliveryFeeUzs),
      freeDeliveryFromUzs: Math.round(freeDeliveryFromUzs),
      rating: 5.0,
      reviewCount: 0,
      isVerified: body.isVerified !== false,
      acceptsCustomOrders: body.acceptsCustomOrders !== false,
      coverMediaKey,
    };

    const existing = readJsonStore<ServerBakery[]>(CUSTOM_BAKERIES_FILE, []);
    const list = Array.isArray(existing) ? existing : [];
    list.push(newBakery);
    writeJsonStore(CUSTOM_BAKERIES_FILE, list);
    res.status(201).json(newBakery);
  });

  app.patch('/api/admin/bakeries/:bakeryId', (req: Request, res: Response) => {
    const bakeryId = req.params.bakeryId;
    const bakeryExists = getResolvedBakeries(true).some((b) => b.id === bakeryId);
    if (!bakeryExists) {
      res.status(404).json({ error: 'BAKERY_NOT_FOUND' });
      return;
    }
    const body = req.body ?? {};
    const overrides = readJsonStore<Record<string, BakeryOverrideRecord>>(BAKERY_OVERRIDES_FILE, {});
    const current = overrides[bakeryId] ?? {};

    if (typeof body.workingHours === 'string' && body.workingHours.trim()) {
      current.workingHours = body.workingHours.trim().slice(0, 30);
    }
    if (typeof body.deliveryFeeUzs === 'number' && Number.isFinite(body.deliveryFeeUzs) && body.deliveryFeeUzs >= 0) {
      current.deliveryFeeUzs = Math.round(body.deliveryFeeUzs);
    }
    if (typeof body.freeDeliveryFromUzs === 'number' && Number.isFinite(body.freeDeliveryFromUzs) && body.freeDeliveryFromUzs >= 0) {
      current.freeDeliveryFromUzs = Math.round(body.freeDeliveryFromUzs);
    }
    if (typeof body.acceptsCustomOrders === 'boolean') {
      current.acceptsCustomOrders = body.acceptsCustomOrders;
    }
    if (typeof body.isVerified === 'boolean') {
      current.isVerified = body.isVerified;
    }
    if (typeof body.isSuspended === 'boolean') {
      current.isSuspended = body.isSuspended;
    }

    overrides[bakeryId] = current;
    writeJsonStore(BAKERY_OVERRIDES_FILE, overrides);
    const updated = getResolvedBakeries(true).find((b) => b.id === bakeryId)!;
    res.json(updated);
  });

  app.patch('/api/admin/orders/:batchId', (req: Request, res: Response) => {
    const batchId = req.params.batchId;
    const body = req.body ?? {};
    const nextStatus = typeof body.status === 'string' ? body.status.trim() : '';
    const allowedStatuses = [
      'confirmed',
      'preparing',
      'ready_for_delivery',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ];
    if (!allowedStatuses.includes(nextStatus)) {
      res.status(400).json({ error: 'INVALID_STATUS' });
      return;
    }
    const orders = ensureOrdersStore();
    const idx = orders.findIndex((o) => o.batchId === batchId);
    if (idx < 0) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND' });
      return;
    }
    const updated = {
      ...orders[idx],
      status: nextStatus,
      manualStatus: nextStatus,
      statusUpdatedAt: new Date().toISOString(),
    };
    orders[idx] = updated;
    writeJsonStore(ORDERS_FILE, orders);
    res.json(updated);
  });

  app.patch('/api/admin/products/:id', (req: Request, res: Response) => {
    const productId = req.params.id;
    const body = req.body ?? {};
    const exists = getAllCatalogProducts().some((p) => p.id === productId);
    if (!exists) {
      res.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
      return;
    }
    const overrides = readJsonStore<Record<string, ProductOverrideRecord>>(PRODUCT_OVERRIDES_FILE, {});
    const current = overrides[productId] ?? {};
    if (typeof body.isPublished === 'boolean') current.isPublished = body.isPublished;
    if (typeof body.priceUzs === 'number' && Number.isFinite(body.priceUzs) && body.priceUzs >= 10000) {
      current.priceUzs = Math.round(body.priceUzs);
    }
    if (typeof body.prepHours === 'number' && Number.isFinite(body.prepHours) && body.prepHours >= 1) {
      current.prepHours = Math.round(body.prepHours);
    }
    overrides[productId] = current;
    writeJsonStore(PRODUCT_OVERRIDES_FILE, overrides);
    const updated = buildEnrichedCatalog(true).find((p) => p.id === productId);
    res.json(updated);
  });

  app.delete('/api/admin/products/:id', (req: Request, res: Response) => {
    const productId = req.params.id;
    const existing = readJsonStore<SellerProductRecord[]>(SELLER_PRODUCTS_FILE, []);
    const list = Array.isArray(existing) ? existing : [];
    const nextList = list.filter((p) => p.id !== productId);
    if (nextList.length === list.length) {
      const overrides = readJsonStore<Record<string, ProductOverrideRecord>>(PRODUCT_OVERRIDES_FILE, {});
      overrides[productId] = { ...(overrides[productId] ?? {}), isPublished: false };
      writeJsonStore(PRODUCT_OVERRIDES_FILE, overrides);
      res.json({ hiddenId: productId });
      return;
    }
    writeJsonStore(SELLER_PRODUCTS_FILE, nextList);
    res.json({ deletedId: productId });
  });

  app.post('/api/admin/promotions', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const bakeryId = typeof body.bakeryId === 'string' ? body.bakeryId.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const titleUz = typeof body.titleUz === 'string' ? body.titleUz.trim() : '';
    const titleRu = typeof body.titleRu === 'string' ? body.titleRu.trim() : '';
    const discountPercent = Number(body.discountPercent);
    const minOrderUzs = Number(body.minOrderUzs);

    if (!bakeryId || code.length < 3 || !titleUz || !Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 70) {
      res.status(400).json({ error: 'INVALID_PROMOTION' });
      return;
    }
    const promo: SellerPromotionRecord = {
      id: `promo-${Date.now()}`,
      bakeryId,
      code,
      title: { uz: titleUz, ru: titleRu || titleUz },
      discountPercent: Math.round(discountPercent),
      minOrderUzs: Number.isFinite(minOrderUzs) && minOrderUzs >= 0 ? Math.round(minOrderUzs) : 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    const existing = readJsonStore<SellerPromotionRecord[]>(PROMOTIONS_FILE, DEFAULT_PROMOTIONS);
    const list = Array.isArray(existing) ? existing : [];
    list.unshift(promo);
    writeJsonStore(PROMOTIONS_FILE, list);
    res.status(201).json(promo);
  });

  app.patch('/api/admin/promotions/:id', (req: Request, res: Response) => {
    const promoId = req.params.id;
    const body = req.body ?? {};
    const list = readJsonStore<SellerPromotionRecord[]>(PROMOTIONS_FILE, DEFAULT_PROMOTIONS);
    const idx = list.findIndex((p) => p.id === promoId);
    if (idx < 0) {
      res.status(404).json({ error: 'PROMOTION_NOT_FOUND' });
      return;
    }
    const updated = {
      ...list[idx],
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    };
    list[idx] = updated;
    writeJsonStore(PROMOTIONS_FILE, list);
    res.json(updated);
  });

  app.delete('/api/admin/promotions/:id', (req: Request, res: Response) => {
    const promoId = req.params.id;
    const list = readJsonStore<SellerPromotionRecord[]>(PROMOTIONS_FILE, DEFAULT_PROMOTIONS);
    const nextList = list.filter((p) => p.id !== promoId);
    writeJsonStore(PROMOTIONS_FILE, nextList);
    res.json({ deletedId: promoId });
  });

  app.delete('/api/admin/reviews/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const list = readJsonStore<ServerReview[]>(REVIEWS_FILE, DEFAULT_REVIEWS);
    const next = list.filter((r) => r.id !== id);
    writeJsonStore(REVIEWS_FILE, next);
    res.json({ deletedId: id });
  });

  app.patch('/api/admin/settings', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const current = getPlatformSettings();
    const updated: PlatformSettingsServerRecord = {
      ...current,
      ...(Number.isFinite(Number(body.commissionPercent)) && Number(body.commissionPercent) >= 0 && Number(body.commissionPercent) <= 50
        ? { commissionPercent: Number(body.commissionPercent) }
        : {}),
      ...(Number.isFinite(Number(body.defaultDeliveryFeeUzs)) && Number(body.defaultDeliveryFeeUzs) >= 0
        ? { defaultDeliveryFeeUzs: Math.round(Number(body.defaultDeliveryFeeUzs)) }
        : {}),
      ...(Number.isFinite(Number(body.freeDeliveryThresholdUzs)) && Number(body.freeDeliveryThresholdUzs) >= 0
        ? { freeDeliveryThresholdUzs: Math.round(Number(body.freeDeliveryThresholdUzs)) }
        : {}),
      ...(typeof body.requireDeliveryPin === 'boolean' ? { requireDeliveryPin: body.requireDeliveryPin } : {}),
      ...(typeof body.announcementEnabled === 'boolean' ? { announcementEnabled: body.announcementEnabled } : {}),
      ...(typeof body.announcementUz === 'string' ? { announcementUz: body.announcementUz.trim() } : {}),
      ...(typeof body.announcementRu === 'string' ? { announcementRu: body.announcementRu.trim() } : {}),
      updatedAt: new Date().toISOString(),
    };
    writeJsonStore(PLATFORM_SETTINGS_FILE, updated);
    res.json(updated);
  });

  app.get('/api/messages', (req: Request, res: Response) => {
    const bakeryId = typeof req.query.bakeryId === 'string' ? req.query.bakeryId.trim() : '';
    const allMessages = readJsonStore<CustomerInquiryRecord[]>(MESSAGES_FILE, DEFAULT_MESSAGES);
    const filtered = bakeryId
      ? allMessages.filter((m) => m.bakeryId === bakeryId)
      : allMessages;
    const sorted = [...filtered].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    res.json({ items: sorted, total: sorted.length });
  });

  app.post('/api/messages', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const bakeryId = typeof body.bakeryId === 'string' ? body.bakeryId.trim() : '';
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    const bakery = getResolvedBakeries().find((b) => b.id === bakeryId);
    if (!bakery) {
      res.status(400).json({ error: 'INVALID_BAKERY' });
      return;
    }
    if (customerName.length < 2 || message.length < 4) {
      res.status(400).json({ error: 'INVALID_MESSAGE' });
      return;
    }

    const record: CustomerInquiryRecord = {
      id: `msg-${Date.now()}`,
      bakeryId: bakery.id,
      bakeryName: bakery.name,
      customerName,
      customerPhone: customerPhone || '+998',
      message: message.slice(0, 400),
      createdAt: new Date().toISOString(),
    };

    const existing = readJsonStore<CustomerInquiryRecord[]>(MESSAGES_FILE, DEFAULT_MESSAGES);
    const list = Array.isArray(existing) ? existing : [];
    list.unshift(record);
    writeJsonStore(MESSAGES_FILE, list.slice(0, 200));
    res.status(201).json(record);
  });

  app.post('/api/messages/:id/reply', (req: Request, res: Response) => {
    const messageId = req.params.id;
    const body = req.body ?? {};
    const reply = typeof body.reply === 'string' ? body.reply.trim() : '';
    if (reply.length < 2) {
      res.status(400).json({ error: 'INVALID_REPLY' });
      return;
    }

    const list = readJsonStore<CustomerInquiryRecord[]>(MESSAGES_FILE, DEFAULT_MESSAGES);
    const idx = list.findIndex((m) => m.id === messageId);
    if (idx < 0) {
      res.status(404).json({ error: 'MESSAGE_NOT_FOUND' });
      return;
    }

    const updated: CustomerInquiryRecord = {
      ...list[idx],
      reply: reply.slice(0, 400),
      repliedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    writeJsonStore(MESSAGES_FILE, list);
    res.json(updated);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`SweetMarket server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start SweetMarket server:', error);
  process.exit(1);
});
