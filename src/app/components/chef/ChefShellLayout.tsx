// ChefShellLayout — React Router v6 nested layout for chef-shell routes.
//
// Wraps /dashboard, /chef/quotes, /chef/quotes/:id, /chef/order-guide/:id,
// and /chef/catalog with the chef chrome (ChefTabDesktopShell on desktop,
// ChefTabBar on mobile). Mounted inside RootLayout so ChefTopbar renders
// above it.
//
// activeTab is derived from useLocation().pathname so sidebar/bar highlight
// stays in sync with direct URL navigation.
//
// Stage 1 nav decision: all tab clicks that resolve outside the current page
// route to /dashboard. ChefDashboardPage internally handles its own
// activeTab state for intra-page tab switching (Overview/Distributors/Settings).
// Deferred: passing clicked tab through navigate state so ChefDashboardPage
// can open on the right tab without extra roundtrip. File as c53-bis.
//
// Routes intentionally OUTSIDE this shell (per Eleven's lock):
//   /chef/welcome, /chef/signup, /chef/entry, /chef/status/:id, /chef
//   (arrival, pre-auth, transient, or guest-flow surfaces)

import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { ChefTabBar, ChefTabDesktopShell } from './';
import { useAuth } from '../../contexts/AuthContext';

type ActiveTab = 'home' | 'dashboard' | 'order-guides' | 'distributors' | 'settings';
type SidebarMode = 'open' | 'collapsed' | 'hidden';

function initialModeFromPath(pathname: string): SidebarMode {
  // Detail surfaces default to Compact (in-flow density)
  if (pathname.startsWith('/chef/quotes/') && pathname !== '/chef/quotes') return 'collapsed';
  if (pathname.startsWith('/chef/order-guide/')) return 'collapsed';
  // Stack compare-spread (/chef/menus/:menuId/stack) — wide table view, collapsed sidebar
  if (/^\/chef\/menus\/[^/]+\/stack/.test(pathname)) return 'collapsed';
  // Menu detail (/chef/menus/:id) — document view
  if (/^\/chef\/menus\/[^/]+/.test(pathname)) return 'collapsed';
  // Browse surfaces default to Full
  // /dashboard, /chef/quotes (no :id), /chef/menus (index), /chef/catalog
  return 'open';
}

function activeTabFromPath(pathname: string): ActiveTab {
  if (pathname.startsWith('/chef/order-guide')) return 'order-guides';
  if (pathname.startsWith('/chef/quotes')) return 'home'; // Quotes destination
  if (pathname.startsWith('/chef/menus')) return 'home'; // Menus sit under the Quotes/home tab
  if (pathname.startsWith('/chef/catalog')) return 'distributors';
  if (pathname.startsWith('/chef/distributor')) return 'distributors';
  // /chef/stack — My Stack manage view lives under Distributors in the IA
  if (pathname === '/chef/stack' || pathname.startsWith('/chef/stack/')) return 'distributors';
  // /chef/pull/entry — the pull-quote entry surface lives under Distributors
  // in the IA: a chef picks a distributor first, then lands here.
  if (pathname.startsWith('/chef/pull')) return 'distributors';
  if (pathname.startsWith('/chef/settings')) return 'settings';
  // c73: /dashboard maps explicitly to 'dashboard' tab
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard')) return 'dashboard';
  return 'home';
}

export function ChefShellLayout() {
  // All hooks must be called unconditionally before any early return to
  // satisfy the Rules of Hooks. Role check + bypass happens after.
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = activeTabFromPath(location.pathname);

  const [isDesktop, setIsDesktop] = useState<boolean>(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Bug #4: /dashboard is mounted inside this layout via routes.tsx so that
  // chef/buyer/group_admin users get the chef chrome (sidebar + tab bar).
  // DashboardRoleRouter correctly branches content by role, but the layout
  // wraps unconditionally — meaning a rep at /dashboard previously saw the
  // chef tab bar over their rep dashboard. Role-guard here pulls the chef
  // chrome off non-chef-role users. Outer RootLayout still owns rep chrome.
  const isChefShellUser = user?.role === 'chef' || user?.role === 'buyer' || user?.role === 'group_admin';
  if (!isChefShellUser) return <Outlet />;

  // Stage 1: all tab nav routes to /dashboard, passing the clicked tab
  // through navigate state so ChefDashboardPage can open on the right tab.
  // c53-bis: implemented — activeTab passed via state arg.
  const navTab = (target: string) => {
    if (target === 'entry') return navigate('/chef/entry');
    if (target === 'distributor-new') return navigate('/chef/distributor/new');
    if (target === 'tab-dashboard') return navigate('/dashboard', { state: { activeTab: 'home' } });
    // Quotes has a dedicated route — navigate there directly (c135)
    if (target === 'tab-home') return navigate('/chef/quotes');
    if (target === 'tab-distributors') return navigate('/chef/distributor/new');
    if (target === 'tab-stack') return navigate('/chef/stack');
    if (target === 'tab-settings') return navigate('/dashboard', { state: { activeTab: 'settings' } });
  };

  return isDesktop ? (
    <ChefTabDesktopShell
      active={activeTab}
      nav={navTab}
      initialMode={initialModeFromPath(location.pathname)}
    >
      <Outlet />
    </ChefTabDesktopShell>
  ) : (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="flex-1 overflow-auto chef-scroller" style={{ paddingBottom: 68 }}>
        <Outlet />
      </div>
      <ChefTabBar active={activeTab === 'dashboard' ? 'home' : activeTab} nav={navTab} />
    </div>
  );
}
