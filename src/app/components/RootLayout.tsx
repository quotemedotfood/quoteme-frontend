import { Outlet, Navigate } from 'react-router';
import { AppSidebar } from './AppSidebar';
import { ChefTopbar } from './ChefTopbar';
import { AuthSyncProvider } from './AuthSyncProvider';
import { DemoBanner } from './DemoBanner';
import { isDemoMode } from '../utils/demoMode';
import { useAuth } from '../contexts/AuthContext';

export function RootLayout() {
  const demo = isDemoMode();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!demo && !isAuthenticated && !isLoading) {
    return <Navigate to="/auth" replace />;
  }

  // V2 fix (smoke P0-A): chef-role users get a minimal layout — wordmark +
  // identity + sign-out only, no AppSidebar. Distributors/Locations/Quotes
  // routes don't exist as chef-facing surfaces in V2 scope, so showing
  // rep-flavored nav to a chef is both confusing and 404-prone. Rep flow is
  // unchanged.
  const isChef = user?.role === 'chef';

  if (isChef) {
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