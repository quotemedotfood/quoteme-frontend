import { Outlet } from 'react-router';
import { AppProviders } from './AppProviders';
import { ImpersonationBanner } from './ImpersonationBanner';

export function RootWrapper() {
  return (
    <AppProviders>
      <ImpersonationBanner />
      <Outlet />
    </AppProviders>
  );
}
