import {
  BakeryReel,
  BakeryReview,
  BakeryStory,
  BakerySummary,
  CatalogSortOption,
  CategorySummary,
  CheckoutOrderPayload,
  ConfirmedOrderReceipt,
  CustomerInquiryMessage,
  OrderStatus,
  PlatformSettingsRecord,
  ProductCategory,
  SellerAccountRecord,
  SellerDashboardMetrics,
  SellerPromotion,
  ShowcaseProduct,
} from '../../types';

function getSellerAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  return { Accept: 'application/json', ...extra };
}

export interface ServerHealthResponse {
  status: string;
  service: string;
  region: string;
  timestamp: string;
}

export interface ShowcaseCatalogResponse {
  items: ShowcaseProduct[];
  categories: CategorySummary[];
  total: number;
}

export interface CompaniesResponse {
  items: BakerySummary[];
  total: number;
}

export interface StoriesResponse {
  items: BakeryStory[];
  total: number;
}

export interface ReelsResponse {
  items: BakeryReel[];
  total: number;
}

export interface ReviewsResponse {
  items: BakeryReview[];
  averageRating: number;
  total: number;
}

export interface SellerOnboardingPayload {
  name: string;
  shopType: 'bakery' | 'confectionery' | 'restaurant' | 'cafe' | 'home_kitchen' | 'grocery' | 'other';
  phone: string;
  district: string;
  address: string;
  description: string;
  googleMapsUrl: string;
  latitude: number | null;
  longitude: number | null;
}

export async function submitSellerOnboarding(payload: SellerOnboardingPayload): Promise<void> {
  const response = await fetch('/api/seller/onboarding', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(data.error || 'SELLER_DETAILS_SAVE_FAILED');
}

export interface SellerPaymentStartResponse {
  paymentId: string;
  paymentUrl: string;
  amountUzs: number;
}

export async function createSellerTestPayment(): Promise<SellerPaymentStartResponse> {
  const response = await fetch('/api/seller/payment', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  const data = await response.json() as SellerPaymentStartResponse & { error?: string };
  if (!response.ok) throw new Error(data.error || 'PAYMENT_CREATE_FAILED');
  return data;
}

export async function verifySellerTestPayment(paymentId: string): Promise<'paid' | 'pending' | 'failed'> {
  const response = await fetch(`/api/seller/payment?paymentId=${encodeURIComponent(paymentId)}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  const data = await response.json() as { status?: 'paid' | 'pending' | 'failed'; error?: string };
  if (!response.ok) throw new Error(data.error || 'PAYMENT_STATUS_UNAVAILABLE');
  return data.status ?? 'pending';
}

export async function fetchServerHealth(): Promise<ServerHealthResponse> {
  const response = await fetch('/api/health', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return (await response.json()) as ServerHealthResponse;
}

export async function fetchPlatformConfig(): Promise<PlatformSettingsRecord> {
  const response = await fetch('/api/platform/config', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Platform config failed with status ${response.status}`);
  }
  return (await response.json()) as PlatformSettingsRecord;
}

export async function fetchCompanies(): Promise<CompaniesResponse> {
  const response = await fetch('/api/companies', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Companies request failed with status ${response.status}`);
  }

  return (await response.json()) as CompaniesResponse;
}

export async function fetchStories(): Promise<StoriesResponse> {
  const response = await fetch('/api/stories', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Stories request failed with status ${response.status}`);
  }

  return (await response.json()) as StoriesResponse;
}

export async function reactToStory(
  storyId: string,
  payload: { action: 'like' | 'unlike' } | { action: 'vote'; optionId: string },
): Promise<BakeryStory> {
  const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/react`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Story reaction failed with status ${response.status}`);
  }

  return (await response.json()) as BakeryStory;
}

export async function fetchReels(): Promise<ReelsResponse> {
  const response = await fetch('/api/reels', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Reels request failed with status ${response.status}`);
  }

  return (await response.json()) as ReelsResponse;
}

export async function fetchCompanyReviews(bakeryId: string): Promise<ReviewsResponse> {
  const response = await fetch(`/api/companies/${encodeURIComponent(bakeryId)}/reviews`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Reviews request failed with status ${response.status}`);
  }

  return (await response.json()) as ReviewsResponse;
}

export async function submitCompanyReview(
  bakeryId: string,
  payload: { authorName: string; rating: number; comment: string },
): Promise<BakeryReview> {
  const response = await fetch(`/api/companies/${encodeURIComponent(bakeryId)}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as BakeryReview & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Review submission failed with status ${response.status}`);
  }

  return data;
}

export async function fetchShowcaseCatalog(params?: {
  category?: string;
  district?: string;
  bakeryId?: string;
  dietary?: string;
  occasion?: string;
  fastOnly?: boolean;
  sort?: CatalogSortOption;
  q?: string;
}): Promise<ShowcaseCatalogResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category && params.category !== 'all') {
    searchParams.set('category', params.category);
  }
  if (params?.district && params.district !== 'all') {
    searchParams.set('district', params.district);
  }
  if (params?.bakeryId && params.bakeryId !== 'all') {
    searchParams.set('bakeryId', params.bakeryId);
  }
  if (params?.dietary && params.dietary !== 'all') {
    searchParams.set('dietary', params.dietary);
  }
  if (params?.occasion && params.occasion !== 'all') {
    searchParams.set('occasion', params.occasion);
  }
  if (params?.fastOnly) {
    searchParams.set('fastOnly', 'true');
  }
  if (params?.sort) {
    searchParams.set('sort', params.sort);
  }
  if (params?.q?.trim()) {
    searchParams.set('q', params.q.trim());
  }

  const queryString = searchParams.toString();
  const url = queryString ? `/api/catalog/showcase?${queryString}` : '/api/catalog/showcase';

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  return (await response.json()) as ShowcaseCatalogResponse;
}

export async function submitCustomerOrder(
  payload: CheckoutOrderPayload,
): Promise<ConfirmedOrderReceipt> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as ConfirmedOrderReceipt & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Order failed with status ${response.status}`);
  }

  return data;
}

export async function fetchOrderStatus(batchId: string): Promise<ConfirmedOrderReceipt> {
  const response = await fetch(`/api/orders/${encodeURIComponent(batchId)}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Order lookup failed with status ${response.status}`);
  }

  return (await response.json()) as ConfirmedOrderReceipt;
}

export async function cancelCustomerOrder(batchId: string): Promise<ConfirmedOrderReceipt> {
  const response = await fetch(`/api/orders/${encodeURIComponent(batchId)}/cancel`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });

  const data = (await response.json()) as ConfirmedOrderReceipt & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Order cancellation failed with status ${response.status}`);
  }

  return data;
}

// --- Seller Authentication & Dashboard APIs ---

export async function loginSellerAccount(payload: {
  login: string;
  password: string;
}): Promise<{ account: SellerAccountRecord }> {
  const response = await fetch('/api/seller/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { account: SellerAccountRecord; error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Seller login failed with status ${response.status}`);
  }
  return { account: data.account };
}

export async function linkSellerAccount(payload: {
  login: string;
  password: string;
}): Promise<{ account: SellerAccountRecord }> {
  const response = await fetch('/api/seller/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { account?: SellerAccountRecord; error?: string };
  if (!response.ok || !data.account) {
    throw new Error(data.error || `Seller verification failed with status ${response.status}`);
  }
  return { account: data.account };
}

export async function logoutSellerAccount(): Promise<void> {
  await fetch('/api/seller/logout', {
    method: 'POST',
    headers: getSellerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({}),
    credentials: 'same-origin',
  });
}

export async function fetchCurrentSellerAccount(): Promise<SellerAccountRecord | null> {
  const response = await fetch('/api/seller/me', {
    headers: getSellerAuthHeaders(),
    credentials: 'same-origin',
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { account: SellerAccountRecord };
  return data.account;
}

export interface SellerDashboardResponse {
  bakery: BakerySummary;
  metrics: SellerDashboardMetrics;
  orders: ConfirmedOrderReceipt[];
  products: ShowcaseProduct[];
  promotions: SellerPromotion[];
  messages: CustomerInquiryMessage[];
  reviews: BakeryReview[];
}

export async function fetchSellerDashboard(): Promise<SellerDashboardResponse> {
  const response = await fetch('/api/seller/dashboard', {
    headers: getSellerAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'SELLER_AUTH_REQUIRED' : `Seller dashboard request failed with status ${response.status}`);
  }
  return (await response.json()) as SellerDashboardResponse;
}

export async function updateSellerOrderStatus(
  batchId: string,
  status: OrderStatus,
  handoverPin?: string,
): Promise<ConfirmedOrderReceipt> {
  const response = await fetch(`/api/seller/orders/${encodeURIComponent(batchId)}/status`, {
    method: 'PATCH',
    headers: getSellerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status, ...(handoverPin ? { handoverPin } : {}) }),
  });
  const data = (await response.json()) as ConfirmedOrderReceipt & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Order status update failed with status ${response.status}`);
  }
  return data;
}

export async function createSellerProduct(payload: {
  bakeryId: string;
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  category: string;
  mediaKey: string;
  priceUzs: number;
  weightGrams: number;
  prepHours: number;
  dietaryTags: string[];
  occasions: string[];
}): Promise<ShowcaseProduct> {
  const response = await fetch('/api/seller/products', {
    method: 'POST',
    headers: getSellerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as ShowcaseProduct & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Product creation failed with status ${response.status}`);
  }
  return data;
}

export async function updateSellerProduct(
  productId: string,
  payload: { isPublished?: boolean; priceUzs?: number; prepHours?: number },
): Promise<ShowcaseProduct> {
  const response = await fetch(`/api/seller/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    headers: getSellerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as ShowcaseProduct & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Product update failed with status ${response.status}`);
  }
  return data;
}

export async function deleteSellerProduct(productId: string): Promise<{ deletedId: string }> {
  const response = await fetch(`/api/seller/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    headers: getSellerAuthHeaders(),
  });
  const data = (await response.json()) as { deletedId: string; error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Product deletion failed with status ${response.status}`);
  }
  return data;
}

export async function createSellerPromotion(payload: {
  bakeryId: string;
  code: string;
  titleUz: string;
  titleRu: string;
  discountPercent: number;
  minOrderUzs: number;
}): Promise<SellerPromotion> {
  const response = await fetch('/api/seller/promotions', {
    method: 'POST',
    headers: getSellerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as SellerPromotion & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Promotion creation failed with status ${response.status}`);
  }
  return data;
}

export async function toggleSellerPromotion(
  promoId: string,
  isActive: boolean,
): Promise<SellerPromotion> {
  const response = await fetch(`/api/seller/promotions/${encodeURIComponent(promoId)}`, {
    method: 'PATCH',
    headers: getSellerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ isActive }),
  });
  const data = (await response.json()) as SellerPromotion & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Promotion update failed with status ${response.status}`);
  }
  return data;
}

export async function deleteSellerPromotion(promoId: string): Promise<{ deletedId: string }> {
  const response = await fetch(`/api/seller/promotions/${encodeURIComponent(promoId)}`, {
    method: 'DELETE',
    headers: getSellerAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Promotion delete failed with status ${response.status}`);
  }
  return (await response.json()) as { deletedId: string };
}

export async function updateSellerBakerySettings(
  bakeryId: string,
  payload: {
    workingHours?: string;
    deliveryFeeUzs?: number;
    freeDeliveryFromUzs?: number;
    acceptsCustomOrders?: boolean;
    bio?: { uz: string; ru: string };
  },
): Promise<BakerySummary> {
  const response = await fetch(`/api/seller/bakery/${encodeURIComponent(bakeryId)}`, {
    method: 'PATCH',
    headers: getSellerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as BakerySummary & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Bakery update failed with status ${response.status}`);
  }
  return data;
}

export async function fetchCustomerMessages(bakeryId?: string): Promise<CustomerInquiryMessage[]> {
  const qs = bakeryId ? `?bakeryId=${encodeURIComponent(bakeryId)}` : '';
  const response = await fetch(`/api/messages${qs}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Messages fetch failed with status ${response.status}`);
  }
  const data = (await response.json()) as { items: CustomerInquiryMessage[] };
  return data.items;
}

export async function sendCustomerMessage(payload: {
  bakeryId: string;
  customerName: string;
  customerPhone: string;
  message: string;
}): Promise<CustomerInquiryMessage> {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as CustomerInquiryMessage & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Message send failed with status ${response.status}`);
  }
  return data;
}

export async function replyToCustomerMessage(
  messageId: string,
  reply: string,
): Promise<CustomerInquiryMessage> {
  const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ reply }),
  });
  const data = (await response.json()) as CustomerInquiryMessage & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Reply failed with status ${response.status}`);
  }
  return data;
}

// --- Admin Panel APIs ---

export interface AdminOverviewMetrics {
  totalGmvUzs: number;
  deliveredGmvUzs: number;
  totalCommissionUzs: number;
  totalOrdersCount: number;
  activeOrdersCount: number;
  deliveredOrdersCount: number;
  cancelledOrdersCount: number;
  bakeriesCount: number;
  verifiedBakeriesCount: number;
  productsCount: number;
  publishedProductsCount: number;
  sellerAccountsCount: number;
  activeSellerAccountsCount: number;
  promotionsCount: number;
  reviewsCount: number;
  messagesCount: number;
  unansweredMessagesCount: number;
}

export interface AdminOverviewResponse {
  dataSourceNotice?: string;
  metrics: AdminOverviewMetrics;
  settings: PlatformSettingsRecord;
  bakeries: (BakerySummary & { isSuspended?: boolean })[];
  products: ShowcaseProduct[];
  orders: ConfirmedOrderReceipt[];
  sellerAccounts: SellerAccountRecord[];
  promotions: SellerPromotion[];
  reviews: BakeryReview[];
  messages: CustomerInquiryMessage[];
  stories: BakeryStory[];
}

export interface SellerApplicationRecord {
  id: string;
  ownerUserId: string;
  shopName: string;
  shopType: string;
  phone: string | null;
  district: string | null;
  address: string | null;
  description: string;
  status: string;
  createdAt: string;
  applicantName: string;
  email: string;
}

export async function fetchSellerApplications(): Promise<SellerApplicationRecord[]> {
  const response = await fetch('/api/admin/seller-applications', { headers: { Accept: 'application/json' } });
  const data = await response.json() as { applications?: SellerApplicationRecord[]; error?: string };
  if (!response.ok) throw new Error(data.error || `Applications failed with status ${response.status}`);
  return data.applications ?? [];
}

export async function reviewSellerApplication(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const response = await fetch('/api/admin/seller-applications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ id, status }),
  });
  const data = await response.json() as { error?: string };
  if (!response.ok) throw new Error(data.error || `Application review failed with status ${response.status}`);
}

export async function fetchSellerTestPaymentAmount(): Promise<number> {
  const response = await fetch('/api/admin/payment-settings', { headers: { Accept: 'application/json' } });
  const data = await response.json() as { testPaymentAmountUzs?: number; error?: string };
  if (!response.ok) throw new Error(data.error || `Payment settings failed with status ${response.status}`);
  return data.testPaymentAmountUzs ?? 1000;
}

export async function saveSellerTestPaymentAmount(testPaymentAmountUzs: number): Promise<number> {
  const response = await fetch('/api/admin/payment-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ testPaymentAmountUzs }),
  });
  const data = await response.json() as { testPaymentAmountUzs?: number; error?: string };
  if (!response.ok) throw new Error(data.error || `Payment settings failed with status ${response.status}`);
  return data.testPaymentAmountUzs ?? testPaymentAmountUzs;
}

export async function fetchAdminOverview(): Promise<AdminOverviewResponse> {
  const response = await fetch('/api/admin/overview', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Admin overview failed with status ${response.status}`);
  }
  return (await response.json()) as AdminOverviewResponse;
}

export async function createAdminSellerAccount(payload: {
  fullName: string;
  login: string;
  phone: string;
  password: string;
  bakeryId: string;
  roleLabel?: string;
}): Promise<SellerAccountRecord> {
  const response = await fetch('/api/admin/sellers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as SellerAccountRecord & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Create seller failed with status ${response.status}`);
  }
  return data;
}

export async function updateAdminSellerAccount(
  id: string,
  payload: {
    fullName?: string;
    phone?: string;
    password?: string;
    bakeryId?: string;
    isActive?: boolean;
  },
): Promise<SellerAccountRecord> {
  const response = await fetch(`/api/admin/sellers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as SellerAccountRecord & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Update seller failed with status ${response.status}`);
  }
  return data;
}

export async function deleteAdminSellerAccount(id: string): Promise<{ deletedId: string }> {
  const response = await fetch(`/api/admin/sellers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Delete seller failed with status ${response.status}`);
  }
  return (await response.json()) as { deletedId: string };
}

export async function createAdminBakery(payload: {
  name: string;
  sellerType:
    | 'confectioner'
    | 'home_baker'
    | 'bakery'
    | 'restaurant'
    | 'cafe'
    | 'grocery'
    | 'home_kitchen'
    | 'other';
  districtId: string;
  address: string;
  workingHours: string;
  deliveryFeeUzs: number;
  freeDeliveryFromUzs: number;
  acceptsCustomOrders: boolean;
  isVerified: boolean;
  bioUz: string;
  bioRu: string;
  coverMediaKey: string;
}): Promise<BakerySummary> {
  const response = await fetch('/api/admin/bakeries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as BakerySummary & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Create bakery failed with status ${response.status}`);
  }
  return data;
}

export async function updateAdminBakery(
  bakeryId: string,
  payload: {
    workingHours?: string;
    deliveryFeeUzs?: number;
    freeDeliveryFromUzs?: number;
    acceptsCustomOrders?: boolean;
    isVerified?: boolean;
    isSuspended?: boolean;
  },
): Promise<BakerySummary> {
  const response = await fetch(`/api/admin/bakeries/${encodeURIComponent(bakeryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as BakerySummary & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Update bakery failed with status ${response.status}`);
  }
  return data;
}

export async function updateAdminOrderStatus(
  batchId: string,
  status: OrderStatus,
): Promise<ConfirmedOrderReceipt> {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(batchId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = (await response.json()) as ConfirmedOrderReceipt & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Update order status failed with status ${response.status}`);
  }
  return data;
}

export async function updateAdminProduct(
  productId: string,
  payload: { isPublished?: boolean; priceUzs?: number; prepHours?: number },
): Promise<ShowcaseProduct> {
  const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as ShowcaseProduct & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Update product failed with status ${response.status}`);
  }
  return data;
}

export async function deleteAdminProduct(productId: string): Promise<{ deletedId?: string; hiddenId?: string }> {
  const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Delete product failed with status ${response.status}`);
  }
  return (await response.json()) as { deletedId?: string; hiddenId?: string };
}

export async function createAdminPromotion(payload: {
  bakeryId: string;
  code: string;
  titleUz: string;
  titleRu: string;
  discountPercent: number;
  minOrderUzs: number;
}): Promise<SellerPromotion> {
  const response = await fetch('/api/admin/promotions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as SellerPromotion & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Create promo failed with status ${response.status}`);
  }
  return data;
}

export async function toggleAdminPromotion(promoId: string, isActive: boolean): Promise<SellerPromotion> {
  const response = await fetch(`/api/admin/promotions/${encodeURIComponent(promoId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  if (!response.ok) {
    throw new Error(`Toggle promo failed with status ${response.status}`);
  }
  return (await response.json()) as SellerPromotion;
}

export async function deleteAdminPromotion(promoId: string): Promise<{ deletedId: string }> {
  const response = await fetch(`/api/admin/promotions/${encodeURIComponent(promoId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Delete promo failed with status ${response.status}`);
  }
  return (await response.json()) as { deletedId: string };
}

export async function deleteAdminReview(reviewId: string): Promise<{ deletedId: string }> {
  const response = await fetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Delete review failed with status ${response.status}`);
  }
  return (await response.json()) as { deletedId: string };
}

export async function updateAdminPlatformSettings(
  payload: Partial<Omit<PlatformSettingsRecord, 'updatedAt'>>,
): Promise<PlatformSettingsRecord> {
  const response = await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as PlatformSettingsRecord & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Update settings failed with status ${response.status}`);
  }
  return data;
}

export { ProductCategory };


