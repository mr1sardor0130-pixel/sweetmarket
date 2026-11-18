import { useCallback } from 'react';
import useSWR from 'swr';
import { SavedDeliveryAddress } from '../types';

const PROFILE_STORAGE_KEY = 'sweetmarket_customer_profile';
export type PaymentPreference = 'cash_on_delivery' | 'card_on_delivery';

export interface CustomerProfile {
  fullName: string;
  phone: string;
  districtId: string;
  address: string;
  birthDate: string;
  preferredPayment: PaymentPreference;
  notifyOrders: boolean;
  notifyPromos: boolean;
  savedAddresses: SavedDeliveryAddress[];
}

const DEFAULT_PROFILE: CustomerProfile = {
  fullName: '',
  phone: '+998 ',
  districtId: 'registon',
  address: '',
  birthDate: '',
  preferredPayment: 'cash_on_delivery',
  notifyOrders: true,
  notifyPromos: true,
  savedAddresses: [],
};

function normalizeAddresses(raw: unknown): SavedDeliveryAddress[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is SavedDeliveryAddress => Boolean(item) && typeof item === 'object' && typeof (item as SavedDeliveryAddress).id === 'string' && typeof (item as SavedDeliveryAddress).address === 'string')
    .map((item) => ({
      id: item.id,
      label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : 'Manzil',
      districtId: typeof item.districtId === 'string' && item.districtId ? item.districtId : 'registon',
      address: item.address.trim(),
      note: typeof item.note === 'string' ? item.note.trim() : '',
      isDefault: Boolean(item.isDefault),
    }));
}

function normalizeProfile(raw: Record<string, unknown> | null, fullName = ''): CustomerProfile {
  if (!raw) return { ...DEFAULT_PROFILE, fullName };
  return {
    fullName,
    phone: typeof raw.phone === 'string' && raw.phone ? raw.phone : '+998 ',
    districtId: typeof raw.districtId === 'string' && raw.districtId ? raw.districtId : 'registon',
    address: typeof raw.address === 'string' ? raw.address : '',
    birthDate: typeof raw.birthDate === 'string' ? raw.birthDate : '',
    preferredPayment: raw.preferredPayment === 'card_on_delivery' ? 'card_on_delivery' : 'cash_on_delivery',
    notifyOrders: typeof raw.notifyOrders === 'boolean' ? raw.notifyOrders : true,
    notifyPromos: typeof raw.notifyPromos === 'boolean' ? raw.notifyPromos : true,
    savedAddresses: normalizeAddresses(raw.savedAddresses),
  };
}

async function loadProfile(userId: string): Promise<CustomerProfile> {
  const response = await fetch('/api/customer/profile', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Could not load customer profile');
  const data = await response.json() as { profile: Record<string, unknown> | null; fullName: string };
  if (!data.profile && typeof window !== 'undefined') {
    try {
      const legacy = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (legacy) {
        const saved = JSON.parse(legacy) as Partial<CustomerProfile>;
        const migrated = { ...DEFAULT_PROFILE, ...saved, fullName: data.fullName };
        await fetch('/api/customer/profile', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(migrated),
        });
        window.localStorage.removeItem(PROFILE_STORAGE_KEY);
        return migrated;
      }
    } catch {
      // Keep the account usable if browser-local profile data is malformed.
    }
  }
  return normalizeProfile(data.profile, data.fullName);
}

export function useCustomerProfile(userId?: string) {
  const { data, mutate } = useSWR(userId ? `customer-profile:${userId}` : null, () => loadProfile(userId!), {
    fallbackData: { ...DEFAULT_PROFILE },
    revalidateOnFocus: false,
  });
  const profile = data ?? DEFAULT_PROFILE;

  const save = useCallback((next: CustomerProfile) => {
    void mutate(next, { revalidate: false });
    if (userId) {
      void fetch('/api/customer/profile', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    }
  }, [mutate, userId]);

  const updateProfile = useCallback((next: Partial<CustomerProfile>) => {
    save({ ...profile, ...next });
  }, [profile, save]);

  const addSavedAddress = useCallback((input: { label: string; districtId: string; address: string; note?: string; makeDefault?: boolean }) => {
    const cleanAddress = input.address.trim();
    if (!cleanAddress) return;
    const shouldDefault = input.makeDefault || profile.savedAddresses.length === 0;
    const entry: SavedDeliveryAddress = {
      id: `addr-${crypto.randomUUID()}`,
      label: input.label.trim() || 'Uy',
      districtId: input.districtId || 'registon',
      address: cleanAddress,
      note: input.note?.trim() || '',
      isDefault: shouldDefault,
    };
    save({
      ...profile,
      ...(shouldDefault ? { districtId: entry.districtId, address: entry.address } : {}),
      savedAddresses: shouldDefault
        ? [entry, ...profile.savedAddresses.map((item) => ({ ...item, isDefault: false }))]
        : [...profile.savedAddresses, entry],
    });
  }, [profile, save]);

  const setDefaultSavedAddress = useCallback((addressId: string) => {
    const target = profile.savedAddresses.find((item) => item.id === addressId);
    if (!target) return;
    save({
      ...profile,
      districtId: target.districtId,
      address: target.address,
      savedAddresses: profile.savedAddresses.map((item) => ({ ...item, isDefault: item.id === addressId })),
    });
  }, [profile, save]);

  const removeSavedAddress = useCallback((addressId: string) => {
    const remaining = profile.savedAddresses.filter((item) => item.id !== addressId);
    if (remaining.length && !remaining.some((item) => item.isDefault)) remaining[0] = { ...remaining[0], isDefault: true };
    const nextDefault = remaining.find((item) => item.isDefault);
    save({
      ...profile,
      ...(nextDefault ? { districtId: nextDefault.districtId, address: nextDefault.address } : {}),
      savedAddresses: remaining,
    });
  }, [profile, save]);

  const resetProfile = useCallback(() => save({ ...DEFAULT_PROFILE }), [save]);
  return { profile, updateProfile, addSavedAddress, setDefaultSavedAddress, removeSavedAddress, resetProfile };
}
