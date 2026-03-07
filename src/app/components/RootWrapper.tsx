import { Outlet } from 'react-router';
import { AppProviders } from './AppProviders';

export function RootWrapper() {
  return (
    <AppProviders>
      <Outlet />
    </AppProviders>
  );
}
