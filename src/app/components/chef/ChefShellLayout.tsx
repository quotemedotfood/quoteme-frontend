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

type ActiveTab = 'home' | 'order-guides' | 'distributors' | 'settings';

function activeTabFromPath(pathname: string): ActiveTab {
  if (pathname.startsWith('/chef/order-guide')) return 'order-guides';
  if (pathname.startsWith('/chef/quotes')) return 'home'; // Quotes destination
  if (pathname.startsWith('/chef/catalog')) return 'distributors';
  if (pathname.startsWith('/chef/settings')) return 'settings';
  // /dashboard and anything else → home
  return 'home';
}

export function ChefShellLayout() {
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

  // Stage 1: all tab nav routes to /dashboard. ChefDashboardPage handles
  // intra-page tab switching via its own activeTab state.
  // c53-bis: pass clicked tab through navigate state to open the right tab.
  const navTab = (target: string) => {
    if (target === 'entry') return navigate('/chef/entry');
    if (target === 'tab-home') return navigate('/dashboard');
    if (target === 'tab-order-guides') return navigate('/dashboard');
    if (target === 'tab-distributors') return navigate('/dashboard');
    if (target === 'tab-settings') return navigate('/dashboard');
  };

  return isDesktop ? (
    <ChefTabDesktopShell active={activeTab} nav={navTab}>
      <Outlet />
    </ChefTabDesktopShell>
  ) : (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="flex-1 overflow-auto chef-scroller">
        <Outlet />
      </div>
      <ChefTabBar active={activeTab} nav={navTab} />
    </div>
  );
}
