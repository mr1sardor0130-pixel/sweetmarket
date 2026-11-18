'use client';

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({ baseURL: window.location.origin });

export function allowAuthNavigation() {
  (window as Window & { __sweetMarketAuthNavigation?: boolean }).__sweetMarketAuthNavigation = true;
}

export function clearAuthNavigation() {
  delete (window as Window & { __sweetMarketAuthNavigation?: boolean }).__sweetMarketAuthNavigation;
}
