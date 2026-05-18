import { Outlet, Navigate, useLocation } from 'react-router';
import { AppSidebar } from './AppSidebar';
import { AuthSyncProvider } from './AuthSyncProvider';
import { DemoBanner } from './DemoBanner';
import { isDemoMode } from '../utils/demoMode';
import { useAuth } from '../contexts/AuthContext';
import { ChefTabDesktopShell } from './chef/ChefTabDesktopShell';
import { ChefTopbar } from './ChefTopbar';

export function RootLayout() {
  const demo = isDemoMode();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!demo && !isAuthenticated && !isLoading) {
    return <Navigate to="/auth" replace />;
  }

  // Don't paint a layout until AuthContext finishes its initial /me roundtrip.
  // Without this guard, chef users briefly see the rep AppSidebar before
  // role-routing resolves (FOUC).
  if (!demo && isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#FBFAF7' }}
      >
        <div
          className="w-10 h-10 rounded-full border-4 border-[#E8E8E8] border-t-[#F9A64B]"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // V2 fix (smoke P0-A): chef-role users get their own layout with
  // NewspaperSidebar (desktop) + ChefMobileTabBar (mobile). The
  // /chef/welcome magic-link arrival page is excluded — it stays minimal
  // with no sidebar chrome (per V3 Part 6 lock). Rep flow unchanged.
  const isChef = user?.role === 'chef';
  const { pathname } = useLocation();

  if (isChef) {
    // /chef/welcome is the magic-link envelope arrival page. Per V3 lock
    // it stays minimal — no sidebar, no mobile tab bar.
    if (pathname === '/chef/welcome') {
      return (
        <AuthSyncProvider>
          <div className="flex flex-col min-h-screen bg-[#FBFAF7]">
            <ChefTopbar />
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </AuthSyncProvider>
      );
    }

    return (
      <AuthSyncProvider>
        <ChefTabDesktopShell />
      </AuthSyncProvider>
    );
  }

  return (
    <AuthSyncProvider>
      <div className="flex h-screen bg-[#FFF9F3]">
        {!demo && <AppSidebar />}
        <div className="flex-1 flex flex-col overflow-hidden">
          {demo && <DemoBanner />}
          <main className="flex-1 overflow-auto pb-24 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
    </AuthSyncProvider>
  );
}