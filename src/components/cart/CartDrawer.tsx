import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { PRODUCT_MEDIA_MAP } from '../../assets/productMedia';
import { Button, Divider, SelectInput, TextInput } from '../../design-system/ui';
import { CustomerProfile } from '../../hooks/useCustomerProfile';
import { useTranslation } from '../../hooks/useTranslation';
import { submitCustomerOrder } from '../../services/api/client';
import {
  BakerySummary,
  CartLineItem,
  ConfirmedOrderReceipt,
  DeliveryMethod,
  GeoCoordinates,
  OrderPaymentMethod,
} from '../../types';
import { formatUzsPrice } from '../catalog/ProductCard';
import { SamarkandMapPicker } from './SamarkandMapPicker';

export interface CartDrawerProps {
  isOpen: boolean;
  items: CartLineItem[];
  bakeries: BakerySummary[];
  defaultProfile?: CustomerProfile;
  onClose: () => void;
  onUpdateQuantity: (lineKey: string, quantity: number) => void;
  onRemoveLine: (lineKey: string) => void;
  onClearCart: () => void;
  onOrderConfirmed: (receipt: ConfirmedOrderReceipt) => void;
  onBrowseCatalog: () => void;
  onViewOrderHistory: () => void;
}

const DISTRICT_KEYS = ['registon', 'universitet', 'siyob', 'sartepa', 'sogdiana'] as const;

export function CartDrawer({
  isOpen,
  items,
  bakeries,
  defaultProfile,
  onClose,
  onUpdateQuantity,
  onRemoveLine,
  onClearCart,
  onOrderConfirmed,
  onBrowseCatalog,
  onViewOrderHistory,
}: CartDrawerProps) {
  const { locale, t } = useTranslation();

  const [deliveryMethods, setDeliveryMethods] = useState<Record<string, DeliveryMethod>>({});
  const [customerName, setCustomerName] = useState(defaultProfile?.fullName ?? '');
  const [customerPhone, setCustomerPhone] = useState(defaultProfile?.phone ?? '+998 ');
  const [districtId, setDistrictId] = useState<string>(defaultProfile?.districtId ?? 'registon');
  const [address, setAddress] = useState(defaultProfile?.address ?? '');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [apartmentCode, setApartmentCode] = useState('');
  const [courierNote, setCourierNote] = useState('');
  const [coordinates, setCoordinates] = useState<GeoCoordinates>({ lat: 39.6542, lng: 66.9597 });
  const [deliverySlot, setDeliverySlot] = useState<string>('today_14_17');
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>('cash_on_delivery');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReceipt, setConfirmedReceipt] = useState<ConfirmedOrderReceipt | null>(null);

  useEffect(() => {
    if (!isOpen || !defaultProfile) return;
    if (!customerName && defaultProfile.fullName) setCustomerName(defaultProfile.fullName);
    if (customerPhone.trim() === '+998' && defaultProfile.phone.trim() !== '+998') {
      setCustomerPhone(defaultProfile.phone);
    }
    if (defaultProfile.districtId) setDistrictId(defaultProfile.districtId);
    if (!address && defaultProfile.address) setAddress(defaultProfile.address);
  }, [isOpen, defaultProfile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (items.length > 0 && confirmedReceipt) {
      setConfirmedReceipt(null);
    }
  }, [items.length, confirmedReceipt]);

  const bakeryMap = useMemo(
    () => new Map(bakeries.map((b) => [b.id, b])),
    [bakeries],
  );

  const sellerGroups = useMemo(() => {
    const grouped = new Map<string, CartLineItem[]>();
    for (const item of items) {
      const list = grouped.get(item.bakeryId) ?? [];
      list.push(item);
      grouped.set(item.bakeryId, list);
    }
    return Array.from(grouped.entries()).map(([bakeryId, groupItems]) => {
      const bakery = bakeryMap.get(bakeryId);
      const method = deliveryMethods[bakeryId] ?? DeliveryMethod.COURIER;
      const subtotalUzs = groupItems.reduce(
        (sum, line) => sum + line.unitPriceUzs * line.quantity,
        0,
      );
      const baseFee = bakery?.deliveryFeeUzs ?? 15000;
      const freeFrom = bakery?.freeDeliveryFromUzs ?? 250000;
      const deliveryFeeUzs =
        method === DeliveryMethod.PICKUP || subtotalUzs >= freeFrom ? 0 : baseFee;
      const remainingForFree = Math.max(0, freeFrom - subtotalUzs);

      return {
        bakeryId,
        bakeryName: bakery?.name ?? groupItems[0].bakeryName,
        bakeryOpenNow: bakery?.isOpenNow ?? true,
        bakeryWorkingHours: bakery?.workingHours ?? '09:00 – 21:00',
        items: groupItems,
        method,
        subtotalUzs,
        deliveryFeeUzs,
        remainingForFree,
      };
    });
  }, [items, bakeryMap, deliveryMethods]);

  const itemsSubtotal = useMemo(
    () => sellerGroups.reduce((sum, g) => sum + g.subtotalUzs, 0),
    [sellerGroups],
  );
  const totalDeliveryFee = useMemo(
    () => sellerGroups.reduce((sum, g) => sum + g.deliveryFeeUzs, 0),
    [sellerGroups],
  );
  const grandTotal = itemsSubtotal + totalDeliveryFee;
  const requiresAddress = sellerGroups.some((g) => g.method === DeliveryMethod.COURIER);

  if (!isOpen) return null;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (customerName.trim().length < 2) {
      setFormError(t.cart.nameError);
      return;
    }

    const digits = customerPhone.replace(/\D/g, '');
    if (!/^998\d{9}$/.test(digits)) {
      setFormError(t.cart.phoneError);
      return;
    }

    const finalAddress = [
      street.trim() ? `Ko'cha: ${street.trim()}` : '',
      houseNumber.trim() ? `Uy: ${houseNumber.trim()}` : '',
      apartmentCode.trim() ? `Xonadon/Pod'ezd: ${apartmentCode.trim()}` : '',
      address.trim() && !street.trim() ? address.trim() : '',
      courierNote.trim() ? `Kuryerga izoh: ${courierNote.trim()}` : '',
    ].filter(Boolean).join(', ') || address.trim();

    if (requiresAddress && finalAddress.length < 4) {
      setFormError(t.cart.addressRequiredError);
      return;
    }

    const sellerDeliveryPayload: Record<string, DeliveryMethod> = {};
    for (const group of sellerGroups) {
      sellerDeliveryPayload[group.bakeryId] = group.method;
    }

    setIsSubmitting(true);
    try {
      const receipt = await submitCustomerOrder({
        paymentMethod,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        districtId,
        address: finalAddress,
        coordinates: requiresAddress ? coordinates : undefined,
        courierNote: courierNote.trim() || undefined,
        deliverySlot,
        items: items.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          customNote: line.customNote || undefined,
          bakeryId: line.bakeryId,
          customCake: line.customCake,
        })),
        sellerDeliveryMethods: sellerDeliveryPayload,
      });

      if (receipt.paymentUrl) {
        window.location.assign(receipt.paymentUrl);
        return;
      }

      onOrderConfirmed(receipt);
      onClearCart();
      setConfirmedReceipt(receipt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'INVALID_NAME') setFormError(t.cart.nameError);
      else if (msg === 'INVALID_PHONE') setFormError(t.cart.phoneError);
      else if (msg === 'ADDRESS_REQUIRED') setFormError(t.cart.addressRequiredError);
      else if (msg.startsWith('PAYMENT_')) setFormError(t.cart.onlinePaymentError);
      else setFormError(t.cart.serverErrorFallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t.cart.title}
    >
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[var(--sm-border-subtle)] bg-[var(--sm-bg-elevated)] sm-lens shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[var(--sm-border-subtle)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[var(--sm-accent-primary)]" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
              {t.cart.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.cart.closeCart}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-[var(--sm-text-secondary)] hover:bg-[var(--sm-bg-subtle)] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {confirmedReceipt ? (
            <div className="space-y-5">
              <div className="rounded-[12px] border border-[var(--sm-status-success)]/35 bg-[var(--sm-status-success)]/10 p-5 space-y-3">
                <div className="flex items-center gap-2 text-[var(--sm-status-success)]">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <h3 className="font-display text-lg font-semibold">
                    {t.cart.orderConfirmedTitle}
                  </h3>
                </div>
                <p className="text-sm text-[var(--sm-text-secondary)]">
                  {t.cart.orderConfirmedSubtitle}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="rounded-[8px] bg-[var(--sm-bg-elevated)] p-2.5 border border-[var(--sm-border-subtle)]">
                    <span className="text-[var(--sm-text-muted)] block">Trek Kod:</span>
                    <span className="font-semibold text-[var(--sm-accent-primary)] text-sm">{confirmedReceipt.trackingCode || `#${confirmedReceipt.batchId}`}</span>
                  </div>
                  <div className="rounded-[8px] bg-[var(--sm-bg-elevated)] p-2.5 border border-[var(--sm-border-subtle)]">
                    <span className="text-[var(--sm-text-muted)] block">Yetkazish PIN (Kuryer uchun):</span>
                    <span className="font-semibold text-[var(--sm-status-success)] text-sm">{confirmedReceipt.handoverPin || '4829'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="font-mono text-xs font-semibold tabular-nums text-[var(--sm-text-primary)]">
                    {t.cart.orderBatchLabel}: #{confirmedReceipt.batchId}
                  </p>
                  {confirmedReceipt.coordinates && (
                    <a
                      href={`https://yandex.uz/maps/?pt=${confirmedReceipt.coordinates.lng},${confirmedReceipt.coordinates.lat}&z=17&l=map`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[var(--sm-accent-primary)] hover:underline"
                    >
                      {locale === 'uz' ? 'Xaritada ko‘rish (Yandex)' : 'Открыть на карте (Яндекс)'}
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {confirmedReceipt.sellerOrders.map((so) => (
                  <div
                    key={so.orderNumber}
                    className="rounded-[10px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans text-sm font-semibold text-[var(--sm-text-primary)]">
                        {so.bakeryName}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[var(--sm-accent-primary)]">
                        #{so.orderNumber}
                      </span>
                    </div>

                    <ul className="space-y-1.5 text-xs text-[var(--sm-text-secondary)]">
                      {so.items.map((item, idx) => (
                        <li
                          key={`${item.productId}-${idx}`}
                          className="flex items-baseline justify-between gap-2"
                        >
                          <span className="truncate">
                            {item.quantity} × {item.title[locale]} ({item.variantLabel[locale]})
                          </span>
                          <span className="font-mono tabular-nums shrink-0">
                            {formatUzsPrice(item.lineTotalUzs)} {t.common.currencyUzs}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Divider />

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--sm-text-muted)]">
                        {so.deliveryMethod === DeliveryMethod.PICKUP
                          ? t.cart.pickupNote
                          : `${t.cart.deliveryFeeLabel}: ${
                              so.deliveryFeeUzs === 0
                                ? t.cart.freeLabel
                                : `${formatUzsPrice(so.deliveryFeeUzs)} ${t.common.currencyUzs}`
                            }`}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[var(--sm-text-primary)]">
                        {formatUzsPrice(so.totalUzs)} {t.common.currencyUzs}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-[10px] bg-[var(--sm-bg-subtle)] px-4 py-3 text-sm font-semibold">
                <span>{t.cart.grandTotalLabel}</span>
                <span className="font-mono tabular-nums text-[var(--sm-accent-primary)]">
                  {formatUzsPrice(confirmedReceipt.grandTotalUzs)} {t.common.currencyUzs}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    onClose();
                    onViewOrderHistory();
                  }}
                >
                  {t.cart.viewOrderHistory}
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setConfirmedReceipt(null);
                    onClose();
                  }}
                >
                  {t.cart.continueShopping}
                </Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sm-bg-subtle)] text-[var(--sm-text-muted)]">
                <ShoppingBag className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h3 className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                  {t.cart.emptyTitle}
                </h3>
                <p className="text-sm text-[var(--sm-text-secondary)]">{t.cart.emptyBody}</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onBrowseCatalog();
                }}
              >
                {t.cart.browseCta}
              </Button>
            </div>
          ) : (
            <form id="sweetmarket-checkout-form" onSubmit={handleSubmitOrder} className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--sm-text-secondary)]">
                  {t.cart.sellerGroupNote}
                </p>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-xs font-medium text-[var(--sm-status-danger)] hover:underline cursor-pointer shrink-0"
                >
                  {t.cart.clearCart}
                </button>
              </div>

              {/* Multi-seller groups */}
              <div className="space-y-4">
                {sellerGroups.map((group) => (
                  <section
                    key={group.bakeryId}
                    className="rounded-[12px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="font-sans text-sm font-semibold text-[var(--sm-text-primary)]">
                          {group.bakeryName}
                        </h3>
                        <p className="text-[11px] text-[var(--sm-text-muted)] tabular-nums">
                          {group.bakeryWorkingHours} ·{' '}
                          <span
                            className={
                              group.bakeryOpenNow
                                ? 'text-[var(--sm-status-success)]'
                                : 'text-[var(--sm-text-muted)]'
                            }
                          >
                            {group.bakeryOpenNow
                              ? t.productCard.openNow
                              : t.productCard.closedNow}
                          </span>
                        </p>
                      </div>
                      <span className="font-mono text-xs font-medium tabular-nums text-[var(--sm-text-primary)]">
                        {formatUzsPrice(group.subtotalUzs)} {t.common.currencyUzs}
                      </span>
                    </div>

                    {/* Items inside this bakery */}
                    <div className="space-y-3">
                      {group.items.map((line) => (
                        <div
                          key={line.lineKey}
                          className="flex items-start gap-3 border-t border-[var(--sm-border-subtle)] pt-3"
                        >
                          <img
                            src={PRODUCT_MEDIA_MAP[line.mediaKey]}
                            alt=""
                            className="h-14 w-16 rounded-[6px] object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm font-medium text-[var(--sm-text-primary)] line-clamp-1">
                              {line.title[locale]}
                            </p>
                            <p className="text-xs text-[var(--sm-text-muted)]">
                              {line.variantLabel[locale]} ·{' '}
                              <span className="font-mono tabular-nums">
                                {formatUzsPrice(line.unitPriceUzs)} {t.common.currencyUzs}
                              </span>
                            </p>
                            {line.customNote && (
                              <p className="text-[11px] text-[var(--sm-accent-primary)]">
                                {t.cart.itemNotePrefix} {line.customNote}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <div className="inline-flex items-center rounded-[6px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-subtle)]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQuantity(line.lineKey, line.quantity - 1)
                                  }
                                  aria-label="-"
                                  className="inline-flex h-7 w-7 items-center justify-center text-[var(--sm-text-secondary)] hover:text-[var(--sm-text-primary)] cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center font-mono text-xs font-semibold tabular-nums">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQuantity(line.lineKey, line.quantity + 1)
                                  }
                                  aria-label="+"
                                  className="inline-flex h-7 w-7 items-center justify-center text-[var(--sm-text-secondary)] hover:text-[var(--sm-text-primary)] cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-semibold tabular-nums text-[var(--sm-text-primary)]">
                                  {formatUzsPrice(line.unitPriceUzs * line.quantity)}{' '}
                                  {t.common.currencyUzs}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onRemoveLine(line.lineKey)}
                                  aria-label="Remove"
                                  className="text-[var(--sm-text-muted)] hover:text-[var(--sm-status-danger)] cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Per-bakery delivery selector */}
                    <div className="space-y-2 border-t border-[var(--sm-border-subtle)] pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setDeliveryMethods((prev) => ({
                              ...prev,
                              [group.bakeryId]: DeliveryMethod.COURIER,
                            }))
                          }
                          aria-pressed={group.method === DeliveryMethod.COURIER}
                          className={[
                            'rounded-[7px] border px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                            group.method === DeliveryMethod.COURIER
                              ? 'border-[var(--sm-accent-primary)] bg-[var(--sm-accent-primary-soft)] text-[var(--sm-text-primary)]'
                              : 'border-[var(--sm-border-subtle)] text-[var(--sm-text-secondary)] hover:border-[var(--sm-border-strong)]',
                          ].join(' ')}
                        >
                          {t.cart.courierOption}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeliveryMethods((prev) => ({
                              ...prev,
                              [group.bakeryId]: DeliveryMethod.PICKUP,
                            }))
                          }
                          aria-pressed={group.method === DeliveryMethod.PICKUP}
                          className={[
                            'rounded-[7px] border px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                            group.method === DeliveryMethod.PICKUP
                              ? 'border-[var(--sm-accent-primary)] bg-[var(--sm-accent-primary-soft)] text-[var(--sm-text-primary)]'
                              : 'border-[var(--sm-border-subtle)] text-[var(--sm-text-secondary)] hover:border-[var(--sm-border-strong)]',
                          ].join(' ')}
                        >
                          {t.cart.pickupOption}
                        </button>
                      </div>

                      {group.method === DeliveryMethod.COURIER && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--sm-text-secondary)]">
                            {group.remainingForFree === 0
                              ? t.cart.freeDeliveryAchieved
                              : `${t.cart.freeDeliveryRemaining} ${formatUzsPrice(
                                  group.remainingForFree,
                                )} ${t.common.currencyUzs}`}
                          </span>
                          <span className="font-mono font-semibold tabular-nums text-[var(--sm-text-primary)]">
                            {group.deliveryFeeUzs === 0
                              ? t.cart.freeLabel
                              : `${formatUzsPrice(group.deliveryFeeUzs)} ${t.common.currencyUzs}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>

              <Divider />

              {/* Checkout Form */}
              <div className="space-y-4">
                <h3 className="font-display text-lg font-semibold text-[var(--sm-text-primary)]">
                  {t.cart.checkoutHeading}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <TextInput
                    label={t.cart.customerNameLabel}
                    placeholder={t.cart.customerNamePlaceholder}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                  <TextInput
                    label={t.cart.customerPhoneLabel}
                    placeholder={t.cart.customerPhonePlaceholder}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <SelectInput
                    label={t.cart.districtLabel}
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    options={DISTRICT_KEYS.map((key, idx) => ({
                      value: key,
                      label: t.catalog.districts[idx] ?? key,
                    }))}
                  />
                  <SelectInput
                    label={t.cart.deliverySlotLabel}
                    value={deliverySlot}
                    onChange={(e) => setDeliverySlot(e.target.value)}
                    options={t.cart.deliverySlots.map((slot) => ({
                      value: slot.id,
                      label: slot.label,
                    }))}
                  />
                </div>

                {requiresAddress && (
                  <SamarkandMapPicker
                    districtId={districtId}
                    onDistrictChange={setDistrictId}
                    address={address}
                    onAddressChange={setAddress}
                    street={street}
                    onStreetChange={setStreet}
                    houseNumber={houseNumber}
                    onHouseNumberChange={setHouseNumber}
                    apartmentCode={apartmentCode}
                    onApartmentCodeChange={setApartmentCode}
                    courierNote={courierNote}
                    onCourierNoteChange={setCourierNote}
                    customerPhone={customerPhone}
                    onCustomerPhoneChange={setCustomerPhone}
                    coordinates={coordinates}
                    onCoordinatesChange={setCoordinates}
                  />
                )}

                <fieldset className="rounded-[10px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-subtle)]/70 p-3.5 space-y-3">
                  <legend className="px-1 text-xs font-semibold text-[var(--sm-text-primary)]">
                    {t.cart.paymentMethodTitle}
                  </legend>
                  <label className="flex cursor-pointer items-start gap-3 rounded-[8px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] p-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash_on_delivery"
                      checked={paymentMethod === 'cash_on_delivery'}
                      onChange={() => setPaymentMethod('cash_on_delivery')}
                      className="mt-0.5 accent-[var(--sm-accent-primary)]"
                    />
                    <span className="text-xs font-medium text-[var(--sm-text-primary)]">
                      {t.cart.cashOnDeliveryLabel}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-[8px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] p-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="tolovgo"
                      checked={paymentMethod === 'tolovgo'}
                      onChange={() => setPaymentMethod('tolovgo')}
                      className="mt-0.5 accent-[var(--sm-accent-primary)]"
                    />
                    <span className="space-y-1 text-xs">
                      <span className="block font-medium text-[var(--sm-text-primary)]">
                        {t.cart.onlinePaymentLabel}
                      </span>
                      {paymentMethod === 'tolovgo' && (
                        <span className="block text-[var(--sm-text-secondary)]">
                          {t.cart.onlinePaymentHint}
                        </span>
                      )}
                    </span>
                  </label>
                  {paymentMethod === 'cash_on_delivery' && (
                    <p className="text-xs text-[var(--sm-text-secondary)]">
                      {t.cart.paymentMethodNote}
                    </p>
                  )}
                </fieldset>

                {formError && (
                  <p
                    role="alert"
                    className="rounded-[8px] border border-[var(--sm-status-danger)]/40 bg-[var(--sm-status-danger)]/10 px-3.5 py-2.5 text-xs font-medium text-[var(--sm-status-danger)]"
                  >
                    {formError}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Sticky Checkout Footer */}
        {items.length > 0 && !confirmedReceipt && (
          <div className="border-t border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] px-6 py-4 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-[var(--sm-text-secondary)]">
                <span>{t.cart.subtotalLabel}</span>
                <span className="font-mono tabular-nums">
                  {formatUzsPrice(itemsSubtotal)} {t.common.currencyUzs}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--sm-text-secondary)]">
                <span>{t.cart.deliveryFeeLabel}</span>
                <span className="font-mono tabular-nums">
                  {totalDeliveryFee === 0
                    ? t.cart.freeLabel
                    : `${formatUzsPrice(totalDeliveryFee)} ${t.common.currencyUzs}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-[var(--sm-text-primary)] pt-1">
                <span>{t.cart.grandTotalLabel}</span>
                <span className="font-mono tabular-nums text-[var(--sm-accent-primary)]">
                  {formatUzsPrice(grandTotal)} {t.common.currencyUzs}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              form="sweetmarket-checkout-form"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
            >
              {isSubmitting
                ? t.cart.submittingOrder
                : paymentMethod === 'tolovgo'
                  ? t.cart.onlinePaymentButton
                  : t.cart.placeOrderButton}
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
