import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, LoaderCircle, MapPin, Store } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { createSellerTestPayment, submitSellerOnboarding, verifySellerTestPayment } from '../services/api/client';

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
  { value: 'grocery', uz: 'Oziq-ovqat do‘koni', ru: 'Продуктовый do‘kon' },
  { value: 'other', uz: 'Boshqa', ru: 'Другое' },
];

function coordinatesFromMapsUrl(value: string): { latitude: number | null; longitude: number | null } {
  const match = value.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ??
    value.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  return match ? { latitude: Number(match[1]), longitude: Number(match[2]) } : { latitude: null, longitude: null };
}

export function SellerOnboardingPage({ initialName, onClose }: SellerOnboardingPageProps) {
  const { locale } = useTranslation();
  const uz = locale === 'uz';
  const [name, setName] = useState(initialName);
  const [shopType, setShopType] = useState<ShopType>('restaurant');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isShopSaved, setIsShopSaved] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [testPaymentAmount, setTestPaymentAmount] = useState(1000);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  useEffect(() => {
    if (!name.trim() && initialName.trim()) setName(initialName);
  }, [initialName, name]);

  useEffect(() => {
    if (!paymentId) return;
    let active = true;
    const check = async () => {
      try {
        const status = await verifySellerTestPayment(paymentId);
        if (active && status === 'paid') setError(uz ? 'Test to‘lovi tasdiqlandi. Arizangiz administrator ko‘rib chiqishida; kabinet tasdiqlangandan keyin ochiladi.' : 'Тестовый платёж подтверждён. Заявка ожидает проверки администратора; кабинет откроется после одобрения.');
        if (active && status === 'failed') setError(uz ? 'Test to‘lovi amalga oshmadi. Arizangiz baribir administrator ko‘rib chiqishiga yuborildi.' : 'Тестовый платёж не прошёл. Заявка всё равно отправлена администратору на рассмотрение.');
      } catch {
        if (active) setError(uz ? 'To‘lov holatini tekshirib bo‘lmadi. Qayta tekshirib ko‘ring.' : 'Не удалось проверить статус. Попробуйте ещё раз.');
      }
    };
    const timer = window.setInterval(() => void check(), 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [paymentId, uz]);

  const startPayment = async (paymentWindow: Window | null = null) => {
    setError('');
    setIsCreatingPayment(true);
    try {
      const payment = await createSellerTestPayment();
      setTestPaymentAmount(payment.amountUzs);
      setPaymentId(payment.paymentId);
      setPaymentUrl(payment.paymentUrl);
      if (paymentWindow) paymentWindow.location.href = payment.paymentUrl;
      else window.open(payment.paymentUrl, '_blank', 'noopener,noreferrer');
    } catch {
      paymentWindow?.close();
      setError(uz ? 'TolovGo to‘lovini yaratib bo‘lmadi. Qayta urinib ko‘ring yoki to‘lovsiz davom eting.' : 'Не удалось создать платёж TolovGo. Попробуйте ещё раз или продолжите без оплаты.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    const action = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const paymentWindow = action?.value === 'pay' ? window.open('about:blank', '_blank') : null;
    const coords = coordinatesFromMapsUrl(googleMapsUrl);
    const parsedLatitude = latitude ? Number(latitude) : coords.latitude;
    const parsedLongitude = longitude ? Number(longitude) : coords.longitude;
    try {
      await submitSellerOnboarding({
        name, shopType, phone, district, address, description, googleMapsUrl,
        latitude: Number.isFinite(parsedLatitude) ? parsedLatitude : null,
        longitude: Number.isFinite(parsedLongitude) ? parsedLongitude : null,
      });
      setIsShopSaved(true);
      if (action?.value === 'pay') await startPayment(paymentWindow);
    } catch {
      paymentWindow?.close();
      setError(uz ? 'Ma’lumotlarni saqlab bo‘lmadi. Maydonlarni tekshirib, qayta urinib ko‘ring.' : 'Не удалось сохранить данные. Проверьте поля и попробуйте ещё раз.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName = 'mt-2 w-full rounded-xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] px-4 py-3 text-sm text-[var(--sm-text-primary)] outline-none transition focus:border-[var(--sm-accent-primary)] focus:ring-2 focus:ring-[var(--sm-accent-primary)]/15';
  const labelClassName = 'block text-sm font-medium text-[var(--sm-text-primary)]';

  return (
    <main className="min-h-screen bg-[var(--sm-bg-canvas)] px-4 py-6 text-[var(--sm-text-primary)] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={onClose} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--sm-text-secondary)] transition hover:text-[var(--sm-text-primary)]">
          <ArrowLeft size={16} aria-hidden="true" />{uz ? 'Do‘konga qaytish' : 'Вернуться в магазин'}
        </button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <section className="rounded-3xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] p-5 shadow-sm sm:p-8">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--sm-accent-primary-soft)] text-[var(--sm-accent-primary)]">
                <Store size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sm-accent-primary)]">SweetMarket · 01</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{uz ? 'Sotuvchi arizasi' : 'Заявка продавца'}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sm-text-secondary)]">
                  {uz ? 'Qandolatxonangiz, aloqa ma’lumotlari va manzilini yuboring. Arizangizni administrator ko‘rib chiqadi; bitta hisobga bitta do‘kon biriktiriladi.' : 'Укажите кондитерскую, контакты и адрес. Администратор рассмотрит заявку; к одному аккаунту привязывается один магазин.'}
                </p>
              </div>
            </div>

            {isShopSaved ? (
              <div className="rounded-2xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-canvas)] p-5" role="status" aria-live="polite">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-[var(--sm-accent-primary)]" size={22} aria-hidden="true" />
                  <div>
                    <h2 className="font-semibold">{uz ? 'Arizangiz administratorga yuborildi' : 'Заявка отправлена администратору'}</h2>
                    <p className="mt-1 text-sm text-[var(--sm-text-secondary)]">{uz ? 'Ariza administrator tasdig‘ini kutmoqda. TolovGo testi ixtiyoriy va kabinetga kirish huquqini bermaydi.' : 'Заявка ожидает одобрения администратора. Тест TolovGo необязателен и не открывает доступ к кабинету.'}</p>
                  </div>
                </div>
                {paymentUrl && <a href={paymentUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] px-4 py-3 text-sm font-semibold hover:border-[var(--sm-accent-primary)]"><ArrowUpRight size={16} aria-hidden="true" />{uz ? `TolovGo sahifasi · ${testPaymentAmount.toLocaleString('uz-UZ')} so‘m` : `TolovGo · ${testPaymentAmount.toLocaleString('ru-RU')} сум`}</a>}
                {paymentId && <p className="mt-4 flex items-center gap-2 text-sm text-[var(--sm-text-secondary)]"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" />{uz ? `${testPaymentAmount.toLocaleString('uz-UZ')} so‘m to‘lov tasdiqlanishi kutilmoqda…` : `Ожидаем подтверждения платежа ${testPaymentAmount.toLocaleString('ru-RU')} сум…`}</p>}
                {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={() => void startPayment(window.open('about:blank', '_blank'))} disabled={isCreatingPayment} className="rounded-xl bg-[var(--sm-accent-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                    {isCreatingPayment ? (uz ? 'TolovGo ochilmoqda…' : 'Открываем TolovGo…') : (uz ? 'TolovGo test to‘lovini boshlash' : 'Начать тестовый платёж TolovGo')}
                  </button>
                  <button type="button" onClick={onClose} className="rounded-xl border border-[var(--sm-border-subtle)] px-5 py-3 text-sm font-semibold hover:bg-[var(--sm-bg-canvas)]">{uz ? 'Do‘konga qaytish' : 'Вернуться в магазин'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={(event) => void submit(event)} className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                <label htmlFor="seller-shop-name" className={labelClassName}>{uz ? 'Qandolatxona / do‘kon nomi' : 'Название кондитерской / магазина'}<input id="seller-shop-name" required minLength={2} maxLength={100} autoComplete="organization" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} /></label>
                <label htmlFor="seller-shop-type" className={labelClassName}>{uz ? 'Faoliyat turi' : 'Тип заведения'}<select id="seller-shop-type" value={shopType} onChange={(event) => setShopType(event.target.value as ShopType)} className={inputClassName}>{shopTypeOptions.map((option) => <option key={option.value} value={option.value}>{uz ? option.uz : option.ru}</option>)}</select></label>
                <label htmlFor="seller-phone" className={labelClassName}>{uz ? 'Telefon raqami' : 'Номер телефона'}<input id="seller-phone" required type="tel" inputMode="tel" autoComplete="tel" maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClassName} /></label>
                <label htmlFor="seller-district" className={labelClassName}>{uz ? 'Shahar / tuman' : 'Город / район'}<input id="seller-district" required maxLength={80} value={district} onChange={(event) => setDistrict(event.target.value)} className={inputClassName} /></label>
                <label htmlFor="seller-address" className={`${labelClassName} sm:col-span-2`}>{uz ? 'Ko‘cha manzili' : 'Адрес'}<input id="seller-address" required maxLength={300} autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} className={inputClassName} /></label>
                <label htmlFor="seller-map-url" className={`${labelClassName} sm:col-span-2`}>
                  <span className="inline-flex items-center gap-2"><MapPin size={16} aria-hidden="true" />{uz ? 'Google Maps havolasi' : 'Ссылка Google Maps'}</span>
                  <input id="seller-map-url" type="url" inputMode="url" placeholder="https://maps.app.goo.gl/..." value={googleMapsUrl} onChange={(event) => { setGoogleMapsUrl(event.target.value); const point = coordinatesFromMapsUrl(event.target.value); if (point.latitude !== null) setLatitude(String(point.latitude)); if (point.longitude !== null) setLongitude(String(point.longitude)); }} className={inputClassName} />
                  <span className="mt-1 block text-xs font-normal leading-5 text-[var(--sm-text-secondary)]">{uz ? 'Xaritada joyni ochib, “Ulashish” havolasini shu yerga joylang. Koordinatalar havoladan aniqlansa, avtomatik to‘ldiriladi.' : 'Скопируйте ссылку через «Поделиться» в Google Maps. Координаты из ссылки заполнятся автоматически, если доступны.'}</span>
                </label>
                <label htmlFor="seller-latitude" className={labelClassName}>{uz ? 'Kenglik (ixtiyoriy)' : 'Широта (необязательно)'}<input id="seller-latitude" type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)} className={inputClassName} /></label>
                <label htmlFor="seller-longitude" className={labelClassName}>{uz ? 'Uzunlik (ixtiyoriy)' : 'Долгота (необязательно)'}<input id="seller-longitude" type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)} className={inputClassName} /></label>
                <label htmlFor="seller-description" className={`${labelClassName} sm:col-span-2`}>{uz ? 'Biznes haqida' : 'О заведении'}<textarea id="seller-description" rows={4} maxLength={600} value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClassName} resize-y`} /></label>
                {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
                <div className="flex flex-col gap-3 border-t border-[var(--sm-border-subtle)] pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
                  <button name="action" value="skip" disabled={isSaving} type="submit" className="rounded-xl border border-[var(--sm-border-subtle)] px-5 py-3 text-sm font-semibold transition hover:bg-[var(--sm-bg-canvas)] disabled:opacity-60">{isSaving ? (uz ? 'Saqlanmoqda…' : 'Сохраняем…') : (uz ? 'To‘lovsiz davom etish' : 'Продолжить без оплаты')}</button>
                  <button name="action" value="pay" disabled={isSaving} type="submit" className="rounded-xl bg-[var(--sm-accent-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">{isSaving ? (uz ? 'Saqlanmoqda…' : 'Сохраняем…') : (uz ? 'Saqlash va test to‘lovini boshlash' : 'Сохранить и начать тестовый платёж')}</button>
                </div>
              </form>
            )}
          </section>

          <aside className="rounded-3xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] p-5 lg:sticky lg:top-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sm-text-secondary)]">{uz ? 'Keyingi qadamlar' : 'Дальше'}</p>
            <ol className="mt-5 flex flex-col gap-5">
              <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--sm-accent-primary-soft)] text-xs font-bold text-[var(--sm-accent-primary)]">1</span><div><p className="text-sm font-semibold">{uz ? 'Qandolatxonani ro‘yxatdan o‘tkazing' : 'Зарегистрируйте кондитерскую'}</p><p className="mt-1 text-xs leading-5 text-[var(--sm-text-secondary)]">{uz ? 'Har bir sotuvchi hisobiga bitta qandolatxona.' : 'Одна кондитерская на аккаунт продавца.'}</p></div></li>
              <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--sm-bg-canvas)] text-xs font-bold text-[var(--sm-text-secondary)]">2</span><div><p className="text-sm font-semibold">{uz ? 'Manzilni xaritada belgilang' : 'Отметьте место на карте'}</p><p className="mt-1 text-xs leading-5 text-[var(--sm-text-secondary)]">{uz ? 'Google Maps havolasi yoki koordinatalar.' : 'Ссылка Google Maps или координаты.'}</p></div></li>
              <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--sm-bg-canvas)] text-xs font-bold text-[var(--sm-text-secondary)]">3</span><div><p className="text-sm font-semibold">{uz ? 'Administrator tasdig‘ini kuting' : 'Дождитесь одобрения'}</p><p className="mt-1 text-xs leading-5 text-[var(--sm-text-secondary)]">{uz ? 'Arizani administrator tekshiradi; tasdiqlangach kabinet ochiladi.' : 'Администратор проверит заявку, после одобрения откроется кабинет.'}</p></div></li>
            </ol>
            <div className="mt-6 rounded-2xl bg-[var(--sm-bg-canvas)] p-4 text-xs leading-5 text-[var(--sm-text-secondary)]">{uz ? 'TolovGo testi ixtiyoriy. To‘lov ariza tasdig‘i o‘rnini bosmaydi; sotuvchi kabineti faqat administrator tasdiqlagandan keyin ochiladi.' : 'Тест TolovGo необязателен. Оплата не заменяет одобрение заявки; кабинет продавца откроется только после подтверждения администратором.'}</div>
          </aside>
        </div>
      </div>
    </main>
  );
}
