import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Package,
  Percent,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Star,
  Store,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { PRODUCT_MEDIA_MAP } from '../assets/productMedia';
import { formatUzsPrice } from '../components/catalog/ProductCard';
import {
  Button,
  Card,
  Divider,
  SelectInput,
  TextArea,
  TextInput,
} from '../design-system/ui';
import { useTranslation } from '../hooks/useTranslation';
import {
  AdminOverviewResponse,
  createAdminBakery,
  createAdminPromotion,
  createAdminSellerAccount,
  deleteAdminProduct,
  deleteAdminPromotion,
  deleteAdminReview,
  deleteAdminSellerAccount,
  fetchAdminOverview,
  fetchSellerApplications,
  fetchSellerTestPaymentAmount,
  reviewSellerApplication,
  saveSellerTestPaymentAmount,
  replyToCustomerMessage,
  toggleAdminPromotion,
  updateAdminBakery,
  updateAdminOrderStatus,
  updateAdminPlatformSettings,
  updateAdminProduct,
  updateAdminSellerAccount,
} from '../services/api/client';
import { OrderStatus, ProductMediaKey } from '../types';

export interface AdminDashboardPageProps {
  onBackToStorefront: () => void;
  onOpenSellerPortal: () => void;
  onPlatformDataChanged: () => void;
}

type AdminTab =
  | 'overview'
  | 'sellers'
  | 'bakeries'
  | 'orders'
  | 'products'
  | 'promotions'
  | 'support'
  | 'settings';

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

const DISTRICT_OPTIONS = [
  { value: 'registon', uz: 'Registon markazi', ru: 'Центр / Регистан' },
  { value: 'universitet', uz: 'Universitet xiyoboni', ru: 'Университетский бульвар' },
  { value: 'siyob', uz: 'Siyob bozori', ru: 'Сиабский базар' },
  { value: 'sartepa', uz: 'Sartepa massivi', ru: 'Сартепа' },
  { value: 'sogdiana', uz: 'So‘g‘diyona', ru: 'Согдиана' },
];

export function AdminDashboardPage({
  onBackToStorefront,
  onOpenSellerPortal,
  onPlatformDataChanged,
}: AdminDashboardPageProps) {
  const { locale, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Seller Accounts state
  const [sellerFullName, setSellerFullName] = useState('');
  const [sellerLogin, setSellerLogin] = useState('');
  const [sellerPhone, setSellerPhone] = useState('+998 ');
  const [sellerPassword, setSellerPassword] = useState('');
  const [sellerBakeryId, setSellerBakeryId] = useState('bakery-zarafshon');
  const [sellerRoleLabel, setSellerRoleLabel] = useState('Direktor');
  const [isCreatingSeller, setIsCreatingSeller] = useState(false);
  const [sellerApplications, setSellerApplications] = useState<Awaited<ReturnType<typeof fetchSellerApplications>>>([]);
  const [isReviewingApplication, setIsReviewingApplication] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bakeries state
  const [showCreateBakery, setShowCreateBakery] = useState(false);
  const [bakeryName, setBakeryName] = useState('');
  const [bakeryType, setBakeryType] = useState<'confectioner' | 'home_baker' | 'bakery' | 'restaurant' | 'cafe' | 'grocery' | 'home_kitchen' | 'other'>('bakery');
  const [bakeryDistrict, setBakeryDistrict] = useState('registon');
  const [bakeryAddress, setBakeryAddress] = useState('');
  const [bakeryHours, setBakeryHours] = useState('09:00 – 21:00');
  const [bakeryDeliveryFee, setBakeryDeliveryFee] = useState('15000');
  const [bakeryFreeFrom, setBakeryFreeFrom] = useState('250000');
  const [bakeryMediaKey, setBakeryMediaKey] = useState<ProductMediaKey>('hero_pastry');
  const [bakeryBioUz, setBakeryBioUz] = useState('');
  const [isCreatingBakery, setIsCreatingBakery] = useState(false);

  // Orders filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Products filter & inline price draft
  const [productSearch, setProductSearch] = useState('');
  const [productBakeryFilter, setProductBakeryFilter] = useState('all');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  // Promotions state
  const [promoBakeryId, setPromoBakeryId] = useState('bakery-zarafshon');
  const [promoCode, setPromoCode] = useState('');
  const [promoTitleUz, setPromoTitleUz] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('15');
  const [promoMinOrder, setPromoMinOrder] = useState('150000');

  // Support reply drafts
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Platform settings draft
  const [commissionPercent, setCommissionPercent] = useState('10');
  const [defaultDeliveryFeeUzs, setDefaultDeliveryFeeUzs] = useState('15000');
  const [freeDeliveryThresholdUzs, setFreeDeliveryThresholdUzs] = useState('250000');
  const [requireDeliveryPin, setRequireDeliveryPin] = useState(false);
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementUz, setAnnouncementUz] = useState('');
  const [announcementRu, setAnnouncementRu] = useState('');
  const [testPaymentAmountUzs, setTestPaymentAmountUzs] = useState('1000');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [res, testAmount] = await Promise.all([fetchAdminOverview(), fetchSellerTestPaymentAmount()]);
      setData(res);
      setTestPaymentAmountUzs(String(testAmount));
      setCommissionPercent(String(res.settings.commissionPercent));
      setDefaultDeliveryFeeUzs(String(res.settings.defaultDeliveryFeeUzs));
      setFreeDeliveryThresholdUzs(String(res.settings.freeDeliveryThresholdUzs));
      setRequireDeliveryPin(res.settings.requireDeliveryPin);
      setAnnouncementEnabled(res.settings.announcementEnabled);
      setAnnouncementUz(res.settings.announcementUz);
      setAnnouncementRu(res.settings.announcementRu);
      if (res.bakeries.length > 0 && !res.bakeries.some((b) => b.id === sellerBakeryId)) {
        setSellerBakeryId(res.bakeries[0].id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Admin ma’lumotlarini yuklab bo‘lmadi');
    } finally {
      setIsLoading(false);
    }
  }, [sellerBakeryId]);

  const loadSellerApplications = useCallback(async () => {
    try {
      setSellerApplications(await fetchSellerApplications());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Arizalarni yuklab bo‘lmadi');
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (activeTab === 'sellers') void loadSellerApplications();
  }, [activeTab, loadSellerApplications]);

  const handleReviewApplication = async (id: string, status: 'approved' | 'rejected') => {
    setIsReviewingApplication(id);
    setErrorMsg(null);
    try {
      await reviewSellerApplication(id, status);
      await loadSellerApplications();
      notify(locale === 'uz' ? (status === 'approved' ? 'Sotuvchi arizasi tasdiqlandi.' : 'Sotuvchi arizasi rad etildi.') : (status === 'approved' ? 'Заявка продавца одобрена.' : 'Заявка продавца отклонена.'));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Arizani ko‘rib chiqib bo‘lmadi');
    } finally {
      setIsReviewingApplication(null);
    }
  };

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsCreatingSeller(true);
    try {
      await createAdminSellerAccount({
        fullName: sellerFullName.trim(),
        login: sellerLogin.trim(),
        phone: sellerPhone.trim(),
        password: sellerPassword.trim(),
        bakeryId: sellerBakeryId,
        roleLabel: sellerRoleLabel.trim() || 'Sotuvchi',
      });
      setSellerFullName('');
      setSellerLogin('');
      setSellerPhone('+998 ');
      setSellerPassword('');
      await loadOverview();
      notify(
        locale === 'uz'
          ? 'Yangi sotuvchi akkounti yaratildi (/seller orqali kirishi mumkin).'
          : 'Новый аккаунт продавца создан (вход через /seller).',
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sotuvchi yaratishda xatolik');
    } finally {
      setIsCreatingSeller(false);
    }
  };

  const handleToggleSellerActive = async (id: string, currentActive: boolean) => {
    await updateAdminSellerAccount(id, { isActive: !currentActive });
    await loadOverview();
    notify(locale === 'uz' ? 'Sotuvchi holati yangilandi.' : 'Статус продавца обновлён.');
  };

  const handleChangeSellerBakery = async (id: string, bakeryId: string) => {
    await updateAdminSellerAccount(id, { bakeryId });
    await loadOverview();
    notify(locale === 'uz' ? 'Qandolatxona biriktiruvi yangilandi.' : 'Кондитерская переназначена.');
  };

  const handleDeleteSeller = async (id: string) => {
    await deleteAdminSellerAccount(id);
    await loadOverview();
    notify(locale === 'uz' ? 'Sotuvchi akkounti o‘chirildi.' : 'Аккаунт продавца удалён.');
  };

  const handleCopyCredentials = (id: string, login: string, password?: string) => {
    const text = `URL: ${window.location.origin}/seller\nLogin: ${login}\nParol: ${password ?? '***'}`;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCreateBakery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bakeryName.trim() || !bakeryAddress.trim()) return;
    setIsCreatingBakery(true);
    try {
      await createAdminBakery({
        name: bakeryName.trim(),
        sellerType: bakeryType,
        districtId: bakeryDistrict,
        address: bakeryAddress.trim(),
        workingHours: bakeryHours.trim() || '09:00 – 21:00',
        deliveryFeeUzs: Number(bakeryDeliveryFee) || 15000,
        freeDeliveryFromUzs: Number(bakeryFreeFrom) || 250000,
        acceptsCustomOrders: true,
        isVerified: true,
        bioUz: bakeryBioUz.trim(),
        bioRu: bakeryBioUz.trim(),
        coverMediaKey: bakeryMediaKey,
      });
      setBakeryName('');
      setBakeryAddress('');
      setBakeryBioUz('');
      setShowCreateBakery(false);
      await loadOverview();
      onPlatformDataChanged();
      notify(locale === 'uz' ? 'Yangi qandolatxona qo‘shildi.' : 'Новая кондитерская добавлена.');
    } finally {
      setIsCreatingBakery(false);
    }
  };

  const handleToggleBakeryVerify = async (bakeryId: string, current: boolean) => {
    await updateAdminBakery(bakeryId, { isVerified: !current });
    await loadOverview();
    onPlatformDataChanged();
  };

  const handleToggleBakerySuspend = async (bakeryId: string, currentSuspended: boolean) => {
    await updateAdminBakery(bakeryId, { isSuspended: !currentSuspended });
    await loadOverview();
    onPlatformDataChanged();
  };

  const handleUpdateOrderStatus = async (batchId: string, status: OrderStatus) => {
    await updateAdminOrderStatus(batchId, status);
    await loadOverview();
    notify(locale === 'uz' ? `#${batchId} holati yangilandi.` : `Статус #${batchId} обновлён.`);
  };

  const handleSaveProductPrice = async (productId: string) => {
    const raw = Number(priceDrafts[productId]);
    if (!Number.isFinite(raw) || raw < 10000) return;
    await updateAdminProduct(productId, { priceUzs: raw });
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    await loadOverview();
    onPlatformDataChanged();
    notify(locale === 'uz' ? 'Mahsulot narxi saqlandi.' : 'Цена товара обновлена.');
  };

  const handleToggleProductPublish = async (productId: string, currentlyPublished: boolean) => {
    await updateAdminProduct(productId, { isPublished: !currentlyPublished });
    await loadOverview();
    onPlatformDataChanged();
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteAdminProduct(productId);
    await loadOverview();
    onPlatformDataChanged();
    notify(locale === 'uz' ? 'Mahsulot olib tashlandi.' : 'Товар скрыт / удалён.');
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim() || !promoTitleUz.trim()) return;
    await createAdminPromotion({
      bakeryId: promoBakeryId,
      code: promoCode.trim().toUpperCase(),
      titleUz: promoTitleUz.trim(),
      titleRu: promoTitleUz.trim(),
      discountPercent: Number(promoDiscount) || 10,
      minOrderUzs: Number(promoMinOrder) || 0,
    });
    setPromoCode('');
    setPromoTitleUz('');
    await loadOverview();
    notify(locale === 'uz' ? 'Promokod yaratildi.' : 'Промокод создан.');
  };

  const handleReplyMessage = async (msgId: string) => {
    const reply = (replyDrafts[msgId] || '').trim();
    if (reply.length < 2) return;
    await replyToCustomerMessage(msgId, reply);
    setReplyDrafts((prev) => ({ ...prev, [msgId]: '' }));
    await loadOverview();
    notify(locale === 'uz' ? 'Javob yuborildi.' : 'Ответ отправлен.');
  };

  const handleSaveTestPaymentAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setErrorMsg(null);
    try {
      const savedAmount = await saveSellerTestPaymentAmount(Number(testPaymentAmountUzs));
      setTestPaymentAmountUzs(String(savedAmount));
      notify(locale === 'uz' ? 'Test to‘lovi summasi saqlandi.' : 'Сумма тестового платежа сохранена.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Test to‘lov summasini saqlab bo‘lmadi');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateAdminPlatformSettings({
        commissionPercent: Number(commissionPercent) || 10,
        defaultDeliveryFeeUzs: Number(defaultDeliveryFeeUzs) || 15000,
        freeDeliveryThresholdUzs: Number(freeDeliveryThresholdUzs) || 250000,
        requireDeliveryPin,
        announcementEnabled,
        announcementUz: announcementUz.trim(),
        announcementRu: announcementRu.trim() || announcementUz.trim(),
      });
      await loadOverview();
      onPlatformDataChanged();
      notify(locale === 'uz' ? 'Platforma sozlamalari saqlandi.' : 'Настройки платформы сохранены.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const list = data?.orders ?? [];
    return list.filter((o) => {
      const status = o.status ?? OrderStatus.CONFIRMED;
      if (orderStatusFilter !== 'all' && status !== orderStatusFilter) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.trim().toLowerCase();
        const hay = `${o.batchId} ${o.trackingCode ?? ''} ${o.customerName} ${o.customerPhone} ${o.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data?.orders, orderSearch, orderStatusFilter]);

  const filteredProducts = useMemo(() => {
    const list = data?.products ?? [];
    return list.filter((p) => {
      if (productBakeryFilter !== 'all' && p.bakeryId !== productBakeryFilter) return false;
      if (productSearch.trim()) {
        const q = productSearch.trim().toLowerCase();
        const hay = `${p.title.uz} ${p.title.ru} ${p.bakeryName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data?.products, productSearch, productBakeryFilter]);

  const bakeryPerformance = useMemo(() => {
    if (!data) return [];
    return data.bakeries.map((bakery) => {
      const ordersForBakery = data.orders.filter(
        (o) => o.status !== OrderStatus.CANCELLED && o.sellerOrders.some((so) => so.bakeryId === bakery.id),
      );
      const revenue = ordersForBakery.reduce((sum, o) => {
        const sub = o.sellerOrders
          .filter((so) => so.bakeryId === bakery.id)
          .reduce((s, so) => s + so.totalUzs, 0);
        return sum + sub;
      }, 0);
      const sellerCount = data.sellerAccounts.filter((sa) => sa.bakeryId === bakery.id && sa.isActive).length;
      const productCount = data.products.filter((p) => p.bakeryId === bakery.id && p.isPublished !== false).length;
      return {
        bakery,
        ordersCount: ordersForBakery.length,
        revenue,
        sellerCount,
        productCount,
      };
    });
  }, [data]);

  const navItems: { id: AdminTab; labelUz: string; labelRu: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', labelUz: 'Umumiy ko‘rsatkich', labelRu: 'Обзор', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'sellers',
      labelUz: 'Sotuvchilar kirishi',
      labelRu: 'Доступ продавцов',
      icon: <KeyRound className="w-4 h-4" />,
      badge: data?.metrics.sellerAccountsCount,
    },
    {
      id: 'bakeries',
      labelUz: 'Qandolatxonalar',
      labelRu: 'Кондитерские',
      icon: <Store className="w-4 h-4" />,
      badge: data?.metrics.bakeriesCount,
    },
    {
      id: 'orders',
      labelUz: 'Buyurtmalar & Kuryer',
      labelRu: 'Заказы и курьеры',
      icon: <ReceiptText className="w-4 h-4" />,
      badge: data?.metrics.activeOrdersCount,
    },
    {
      id: 'products',
      labelUz: 'Katalog moderatsiyasi',
      labelRu: 'Модерация каталога',
      icon: <Package className="w-4 h-4" />,
      badge: data?.metrics.productsCount,
    },
    {
      id: 'promotions',
      labelUz: 'Aksiyalar & Kontent',
      labelRu: 'Акции и контент',
      icon: <Percent className="w-4 h-4" />,
    },
    {
      id: 'support',
      labelUz: 'Xabarlar & Sharhlar',
      labelRu: 'Сообщения и отзывы',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: data?.metrics.unansweredMessagesCount,
    },
    { id: 'settings', labelUz: 'Tizim sozlamalari', labelRu: 'Настройки', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--sm-bg-canvas)] text-[var(--sm-text-primary)]">
      {/* Top SaaS Admin Bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] shadow-sm sm-lens">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--sm-accent-primary)] text-[var(--sm-text-inverse)] font-display font-bold text-lg">
              A
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold leading-tight text-[var(--sm-text-primary)]">
                {locale === 'uz' ? 'SweetMarket Admin Panel' : 'Админ-панель SweetMarket'}
              </h1>
              <p className="text-[11px] text-[var(--sm-text-muted)] font-mono">
                /admin · {locale === 'uz' ? 'Samarqand shahri boshqaruv markazi' : 'Центр управления г. Самарканд'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => void loadOverview()}
              isLoading={isLoading}
            >
              {locale === 'uz' ? 'Yangilash' : 'Обновить'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Store className="w-3.5 h-3.5" />}
              onClick={onOpenSellerPortal}
            >
              /seller
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={onBackToStorefront}
            >
              {locale === 'uz' ? 'Saytga qaytish' : 'На витрину'}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
        {toastMsg && (
          <div className="mb-5 flex items-center gap-2 rounded-[10px] border border-[var(--sm-status-success)]/35 bg-[var(--sm-status-success)]/10 px-4 py-2.5 text-xs font-medium text-[var(--sm-status-success)]">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-5 flex items-center gap-2 rounded-[10px] border border-[var(--sm-status-danger)]/40 bg-[var(--sm-status-danger)]/10 px-4 py-2.5 text-xs font-medium text-[var(--sm-status-danger)]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Navigation Rail */}
          <aside className="lg:col-span-3">
            <Card padding="sm" className="space-y-1 lg:sticky lg:top-24">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={[
                      'w-full flex items-center justify-between gap-2 rounded-[10px] px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left',
                      active
                        ? 'bg-[var(--sm-accent-primary)] text-[var(--sm-text-inverse)]'
                        : 'text-[var(--sm-text-secondary)] hover:bg-[var(--sm-bg-subtle)] hover:text-[var(--sm-text-primary)]',
                    ].join(' ')}
                  >
                    <span className="inline-flex items-center gap-2.5 min-w-0">
                      <span aria-hidden="true">{item.icon}</span>
                      <span className="truncate">{locale === 'uz' ? item.labelUz : item.labelRu}</span>
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={[
                          'font-mono text-[11px] tabular-nums',
                          active ? 'text-[var(--sm-text-inverse)]/90' : 'text-[var(--sm-text-muted)]',
                        ].join(' ')}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </Card>
          </aside>

          {/* Main Admin Workspace */}
          <main className="lg:col-span-9 flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] px-5 py-5 shadow-sm sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--sm-accent-primary)]">SWEETMARKET · ADMIN</p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--sm-text-primary)] sm:text-3xl">
                  {activeTab === 'overview' ? (locale === 'uz' ? 'Boshqaruv markazi' : 'Центр управления') : (locale === 'uz' ? navItems.find((item) => item.id === activeTab)?.labelUz : navItems.find((item) => item.id === activeTab)?.labelRu)}
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--sm-text-secondary)]">
                  {locale === 'uz' ? 'Samarqand marketplace faoliyati, sotuvchi arizalari va platforma sozlamalarini boshqaring.' : 'Управляйте работой маркетплейса Самарканда, заявками продавцов и настройками платформы.'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-canvas)] px-3 py-2 text-xs font-medium text-[var(--sm-text-secondary)]">
                <span className="size-2 rounded-full bg-[var(--sm-status-success)]" aria-hidden="true" />
                {locale === 'uz' ? 'Himoyalangan admin sessiyasi' : 'Защищённая сессия администратора'}
              </div>
            </div>
            {data?.dataSourceNotice && (
              <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {locale === 'uz' ? 'Eslatma: ushbu ishlab turgan muhitda sotuvchi arizalari ko‘rinadi. Buyurtmalar, katalog va boshqa CRM ma’lumotlari mavjud backendda lokal fayllarga yoziladi va production uchun hali ko‘chirilmagan.' : 'Важно: в production сейчас доступны заявки продавцов. Заказы, каталог и остальные CRM-данные пока используют локальное файловое хранилище и ещё не перенесены.'}
              </div>
            )}
            {isLoading && !data ? (
              <Card padding="lg">
                <div className="h-44 animate-pulse rounded-[12px] bg-[var(--sm-bg-subtle)]" />
              </Card>
            ) : data ? (
              <>
                {/* 1. OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Card padding="md" className="space-y-1">
                        <p className="text-xs text-[var(--sm-text-muted)]">
                          {locale === 'uz' ? 'Umumiy aylanma (GMV)' : 'Общий оборот (GMV)'}
                        </p>
                        <p className="font-mono text-xl font-bold tabular-nums text-[var(--sm-text-primary)]">
                          {formatUzsPrice(data.metrics.totalGmvUzs)} {t.common.currencyUzs}
                        </p>
                      </Card>
                      <Card padding="md" className="space-y-1">
                        <p className="text-xs text-[var(--sm-text-muted)]">
                          {locale === 'uz' ? `Platforma komissiyasi (${data.settings.commissionPercent}%)` : `Комиссия (${data.settings.commissionPercent}%)`}
                        </p>
                        <p className="font-mono text-xl font-bold tabular-nums text-[var(--sm-status-success)]">
                          {formatUzsPrice(data.metrics.totalCommissionUzs)} {t.common.currencyUzs}
                        </p>
                      </Card>
                      <Card padding="md" className="space-y-1">
                        <p className="text-xs text-[var(--sm-text-muted)]">
                          {locale === 'uz' ? 'Jami buyurtmalar / Faol' : 'Всего заказов / Активные'}
                        </p>
                        <p className="font-mono text-xl font-bold tabular-nums text-[var(--sm-accent-primary)]">
                          {data.metrics.totalOrdersCount} / {data.metrics.activeOrdersCount}
                        </p>
                      </Card>
                      <Card padding="md" className="space-y-1">
                        <p className="text-xs text-[var(--sm-text-muted)]">
                          {locale === 'uz' ? 'Sotuvchi kirish hisoblari' : 'Аккаунты продавцов'}
                        </p>
                        <p className="font-mono text-xl font-bold tabular-nums text-[var(--sm-text-primary)]">
                          {data.metrics.activeSellerAccountsCount} / {data.metrics.sellerAccountsCount}
                        </p>
                      </Card>
                    </div>

                    <Card padding="lg" className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                          {locale === 'uz' ? 'Qandolatxonalar reytingi va savdosi' : 'Показатели кондитерских'}
                        </h2>
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('sellers')}>
                          {locale === 'uz' ? 'Sotuvchi qo‘shish' : 'Добавить продавца'}
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[var(--sm-border-subtle)] text-[var(--sm-text-muted)]">
                              <th className="py-2.5 pr-4 font-semibold">{locale === 'uz' ? 'Qandolatxona' : 'Кондитерская'}</th>
                              <th className="py-2.5 pr-4 font-semibold">{locale === 'uz' ? 'Hudud' : 'Район'}</th>
                              <th className="py-2.5 pr-4 font-semibold">{locale === 'uz' ? 'Mahsulot' : 'Товары'}</th>
                              <th className="py-2.5 pr-4 font-semibold">{locale === 'uz' ? 'Sotuvchilar' : 'Продавцы'}</th>
                              <th className="py-2.5 pr-4 font-semibold">{locale === 'uz' ? 'Buyurtma' : 'Заказы'}</th>
                              <th className="py-2.5 font-semibold text-right">{locale === 'uz' ? 'Tushum' : 'Выручка'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--sm-border-subtle)]">
                            {bakeryPerformance.map((row) => (
                              <tr key={row.bakery.id}>
                                <td className="py-3 pr-4 font-semibold text-[var(--sm-text-primary)]">
                                  {row.bakery.name}
                                </td>
                                <td className="py-3 pr-4 text-[var(--sm-text-secondary)]">
                                  {row.bakery.district[locale]}
                                </td>
                                <td className="py-3 pr-4 font-mono tabular-nums">{row.productCount}</td>
                                <td className="py-3 pr-4 font-mono tabular-nums">{row.sellerCount}</td>
                                <td className="py-3 pr-4 font-mono tabular-nums">{row.ordersCount}</td>
                                <td className="py-3 font-mono font-semibold tabular-nums text-right">
                                  {formatUzsPrice(row.revenue)} {t.common.currencyUzs}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}

                {/* 2. SELLER ACCOUNTS & RESTRICTED ACCESS */}
                {activeTab === 'sellers' && (
                  <div className="space-y-6">
                    <Card padding="lg" className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">{locale === 'uz' ? 'Sotuvchi arizalari' : 'Заявки продавцов'}</h2>
                          <p className="mt-1 text-xs text-[var(--sm-text-muted)]">{locale === 'uz' ? 'Google yoki email orqali ro‘yxatdan o‘tgan hamkorlarni shu yerda ko‘rib chiqasiz.' : 'Проверяйте заявки партнёров, зарегистрированных через Google или email.'}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => void loadSellerApplications()}>{locale === 'uz' ? 'Arizalarni yangilash' : 'Обновить заявки'}</Button>
                      </div>
                      {sellerApplications.length === 0 ? (
                        <p className="rounded-xl bg-[var(--sm-bg-canvas)] p-4 text-sm text-[var(--sm-text-secondary)]">{locale === 'uz' ? 'Hozircha sotuvchi arizalari yo‘q.' : 'Заявок продавцов пока нет.'}</p>
                      ) : (
                        <div className="space-y-3">
                          {sellerApplications.map((application) => (
                            <article key={application.id} className="rounded-xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-elevated)] p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold text-[var(--sm-text-primary)]">{application.shopName}</h3>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${application.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : application.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {application.status === 'approved' ? (locale === 'uz' ? 'Tasdiqlangan' : 'Одобрена') : application.status === 'rejected' ? (locale === 'uz' ? 'Rad etilgan' : 'Отклонена') : (locale === 'uz' ? 'Kutilmoqda' : 'Ожидает')}
                                    </span>
                                  </div>
                                  <p className="text-sm text-[var(--sm-text-secondary)]">{application.applicantName} · {application.email}</p>
                                  <p className="text-xs text-[var(--sm-text-muted)]">{application.phone || '—'} · {application.district || '—'} · {application.address || '—'}</p>
                                  {application.description && <p className="pt-1 text-sm text-[var(--sm-text-secondary)]">{application.description}</p>}
                                  <p className="text-[11px] text-[var(--sm-text-muted)]">{new Date(application.createdAt).toLocaleDateString(locale === 'uz' ? 'uz-UZ' : 'ru-RU')}</p>
                                </div>
                                {application.status !== 'approved' && (
                                  <div className="flex shrink-0 gap-2">
                                    <Button variant="primary" size="sm" isLoading={isReviewingApplication === application.id} disabled={Boolean(isReviewingApplication)} onClick={() => void handleReviewApplication(application.id, 'approved')}>{locale === 'uz' ? 'Tasdiqlash' : 'Одобрить'}</Button>
                                    {application.status !== 'rejected' && <Button variant="danger" size="sm" disabled={Boolean(isReviewingApplication)} onClick={() => void handleReviewApplication(application.id, 'rejected')}>{locale === 'uz' ? 'Rad etish' : 'Отклонить'}</Button>}
                                  </div>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </Card>
                    <Card padding="lg" className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                            {locale === 'uz' ? 'Yangi sotuvchi kirish hisobi yaratish' : 'Создать доступ для продавца'}
                          </h2>
                          <p className="text-xs text-[var(--sm-text-muted)] mt-0.5">
                            {locale === 'uz'
                              ? 'Arizalar Google va email orqali ro‘yxatdan o‘tgan sotuvchilardan keladi. /seller faqat tasdiqlanganlarga ochiq.'
                              : 'Заявки поступают от продавцов, зарегистрированных через Google или email. /seller доступен только одобренным.'}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-[var(--sm-accent-primary)]">
                          URL: /seller
                        </span>
                      </div>

                      <form onSubmit={(e) => void handleCreateSeller(e)} className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <TextInput
                            label={locale === 'uz' ? 'F.I.Sh (Sotuvchi ismi)' : 'Ф.И.О. продавца'}
                            placeholder="Azizbek Karimov"
                            value={sellerFullName}
                            onChange={(e) => setSellerFullName(e.target.value)}
                            required
                          />
                          <TextInput
                            label={locale === 'uz' ? 'Login' : 'Логин'}
                            placeholder="zarafshon_manager"
                            value={sellerLogin}
                            onChange={(e) => setSellerLogin(e.target.value)}
                            required
                          />
                          <TextInput
                            label={locale === 'uz' ? 'Telefon raqam' : 'Телефон'}
                            placeholder="+998 90 123 45 67"
                            value={sellerPhone}
                            onChange={(e) => setSellerPhone(e.target.value)}
                            required
                          />
                          <TextInput
                            label={locale === 'uz' ? 'Kirish paroli' : 'Пароль входа'}
                            placeholder="Kamida 8 belgi"
                            value={sellerPassword}
                            minLength={8}
                            onChange={(e) => setSellerPassword(e.target.value)}
                            required
                          />
                          <SelectInput
                            label={locale === 'uz' ? 'Biriktirilgan qandolatxona' : 'Кондитерская'}
                            value={sellerBakeryId}
                            onChange={(e) => setSellerBakeryId(e.target.value)}
                            options={data.bakeries.map((b) => ({
                              value: b.id,
                              label: `${b.name} (${b.district[locale]})`,
                            }))}
                          />
                          <TextInput
                            label={locale === 'uz' ? 'Lavozim / Rol' : 'Должность / Роль'}
                            placeholder="Direktor / Menejer"
                            value={sellerRoleLabel}
                            onChange={(e) => setSellerRoleLabel(e.target.value)}
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="primary"
                          isLoading={isCreatingSeller}
                          leftIcon={<UserPlus className="w-4 h-4" />}
                        >
                          {locale === 'uz' ? 'Sotuvchi hisobini yaratish' : 'Создать аккаунт продавца'}
                        </Button>
                      </form>
                    </Card>

                    <Card padding="lg" className="space-y-4">
                      <h3 className="font-display text-lg font-semibold text-[var(--sm-text-primary)]">
                        {locale === 'uz' ? 'Ruxsat berilgan sotuvchilar ro‘yxati' : 'Список разрешённых продавцов'}
                      </h3>

                      {data.sellerAccounts.length === 0 ? (
                        <p className="text-sm text-[var(--sm-text-secondary)]">
                          {locale === 'uz'
                            ? 'Hozircha birorta ham sotuvchi hisobi yaratilmagan. Yuqoridagi forma orqali qo‘shing.'
                            : 'Пока нет созданных аккаунтов продавцов. Добавьте выше.'}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {data.sellerAccounts.map((acc) => {
                            const showPass = Boolean(revealedPasswords[acc.id]);
                            return (
                              <div
                                key={acc.id}
                                className="rounded-[12px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-elevated)] p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-[var(--sm-text-primary)]">
                                      {acc.fullName}
                                    </span>
                                    {acc.roleLabel && (
                                      <span className="text-xs text-[var(--sm-text-muted)]">· {acc.roleLabel}</span>
                                    )}
                                    <span
                                      className={
                                        acc.isActive
                                          ? 'text-xs font-semibold text-[var(--sm-status-success)]'
                                          : 'text-xs font-semibold text-[var(--sm-status-danger)]'
                                      }
                                    >
                                      · {acc.isActive ? (locale === 'uz' ? 'Faol' : 'Активен') : locale === 'uz' ? 'Bloklangan' : 'Заблокирован'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--sm-text-secondary)] font-mono">
                                    <span>Login: {acc.login}</span>
                                    <span>Tel: {acc.phone}</span>
                                    <span className="inline-flex items-center gap-1">
                                      Parol: {showPass ? acc.password : '••••••'}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setRevealedPasswords((prev) => ({
                                            ...prev,
                                            [acc.id]: !prev[acc.id],
                                          }))
                                        }
                                        className="text-[var(--sm-text-muted)] hover:text-[var(--sm-text-primary)] cursor-pointer"
                                        aria-label="Toggle password"
                                      >
                                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  <select
                                    value={acc.bakeryId}
                                    onChange={(e) => void handleChangeSellerBakery(acc.id, e.target.value)}
                                    className="h-9 rounded-[8px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-surface)] px-2.5 text-xs text-[var(--sm-text-primary)]"
                                  >
                                    {data.bakeries.map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.name}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={copiedId === acc.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    onClick={() => handleCopyCredentials(acc.id, acc.login, acc.password)}
                                  >
                                    {copiedId === acc.id ? 'Nusxalandi' : 'Nusxalash'}
                                  </Button>
                                  <Button
                                    variant={acc.isActive ? 'outline' : 'secondary'}
                                    size="sm"
                                    onClick={() => void handleToggleSellerActive(acc.id, acc.isActive)}
                                  >
                                    {acc.isActive ? (locale === 'uz' ? 'Bloklash' : 'Блокировать') : locale === 'uz' ? 'Yoqish' : 'Активировать'}
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => void handleDeleteSeller(acc.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* 3. BAKERIES MANAGEMENT */}
                {activeTab === 'bakeries' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                        {locale === 'uz' ? 'Hamkorlar va do‘konlar' : 'Партнёры и магазины'}
                      </h2>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => setShowCreateBakery((p) => !p)}
                      >
                        {locale === 'uz' ? 'Yangi do‘kon' : 'Новый магазин'}
                      </Button>
                    </div>

                    {showCreateBakery && (
                      <Card padding="lg">
                        <form onSubmit={(e) => void handleCreateBakery(e)} className="space-y-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <TextInput
                              label={locale === 'uz' ? 'Nomi' : 'Название'}
                              placeholder="Afrosiyob Tortlari"
                              value={bakeryName}
                              onChange={(e) => setBakeryName(e.target.value)}
                              required
                            />
                            <SelectInput
                              label={locale === 'uz' ? 'Turi' : 'Тип'}
                              value={bakeryType}
                              onChange={(e) => setBakeryType(e.target.value as typeof bakeryType)}
                              options={[
                                { value: 'bakery', label: locale === 'uz' ? 'Qandolatxona' : 'Кондитерская' },
                                { value: 'confectioner', label: locale === 'uz' ? 'Usta qandolatchi' : 'Кондитер-мастер' },
                                { value: 'home_baker', label: locale === 'uz' ? 'Uy novvoyxonasi' : 'Домашняя пекарня' },
                                { value: 'restaurant', label: locale === 'uz' ? 'Restoran' : 'Ресторан' },
                                { value: 'cafe', label: locale === 'uz' ? 'Kafe' : 'Кафе' },
                                { value: 'grocery', label: locale === 'uz' ? 'Oziq-ovqat do‘koni' : 'Продуктовый магазин' },
                                { value: 'home_kitchen', label: locale === 'uz' ? 'Uy oshxonasi' : 'Домашняя кухня' },
                                { value: 'other', label: locale === 'uz' ? 'Boshqa do‘kon' : 'Другой магазин' },
                              ]}
                            />
                            <SelectInput
                              label={locale === 'uz' ? 'Hudud' : 'Район'}
                              value={bakeryDistrict}
                              onChange={(e) => setBakeryDistrict(e.target.value)}
                              options={DISTRICT_OPTIONS.map((d) => ({ value: d.value, label: locale === 'uz' ? d.uz : d.ru }))}
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <TextInput
                              label={locale === 'uz' ? 'Manzil' : 'Адрес'}
                              placeholder="Samarqand, Rudakiy 10"
                              value={bakeryAddress}
                              onChange={(e) => setBakeryAddress(e.target.value)}
                              required
                            />
                            <TextInput
                              label={locale === 'uz' ? 'Ish vaqti' : 'Режим работы'}
                              value={bakeryHours}
                              onChange={(e) => setBakeryHours(e.target.value)}
                            />
                            <TextInput
                              label={locale === 'uz' ? 'Yetkazish (UZS)' : 'Доставка (сум)'}
                              type="number"
                              value={bakeryDeliveryFee}
                              onChange={(e) => setBakeryDeliveryFee(e.target.value)}
                            />
                            <SelectInput
                              label={locale === 'uz' ? 'Muqova rasmi' : 'Обложка'}
                              value={bakeryMediaKey}
                              onChange={(e) => setBakeryMediaKey(e.target.value as ProductMediaKey)}
                              options={MEDIA_KEYS.map((k) => ({ value: k, label: k.replace('_', ' ') }))}
                            />
                          </div>
                          <TextArea
                            label={locale === 'uz' ? 'Tavsif' : 'Описание'}
                            rows={2}
                            value={bakeryBioUz}
                            onChange={(e) => setBakeryBioUz(e.target.value)}
                          />
                          <Button type="submit" variant="primary" isLoading={isCreatingBakery}>
                            {locale === 'uz' ? 'Saqlash' : 'Сохранить'}
                          </Button>
                        </form>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {data.bakeries.map((b) => (
                        <Card key={b.id} padding="md" className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-[var(--sm-accent-primary)] shrink-0" />
                                <h3 className="font-semibold text-sm text-[var(--sm-text-primary)] truncate">
                                  {b.name}
                                </h3>
                              </div>
                              <p className="text-xs text-[var(--sm-text-muted)]">
                                {b.district[locale]} · {b.address[locale]}
                              </p>
                            </div>
                            <span className="font-mono text-xs font-semibold tabular-nums inline-flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-current text-[var(--sm-accent-gold)]" />
                              {b.rating.toFixed(1)}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums text-[var(--sm-text-secondary)]">
                            <div>{b.workingHours}</div>
                            <div>{formatUzsPrice(b.deliveryFeeUzs)} UZS</div>
                            <div>
                              {b.isSuspended ? (
                                <span className="text-[var(--sm-status-danger)] font-sans font-semibold">To‘xtatilgan</span>
                              ) : b.isVerified ? (
                                <span className="text-[var(--sm-status-success)] font-sans font-semibold">Tasdiqlangan</span>
                              ) : (
                                <span className="text-[var(--sm-text-muted)] font-sans">Oddiy</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--sm-border-subtle)] pt-3">
                            <Button
                              variant={b.isVerified ? 'secondary' : 'outline'}
                              size="sm"
                              leftIcon={<BadgeCheck className="w-3.5 h-3.5" />}
                              onClick={() => void handleToggleBakeryVerify(b.id, b.isVerified)}
                            >
                              {b.isVerified ? 'Tasdiqlangan' : 'Tasdiqlash'}
                            </Button>
                            <Button
                              variant={b.isSuspended ? 'primary' : 'danger'}
                              size="sm"
                              onClick={() => void handleToggleBakerySuspend(b.id, Boolean(b.isSuspended))}
                            >
                              {b.isSuspended ? 'Faollashtirish' : 'To‘xtatish'}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. ORDERS & COURIERS */}
                {activeTab === 'orders' && (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                        {locale === 'uz' ? 'Barcha buyurtmalar nazorati' : 'Мониторинг всех заказов'}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--sm-text-muted)]" />
                          <input
                            type="search"
                            placeholder={locale === 'uz' ? 'Trek, mijoz, telefon...' : 'Трек, клиент, телефон...'}
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                            className="h-9 rounded-[8px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-elevated)] pl-8 pr-3 text-xs text-[var(--sm-text-primary)]"
                          />
                        </div>
                        <SelectInput
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
                          {locale === 'uz' ? 'Buyurtmalar topilmadi.' : 'Заказы не найдены.'}
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {filteredOrders.map((order) => {
                          const currentStatus = order.status ?? OrderStatus.CONFIRMED;
                          return (
                            <Card key={order.batchId} padding="md" className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-2 font-mono">
                                  <span className="font-bold text-sm text-[var(--sm-accent-primary)]">
                                    #{order.batchId}
                                  </span>
                                  {order.trackingCode && (
                                    <span className="rounded bg-[var(--sm-accent-primary-soft)] px-2 py-0.5 text-[var(--sm-accent-primary)] font-semibold">
                                      {order.trackingCode}
                                    </span>
                                  )}
                                  {order.handoverPin && (
                                    <span className="rounded bg-[var(--sm-status-success)]/15 px-2 py-0.5 text-[var(--sm-status-success)] font-semibold">
                                      PIN: {order.handoverPin}
                                    </span>
                                  )}
                                  <span className="font-sans font-semibold text-[var(--sm-text-primary)]">
                                    {order.customerName}
                                  </span>
                                  <span className="text-[var(--sm-text-secondary)]">{order.customerPhone}</span>
                                </div>
                                <span className="font-mono font-bold tabular-nums text-sm">
                                  {formatUzsPrice(order.grandTotalUzs)} {t.common.currencyUzs}
                                </span>
                              </div>

                              <div className="text-xs text-[var(--sm-text-secondary)] space-y-1">
                                <p>{order.address}</p>
                                {order.courierNote && (
                                  <p className="text-[var(--sm-accent-primary)]">Izoh: {order.courierNote}</p>
                                )}
                                {order.coordinates && (
                                  <a
                                    href={`https://yandex.uz/maps/?pt=${order.coordinates.lng},${order.coordinates.lat}&z=17&l=map`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--sm-accent-primary)] hover:underline"
                                  >
                                    <span>
                                      {order.coordinates.lat.toFixed(5)}, {order.coordinates.lng.toFixed(5)} · Yandex Maps
                                    </span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sm-border-subtle)] pt-3">
                                <span className="text-xs text-[var(--sm-text-muted)]">
                                  {order.sellerOrders.map((so) => so.bakeryName).join(', ')}
                                </span>
                                <select
                                  value={currentStatus}
                                  onChange={(e) =>
                                    void handleUpdateOrderStatus(order.batchId, e.target.value as OrderStatus)
                                  }
                                  className="h-8 rounded-[8px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-elevated)] px-2.5 text-xs text-[var(--sm-text-primary)]"
                                >
                                  <option value={OrderStatus.CONFIRMED}>{t.profile.orderStatuses.confirmed}</option>
                                  <option value={OrderStatus.PREPARING}>{t.profile.orderStatuses.preparing}</option>
                                  <option value={OrderStatus.READY_FOR_DELIVERY}>{t.profile.orderStatuses.ready_for_delivery}</option>
                                  <option value={OrderStatus.OUT_FOR_DELIVERY}>{t.profile.orderStatuses.out_for_delivery}</option>
                                  <option value={OrderStatus.DELIVERED}>{t.profile.orderStatuses.delivered}</option>
                                  <option value={OrderStatus.CANCELLED}>{t.profile.orderStatuses.cancelled}</option>
                                </select>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. PRODUCTS MODERATION */}
                {activeTab === 'products' && (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                        {locale === 'uz' ? 'Katalog va narxlar moderatsiyasi' : 'Модерация каталога и цен'}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="search"
                          placeholder={locale === 'uz' ? 'Mahsulot qidirish...' : 'Поиск товара...'}
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="h-9 rounded-[8px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-elevated)] px-3 text-xs"
                        />
                        <SelectInput
                          value={productBakeryFilter}
                          onChange={(e) => setProductBakeryFilter(e.target.value)}
                          options={[
                            { value: 'all', label: locale === 'uz' ? 'Barcha qandolatxonalar' : 'Все кондитерские' },
                            ...data.bakeries.map((b) => ({ value: b.id, label: b.name })),
                          ]}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {filteredProducts.map((product) => {
                        const published = product.isPublished !== false;
                        const draft = priceDrafts[product.id] ?? String(product.priceUzs);
                        const edited = priceDrafts[product.id] !== undefined && Number(draft) !== product.priceUzs;

                        return (
                          <Card
                            key={product.id}
                            padding="md"
                            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={PRODUCT_MEDIA_MAP[product.mediaKey]}
                                alt=""
                                className="h-14 w-16 rounded-[8px] object-cover shrink-0"
                              />
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-semibold text-[var(--sm-text-primary)] truncate">
                                  {product.title[locale]}
                                </p>
                                <p className="text-xs text-[var(--sm-text-muted)]">
                                  {product.bakeryName} · {t.categoriesMap[product.category]} ·{' '}
                                  <span
                                    className={
                                      published ? 'text-[var(--sm-status-success)] font-semibold' : 'text-[var(--sm-status-warning)] font-semibold'
                                    }
                                  >
                                    {published ? 'Vitrinada' : 'Yashirilgan'}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <input
                                type="number"
                                value={draft}
                                onChange={(e) => setPriceDrafts((p) => ({ ...p, [product.id]: e.target.value }))}
                                className="h-8 w-28 rounded-[8px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-elevated)] px-2 font-mono text-xs tabular-nums"
                              />
                              {edited && (
                                <Button variant="primary" size="sm" onClick={() => void handleSaveProductPrice(product.id)}>
                                  Saqlash
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleToggleProductPublish(product.id, published)}
                              >
                                {published ? 'Yashirish' : 'Chiqarish'}
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => void handleDeleteProduct(product.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. PROMOTIONS & STORIES */}
                {activeTab === 'promotions' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                      <Card padding="lg" className="lg:col-span-5">
                        <form onSubmit={(e) => void handleCreatePromo(e)} className="space-y-3">
                          <h2 className="font-display text-lg font-semibold text-[var(--sm-text-primary)]">
                            {locale === 'uz' ? 'Yangi promokod yaratish' : 'Создать промокод'}
                          </h2>
                          <SelectInput
                            label={locale === 'uz' ? 'Qandolatxona' : 'Кондитерская'}
                            value={promoBakeryId}
                            onChange={(e) => setPromoBakeryId(e.target.value)}
                            options={data.bakeries.map((b) => ({ value: b.id, label: b.name }))}
                          />
                          <TextInput
                            label="Kod"
                            placeholder="SAMARQAND20"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            required
                          />
                          <TextInput
                            label={locale === 'uz' ? 'Aksiya nomi' : 'Название акции'}
                            value={promoTitleUz}
                            onChange={(e) => setPromoTitleUz(e.target.value)}
                            required
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <TextInput
                              label="Chegirma (%)"
                              type="number"
                              value={promoDiscount}
                              onChange={(e) => setPromoDiscount(e.target.value)}
                            />
                            <TextInput
                              label="Min. summa (UZS)"
                              type="number"
                              value={promoMinOrder}
                              onChange={(e) => setPromoMinOrder(e.target.value)}
                            />
                          </div>
                          <Button type="submit" variant="primary" fullWidth>
                            {locale === 'uz' ? 'Promokodni saqlash' : 'Сохранить промокод'}
                          </Button>
                        </form>
                      </Card>

                      <div className="lg:col-span-7 space-y-3">
                        <h3 className="font-display text-lg font-semibold text-[var(--sm-text-primary)]">
                          {locale === 'uz' ? 'Barcha promokodlar' : 'Все промокоды'}
                        </h3>
                        {data.promotions.map((promo) => (
                          <Card key={promo.id} padding="md" className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[var(--sm-accent-primary)]">
                                  {promo.code}
                                </span>
                                <span className="font-mono text-xs font-semibold">-{promo.discountPercent}%</span>
                                <span className={promo.isActive ? 'text-xs text-[var(--sm-status-success)]' : 'text-xs text-[var(--sm-text-muted)]'}>
                                  {promo.isActive ? 'Faol' : 'To‘xtatilgan'}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--sm-text-secondary)]">{promo.title[locale]}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void toggleAdminPromotion(promo.id, !promo.isActive).then(loadOverview)}
                              >
                                {promo.isActive ? 'O‘chirish' : 'Yoqish'}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => void deleteAdminPromotion(promo.id).then(loadOverview)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <Card padding="lg" className="space-y-3">
                      <h3 className="font-display text-lg font-semibold text-[var(--sm-text-primary)]">
                        {locale === 'uz' ? 'Stories va so‘rovnomalar statistikasi' : 'Статистика Stories'}
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {data.stories.map((st) => (
                          <div key={st.id} className="rounded-[10px] border border-[var(--sm-border-subtle)] p-3 text-xs space-y-1">
                            <p className="font-semibold text-[var(--sm-text-primary)]">{st.bakeryName}</p>
                            <p className="text-[var(--sm-text-secondary)] line-clamp-2">{st.caption[locale]}</p>
                            <p className="font-mono text-[var(--sm-accent-primary)] tabular-nums">
                              ♥ {st.likesCount} · {st.poll.options.reduce((s, o) => s + o.votes, 0)} ovoz
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {/* 7. SUPPORT & REVIEWS */}
                {activeTab === 'support' && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-7 space-y-3">
                      <h2 className="font-display text-lg font-semibold text-[var(--sm-text-primary)]">
                        {locale === 'uz' ? 'Mijoz murojaatlari' : 'Обращения клиентов'}
                      </h2>
                      {data.messages.map((msg) => (
                        <Card key={msg.id} padding="md" className="space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[var(--sm-text-primary)]">
                              {msg.customerName} → {msg.bakeryName}
                            </span>
                            <span className="font-mono text-[var(--sm-text-muted)]">{msg.customerPhone}</span>
                          </div>
                          <p className="text-sm text-[var(--sm-text-primary)]">{msg.message}</p>
                          {msg.reply ? (
                            <p className="text-xs text-[var(--sm-status-success)] border-t border-[var(--sm-border-subtle)] pt-2">
                              Javob: {msg.reply}
                            </p>
                          ) : (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                placeholder="Admin javobi..."
                                value={replyDrafts[msg.id] ?? ''}
                                onChange={(e) => setReplyDrafts((p) => ({ ...p, [msg.id]: e.target.value }))}
                                className="h-8 flex-1 rounded-[8px] border border-[var(--sm-border-strong)] bg-[var(--sm-bg-elevated)] px-2.5 text-xs"
                              />
                              <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<Send className="w-3.5 h-3.5" />}
                                onClick={() => void handleReplyMessage(msg.id)}
                              >
                                Yuborish
                              </Button>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>

                    <div className="lg:col-span-5 space-y-3">
                      <h2 className="font-display text-lg font-semibold text-[var(--sm-text-primary)]">
                        {locale === 'uz' ? 'Sharhlar moderatsiyasi' : 'Модерация отзывов'}
                      </h2>
                      {data.reviews.map((rev) => (
                        <Card key={rev.id} padding="md" className="space-y-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold">{rev.authorName} · ★ {rev.rating}</span>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => void deleteAdminReview(rev.id).then(loadOverview)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <p className="text-xs text-[var(--sm-text-secondary)]">{rev.comment}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. PLATFORM SETTINGS */}
                {activeTab === 'settings' && (
                  <>
                  <Card padding="lg" className="max-w-3xl">
                    <form onSubmit={(e) => void handleSaveSettings(e)} className="space-y-4">
                      <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                        {locale === 'uz' ? 'Platforma global sozlamalari' : 'Глобальные настройки платформы'}
                      </h2>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <TextInput
                          label={locale === 'uz' ? 'Platforma komissiyasi (%)' : 'Комиссия (%)'}
                          type="number"
                          value={commissionPercent}
                          onChange={(e) => setCommissionPercent(e.target.value)}
                        />
                        <TextInput
                          label={locale === 'uz' ? 'Standart yetkazish (UZS)' : 'Доставка по умолч.'}
                          type="number"
                          value={defaultDeliveryFeeUzs}
                          onChange={(e) => setDefaultDeliveryFeeUzs(e.target.value)}
                        />
                        <TextInput
                          label={locale === 'uz' ? 'Bepul yetkazish chegarasi' : 'Порог бесплатной доставки'}
                          type="number"
                          value={freeDeliveryThresholdUzs}
                          onChange={(e) => setFreeDeliveryThresholdUzs(e.target.value)}
                        />
                      </div>

                      <Divider />

                      <label className="flex items-center gap-2.5 text-sm text-[var(--sm-text-primary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requireDeliveryPin}
                          onChange={(e) => setRequireDeliveryPin(e.target.checked)}
                          className="h-4 w-4 accent-[var(--sm-accent-primary)]"
                        />
                        <span>
                          {locale === 'uz'
                            ? 'Yetkazilgan deb belgilashda sotuvchi/kuryerdan maxsus mijoz PIN-kodini talab qilish'
                            : 'Требовать специальный PIN-код клиента при отметке «Доставлено»'}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 text-sm text-[var(--sm-text-primary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={announcementEnabled}
                          onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                          className="h-4 w-4 accent-[var(--sm-accent-primary)]"
                        />
                        <span>
                          {locale === 'uz'
                            ? 'Vitrinada yuqori e’lon bannerini ko‘rsatish'
                            : 'Показывать верхний баннер объявлений на витрине'}
                        </span>
                      </label>

                      <TextInput
                        label={locale === 'uz' ? 'E’lon matni (O‘zbekcha)' : 'Текст объявления (Узб)'}
                        value={announcementUz}
                        onChange={(e) => setAnnouncementUz(e.target.value)}
                      />
                      <TextInput
                        label={locale === 'uz' ? 'E’lon matni (Ruscha)' : 'Текст объявления (Рус)'}
                        value={announcementRu}
                        onChange={(e) => setAnnouncementRu(e.target.value)}
                      />

                      <Button type="submit" variant="primary" isLoading={isSavingSettings}>
                        {locale === 'uz' ? 'Sozlamalarni saqlash' : 'Сохранить настройки'}
                      </Button>
                    </form>
                  </Card>
                  <Card padding="lg" className="max-w-3xl">
                    <form onSubmit={(e) => void handleSaveTestPaymentAmount(e)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <TextInput
                          label={locale === 'uz' ? 'Sotuvchi test to‘lovi (UZS, 0 = o‘chiq)' : 'Тестовый платёж продавца (сум, 0 = выкл.)'}
                          type="number"
                          min={0}
                          max={100000000}
                          step={1}
                          value={testPaymentAmountUzs}
                          onChange={(e) => setTestPaymentAmountUzs(e.target.value)}
                        />
                        <p className="mt-2 text-xs text-[var(--sm-text-muted)]">{locale === 'uz' ? 'To‘lov miqdori TolovGo test to‘lovi uchun ishlatiladi. 0 qiymati test to‘lovini o‘chiradi.' : 'Сумма применяется к тестовому платежу TolovGo. Значение 0 отключает тестовый платёж.'}</p>
                      </div>
                      <Button type="submit" variant="primary" isLoading={isSavingSettings}>{locale === 'uz' ? 'Test to‘lovini saqlash' : 'Сохранить сумму'}</Button>
                    </form>
                  </Card>
                  </>
                )}
              </>
            ) : (
              <Card padding="lg" className="flex min-h-[320px] flex-col items-start justify-center gap-5 border-[var(--sm-border-subtle)]">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--sm-status-danger)]/10 text-[var(--sm-status-danger)]">
                  <ShieldAlert aria-hidden="true" className="size-6" />
                </div>
                <div className="max-w-xl">
                  <h3 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                    {errorMsg?.includes('404')
                      ? (locale === 'uz' ? 'Admin API topilmadi' : 'Admin API не найден')
                      : (locale === 'uz' ? 'Admin ma’lumotlari yuklanmadi' : 'Не удалось загрузить данные')}
                  </h3>
                  <p role="status" className="mt-2 text-sm leading-6 text-[var(--sm-text-secondary)]">
                    {errorMsg?.includes('404')
                      ? (locale === 'uz' ? 'Bu deployda admin API yo‘q. O‘zgarishlar yangi Vercel deployga chiqqach, sahifa avtomatik ishlaydi.' : 'В этом деплое нет Admin API. Страница заработает после публикации нового деплоя.')
                      : errorMsg?.includes('403')
                        ? (locale === 'uz' ? 'Bu akkauntda admin huquqi yo‘q. Administrator emaili bilan kiring.' : 'У этой учётной записи нет прав администратора. Войдите с email администратора.')
                        : (locale === 'uz' ? 'Server bilan aloqa uzildi. Qayta urinib ko‘ring.' : 'Не удалось связаться с сервером. Попробуйте ещё раз.')}
                  </p>
                  {errorMsg && <p className="mt-3 rounded-lg bg-[var(--sm-bg-canvas)] px-3 py-2 font-mono text-xs text-[var(--sm-text-muted)]">{errorMsg}</p>}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" onClick={() => void loadOverview()} isLoading={isLoading}>
                    {locale === 'uz' ? 'Qayta yuklash' : 'Повторить'}
                  </Button>
                  <Button variant="outline" onClick={onBackToStorefront}>
                    {locale === 'uz' ? 'Do‘konga qaytish' : 'Вернуться в магазин'}
                  </Button>
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
