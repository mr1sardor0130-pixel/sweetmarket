import { useState } from 'react';
import { allowAuthNavigation, authClient, clearAuthNavigation } from '../services/auth-client';
import { useTranslation } from '../hooks/useTranslation';
import { loginSellerAccount } from '../services/api/client';

type AccountType = 'customer' | 'seller';

export function AuthPage({ onClose }: { onClose: () => void }) {
  const { locale } = useTranslation();
  const [accountType, setAccountType] = useState<AccountType>('customer');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('');
  const [emailOrLogin, setEmailOrLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const uz = locale === 'uz';

  const finish = () => {
    allowAuthNavigation();
    window.location.assign(accountType === 'seller' ? '/seller' : '/profile');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (accountType === 'seller') {
        await loginSellerAccount({ login: emailOrLogin.trim(), password });
        finish();
        return;
      }
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({ name: name.trim(), email: emailOrLogin.trim(), password })
          : await authClient.signIn.email({ email: emailOrLogin.trim(), password });
      if (result.error) throw new Error(result.error.message || 'AUTH_FAILED');
      finish();
    } catch {
      setError(uz ? 'Kirish ma’lumotlarini tekshirib, qayta urinib ko‘ring.' : 'Проверьте данные и попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  const signInSocial = async (provider: 'google' | 'telegram') => {
    setError('');
    setBusy(true);
    try {
      allowAuthNavigation();
      const result = await authClient.signIn.social({ provider, callbackURL: accountType === 'seller' ? '/seller' : '/profile' });
      if (result.error) throw new Error(result.error.message || 'AUTH_FAILED');
    } catch {
      clearAuthNavigation();
      setError(uz ? 'Ijtimoiy tarmoq orqali kirish vaqtincha mavjud emas.' : 'Вход через этот сервис временно недоступен.');
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[70vh] px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-3xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] p-6 shadow-xl sm:p-8">
        <button type="button" onClick={onClose} className="mb-5 text-sm font-medium text-[var(--sm-text-secondary)] hover:text-[var(--sm-text-primary)]">
          {uz ? '← Do‘konga qaytish' : '← Вернуться в магазин'}
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sm-accent-primary)]">SweetMarket</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--sm-text-primary)]">{uz ? 'Hisobingizga kiring' : 'Войдите в аккаунт'}</h1>
        <p className="mt-2 text-sm text-[var(--sm-text-secondary)]">{uz ? 'Xaridorlar va sotuvchilar uchun yagona kirish' : 'Единый вход для покупателей и продавцов'}</p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-[var(--sm-bg-canvas)] p-1" role="tablist" aria-label={uz ? 'Hisob turi' : 'Тип аккаунта'}>
          {(['customer', 'seller'] as const).map((type) => (
            <button key={type} role="tab" aria-selected={accountType === type} type="button" onClick={() => { setAccountType(type); setMode('sign-in'); setError(''); }} className={`rounded-lg px-3 py-2.5 text-sm font-medium ${accountType === type ? 'bg-[var(--sm-bg-surface)] text-[var(--sm-text-primary)] shadow-sm' : 'text-[var(--sm-text-secondary)]'}`}>
              {type === 'customer' ? (uz ? 'Xaridor' : 'Покупатель') : (uz ? 'Sotuvchi' : 'Продавец')}
            </button>
          ))}
        </div>

        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
          {accountType === 'customer' && mode === 'sign-up' && (
            <label className="block text-sm font-medium text-[var(--sm-text-primary)]">{uz ? 'Ism' : 'Имя'}
              <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] px-3.5 py-3 outline-none focus:border-[var(--sm-accent-primary)]" />
            </label>
          )}
          <label className="block text-sm font-medium text-[var(--sm-text-primary)]">{accountType === 'seller' ? (uz ? 'Login yoki telefon' : 'Логин или телефон') : 'Email'}
            <input required type={accountType === 'customer' ? 'email' : 'text'} autoComplete={mode === 'sign-up' ? 'email' : 'username'} value={emailOrLogin} onChange={(event) => setEmailOrLogin(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] px-3.5 py-3 outline-none focus:border-[var(--sm-accent-primary)]" />
          </label>
          <label className="block text-sm font-medium text-[var(--sm-text-primary)]">{uz ? 'Parol' : 'Пароль'}
            <input required type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} minLength={accountType === 'customer' ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] px-3.5 py-3 outline-none focus:border-[var(--sm-accent-primary)]" />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} type="submit" className="w-full rounded-xl bg-[var(--sm-accent-primary)] px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
            {busy ? (uz ? 'Kutilmoqda…' : 'Подождите…') : accountType === 'seller' || mode === 'sign-in' ? (uz ? 'Kirish' : 'Войти') : (uz ? 'Hisob yaratish' : 'Создать аккаунт')}
          </button>
        </form>

        {accountType === 'customer' && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-[var(--sm-text-secondary)]"><span className="h-px flex-1 bg-[var(--sm-border-subtle)]" />{uz ? 'yoki davom eting' : 'или продолжите'}<span className="h-px flex-1 bg-[var(--sm-border-subtle)]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={busy} onClick={() => void signInSocial('google')} className="rounded-xl border border-[var(--sm-border-subtle)] px-3 py-3 text-sm font-medium text-[var(--sm-text-primary)] hover:bg-[var(--sm-bg-canvas)]">Google</button>
              <button type="button" disabled={busy} onClick={() => void signInSocial('telegram')} className="rounded-xl border border-[var(--sm-border-subtle)] px-3 py-3 text-sm font-medium text-[var(--sm-text-primary)] hover:bg-[var(--sm-bg-canvas)]">Telegram</button>
            </div>
            <p className="mt-5 text-center text-sm text-[var(--sm-text-secondary)]">
              {mode === 'sign-in' ? (uz ? 'Hisobingiz yo‘qmi?' : 'Нет аккаунта?') : (uz ? 'Hisobingiz bormi?' : 'Уже зарегистрированы?')}{' '}
              <button type="button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} className="font-semibold text-[var(--sm-accent-primary)]">{mode === 'sign-in' ? (uz ? 'Ro‘yxatdan o‘ting' : 'Зарегистрируйтесь') : (uz ? 'Kirish' : 'Войти')}</button>
            </p>
          </>
        )}
        {accountType === 'seller' && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-[var(--sm-text-secondary)]"><span className="h-px flex-1 bg-[var(--sm-border-subtle)]" />{uz ? 'yoki ijtimoiy tarmoq orqali' : 'или через соцсеть'}<span className="h-px flex-1 bg-[var(--sm-border-subtle)]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={busy} onClick={() => void signInSocial('google')} className="rounded-xl border border-[var(--sm-border-subtle)] px-3 py-3 text-sm font-medium text-[var(--sm-text-primary)] hover:bg-[var(--sm-bg-canvas)]">Google</button>
              <button type="button" disabled={busy} onClick={() => void signInSocial('telegram')} className="rounded-xl border border-[var(--sm-border-subtle)] px-3 py-3 text-sm font-medium text-[var(--sm-text-primary)] hover:bg-[var(--sm-bg-canvas)]">Telegram</button>
            </div>
            <p className="mt-5 text-xs leading-5 text-[var(--sm-text-secondary)]">{uz ? 'Ijtimoiy tarmoq orqali kirgandan so‘ng, sotuvchi hisobini administrator bergan login va parol bilan tasdiqlang.' : 'После входа через соцсеть подтвердите кабинет продавца логином и паролем от администратора.'}</p>
          </>
        )}
      </section>
    </main>
  );
}
