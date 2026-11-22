export type AppRouteId =
  | 'marketplace'
  | 'catalog'
  | 'artisans'
  | 'favorites'
  | 'profile'
  | 'sign-in'
  | 'seller-onboarding'
  | 'seller'
  | 'admin'
  | 'system';

export type RolePerspective = 'customer' | 'seller' | 'admin';

export interface NavRouteConfig {
  id: AppRouteId;
  path: string;
}

export const CUSTOMER_NAV_ROUTES: NavRouteConfig[] = [
  { id: 'marketplace', path: '/' },
  { id: 'catalog', path: '/catalog' },
  { id: 'artisans', path: '/artisans' },
  { id: 'favorites', path: '/favorites' },
];

export const PRIMARY_NAV_ROUTES: NavRouteConfig[] = CUSTOMER_NAV_ROUTES;

export const SYSTEM_ROUTE: NavRouteConfig = { id: 'system', path: '/system' };
