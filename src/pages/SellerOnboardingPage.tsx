import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { submitSellerOnboarding } from '../services/api/client';

type ShopType = 'bakery' | 'confectionery' | 'restaurant' | 'cafe' | 'home_kitchen' | 'grocery' | 'other';

type SellerOnboardingPageProps = {
  initialName: string;
  onClose: () => void;
};

const shopTypeOptions: { value: ShopType; uz: string; ru: string }[] = [
  { value: 'bakery', uz: 'Nonvoyxona', ru: 'Пекарня' },
  { value: 'confectionery', uz: 'Qandolat ustaxonasi', ru: 'Кондитерская' },
  { value: 'home_kitchen', uz: 'Uy oshxonasi', ru: 'Домашняя кухня' },
  { value: 'restaurant', uz: 'Restoran', ru: 'Ресторан' },
  { value: 'cafe', uz: 'Kafe', ru: 'Кафе' },
  { value: 'grocery', uz: 'Oziq-ovqat do‘koni', ru: 'Продуктовый магазин' },
  { value: 'other', uz: 'Boshqa', ru: 'Другое' },
];

export function SellerOnboardingPage({ initialName, onClose }: SellerOnboardingPageProps) {
  const { locale } = useTranslation();
  const uz = locale === 'uz';
  const [name, setName] = useState(initialName);
  const [shopType, setShopType] = useState<ShopType>('bakery');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!name.trim() && initialName.trim()) setName(initialName);
  }, [initialName, name]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await submitSellerOnboarding({ name, shopType, phone, district, address, description });
      setIsSaved(true);
    } catch {
      setError(uz ? 'Saqlash amalga oshmadi. Ma’lumotlarni tekshirib, qayta urinib ko‘ring.' : 'Не удалось сохранить. Проверьте данные и попробуйте ещё раз.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName = 'mt-1.5 w-full rounded-xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] px-3.5 py-3 text-sm text-[var(--sm-text-primary)] outline-none focus:border-[var(--sm-accent-primary)]';
  const labelClassName = 'block text-sm font-medium text-[var(--sm-text-primary)]';

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] p-6 shadow-xl sm:p-8">
        <button type="button" onClick={onClose} className="mb-5 text-sm font-medium text-[var(--sm-text-secondary)] hover:text-[var(--sm-text-primary)]">
          {uz ? '← Do‘konga qaytish' : '← Вернуться в магазин'}
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sm-accent-primary)]">SweetMarket</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--sm-text-primary)]">{uz ? 'Sotuvchi profilingiz' : 'Профиль продавца'}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--sm-text-secondary)]">
          {uz ? 'Do‘koningiz haqida ma’lumot kiriting.' : 'Расскажите о вашем магазине.'}
        </p>

        {isSaved ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900" role="status" aria-live="polite">
            <p className="font-semibold">{uz ? 'Ma’lumotlar saqlandi' : 'Данные сохранены'}</p>
            <p className="mt-1">{uz ? 'Sotuvchi profilingiz yangilandi.' : 'Профиль продавца обновлён.'}</p>
            <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-[var(--sm-accent-primary)] px-4 py-2.5 font-semibold text-white hover:opacity-90">
              {uz ? 'Do‘konga qaytish' : 'Вернуться в магазин'}
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label htmlFor="seller-shop-name" className={labelClassName}>
              {uz ? 'Do‘kon nomi' : 'Название магазина'}
              <input id="seller-shop-name" required minLength={2} maxLength={100} autoComplete="organization" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
            </label>
            <label htmlFor="seller-shop-type" className={labelClassName}>
              {uz ? 'Faoliyat turi' : 'Тип магазина'}
              <select id="seller-shop-type" value={shopType} onChange={(event) => setShopType(event.target.value as ShopType)} className={inputClassName}>
                {shopTypeOptions.map((option) => <option key={option.value} value={option.value}>{uz ? option.uz : option.ru}</option>)}
              </select>
            </label>
            <label htmlFor="seller-phone" className={labelClassName}>
              {uz ? 'Telefon raqami' : 'Номер телефона'}
              <input id="seller-phone" required type="tel" inputMode="tel" autoComplete="tel" maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClassName} />
            </label>
            <label htmlFor="seller-district" className={labelClassName}>
              {uz ? 'Tuman' : 'Район'}
              <input id="seller-district" required maxLength={80} value={district} onChange={(event) => setDistrict(event.target.value)} className={inputClassName} />
            </label>
            <label htmlFor="seller-address" className={`${labelClassName} sm:col-span-2`}>
              {uz ? 'Manzil' : 'Адрес'}
              <input id="seller-address" required maxLength={300} autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} className={inputClassName} />
            </label>
            <label htmlFor="seller-description" className={`${labelClassName} sm:col-span-2`}>
              {uz ? 'Do‘kon haqida' : 'О магазине'}
              <textarea id="seller-description" rows={4} maxLength={600} value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClassName} resize-y`} />
            </label>
            {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button disabled={isSaving} type="submit" className="rounded-xl bg-[var(--sm-accent-primary)] px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60 sm:col-span-2">
              {isSaving ? (uz ? 'Saqlanmoqda…' : 'Сохраняем…') : (uz ? 'Ma’lumotlarni saqlash' : 'Сохранить данные')}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
