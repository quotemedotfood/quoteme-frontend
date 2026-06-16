// BrandShellLayout — persistent shell for all /brand/* routes.
//
// Wired to NewspaperShell (Desi brand-suite-060626) per the handoff README.
// RoleSidebar on desktop (≥768px), NewspaperMobileShell on mobile.
//
// Role guard: non-brand roles redirect to their canonical landing.
// Nav contract (final, do not reorder):
//   dashboard    → /brand
//   capture      → /brand/capture
//   catalog      → /brand/catalog
//   packages     → /brand/packages
//   distributors → /brand/distributors
//   notifications → /brand/notifications
//   team         → /brand/team
//   settings     → /brand/settings   (bottom-pinned)
//   profile      → /brand/profile    (via Settings sub)
//
// Doctrine: brands receive NO quotes. No "New Quote", no "Quotes", no
// "Customers", no incoming-quote surfaces anywhere in this shell.
//
// SCOPE GUARD: this shell is brand-only. Chef/rep/distributor desktop shells
// are NOT converted to NewspaperShell — that sweep is held for Moose's call.

import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { NewspaperShell } from '../newspaper/NewspaperShell';
import type { NewspaperShellProps } from '../newspaper/NewspaperShell';

// ─── Types ────────────────────────────────────────────────────────────────────

type BrandNavTab =
  | 'dashboard'
  | 'catalog'
  | 'capture'
  | 'packages'
  | 'distributors'
  | 'notifications'
  | 'team'
  | 'settings'
  | 'profile';

// ─── Context ──────────────────────────────────────────────────────────────────

interface BrandShellContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

export const BrandShellContext = createContext<BrandShellContextValue>({
  sidebarOpen: true,
  setSidebarOpen: () => {},
});

export function useBrandShell() {
  return useContext(BrandShellContext);
}

// ─── Active tab derivation ────────────────────────────────────────────────────

function activeTabFromPath(pathname: string): BrandNavTab {
  if (pathname.startsWith('/brand/catalog'))       return 'catalog';
  if (pathname.startsWith('/brand/capture'))       return 'capture';
  if (pathname.startsWith('/brand/packages'))      return 'packages';
  if (pathname.startsWith('/brand/distributors'))  return 'distributors';
  if (pathname.startsWith('/brand/notifications')) return 'notifications';
  if (pathname.startsWith('/brand/team'))          return 'team';
  if (pathname.startsWith('/brand/settings'))      return 'settings';
  if (pathname.startsWith('/brand/profile'))       return 'profile';
  return 'dashboard';
}

// ─── Responsive variant hook ──────────────────────────────────────────────────

function useVariant(): 'desktop' | 'mobile' {
  const [variant, setVariant] = useState<'desktop' | 'mobile'>(
    () => (window.innerWidth >= 768 ? 'desktop' : 'mobile'),
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setVariant(mq.matches ? 'desktop' : 'mobile');
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return variant;
}

// ─── brandNav builder ─────────────────────────────────────────────────────────

function buildBrandNav(
  navigate: (path: string) => void,
): NewspaperShellProps['nav'] {
  return [
    {
      group: 'THE DAILY WORK',
      items: [
        { id: 'dashboard',     icon: 'layout-grid',  label: 'Dashboard',     onClick: () => navigate('/brand') },
        { id: 'capture',       icon: 'scan-line',    label: 'Capture',       onClick: () => navigate('/brand/capture') },
        { id: 'packages',      icon: 'package',      label: 'Packages',      onClick: () => navigate('/brand/packages') },
        { id: 'notifications', icon: 'bell',         label: 'Notifications', onClick: () => navigate('/brand/notifications') },
      ],
    },
    {
      group: 'YOUR LINE',
      items: [
        { id: 'catalog',       icon: 'notebook-text', label: 'Catalog',      onClick: () => navigate('/brand/catalog') },
      ],
    },
    {
      group: 'NETWORK',
      items: [
        { id: 'distributors',  icon: 'truck',         label: 'Distributors', onClick: () => navigate('/brand/distributors') },
        { id: 'team',          icon: 'users',         label: 'Team',         onClick: () => navigate('/brand/team') },
      ],
    },
  ];
}

function buildBrandSettings(navigate: (path: string) => void, onSignOut: () => void) {
  return {
    id: 'settings' as const,
    icon: 'settings',
    label: 'Settings',
    onClick: () => navigate('/brand/settings'),
    sub: [
      { label: 'Company', onClick: () => navigate('/brand/settings') },
      { label: 'Profile', onClick: () => navigate('/brand/profile') },
      { label: 'Billing', onClick: () => navigate('/brand/settings') },
      // B-PORTAL-01: brand portal had no sign-out (logout was wired in useAuth but
      // never surfaced). Add it to the Settings menu.
      { label: 'Sign out', onClick: onSignOut },
    ],
  };
}

// ─── BrandShellLayout ─────────────────────────────────────────────────────────

export function BrandShellLayout() {
  const { user, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const variant = useVariant();

  // Brand guard: non-brand roles must never land here.
  if (!isLoading && user && user.role !== 'brand') {
    const landing =
      user.role === 'quoteme_admin'     ? '/qm-admin' :
      user.role === 'distributor_admin' ? '/distributor-admin' :
      user.role === 'rep'               ? '/rep/quotes/inbound' :
      '/dashboard';
    return <Navigate to={landing} replace />;
  }

  const active = activeTabFromPath(location.pathname);
  const brandName = user?.brand?.name ?? user?.first_name ?? 'Brand';
  const brandMono = brandName.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();

  const identity = {
    eyebrow: 'BRAND',
    title: brandName,
    sub: user?.brand?.category ?? undefined,
    mono: brandMono,
    initials: brandMono,
  };

  const nav = buildBrandNav(navigate);
  const settings = buildBrandSettings(navigate, () => {
    logout();
    navigate('/auth');
  });

  return (
    <BrandShellContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <NewspaperShell
        variant={variant}
        edition="Brand Edition"
        identity={identity}
        nav={nav}
        active={active}
        settings={settings}
        onNav={(path) => navigate(path)}
        maxWidth={860}
      >
        <Outlet />
      </NewspaperShell>
    </BrandShellContext.Provider>
  );
}
