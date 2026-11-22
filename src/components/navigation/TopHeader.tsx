import React from 'react';
import { Menu, ShoppingBag } from 'lucide-react';
import { AppRouteId, CUSTOMER_NAV_ROUTES } from '../../app/routes';
import { BRAND_LOGO_PATH, PROFILE_AVATAR_PATH } from '../../assets/brandLogo';
import { Button } from '../../design-system/ui';
import { useTranslation } from '../../hooks/useTranslation';

export interface TopHeaderProps {
  activeRoute: AppRouteId;
  cartCount: number;
  favoritesCount: number;
  onNavigate: (route: AppRouteId) => void;
  onOpenMobileMenu: () => void;
  onOpenCart: () => void;
}

export function TopHeader({
  activeRoute,
  cartCount,
  favoritesCount,
  onNavigate,
  onOpenMobileMenu,
  onOpenCart,
}: TopHeaderProps) {
  const { t } = useTranslation();

  const labelMap: Record<AppRouteId, string> = {
    marketplace: t.nav.marketplace,
    catalog: t.nav.catalog,
    artisans: t.nav.artisans,
    favorites: t.nav.favorites,
    profile: t.nav.profile,
    'sign-in': 'Sign in',
    'seller-onboarding': t.nav.seller,
    seller: t.nav.seller,
    admin: 'Admin',
    system: t.nav.system,
  };

  const isProfileActive = activeRoute === 'profile';

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] sm-lens">
      <div className="mx-auto flex h-14 md:h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-10">
        {/* Zone 1: Single-line Brand Lockup (Logo + Wordmark) */}
        <button
          type="button"
          onClick={() => onNavigate('marketplace')}
          className="inline-flex items-center gap-2.5 font-display text-xl sm:text-[22px] font-semibold tracking-tight text-[var(--sm-text-primary)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sm-focus-ring)] rounded-sm"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-[8px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] shrink-0">
            <img
              src={BRAND_LOGO_PATH}
              alt=""
              className="h-full w-full object-cover scale-[1.85]"
            />
          </span>
          <span>{t.brand.name}</span>
        </button>

        {/* Zone 2: Concise Single-Line Customer Navigation Links */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-7">
          {CUSTOMER_NAV_ROUTES.map((route) => {
            const isActive = activeRoute === route.id;
            const showFavCount = route.id === 'favorites' && favoritesCount > 0;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => onNavigate(route.id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'relative inline-flex items-center gap-1.5 py-1 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150',
                  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sm-focus-ring)] rounded-sm',
                  isActive
                    ? 'text-[var(--sm-text-primary)]'
                    : 'text-[var(--sm-text-secondary)] hover:text-[var(--sm-text-primary)]',
                ].join(' ')}
              >
                <span>{labelMap[route.id]}</span>
                {showFavCount && (
                  <span className="font-mono text-[11px] tabular-nums text-[var(--sm-accent-primary)]">
                    ({favoritesCount})
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[19px] h-[2px] bg-[var(--sm-accent-primary)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Cart Action + Photo-Only Circular Profile Icon + Mobile Menu */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:block">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ShoppingBag className="w-4 h-4" />}
              onClick={onOpenCart}
            >
              <span>{t.nav.cart}</span>
              {cartCount > 0 && (
                <span className="font-mono text-xs tabular-nums">({cartCount})</span>
              )}
            </Button>
          </div>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={t.nav.cart}
            className="md:hidden inline-flex items-center gap-1.5 px-2.5 h-9 rounded-[8px] bg-[var(--sm-accent-primary)] text-[var(--sm-text-inverse)] text-xs font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sm-focus-ring)]"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span className="font-mono tabular-nums">{cartCount}</span>
          </button>

          {/* Circular photo-only profile icon */}
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            aria-label={t.nav.profile}
            aria-current={isProfileActive ? 'page' : undefined}
            className={[
              'inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 transition-all cursor-pointer shrink-0',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sm-focus-ring)]',
              isProfileActive
                ? 'border-[var(--sm-accent-primary)] ring-2 ring-[var(--sm-accent-primary)]/30'
                : 'border-[var(--sm-border-strong)] hover:border-[var(--sm-accent-primary)]',
            ].join(' ')}
          >
            <img
              src={PROFILE_AVATAR_PATH}
              alt={t.nav.profile}
              className="h-full w-full object-cover scale-110"
            />
          </button>

          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label={t.nav.openMenu}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-[8px] text-[var(--sm-text-primary)] hover:bg-[var(--sm-bg-subtle)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sm-focus-ring)]"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
