import React from 'react';
import { AppRouteId, CUSTOMER_NAV_ROUTES } from '../../app/routes';
import { BRAND_LOGO_PATH } from '../../assets/brandLogo';
import { Divider } from '../../design-system/ui';
import { useTranslation } from '../../hooks/useTranslation';

export interface FooterProps {
  onNavigate: (route: AppRouteId) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { t } = useTranslation();

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
    <footer className="border-t border-[var(--sm-border-subtle)] bg-[var(--sm-bg-surface)] sm-lens pb-20 md:pb-10">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5 space-y-3">
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
            <p className="max-w-md text-sm leading-relaxed text-[var(--sm-text-secondary)]">
              {t.footer.aboutText}
            </p>
            <p className="text-xs font-medium text-[var(--sm-text-muted)]">
              {t.footer.regionNote}
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="font-sans text-xs font-semibold text-[var(--sm-text-primary)]">
              {t.footer.modulesTitle}
            </h3>
            <ul className="space-y-2 text-sm text-[var(--sm-text-secondary)]">
              {CUSTOMER_NAV_ROUTES.map((route) => (
                <li key={route.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(route.id)}
                    className="hover:text-[var(--sm-text-primary)] transition-colors cursor-pointer"
                  >
                    {labelMap[route.id]}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h3 className="font-sans text-xs font-semibold text-[var(--sm-text-primary)]">
              {t.footer.platformTitle}
            </h3>
            <p className="text-sm text-[var(--sm-text-secondary)]">{t.brand.tagline}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[var(--sm-text-muted)]">
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="cursor-pointer transition-colors hover:text-[var(--sm-text-primary)]"
              >
                {t.nav.profile}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onNavigate('system')}
                className="cursor-pointer transition-colors hover:text-[var(--sm-text-primary)]"
              >
                {t.nav.systemLink}
              </button>
            </div>
          </div>
        </div>

        <Divider className="my-8" />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--sm-text-muted)]">
          <span>{t.footer.copyright}</span>
          <span>{t.brand.region}</span>
        </div>
      </div>
    </footer>
  );
}
