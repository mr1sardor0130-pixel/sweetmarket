import React, { useEffect } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { AppRouteId, CUSTOMER_NAV_ROUTES } from '../../app/routes';
import { BRAND_LOGO_PATH, PROFILE_AVATAR_PATH } from '../../assets/brandLogo';
import { Button, Divider } from '../../design-system/ui';
import { useTranslation } from '../../hooks/useTranslation';
import { ProductCategory } from '../../types';

export interface MobileNavDrawerProps {
  isOpen: boolean;
  activeRoute: AppRouteId;
  selectedCategory: ProductCategory | 'all';
  cartCount: number;
  onClose: () => void;
  onNavigate: (route: AppRouteId) => void;
  onSelectCategory: (category: ProductCategory | 'all') => void;
  onOpenCart: () => void;
}

const MOBILE_CATEGORIES: ProductCategory[] = [
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

export function MobileNavDrawer({
  isOpen,
  activeRoute,
  selectedCategory,
  cartCount,
  onClose,
  onNavigate,
  onSelectCategory,
  onOpenCart,
}: MobileNavDrawerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const labelMap: Record<AppRouteId, string> = {
    marketplace: t.nav.marketplace,
    catalog: t.nav.catalog,
    artisans: t.nav.artisans,
    favorites: t.nav.favorites,
    profile: t.nav.profile,
    'sign-in': 'Sign in',
    seller: t.nav.seller,
    admin: 'Admin',
    system: t.nav.system,
  };

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t.brand.name}
    >
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 right-0 w-full max-w-xs bg-[var(--sm-bg-elevated)] sm-lens border-l border-[var(--sm-border-subtle)] p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-[7px] border border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] shrink-0">
                <img
                  src={BRAND_LOGO_PATH}
                  alt=""
                  className="h-full w-full object-cover scale-[1.85]"
                />
              </span>
              <span className="font-display text-xl font-semibold text-[var(--sm-text-primary)]">
                {t.brand.name}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.nav.closeMenu}
              className="inline-flex items-center justify-center w-11 h-11 rounded-[8px] text-[var(--sm-text-secondary)] hover:bg-[var(--sm-bg-subtle)] cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <Divider className="my-5" />

          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {CUSTOMER_NAV_ROUTES.map((route) => {
              const active = activeRoute === route.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => {
                    onNavigate(route.id);
                    onClose();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'w-full text-left px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors cursor-pointer',
                    active
                      ? 'bg-[var(--sm-accent-primary-soft)] text-[var(--sm-accent-primary)]'
                      : 'text-[var(--sm-text-primary)] hover:bg-[var(--sm-bg-subtle)]',
                  ].join(' ')}
                >
                  {labelMap[route.id]}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                onNavigate('profile');
                onClose();
              }}
              aria-current={activeRoute === 'profile' ? 'page' : undefined}
              className={[
                'w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors cursor-pointer',
                activeRoute === 'profile'
                  ? 'bg-[var(--sm-accent-primary-soft)] text-[var(--sm-accent-primary)]'
                  : 'text-[var(--sm-text-primary)] hover:bg-[var(--sm-bg-subtle)]',
              ].join(' ')}
            >
              <img
                src={PROFILE_AVATAR_PATH}
                alt=""
                className="h-6 w-6 rounded-full object-cover scale-110"
              />
              <span>{t.nav.profile}</span>
            </button>
          </nav>

          <Divider className="my-5" />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--sm-text-muted)]">
              {t.sidebar.categoriesTitle}
            </p>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('all');
                  onNavigate('catalog');
                  onClose();
                }}
                className={[
                  'w-full text-left px-3 py-2 rounded-[6px] text-xs font-medium transition-colors cursor-pointer',
                  selectedCategory === 'all'
                    ? 'bg-[var(--sm-accent-primary-soft)] text-[var(--sm-accent-primary)]'
                    : 'text-[var(--sm-text-secondary)] hover:bg-[var(--sm-bg-subtle)]',
                ].join(' ')}
              >
                {t.sidebar.allCategories}
              </button>
              {MOBILE_CATEGORIES.map((categoryId) => (
                <button
                  key={categoryId}
                  type="button"
                  onClick={() => {
                    onSelectCategory(categoryId);
                    onNavigate('catalog');
                    onClose();
                  }}
                  className={[
                    'w-full text-left px-3 py-1.5 rounded-[6px] text-xs transition-colors cursor-pointer',
                    selectedCategory === categoryId
                      ? 'bg-[var(--sm-accent-primary-soft)] font-semibold text-[var(--sm-accent-primary)]'
                      : 'text-[var(--sm-text-secondary)] hover:bg-[var(--sm-bg-subtle)]',
                  ].join(' ')}
                >
                  {t.categoriesMap[categoryId]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6">
          <Button
            variant="primary"
            fullWidth
            leftIcon={<ShoppingBag className="w-4 h-4" />}
            onClick={() => {
              onClose();
              onOpenCart();
            }}
          >
            {t.nav.cart} {cartCount > 0 ? `(${cartCount})` : ''}
          </Button>
        </div>
      </aside>
    </div>
  );
}
