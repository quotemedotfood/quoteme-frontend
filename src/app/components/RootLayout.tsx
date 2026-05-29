import { Outlet, Navigate, useLocation } from 'react-router';
import { AppSidebar } from './AppSidebar';
import { ChefTopbar } from './ChefTopbar';
import { AuthSyncProvider } from './AuthSyncProvider';
import { DemoBanner } from './DemoBanner';
import { isDemoMode } from '../utils/demoMode';
import { isBuyerRole } from '../utils/roles';
import { useAuth } from '../contexts/AuthContext';
import { guestTokenBypassesAuthGuard } from '../utils/routeGuard';

export function RootLayout() {
  const demo = isDemoMode();
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // P0 (Bug #1 / route-guard): /chef/quotes/:id is the chef receipt and must
  // render for a guest who holds a quoteme_guest_token in localStorage.
  // guestTokenBypassesAuthGuard() reads localStorage synchronously BEFORE the
  // Navigate redirect fires — this is the critical ordering that lets returning
  // unauthenticated chefs see their emailed quote link without being bounced to
  // /auth. The BE endpoint authenticates the token via Chef::BaseController's
  // X-Guest-Token header; see src/app/utils/routeGuard.ts for path scoping.
  const isGuestChefReceipt =
    !isAuthenticated && guestTokenBypassesAuthGuard(location.pathname);

  if (!demo && !isAuthenticated && !isLoading && !isGuestChefReceipt) {
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

  // Track 13: role guard for /chef/* routes. The chef flow is for chef /
  // group_admin users (+ buyers, who are chef-adjacent) and unauthenticated
  // guests building a quote via magic link. Before this guard, an
  // authenticated rep / distributor_admin / quoteme_admin who navigated to a
  // /chef/* path fell through to the rep AppSidebar layout with the chef page
  // mounted inside it — the page then 500'd on chef-token rejection ("Session
  // not found or expired"), and the rep saw chef UI they shouldn't. Redirect
  // those roles to their own landing BEFORE the page mounts/fetches.
  //
  // Guests (not authenticated) pass through untouched — the guest chef-build
  // flow (/chef/entry, /chef/welcome, /chef/status, /chef/quotes/:id) must
  // stay open. The isAuthenticated gate above already bounced unauthenticated
  // non-guests to /auth.
  //
  // V1 LOCK: /chef/entry requires auth. V2 chef-discovery flow
  // (chef arrives without rep relationship) will need a NEW entry
  // surface, NOT removing this guard. See Justin doctrine
  // 2026-05-28 Q-Entry: lock behavior, not model.
  const CHEF_FLOW_ROLES = ['chef', 'group_admin'];
  if (
    isAuthenticated &&
    location.pathname.startsWith('/chef') &&
    !isGuestChefReceipt &&
    !CHEF_FLOW_ROLES.includes(user?.role ?? '') &&
    !isBuyerRole(user?.role)
  ) {
    const landing =
      user?.role === 'quoteme_admin' ? '/qm-admin' :
      user?.role === 'distributor_admin' ? '/distributor-admin' :
      '/dashboard';
    return <Navigate to={landing} replace />;
  }

  // V2 fix (smoke P0-A): chef-role + group_admin users get the minimal chef
  // layout — wordmark + identity + sign-out only, no AppSidebar.
  // Distributors/Locations/Quotes routes don't exist as chef-facing surfaces
  // in V2 scope, so showing rep-flavored nav to a chef is both confusing and
  // 404-prone. Buyer stays on AppSidebar; rep flow unchanged.
  // P0 (Bug #1): a guest viewing the chef receipt has no user/role yet;
  // without this override they'd render the rep AppSidebar around the
  // receipt. Force the minimal chef layout for that case.
  const isChefLayout =
    isGuestChefReceipt || ['chef', 'group_admin'].includes(user?.role ?? '');

  if (isChefLayout) {
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