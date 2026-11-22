import React from 'react';
import { AppShell } from './app/AppShell';
import { AppProviders } from './app/providers/AppProviders';
import { SplashScreen } from './components/navigation/SplashScreen';

export default function App() {
  return (
    <AppProviders>
      <AppShell />
      <SplashScreen />
    </AppProviders>
  );
}
