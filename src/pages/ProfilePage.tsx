import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  CreditCard,
  MapPin,
  MessageSquare,
  Moon,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sun,
  Store,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react';
import { PROFILE_AVATAR_PATH } from '../assets/brandLogo';
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
import { CustomerProfile, PaymentPreference } from '../hooks/useCustomerProfile';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import {
  cancelCustomerOrder,
  fetchCustomerMessages,
  fetchOrderStatus,
  sendCustomerMessage,
} from '../services/api/client';
import {
  BakerySummary,
  ConfirmedOrderReceipt,
  CustomerInquiryMessage,
  DeliveryMethod,
  OrderStatus,
  ShowcaseProduct,
} from '../types';

export interface ProfilePageProps {
  profile: CustomerProfile;
  bakeries: BakerySummary[];
  allProducts: ShowcaseProduct[];
  onUpdateProfile: (next: Partial<CustomerProfile>) => void;
  onAddAddress: (input: {
    label: string;
    districtId: string;
    address: string;
    note?: string;
    makeDefault?: boolean;
  }) => void;
  onSetDefaultAddress: (addressId: string) => void;
  onRemoveAddress: (addressId: string) => void;
  onResetProfile: () => void;
  recentOrders: ConfirmedOrderReceipt[];
  onOrderUpdated: (updated: ConfirmedOrderReceipt) => void;
  onReorderItems: (order: ConfirmedOrderReceipt) => void;
  favoritesCount: number;
  followedBakeriesCount: number;
  onOpenSystem: () => void;
  onOpenSellerCabinet: () => void;
  onSignOut: () => void;
}

type ProfileTab = 'overview' | 'orders' | 'messages' | 'settings';
type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled';

const DISTRICT_KEYS = ['registon', 'universitet', 'siyob', 'sartepa', 'sogdiana'] as const;
const ORDER_PROGRESS_STEPS: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

export function ProfilePage({
  profile,
  bakeries,
  onUpdateProfile,
  onAddAddress,
  onSetDefaultAddress,
  onRemoveAddress,
  onResetProfile,
  recentOrders,
  onOrderUpdated,
  onReorderItems,
  favoritesCount,
  followedBakeriesCount,
  onOpenSystem,
  onOpenSellerCabinet,
  onSignOut,
}: ProfilePageProps) {
  const { locale, setLocale, t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Personal info state
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [birthDate, setBirthDate] = useState(profile.birthDate);
  const [districtId, setDistrictId] = useState(profile.districtId);
  const [address, setAddress] = useState(profile.address);
  const [preferredPayment, setPreferredPayment] = useState<PaymentPreference>(
    profile.preferredPayment,
  );
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Address book form state
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressDistrict, setNewAddressDistrict] = useState(profile.districtId || 'registon');
  const [newAddressStreet, setNewAddressStreet] = useState('');
  const [newAddressNote, setNewAddressNote] = useState('');

  // Orders state
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [refreshingBatchId, setRefreshingBatchId] = useState<string | null>(null);
  const [cancellingBatchId, setCancellingBatchId] = useState<string | null>(null);
  const [reorderedBatchId, setReorderedBatchId] = useState<string | null>(null);
  const [orderNoticeMap, setOrderNoticeMap] = useState<
    Record<string, { type: 'success' | 'error'; message: string }>
  >({});

  // Messages state
  const [messages, setMessages] = useState<CustomerInquiryMessage[]>([]);
  const [selectedBakeryId, setSelectedBakeryId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageNotice, setMessageNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    setFullName(profile.fullName);
    setPhone(profile.phone);
    setBirthDate(profile.birthDate);
    setDistrictId(profile.districtId);
    setAddress(profile.address);
    setPreferredPayment(profile.preferredPayment);
  }, [profile]);

  useEffect(() => {
    if (!selectedBakeryId && bakeries.length > 0) {
      setSelectedBakeryId(bakeries[0].id);
    }
  }, [bakeries, selectedBakeryId]);

  useEffect(() => {
    if (activeTab !== 'messages') return;
    void fetchCustomerMessages()
      .then((list) => setMessages(list))
      .catch(() => {});
  }, [activeTab]);

  const districtIndex = DISTRICT_KEYS.indexOf(
    (profile.districtId as (typeof DISTRICT_KEYS)[number]) ?? 'registon',
  );
  const districtDisplay =
    t.catalog.districts[districtIndex >= 0 ? districtIndex : 0] ?? t.profile.cityLabel;

  const totalSpentUzs = useMemo(
    () =>
      recentOrders
        .filter((o) => o.status !== OrderStatus.CANCELLED)
        .reduce((sum, o) => sum + o.grandTotalUzs, 0),
    [recentOrders],
  );

  const filteredOrders = useMemo(() => {
    return recentOrders.filter((order) => {
      const status = order.status ?? OrderStatus.CONFIRMED;
      if (orderFilter === 'active') {
        return status !== OrderStatus.DELIVERED && status !== OrderStatus.CANCELLED;
      }
      if (orderFilter === 'completed') {
        return status === OrderStatus.DELIVERED;
      }
      if (orderFilter === 'cancelled') {
        return status === OrderStatus.CANCELLED;
      }
      return true;
    });
  }, [recentOrders, orderFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      fullName: fullName.trim(),
      phone: phone.trim() || '+998 ',
      birthDate: birthDate.trim(),
      districtId,
      address: address.trim(),
      preferredPayment,
    });
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleAddSavedAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAddressStreet.trim().length < 4) return;
    onAddAddress({
      label: newAddressLabel.trim() || t.profile.addressTagPlaceholder.split(',')[0],
      districtId: newAddressDistrict,
      address: newAddressStreet.trim(),
      note: newAddressNote.trim(),
      makeDefault: profile.savedAddresses.length === 0,
    });
    setNewAddressLabel('');
    setNewAddressStreet('');
    setNewAddressNote('');
  };

  const handleRefreshStatus = async (batchId: string) => {
    setRefreshingBatchId(batchId);
    try {
      const updated = await fetchOrderStatus(batchId);
      onOrderUpdated(updated);
    } catch {
      // Keep local snapshot if offline
    } finally {
      setRefreshingBatchId(null);
    }
  };

  const handleCancelOrder = async (batchId: string) => {
    setCancellingBatchId(batchId);
    setOrderNoticeMap((prev) => {
      const copy = { ...prev };
      delete copy[batchId];
      return copy;
    });
    try {
      const updated = await cancelCustomerOrder(batchId);
      onOrderUpdated(updated);
      setOrderNoticeMap((prev) => ({
        ...prev,
        [batchId]: { type: 'success', message: t.profile.cancelledNotice },
      }));
    } catch {
      setOrderNoticeMap((prev) => ({
        ...prev,
        [batchId]: { type: 'error', message: t.profile.cancelErrorNotice },
      }));
    } finally {
      setCancellingBatchId(null);
    }
  };

  const handleReorder = (order: ConfirmedOrderReceipt) => {
    onReorderItems(order);
    setReorderedBatchId(order.batchId);
    window.setTimeout(() => setReorderedBatchId(null), 2600);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessageNotice(null);
    const trimmed = messageText.trim();
    if (!selectedBakeryId || trimmed.length < 4) {
      setMessageNotice({ type: 'error', text: t.profile.messageErrorNotice });
      return;
    }

    setIsSendingMessage(true);
    try {
      const created = await sendCustomerMessage({
        bakeryId: selectedBakeryId,
        customerName: (profile.fullName || t.profile.guestNameFallback).trim(),
        customerPhone: profile.phone.trim() || '+998',
        message: trimmed,
      });
      setMessages((prev) => [created, ...prev]);
      setMessageText('');
      setMessageNotice({ type: 'success', text: t.profile.messageSentNotice });
    } catch {
      setMessageNotice({ type: 'error', text: t.profile.messageErrorNotice });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleResetLocal = () => {
    onResetProfile();
    setResetDone(true);
    window.setTimeout(() => setResetDone(false), 2600);
  };

  const tabItems: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t.profile.tabs.overview, icon: <UserRound className="w-4 h-4" /> },
    { id: 'orders', label: t.profile.tabs.orders, icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'messages', label: t.profile.tabs.messages, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'settings', label: t.profile.tabs.settings, icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 py-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader
          as="h1"
          title={t.profile.heading}
          subtitle={t.profile.subheading}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Store className="h-4 w-4" aria-hidden="true" />}
            onClick={onOpenSellerCabinet}
          >
            {locale === 'uz' ? 'Sotuvchi kabineti' : 'Кабинет продавца'}
          </Button>
          <button type="button" onClick={onSignOut} className="rounded-xl border border-[var(--sm-border-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--sm-text-secondary)] hover:bg-[var(--sm-bg-surface)] hover:text-[var(--sm-text-primary)]">
            {locale === 'uz' ? 'Chiqish' : 'Выйти'}
          </button>
        </div>
      </div>

      {/* Profile Identity & 4-Metric Summary Card */}
      <Card padding="lg" className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-[var(--sm-accent-primary)] shrink-0">
            <img
              src={PROFILE_AVATAR_PATH}
              alt={fullName || t.profile.guestNameFallback}
              className="h-full w-full object-cover scale-110"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <h2 className="font-display text-2xl font-semibold text-[var(--sm-text-primary)] truncate">
              {profile.fullName || t.profile.guestNameFallback}
            </h2>
            <p className="font-mono text-xs text-[var(--sm-text-secondary)] tabular-nums">
              {profile.phone && profile.phone.trim() !== '+998'
                ? profile.phone
                : '+998 -- --- -- --'}
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs text-[var(--sm-text-muted)]">
              <MapPin className="w-3.5 h-3.5 text-[var(--sm-accent-primary)]" aria-hidden="true" />
              <span>
                {t.profile.cityLabel} · {districtDisplay}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t lg:border-t-0 lg:border-l border-[var(--sm-border-subtle)] pt-4 lg:pt-0 lg:pl-8 text-left sm:text-center">
          <div>
            <p className="font-mono text-xl font-semibold tabular-nums text-[var(--sm-text-primary)]">
              {recentOrders.length}
            </p>
            <p className="text-xs text-[var(--sm-text-muted)]">{t.profile.statsOrders}</p>
          </div>
          <div>
            <p className="font-mono text-xl font-semibold tabular-nums text-[var(--sm-text-primary)]">
              {favoritesCount}
            </p>
            <p className="text-xs text-[var(--sm-text-muted)]">{t.profile.statsFavorites}</p>
          </div>
          <div>
            <p className="font-mono text-xl font-semibold tabular-nums text-[var(--sm-text-primary)]">
              {followedBakeriesCount}
            </p>
            <p className="text-xs text-[var(--sm-text-muted)]">{t.profile.statsBakeries}</p>
          </div>
          <div>
            <p className="font-mono text-lg sm:text-xl font-semibold tabular-nums text-[var(--sm-accent-primary)]">
              {formatUzsPrice(totalSpentUzs)}
            </p>
            <p className="text-xs text-[var(--sm-text-muted)]">
              {t.profile.statsSpent} ({t.common.currencyUzs})
            </p>
          </div>
        </div>
      </Card>

      {/* Segmented Navigation Tabs */}
      <div
        role="tablist"
        aria-label={t.profile.heading}
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

      {/* TAB 1: Overview — Personal Info + Address Book */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Card padding="lg">
              <form onSubmit={handleSave} className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                  {t.profile.editInfoTitle}
                </h2>

                <TextInput
                  label={t.profile.fullNameLabel}
                  placeholder={t.profile.fullNamePlaceholder}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextInput
                    label={t.profile.phoneLabel}
                    placeholder="+998 90 123 45 67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <TextInput
                    label={t.profile.birthDateLabel}
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>

                <SelectInput
                  label={t.profile.districtLabel}
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  options={DISTRICT_KEYS.map((key, idx) => ({
                    value: key,
                    label: t.catalog.districts[idx] ?? key,
                  }))}
                />

                <TextInput
                  label={t.profile.addressLabel}
                  placeholder={t.profile.addressPlaceholder}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                {/* Preferred Payment Method */}
                <div className="space-y-2 pt-1">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sm-text-secondary)]">
                    <CreditCard className="w-3.5 h-3.5 text-[var(--sm-accent-primary)]" aria-hidden="true" />
                    <span>{t.profile.paymentPrefLabel}</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPreferredPayment('cash_on_delivery')}
                      aria-pressed={preferredPayment === 'cash_on_delivery'}
                      className={[
                        'rounded-[10px] border px-3 py-2.5 text-xs font-medium text-left transition-colors cursor-pointer',
                        preferredPayment === 'cash_on_delivery'
                          ? 'border-[var(--sm-accent-primary)] bg-[var(--sm-accent-primary-soft)] text-[var(--sm-accent-primary)]'
                          : 'border-[var(--sm-border-subtle)] bg-[var(--sm-bg-subtle)] text-[var(--sm-text-secondary)]',
                      ].join(' ')}
                    >
                      {t.profile.paymentCash}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredPayment('card_on_delivery')}
                      aria-pressed={preferredPayment === 'card_on_delivery'}
                      className={[
                        'rounded-[10px] border px-3 py-2.5 text-xs font-medium text-left transition-colors cursor-pointer',
                        preferredPayment === 'card_on_delivery'
                          ? 'border-[var(--sm-accent-primary)] bg-[var(--sm-accent-primary-soft)] text-[var(--sm-accent-primary)]'
                          : 'border-[var(--sm-border-subtle)] bg-[var(--sm-bg-subtle)] text-[var(--sm-text-secondary)]',
                      ].join(' ')}
                    >
                      {t.profile.paymentCardOnDelivery}
                    </button>
                  </div>
                </div>

                {savedFeedback && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sm-status-success)]">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.profile.savedNotice}</span>
                  </p>
                )}

                <Button type="submit" variant="primary" fullWidth>
                  {t.profile.saveButton}
                </Button>
              </form>
            </Card>
          </div>

          {/* Saved Delivery Addresses Book */}
          <div className="lg:col-span-6 space-y-6">
            <Card padding="lg" className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                  {t.profile.addressesBookTitle}
                </h2>
                <p className="text-xs text-[var(--sm-text-muted)] mt-1">
                  {t.profile.addressesBookSubtitle}
                </p>
              </div>

              {profile.savedAddresses.length === 0 ? (
                <p className="text-sm text-[var(--sm-text-secondary)] py-2">
                  {t.profile.emptyAddressesNote}
                </p>
              ) : (
                <div className="divide-y divide-[var(--sm-border-subtle)]">
                  {profile.savedAddresses.map((addr) => {
                    const idx = DISTRICT_KEYS.indexOf(
                      addr.districtId as (typeof DISTRICT_KEYS)[number],
                    );
                    const dName = t.catalog.districts[idx >= 0 ? idx : 0] ?? addr.districtId;
                    return (
                      <div key={addr.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sm-text-primary)]">
                            <span>{addr.label}</span>
                            <span className="text-[var(--sm-text-muted)] font-normal">·</span>
                            <span className="text-xs font-normal text-[var(--sm-text-secondary)]">
                              {dName}
                            </span>
                            {addr.isDefault && (
                              <>
                                <span className="text-[var(--sm-text-muted)] font-normal">·</span>
                                <span className="text-xs font-semibold text-[var(--sm-status-success)]">
                                  {t.profile.defaultAddressTag}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!addr.isDefault && (
                              <button
                                type="button"
                                onClick={() => onSetDefaultAddress(addr.id)}
                                className="text-xs font-medium text-[var(--sm-accent-primary)] hover:underline cursor-pointer"
                              >
                                {t.profile.setDefaultAddressButton}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onRemoveAddress(addr.id)}
                              aria-label={t.profile.removeAddressButton}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--sm-text-muted)] hover:text-[var(--sm-status-danger)] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-[var(--sm-text-secondary)]">{addr.address}</p>
                        {addr.note && (
                          <p className="text-[11px] text-[var(--sm-text-muted)]">{addr.note}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <Divider />

              <form onSubmit={handleAddSavedAddress} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextInput
                    label={t.profile.addressTagLabel}
                    placeholder={t.profile.addressTagPlaceholder}
                    value={newAddressLabel}
                    onChange={(e) => setNewAddressLabel(e.target.value)}
                  />
                  <SelectInput
                    label={t.profile.districtLabel}
                    value={newAddressDistrict}
                    onChange={(e) => setNewAddressDistrict(e.target.value)}
                    options={DISTRICT_KEYS.map((key, idx) => ({
                      value: key,
                      label: t.catalog.districts[idx] ?? key,
                    }))}
                  />
                </div>
                <TextInput
                  label={t.profile.addressLabel}
                  placeholder={t.profile.addressPlaceholder}
                  value={newAddressStreet}
                  onChange={(e) => setNewAddressStreet(e.target.value)}
                />
                <TextInput
                  label={t.profile.addressNoteLabel}
                  placeholder={t.profile.addressNotePlaceholder}
                  value={newAddressNote}
                  onChange={(e) => setNewAddressNote(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  {t.profile.addAddressButton}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Orders & Reorder */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-[var(--sm-accent-primary)]" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                {t.profile.ordersTitle}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: t.profile.orderFilterAll },
                  { id: 'active', label: t.profile.orderFilterActive },
                  { id: 'completed', label: t.profile.orderFilterCompleted },
                  { id: 'cancelled', label: t.profile.orderFilterCancelled },
                ] as { id: OrderFilter; label: string }[]
              ).map((filterItem) => (
                <button
                  key={filterItem.id}
                  type="button"
                  onClick={() => setOrderFilter(filterItem.id)}
                  className={[
                    'px-3 py-1.5 rounded-[10px] border text-xs font-medium cursor-pointer transition-colors',
                    orderFilter === filterItem.id
                      ? 'border-transparent bg-[var(--sm-accent-primary)] text-[var(--sm-text-inverse)]'
                      : 'border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] text-[var(--sm-text-secondary)]',
                  ].join(' ')}
                >
                  {filterItem.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <Card padding="lg" tone="subtle">
              <p className="text-sm text-[var(--sm-text-secondary)]">
                {t.profile.emptyOrdersNote}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const currentStatus = order.status ?? OrderStatus.CONFIRMED;
                const isCancelled = currentStatus === OrderStatus.CANCELLED;
                const activeStepIndex = ORDER_PROGRESS_STEPS.indexOf(currentStatus);
                const canCancel =
                  currentStatus === OrderStatus.PENDING ||
                  currentStatus === OrderStatus.CONFIRMED ||
                  currentStatus === OrderStatus.PREPARING;
                const notice = orderNoticeMap[order.batchId];

                return (
                  <Card key={order.batchId} padding="md" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-semibold tabular-nums text-[var(--sm-accent-primary)]">
                          {t.favorites.orderBatchLabel} #{order.batchId}
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
                        <span className="text-xs text-[var(--sm-text-muted)]">·</span>
                        <span
                          className={[
                            'text-xs font-semibold',
                            isCancelled
                              ? 'text-[var(--sm-status-danger)]'
                              : currentStatus === OrderStatus.DELIVERED
                              ? 'text-[var(--sm-status-success)]'
                              : 'text-[var(--sm-text-primary)]',
                          ].join(' ')}
                        >
                          {t.profile.orderStatuses[currentStatus]}
                        </span>
                      </div>

                      <span className="text-xs text-[var(--sm-text-muted)] tabular-nums">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {!isCancelled && (
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {ORDER_PROGRESS_STEPS.map((stepStatus, idx) => {
                          const completed = activeStepIndex >= idx;
                          return (
                            <div key={stepStatus} className="space-y-1.5">
                              <div
                                className={[
                                  'h-1.5 w-full rounded-full transition-colors',
                                  completed
                                    ? 'bg-[var(--sm-accent-primary)]'
                                    : 'bg-[var(--sm-border-subtle)]',
                                ].join(' ')}
                              />
                              <p
                                className={[
                                  'text-[10px] sm:text-[11px] leading-tight truncate',
                                  completed
                                    ? 'font-semibold text-[var(--sm-text-primary)]'
                                    : 'text-[var(--sm-text-muted)]',
                                ].join(' ')}
                              >
                                {t.profile.orderStatuses[stepStatus]}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="divide-y divide-[var(--sm-border-subtle)]">
                      {order.sellerOrders.map((so) => (
                        <div key={so.orderNumber} className="py-2.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                          <div className="flex items-center justify-between font-semibold text-[var(--sm-text-primary)]">
                            <span>{so.bakeryName}</span>
                            <span className="font-mono tabular-nums">
                              {formatUzsPrice(so.totalUzs)} {t.common.currencyUzs}
                            </span>
                          </div>
                          <p className="text-[var(--sm-text-secondary)]">
                            {so.items
                              .map((i) => `${i.quantity}× ${i.title[locale]} (${i.variantLabel[locale]})`)
                              .join(', ')}
                          </p>
                          <p className="text-[11px] text-[var(--sm-text-muted)]">
                            {so.deliveryMethod === DeliveryMethod.PICKUP
                              ? t.cart.pickupOption
                              : `${t.cart.courierOption} · ${order.address}`}
                          </p>
                        </div>
                      ))}
                    </div>

                    {notice && (
                      <p
                        className={[
                          'text-xs font-medium',
                          notice.type === 'success'
                            ? 'text-[var(--sm-status-success)]'
                            : 'text-[var(--sm-status-danger)]',
                        ].join(' ')}
                      >
                        {notice.message}
                      </p>
                    )}

                    {reorderedBatchId === order.batchId && (
                      <p className="text-xs font-medium text-[var(--sm-status-success)]">
                        {t.profile.reorderedNotice}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sm-border-subtle)] pt-3">
                      <div className="text-sm font-semibold">
                        <span className="text-[var(--sm-text-secondary)] font-normal mr-2">
                          {t.cart.grandTotalLabel}:
                        </span>
                        <span className="font-mono tabular-nums text-[var(--sm-text-primary)]">
                          {formatUzsPrice(order.grandTotalUzs)} {t.common.currencyUzs}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          onClick={() => handleReorder(order)}
                        >
                          {t.profile.reorderButton}
                        </Button>

                        {!isCancelled && currentStatus !== OrderStatus.DELIVERED && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                              isLoading={refreshingBatchId === order.batchId}
                              onClick={() => void handleRefreshStatus(order.batchId)}
                            >
                              {refreshingBatchId === order.batchId
                                ? t.profile.refreshingStatus
                                : t.profile.refreshStatusButton}
                            </Button>

                            {canCancel && (
                              <Button
                                variant="danger"
                                size="sm"
                                leftIcon={<XCircle className="w-3.5 h-3.5" />}
                                isLoading={cancellingBatchId === order.batchId}
                                onClick={() => void handleCancelOrder(order.batchId)}
                              >
                                {cancellingBatchId === order.batchId
                                  ? t.profile.cancellingOrder
                                  : t.profile.cancelOrderButton}
                              </Button>
                            )}
                          </>
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

      {/* TAB 3: Customer-Bakery Messages & Support */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Card padding="lg">
              <form onSubmit={(e) => void handleSendMessage(e)} className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                    {t.profile.messagesTitle}
                  </h2>
                  <p className="text-xs text-[var(--sm-text-muted)] mt-1">
                    {t.profile.messagesSubtitle}
                  </p>
                </div>

                <SelectInput
                  label={t.profile.selectBakeryLabel}
                  value={selectedBakeryId}
                  onChange={(e) => setSelectedBakeryId(e.target.value)}
                  options={bakeries.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.district[locale]})`,
                  }))}
                />

                <TextArea
                  label={t.profile.messageTextLabel}
                  placeholder={t.profile.messageTextPlaceholder}
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />

                {messageNotice && (
                  <p
                    className={[
                      'text-xs font-medium',
                      messageNotice.type === 'success'
                        ? 'text-[var(--sm-status-success)]'
                        : 'text-[var(--sm-status-danger)]',
                    ].join(' ')}
                  >
                    {messageNotice.text}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSendingMessage}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  {t.profile.sendMessageButton}
                </Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {messages.length === 0 ? (
              <Card padding="lg" tone="subtle">
                <p className="text-sm text-[var(--sm-text-secondary)]">
                  {t.profile.emptyMessagesNote}
                </p>
              </Card>
            ) : (
              messages.map((msg) => (
                <Card key={msg.id} padding="md" className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[var(--sm-text-primary)]">
                      {msg.bakeryName}
                    </span>
                    <span className="text-[var(--sm-text-muted)] tabular-nums">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--sm-text-primary)]">{msg.message}</p>

                  {msg.reply ? (
                    <div className="border-t border-[var(--sm-border-subtle)] pt-2.5 space-y-1">
                      <p className="text-[11px] font-semibold text-[var(--sm-accent-primary)]">
                        {t.profile.bakeryReplyLabel}
                      </p>
                      <p className="text-xs text-[var(--sm-text-secondary)]">{msg.reply}</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--sm-text-muted)] pt-1">
                      {t.profile.awaitingReplyLabel}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Language, Theme, Notifications & Seller Mode */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Card padding="lg" className="space-y-5">
              <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                {t.profile.preferencesTitle}
              </h2>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--sm-text-muted)]">
                  {t.profile.languageSettingLabel}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    variant={locale === 'uz' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setLocale('uz')}
                  >
                    O&apos;zbekcha
                  </Button>
                  <Button
                    variant={locale === 'ru' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setLocale('ru')}
                  >
                    Русский
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--sm-text-muted)]">
                  {t.profile.themeSettingLabel}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    variant={theme === 'light' ? 'primary' : 'outline'}
                    size="sm"
                    leftIcon={<Sun className="w-3.5 h-3.5" />}
                    onClick={() => setTheme('light')}
                  >
                    {t.toolbar.themeLight}
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'primary' : 'outline'}
                    size="sm"
                    leftIcon={<Moon className="w-3.5 h-3.5" />}
                    onClick={() => setTheme('dark')}
                  >
                    {t.toolbar.themeDark}
                  </Button>
                </div>
              </div>

              <Divider />

              <div className="space-y-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sm-text-muted)]">
                  <Bell className="w-3.5 h-3.5 text-[var(--sm-accent-primary)]" aria-hidden="true" />
                  <span>{t.profile.notificationsTitle}</span>
                </p>

                <label className="flex items-center justify-between gap-3 text-sm text-[var(--sm-text-primary)] cursor-pointer">
                  <span>{t.profile.notifyOrdersLabel}</span>
                  <input
                    type="checkbox"
                    checked={profile.notifyOrders}
                    onChange={(e) => onUpdateProfile({ notifyOrders: e.target.checked })}
                    className="h-4 w-4 accent-[var(--sm-accent-primary)]"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 text-sm text-[var(--sm-text-primary)] cursor-pointer">
                  <span>{t.profile.notifyPromosLabel}</span>
                  <input
                    type="checkbox"
                    checked={profile.notifyPromos}
                    onChange={(e) => onUpdateProfile({ notifyPromos: e.target.checked })}
                    className="h-4 w-4 accent-[var(--sm-accent-primary)]"
                  />
                </label>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <Card padding="lg" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onOpenSystem}
                  className="text-xs font-medium text-[var(--sm-text-muted)] hover:text-[var(--sm-text-primary)] transition-colors cursor-pointer"
                >
                  {t.profile.systemArchitectureLink}
                </button>

                <Button variant="ghost" size="sm" onClick={handleResetLocal}>
                  {resetDone ? t.profile.resetProfileConfirm : t.profile.resetProfileButton}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
