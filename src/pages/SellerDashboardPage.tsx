import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  KeyRound,
  LogOut,
  MessageSquare,
  Package,
  Percent,
  Plus,
  ReceiptText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { PRODUCT_MEDIA_MAP } from '../assets/productMedia';
import { formatUzsPrice } from '../components/catalog/ProductCard';
import {
  Button,
  Card,
  Divider,
  SectionHeader,
  SelectInput,
  TextArea,
  TextInput,
} from '../design-system/ui';
import { useTranslation } from '../hooks/useTranslation';
import { allowAuthNavigation, authClient, clearAuthNavigation } from '../services/auth-client';
import {
  createSellerProduct,
  createSellerPromotion,
  deleteSellerProduct,
  deleteSellerPromotion,
  fetchCurrentSellerAccount,
  fetchSellerDashboard,
  loginSellerAccount,
  linkSellerAccount,
  logoutSellerAccount,
  replyToCustomerMessage,
  SellerDashboardResponse,
  toggleSellerPromotion,
  updateSellerBakerySettings,
  updateSellerOrderStatus,
  updateSellerProduct,
} from '../services/api/client';
import {
  BakerySummary,
  DeliveryMethod,
  OrderStatus,
  ProductCategory,
  ProductMediaKey,
  SellerAccountRecord,
} from '../types';

export interface SellerDashboardPageProps {
  bakeries: BakerySummary[];
  onBackToProfile: () => void;
  onCatalogChanged: () => void;
}

type SellerTab = 'overview' | 'orders' | 'products' | 'promotions' | 'messages' | 'settings';

const MEDIA_KEYS: ProductMediaKey[] = [
  'medovik',
  'bento_cake',
  'truffles',
  'celebration_cake',
  'macarons',
  'eclairs',
  'berry_tart',
  'halva',
  'hero_pastry',
];

const CATEGORIES: ProductCategory[] = [
  ProductCategory.CAKES,
  ProductCategory.BENTO_CAKES,
  ProductCategory.PASTRIES,
  ProductCategory.EASTERN_SWEETS,
  ProductCategory.CHOCOLATES,
  ProductCategory.MACARONS_ECLAIRS,
  ProductCategory.DIETARY,
  ProductCategory.GIFT_BOXES,
  ProductCategory.WEDDING_CAKES,
  ProductCategory.BREAKFAST_BAKES,
  ProductCategory.HALVA_NAVVOT,
];

export function SellerDashboardPage({
  onBackToProfile,
  onCatalogChanged,
}: SellerDashboardPageProps) {
  const { data: authSession } = authClient.useSession();
  const { locale, t } = useTranslation();

  const [sellerAccount, setSellerAccount] = useState<SellerAccountRecord | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const selectedBakeryId = sellerAccount?.bakeryId ?? '';
  const [activeTab, setActiveTab] = useState<SellerTab>('overview');
  const [dashboard, setDashboard] = useState<SellerDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Orders filter & handover PIN modal/inline
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [pinPromptBatchId, setPinPromptBatchId] = useState<string | null>(null);
  const [pinInputValue, setPinInputValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // New Product Form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [prodTitleUz, setProdTitleUz] = useState('');
  const [prodTitleRu, setProdTitleRu] = useState('');
  const [prodDescUz, setProdDescUz] = useState('');
  const [prodCategory, setProdCategory] = useState<ProductCategory>(ProductCategory.CAKES);
  const [prodMediaKey, setProdMediaKey] = useState<ProductMediaKey>('medovik');
  const [prodPriceUzs, setProdPriceUzs] = useState('135000');
  const [prodWeightGrams, setProdWeightGrams] = useState('800');
  const [prodPrepHours, setProdPrepHours] = useState('2');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productCreatedNotice, setProductCreatedNotice] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  // Promotion Form
  const [promoCode, setPromoCode] = useState('');
  const [promoTitleUz, setPromoTitleUz] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('10');
  const [promoMinOrder, setPromoMinOrder] = useState('150000');

  // Message Reply Drafts
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  // Bakery Settings Form
  const [workingHours, setWorkingHours] = useState('');
  const [deliveryFeeUzs, setDeliveryFeeUzs] = useState('');
  const [freeDeliveryFromUzs, setFreeDeliveryFromUzs] = useState('');
  const [acceptsCustomOrders, setAcceptsCustomOrders] = useState(true);
  const [bioUz, setBioUz] = useState('');
  const [bioRu, setBioRu] = useState('');
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSellerDashboard();
      setDashboard(data);
      setWorkingHours(data.bakery.workingHours);
      setDeliveryFeeUzs(String(data.bakery.deliveryFeeUzs));
      setFreeDeliveryFromUzs(String(data.bakery.freeDeliveryFromUzs));
      setAcceptsCustomOrders(data.bakery.acceptsCustomOrders);
      setBioUz(data.bakery.bio.uz);
      setBioRu(data.bakery.bio.ru);
    } catch (err) {
      if (err instanceof Error && err.message === 'SELLER_AUTH_REQUIRED') {
        setSellerAccount(null);
        setDashboard(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetchCurrentSellerAccount()
      .then((acc) => {
        if (!mounted) return;
        setSellerAccount(acc);
        if (acc) {
          void loadDashboard();
        }
      })
      .finally(() => {
        if (mounted) setAuthChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadDashboard]);

  const handleSellerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const { account } = authSession?.user
        ? await linkSellerAccount({ login: loginInput.trim(), password: passwordInput })
        : await loginSellerAccount({ login: loginInput.trim(), password: passwordInput });
      setSellerAccount(account);
      setPasswordInput('');
      await loadDashboard();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'ACCOUNT_DISABLED') {
        setLoginError(
          locale === 'uz'
            ? 'Sotuvchi hisobingiz administrator tomonidan bloklangan.'
            : 'Ваш аккаунт продавца заблокирован администратором.',
        );
      } else {
        setLoginError(
          locale === 'uz'
            ? 'Login/telefon yoki parol noto‘g‘ri. Kirish ma’lumotlarini administratordan oling.'
            : 'Неверный логин или пароль. Получите данные доступа у администратора.',
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSellerSocialLogin = async (provider: 'google' | 'telegram') => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      allowAuthNavigation();
      const result = await authClient.signIn.social({ provider, callbackURL: '/seller' });
      if (result.error) throw new Error(result.error.message || 'AUTH_FAILED');
    } catch {
      clearAuthNavigation();
      setLoginError(
        locale === 'uz'
          ? 'Ijtimoiy tarmoq orqali kirish vaqtincha mavjud emas.'
          : 'Вход через этот сервис временно недоступен.',
      );
      setIsLoggingIn(false);
    }
  };

  const handleSellerLogout = async () => {
    await logoutSellerAccount();
    setSellerAccount(null);
    setDashboard(null);
  };

  const filteredOrders = useMemo(() => {
    const list = dashboard?.orders ?? [];
    return list.filter((order) => {
      const status = order.status ?? OrderStatus.CONFIRMED;
      if (orderStatusFilter !== 'all' && status !== orderStatusFilter) {
        return false;
      }
      if (orderQuery.trim()) {
        const q = orderQuery.trim().toLowerCase();
        const hay = `${order.batchId} ${order.trackingCode ?? ''} ${order.customerName} ${order.customerPhone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dashboard?.orders, orderQuery, orderStatusFilter]);

  const handleAdvanceOrder = async (batchId: string, nextStatus: OrderStatus, handoverPin?: string) => {
    setUpdatingOrderId(batchId);
    setPinError(null);
    try {
      await updateSellerOrderStatus(batchId, nextStatus, handoverPin);
      setPinPromptBatchId(null);
      setPinInputValue('');
      await loadDashboard();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'INVALID_HANDOVER_PIN') {
        setPinPromptBatchId(batchId);
        if (handoverPin) {
          setPinError(
            locale === 'uz'
              ? 'Mijoz PIN-kodi noto‘g‘ri. Mijozdan 4 xonali kodni so‘rang.'
              : 'Неверный PIN-код клиента.',
          );
        }
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prodTitleUz.trim().length < 3) return;
    setIsCreatingProduct(true);
    try {
      await createSellerProduct({
        bakeryId: selectedBakeryId,
        titleUz: prodTitleUz.trim(),
        titleRu: prodTitleRu.trim() || prodTitleUz.trim(),
        descriptionUz: prodDescUz.trim(),
        descriptionRu: prodDescUz.trim(),
        category: prodCategory,
        mediaKey: prodMediaKey,
        priceUzs: Number(prodPriceUzs) || 100000,
        weightGrams: Number(prodWeightGrams) || 600,
        prepHours: Number(prodPrepHours) || 2,
        dietaryTags: ['halal'],
        occasions: ['birthday'],
      });
      setProdTitleUz('');
      setProdTitleRu('');
      setProdDescUz('');
      setShowAddProduct(false);
      setProductCreatedNotice(true);
      window.setTimeout(() => setProductCreatedNotice(false), 3000);
      await loadDashboard();
      onCatalogChanged();
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleToggleProductPublish = async (productId: string, currentlyPublished: boolean) => {
    await updateSellerProduct(productId, { isPublished: !currentlyPublished });
    await loadDashboard();
    onCatalogChanged();
  };

  const handleSaveProductPrice = async (productId: string) => {
    const raw = Number(priceDrafts[productId]);
    if (!Number.isFinite(raw) || raw < 10000) return;
    await updateSellerProduct(productId, { priceUzs: raw });
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    await loadDashboard();
    onCatalogChanged();
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteSellerProduct(productId);
    await loadDashboard();
    onCatalogChanged();
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().length < 3 || !promoTitleUz.trim()) return;
    await createSellerPromotion({
      bakeryId: selectedBakeryId,
      code: promoCode.trim().toUpperCase(),
      titleUz: promoTitleUz.trim(),
      titleRu: promoTitleUz.trim(),
      discountPercent: Number(promoDiscount) || 10,
      minOrderUzs: Number(promoMinOrder) || 0,
    });
    setPromoCode('');
    setPromoTitleUz('');
    await loadDashboard();
  };

  const handleTogglePromo = async (promoId: string, isActive: boolean) => {
    await toggleSellerPromotion(promoId, !isActive);
    await loadDashboard();
  };

  const handleDeletePromo = async (promoId: string) => {
    await deleteSellerPromotion(promoId);
    await loadDashboard();
  };

  const handleReplyMessage = async (messageId: string) => {
    const replyText = (replyDrafts[messageId] || '').trim();
    if (replyText.length < 2) return;
    setReplyingId(messageId);
    try {
      await replyToCustomerMessage(messageId, replyText);
      setReplyDrafts((prev) => ({ ...prev, [messageId]: '' }));
      await loadDashboard();
    } finally {
      setReplyingId(null);
    }
  };

  const handleSaveBakerySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSellerBakerySettings(selectedBakeryId, {
      workingHours: workingHours.trim(),
      deliveryFeeUzs: Number(deliveryFeeUzs) || 0,
      freeDeliveryFromUzs: Number(freeDeliveryFromUzs) || 0,
      acceptsCustomOrders,
      bio: { uz: bioUz.trim(), ru: bioRu.trim() || bioUz.trim() },
    });
    setSettingsSavedNotice(true);
    window.setTimeout(() => setSettingsSavedNotice(false), 3000);
    await loadDashboard();
    onCatalogChanged();
  };

  const tabItems: { id: SellerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t.seller.tabs.overview, icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'orders', label: t.seller.tabs.orders, icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'products', label: t.seller.tabs.products, icon: <Package className="w-4 h-4" /> },
    { id: 'promotions', label: t.seller.tabs.promotions, icon: <Percent className="w-4 h-4" /> },
    { id: 'messages', label: t.seller.tabs.messages, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'settings', label: t.seller.tabs.settings, icon: <Settings className="w-4 h-4" /> },
  ];

  const metrics = dashboard?.metrics;

  if (authChecking) {
    return (
      <div className="mx-auto max-w-md py-16">
        <Card padding="lg">
          <div className="h-32 animate-pulse rounded-[12px] bg-[var(--sm-bg-subtle)]" />
        </Card>
      </div>
    );
  }

  if (!sellerAccount) {
    return (
      <div className="mx-auto max-w-md py-12 sm:py-20 space-y-5">
        <button
          type="button"
          onClick={onBackToProfile}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sm-accent-primary)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{locale === 'uz' ? 'Asosiy saytga qaytish' : 'Вернуться на витрину'}</span>
        </button>

        <Card padding="lg" className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--sm-accent-primary-soft)] text-[var(--sm-accent-primary)]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                {locale === 'uz' ? 'Sotuvchi kabinetiga kirish' : 'Вход в кабинет продавца'}
              </h1>
              <p className="text-xs text-[var(--sm-text-muted)] font-mono">/seller</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-[10px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-subtle)] p-3 text-xs text-[var(--sm-text-secondary)]">
            <ShieldCheck className="w-4 h-4 text-[var(--sm-accent-primary)] shrink-0 mt-0.5" />
            <span>
              {locale === 'uz'
                ? 'Ushbu bo‘lim faqat administrator tomonidan ro‘yxatdan o‘tkazilgan hamkor qandolatxonalar uchun yopiq portaldir. Ijtimoiy tarmoq orqali kirish administrator bergan hisob ma’lumotlari bilan tasdiqlanadi.'
                : 'Этот раздел доступен только партнёрам, зарегистрированным администратором. Вход через соцсеть подтверждается данными, выданными администратором.'}
            </span>
          </div>

          {authSession?.user && (
            <div className="rounded-[10px] border border-[var(--sm-accent-primary)]/25 bg-[var(--sm-accent-primary-soft)] p-3 text-xs leading-5 text-[var(--sm-text-secondary)]">
              {locale === 'uz'
                ? 'Ijtimoiy tarmoq hisobi ulandi. Sotuvchi kabinetini ochish uchun administrator bergan login va parolni tasdiqlang.'
                : 'Социальный аккаунт подключён. Подтвердите данные, выданные администратором, чтобы открыть кабинет продавца.'}
            </div>
          )}

          <form onSubmit={(e) => void handleSellerLogin(e)} className="space-y-4">
            <TextInput
              label={locale === 'uz' ? 'Login yoki telefon raqami' : 'Логин или телефон'}
              placeholder="zarafshon_manager"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              required
            />
            <TextInput
              label={locale === 'uz' ? 'Parol' : 'Пароль'}
              type="password"
              placeholder="••••••••"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
            />

            {loginError && (
              <p
                role="alert"
                className="rounded-[8px] border border-[var(--sm-status-danger)]/40 bg-[var(--sm-status-danger)]/10 px-3 py-2 text-xs font-medium text-[var(--sm-status-danger)]"
              >
                {loginError}
              </p>
            )}

            <Button type="submit" variant="primary" fullWidth isLoading={isLoggingIn}>
              {authSession?.user
                ? locale === 'uz' ? 'Sotuvchi hisobini tasdiqlash' : 'Подтвердить аккаунт продавца'
                : locale === 'uz' ? 'Kabinetga kirish' : 'Войти в кабинет'}
            </Button>
          </form>

          {!authSession?.user && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--sm-text-muted)]">
                <span className="h-px flex-1 bg-[var(--sm-border-subtle)]" />
                {locale === 'uz' ? 'yoki ijtimoiy tarmoq' : 'или соцсеть'}
                <span className="h-px flex-1 bg-[var(--sm-border-subtle)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" fullWidth isLoading={isLoggingIn} onClick={() => void handleSellerSocialLogin('google')}>Google</Button>
                <Button type="button" variant="secondary" fullWidth isLoading={isLoggingIn} onClick={() => void handleSellerSocialLogin('telegram')}>Telegram</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8 sm:py-12">
      {/* Restricted Seller Workspace Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBackToProfile}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sm-accent-primary)] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{locale === 'uz' ? 'Vitrinaga qaytish' : 'На витрину'}</span>
          </button>
          <SectionHeader
            as="h1"
            title={sellerAccount.bakeryName || t.seller.heading}
            subtitle={`${sellerAccount.fullName}${sellerAccount.roleLabel ? ` · ${sellerAccount.roleLabel}` : ''} · ${sellerAccount.login}`}
          />
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
            onClick={() => void handleSellerLogout()}
          >
            {locale === 'uz' ? 'Chiqish' : 'Выйти'}
          </Button>
        </div>
      </div>

      {/* 4-Column KPI Summary Strip (Single Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md" className="space-y-1">
          <p className="text-xs font-medium text-[var(--sm-text-muted)]">{t.seller.kpiRevenue}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-[var(--sm-text-primary)]">
            {formatUzsPrice(metrics?.totalRevenueUzs ?? 0)} {t.common.currencyUzs}
          </p>
        </Card>

        <Card padding="md" className="space-y-1">
          <p className="text-xs font-medium text-[var(--sm-text-muted)]">{t.seller.kpiActiveOrders}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-[var(--sm-accent-primary)]">
            {metrics?.activeOrdersCount ?? 0}
          </p>
        </Card>

        <Card padding="md" className="space-y-1">
          <p className="text-xs font-medium text-[var(--sm-text-muted)]">{t.seller.kpiNetPayout}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-[var(--sm-status-success)]">
            {formatUzsPrice(metrics?.netPayoutUzs ?? 0)} {t.common.currencyUzs}
          </p>
        </Card>

        <Card padding="md" className="space-y-1">
          <p className="text-xs font-medium text-[var(--sm-text-muted)]">{t.seller.kpiRating}</p>
          <p className="inline-flex items-center gap-1.5 font-mono text-2xl font-semibold tabular-nums text-[var(--sm-text-primary)]">
            <Star className="w-5 h-5 fill-current text-[var(--sm-accent-gold)]" aria-hidden="true" />
            <span>{(metrics?.averageRating ?? 4.9).toFixed(1)}</span>
            <span className="text-sm font-normal text-[var(--sm-text-muted)]">
              ({metrics?.reviewCount ?? 0})
            </span>
          </p>
        </Card>
      </div>

      {/* Seller Workspace Tabs */}
      <div
        role="tablist"
        aria-label={t.seller.heading}
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
      >
        {tabItems.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'inline-flex items-center gap-2 rounded-[12px] border px-4 py-2.5 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors',
                active
                  ? 'border-transparent bg-[var(--sm-accent-primary)] text-[var(--sm-text-inverse)]'
                  : 'border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] text-[var(--sm-text-secondary)] hover:text-[var(--sm-text-primary)]',
              ].join(' ')}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading && !dashboard ? (
        <Card padding="lg">
          <div className="h-32 animate-pulse rounded-[12px] bg-[var(--sm-bg-subtle)]" />
        </Card>
      ) : (
        <>
          {/* TAB 1: Overview & Financial Breakdown */}
          {activeTab === 'overview' && dashboard && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <Card padding="lg" className="lg:col-span-7 space-y-5">
                <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                  {t.seller.financeTitle}
                </h2>
                <dl className="divide-y divide-[var(--sm-border-subtle)] text-sm">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[var(--sm-text-secondary)]">{t.seller.financeGrossLabel}</dt>
                    <dd className="font-mono font-semibold tabular-nums text-[var(--sm-text-primary)]">
                      {formatUzsPrice(dashboard.metrics.totalRevenueUzs)} {t.common.currencyUzs}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[var(--sm-text-secondary)]">
                      {t.seller.financeCommissionLabel}
                    </dt>
                    <dd className="font-mono font-semibold tabular-nums text-[var(--sm-status-danger)]">
                      -{formatUzsPrice(dashboard.metrics.commissionUzs)} {t.common.currencyUzs}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[var(--sm-text-secondary)]">
                      {t.seller.financeDeliveredLabel}
                    </dt>
                    <dd className="font-mono font-semibold tabular-nums text-[var(--sm-text-primary)]">
                      {formatUzsPrice(dashboard.metrics.deliveredRevenueUzs)} {t.common.currencyUzs}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3 text-base">
                    <dt className="font-semibold text-[var(--sm-text-primary)]">
                      {t.seller.financeNetLabel}
                    </dt>
                    <dd className="font-mono font-bold tabular-nums text-[var(--sm-status-success)]">
                      {formatUzsPrice(dashboard.metrics.netPayoutUzs)} {t.common.currencyUzs}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card padding="lg" className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Store className="w-5 h-5 text-[var(--sm-accent-primary)]" aria-hidden="true" />
                  <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                    {dashboard.bakery.name}
                  </h2>
                </div>
                <p className="text-sm text-[var(--sm-text-secondary)]">
                  {dashboard.bakery.bio[locale]}
                </p>
                <Divider />
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[var(--sm-text-muted)]">{t.seller.workingHoursLabel}</p>
                    <p className="font-mono font-semibold tabular-nums text-[var(--sm-text-primary)] mt-0.5">
                      {dashboard.bakery.workingHours}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--sm-text-muted)]">{t.seller.tabs.products}</p>
                    <p className="font-mono font-semibold tabular-nums text-[var(--sm-text-primary)] mt-0.5">
                      {dashboard.metrics.activeProductsCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--sm-text-muted)]">{t.seller.deliveryFeeLabel}</p>
                    <p className="font-mono font-semibold tabular-nums text-[var(--sm-text-primary)] mt-0.5">
                      {formatUzsPrice(dashboard.bakery.deliveryFeeUzs)} {t.common.currencyUzs}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--sm-text-muted)]">{t.seller.freeDeliveryLabel}</p>
                    <p className="font-mono font-semibold tabular-nums text-[var(--sm-text-primary)] mt-0.5">
                      {formatUzsPrice(dashboard.bakery.freeDeliveryFromUzs)} {t.common.currencyUzs}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: Orders Management */}
          {activeTab === 'orders' && dashboard && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                  {t.seller.ordersHeading}
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sm-text-muted)]" />
                    <input
                      type="search"
                      placeholder={t.seller.orderSearchPlaceholder}
                      value={orderQuery}
                      onChange={(e) => setOrderQuery(e.target.value)}
                      className="h-10 rounded-[10px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-elevated)] pl-9 pr-3 text-xs text-[var(--sm-text-primary)] focus:outline-none focus:border-[var(--sm-accent-primary)] w-full sm:w-64"
                    />
                  </div>
                  <SelectInput
                    aria-label={t.profile.orderStatusLabel}
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    options={[
                      { value: 'all', label: t.profile.orderFilterAll },
                      { value: OrderStatus.CONFIRMED, label: t.profile.orderStatuses.confirmed },
                      { value: OrderStatus.PREPARING, label: t.profile.orderStatuses.preparing },
                      { value: OrderStatus.READY_FOR_DELIVERY, label: t.profile.orderStatuses.ready_for_delivery },
                      { value: OrderStatus.OUT_FOR_DELIVERY, label: t.profile.orderStatuses.out_for_delivery },
                      { value: OrderStatus.DELIVERED, label: t.profile.orderStatuses.delivered },
                      { value: OrderStatus.CANCELLED, label: t.profile.orderStatuses.cancelled },
                    ]}
                  />
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <Card padding="lg" tone="subtle">
                  <p className="text-sm text-[var(--sm-text-secondary)]">
                    {t.seller.emptyOrdersNote}
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const status = order.status ?? OrderStatus.CONFIRMED;
                    const subOrders = order.sellerOrders.filter(
                      (so) => so.bakeryId === selectedBakeryId,
                    );
                    const subTotal = subOrders.reduce((s, so) => s + so.totalUzs, 0);

                    return (
                      <Card key={order.batchId} padding="md" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono text-sm font-semibold tabular-nums text-[var(--sm-accent-primary)]">
                              #{order.batchId}
                            </span>
                            {order.trackingCode && (
                              <span className="rounded bg-[var(--sm-accent-primary-soft)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--sm-accent-primary)]">
                                Trek: {order.trackingCode}
                              </span>
                            )}
                            {order.handoverPin && (
                              <span className="rounded bg-[var(--sm-status-success)]/15 px-2 py-0.5 font-mono text-xs font-semibold text-[var(--sm-status-success)]">
                                PIN: {order.handoverPin}
                              </span>
                            )}
                            <span className="text-[var(--sm-text-muted)]">·</span>
                            <span className="font-semibold text-[var(--sm-text-primary)]">
                              {order.customerName}
                            </span>
                            <span className="text-[var(--sm-text-muted)]">·</span>
                            <span className="font-mono tabular-nums text-[var(--sm-text-secondary)]">
                              {order.customerPhone}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-[var(--sm-text-primary)]">
                            {t.profile.orderStatuses[status]}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-[var(--sm-text-secondary)]">
                          {subOrders.map((so) => (
                            <div key={so.orderNumber} className="space-y-0.5">
                              <p>
                                {so.items
                                  .map(
                                    (i) =>
                                      `${i.quantity}× ${i.title[locale]} (${i.variantLabel[locale]})${
                                        i.customNote ? ` — "${i.customNote}"` : ''
                                      }`,
                                  )
                                  .join('; ')}
                              </p>
                              <p className="text-[11px] text-[var(--sm-text-muted)]">
                                {so.deliveryMethod === DeliveryMethod.PICKUP
                                  ? t.cart.pickupOption
                                  : `${t.cart.courierOption} · ${order.address}`}
                              </p>
                              {order.courierNote && (
                                <p className="text-[11px] text-[var(--sm-accent-primary)]">
                                  Izoh: {order.courierNote}
                                </p>
                              )}
                              {order.coordinates && so.deliveryMethod === DeliveryMethod.COURIER && (
                                <a
                                  href={`https://yandex.uz/maps/?pt=${order.coordinates.lng},${order.coordinates.lat}&z=17&l=map`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--sm-accent-primary)] hover:underline"
                                >
                                  <span>
                                    {order.coordinates.lat.toFixed(4)}, {order.coordinates.lng.toFixed(4)} · Yandex Maps
                                  </span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>

                        {pinPromptBatchId === order.batchId && (
                          <div className="rounded-[10px] border border-[var(--sm-accent-primary)]/40 bg-[var(--sm-accent-primary-soft)] p-3 space-y-2">
                            <p className="text-xs font-semibold text-[var(--sm-text-primary)]">
                              {locale === 'uz'
                                ? 'Yetkazib berishni tasdiqlash uchun mijozdan 4 xonali PIN-kodni kiriting:'
                                : 'Введите 4-значный PIN-код клиента для подтверждения доставки:'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                maxLength={6}
                                value={pinInputValue}
                                onChange={(e) => setPinInputValue(e.target.value)}
                                placeholder="PIN (masalan: 4829)"
                                className="h-8 w-36 rounded-[6px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-elevated)] px-2.5 font-mono text-xs"
                              />
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={updatingOrderId === order.batchId}
                                onClick={() =>
                                  void handleAdvanceOrder(
                                    order.batchId,
                                    OrderStatus.DELIVERED,
                                    pinInputValue.trim(),
                                  )
                                }
                              >
                                {locale === 'uz' ? 'Tasdiqlash' : 'Подтвердить'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPinPromptBatchId(null);
                                  setPinInputValue('');
                                  setPinError(null);
                                }}
                              >
                                {locale === 'uz' ? 'Bekor' : 'Отмена'}
                              </Button>
                            </div>
                            {pinError && (
                              <p className="text-xs text-[var(--sm-status-danger)]">{pinError}</p>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sm-border-subtle)] pt-3">
                          <span className="font-mono text-sm font-semibold tabular-nums text-[var(--sm-text-primary)]">
                            {formatUzsPrice(subTotal)} {t.common.currencyUzs}
                          </span>

                          <div className="flex flex-wrap items-center gap-2">
                            {status === OrderStatus.CONFIRMED && (
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={updatingOrderId === order.batchId}
                                onClick={() =>
                                  void handleAdvanceOrder(order.batchId, OrderStatus.PREPARING)
                                }
                              >
                                {t.seller.advanceStatusLabels.startPreparing}
                              </Button>
                            )}
                            {status === OrderStatus.PREPARING && (
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={updatingOrderId === order.batchId}
                                onClick={() =>
                                  void handleAdvanceOrder(
                                    order.batchId,
                                    OrderStatus.READY_FOR_DELIVERY,
                                  )
                                }
                              >
                                {t.seller.advanceStatusLabels.markReady}
                              </Button>
                            )}
                            {status === OrderStatus.READY_FOR_DELIVERY && (
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={updatingOrderId === order.batchId}
                                onClick={() =>
                                  void handleAdvanceOrder(
                                    order.batchId,
                                    OrderStatus.OUT_FOR_DELIVERY,
                                  )
                                }
                              >
                                {t.seller.advanceStatusLabels.sendCourier}
                              </Button>
                            )}
                            {status === OrderStatus.OUT_FOR_DELIVERY && (
                              <Button
                                variant="secondary"
                                size="sm"
                                isLoading={updatingOrderId === order.batchId}
                                onClick={() =>
                                  void handleAdvanceOrder(order.batchId, OrderStatus.DELIVERED)
                                }
                              >
                                {t.seller.advanceStatusLabels.markDelivered}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Products Catalog Management */}
          {activeTab === 'products' && dashboard && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                  {t.seller.productsHeading}
                </h2>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowAddProduct((prev) => !prev)}
                >
                  {t.seller.addProductToggle}
                </Button>
              </div>

              {productCreatedNotice && (
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sm-status-success)]">
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>{t.seller.productCreatedNotice}</span>
                </p>
              )}

              {showAddProduct && (
                <Card padding="lg">
                  <form onSubmit={(e) => void handleCreateProduct(e)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <TextInput
                        label={t.seller.productTitleUzLabel}
                        value={prodTitleUz}
                        onChange={(e) => setProdTitleUz(e.target.value)}
                        required
                      />
                      <TextInput
                        label={t.seller.productTitleRuLabel}
                        value={prodTitleRu}
                        onChange={(e) => setProdTitleRu(e.target.value)}
                      />
                    </div>

                    <TextArea
                      label={t.seller.productDescUzLabel}
                      rows={2}
                      value={prodDescUz}
                      onChange={(e) => setProdDescUz(e.target.value)}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <SelectInput
                        label={t.seller.productCategoryLabel}
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value as ProductCategory)}
                        options={CATEGORIES.map((cat) => ({
                          value: cat,
                          label: t.categoriesMap[cat],
                        }))}
                      />
                      <SelectInput
                        label={t.seller.productMediaLabel}
                        value={prodMediaKey}
                        onChange={(e) => setProdMediaKey(e.target.value as ProductMediaKey)}
                        options={MEDIA_KEYS.map((key) => ({
                          value: key,
                          label: key.replace('_', ' '),
                        }))}
                      />
                      <TextInput
                        label={t.seller.productPriceLabel}
                        type="number"
                        value={prodPriceUzs}
                        onChange={(e) => setProdPriceUzs(e.target.value)}
                      />
                      <TextInput
                        label={t.seller.productWeightLabel}
                        type="number"
                        value={prodWeightGrams}
                        onChange={(e) => setProdWeightGrams(e.target.value)}
                      />
                      <TextInput
                        label={t.seller.productPrepHoursLabel}
                        type="number"
                        value={prodPrepHours}
                        onChange={(e) => setProdPrepHours(e.target.value)}
                      />
                    </div>

                    <Button type="submit" variant="primary" isLoading={isCreatingProduct}>
                      {t.seller.createProductButton}
                    </Button>
                  </form>
                </Card>
              )}

              <div className="space-y-3">
                {dashboard.products.map((product) => {
                  const published = product.isPublished !== false;
                  const draftValue = priceDrafts[product.id] ?? String(product.priceUzs);
                  const hasPriceEdit =
                    priceDrafts[product.id] !== undefined &&
                    Number(priceDrafts[product.id]) !== product.priceUzs;

                  return (
                    <Card
                      key={product.id}
                      padding="md"
                      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={PRODUCT_MEDIA_MAP[product.mediaKey]}
                          alt={product.title[locale]}
                          className="h-16 w-20 rounded-[10px] object-cover shrink-0"
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-[var(--sm-text-primary)] truncate">
                            {product.title[locale]}
                          </p>
                          <p className="text-xs text-[var(--sm-text-muted)]">
                            {t.categoriesMap[product.category]} · {product.weightGrams}{' '}
                            {t.productCard.weightUnit} ·{' '}
                            <span
                              className={
                                published
                                  ? 'font-semibold text-[var(--sm-status-success)]'
                                  : 'font-semibold text-[var(--sm-status-warning)]'
                              }
                            >
                              {published
                                ? t.seller.productStatusPublished
                                : t.seller.productStatusPaused}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <input
                          type="number"
                          aria-label={t.seller.productPriceLabel}
                          value={draftValue}
                          onChange={(e) =>
                            setPriceDrafts((prev) => ({ ...prev, [product.id]: e.target.value }))
                          }
                          className="h-9 w-28 rounded-[8px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-elevated)] px-2.5 font-mono text-xs tabular-nums text-[var(--sm-text-primary)]"
                        />
                        {hasPriceEdit && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => void handleSaveProductPrice(product.id)}
                          >
                            {t.seller.updatePriceAction}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleToggleProductPublish(product.id, published)}
                        >
                          {t.seller.togglePublishAction}
                        </Button>
                        {product.isSellerCreated && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => void handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Promotions & Discounts */}
          {activeTab === 'promotions' && dashboard && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Card padding="lg">
                  <form onSubmit={(e) => void handleCreatePromo(e)} className="space-y-4">
                    <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                      {t.seller.promotionsHeading}
                    </h2>
                    <TextInput
                      label={t.seller.promoCodeLabel}
                      placeholder="SAMARQAND15"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      required
                    />
                    <TextInput
                      label={t.seller.promoTitleUzLabel}
                      value={promoTitleUz}
                      onChange={(e) => setPromoTitleUz(e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <TextInput
                        label={t.seller.promoDiscountLabel}
                        type="number"
                        value={promoDiscount}
                        onChange={(e) => setPromoDiscount(e.target.value)}
                      />
                      <TextInput
                        label={t.seller.promoMinOrderLabel}
                        type="number"
                        value={promoMinOrder}
                        onChange={(e) => setPromoMinOrder(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="primary" fullWidth>
                      {t.seller.createPromoButton}
                    </Button>
                  </form>
                </Card>
              </div>

              <div className="lg:col-span-7 space-y-3">
                {dashboard.promotions.length === 0 ? (
                  <Card padding="lg" tone="subtle">
                    <p className="text-sm text-[var(--sm-text-secondary)]">
                      {t.seller.emptyPromosNote}
                    </p>
                  </Card>
                ) : (
                  dashboard.promotions.map((promo) => (
                    <Card
                      key={promo.id}
                      padding="md"
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[var(--sm-accent-primary)]">
                            {promo.code}
                          </span>
                          <span className="text-xs text-[var(--sm-text-muted)]">·</span>
                          <span className="font-mono text-xs font-semibold tabular-nums">
                            -{promo.discountPercent}%
                          </span>
                          <span className="text-xs text-[var(--sm-text-muted)]">·</span>
                          <span
                            className={
                              promo.isActive
                                ? 'text-xs font-semibold text-[var(--sm-status-success)]'
                                : 'text-xs text-[var(--sm-text-muted)]'
                            }
                          >
                            {promo.isActive ? t.seller.promoActiveLabel : t.seller.promoPausedLabel}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--sm-text-primary)]">{promo.title[locale]}</p>
                        <p className="text-xs text-[var(--sm-text-muted)] tabular-nums">
                          Min: {formatUzsPrice(promo.minOrderUzs)} {t.common.currencyUzs}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleTogglePromo(promo.id, promo.isActive)}
                        >
                          {t.seller.togglePublishAction}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => void handleDeletePromo(promo.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Customer Messages & Bakery Reviews */}
          {activeTab === 'messages' && dashboard && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7 space-y-4">
                <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                  {t.seller.messagesHeading}
                </h2>
                {dashboard.messages.length === 0 ? (
                  <Card padding="lg" tone="subtle">
                    <p className="text-sm text-[var(--sm-text-secondary)]">
                      {t.seller.emptyMessagesNote}
                    </p>
                  </Card>
                ) : (
                  dashboard.messages.map((msg) => (
                    <Card key={msg.id} padding="md" className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[var(--sm-text-primary)]">
                          {msg.customerName} ·{' '}
                          <span className="font-mono tabular-nums text-[var(--sm-text-secondary)]">
                            {msg.customerPhone}
                          </span>
                        </span>
                        <span className="text-[var(--sm-text-muted)] tabular-nums">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm text-[var(--sm-text-primary)]">{msg.message}</p>

                      {msg.reply ? (
                        <div className="border-t border-[var(--sm-border-subtle)] pt-2.5 text-xs text-[var(--sm-text-secondary)]">
                          <span className="font-semibold text-[var(--sm-accent-primary)]">
                            {t.profile.bakeryReplyLabel}:{' '}
                          </span>
                          <span>{msg.reply}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder={t.seller.replyPlaceholder}
                            value={replyDrafts[msg.id] ?? ''}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({ ...prev, [msg.id]: e.target.value }))
                            }
                            className="h-9 flex-1 rounded-[8px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-elevated)] px-3 text-xs text-[var(--sm-text-primary)] focus:outline-none focus:border-[var(--sm-accent-primary)]"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={replyingId === msg.id}
                            leftIcon={<Send className="w-3.5 h-3.5" />}
                            onClick={() => void handleReplyMessage(msg.id)}
                          >
                            {t.seller.sendReplyButton}
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>

              <div className="lg:col-span-5 space-y-4">
                <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                  {t.seller.reviewsHeading}
                </h2>
                <Card padding="md" className="divide-y divide-[var(--sm-border-subtle)]">
                  {dashboard.reviews.length === 0 ? (
                    <p className="text-sm text-[var(--sm-text-secondary)] py-2">
                      {t.artisans.noReviewsYet}
                    </p>
                  ) : (
                    dashboard.reviews.map((rev) => (
                      <div key={rev.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--sm-text-primary)]">
                            {rev.authorName}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums">
                            <Star
                              className="w-3.5 h-3.5 fill-current text-[var(--sm-accent-gold)]"
                              aria-hidden="true"
                            />
                            {rev.rating}.0
                          </span>
                        </div>
                        <p className="text-xs text-[var(--sm-text-secondary)]">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* TAB 6: Bakery Settings */}
          {activeTab === 'settings' && dashboard && (
            <Card padding="lg" className="max-w-3xl">
              <form onSubmit={(e) => void handleSaveBakerySettings(e)} className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                  {t.seller.settingsHeading}
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <TextInput
                    label={t.seller.workingHoursLabel}
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                  />
                  <TextInput
                    label={t.seller.deliveryFeeLabel}
                    type="number"
                    value={deliveryFeeUzs}
                    onChange={(e) => setDeliveryFeeUzs(e.target.value)}
                  />
                  <TextInput
                    label={t.seller.freeDeliveryLabel}
                    type="number"
                    value={freeDeliveryFromUzs}
                    onChange={(e) => setFreeDeliveryFromUzs(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2.5 text-sm text-[var(--sm-text-primary)] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={acceptsCustomOrders}
                    onChange={(e) => setAcceptsCustomOrders(e.target.checked)}
                    className="h-4 w-4 accent-[var(--sm-accent-primary)]"
                  />
                  <span>{t.seller.acceptsCustomLabel}</span>
                </label>

                <TextArea
                  label={t.seller.bioUzLabel}
                  rows={2}
                  value={bioUz}
                  onChange={(e) => setBioUz(e.target.value)}
                />
                <TextArea
                  label={t.seller.bioRuLabel}
                  rows={2}
                  value={bioRu}
                  onChange={(e) => setBioRu(e.target.value)}
                />

                {settingsSavedNotice && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sm-status-success)]">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.seller.settingsSavedNotice}</span>
                  </p>
                )}

                <Button type="submit" variant="primary">
                  {t.seller.saveSettingsButton}
                </Button>
              </form>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
