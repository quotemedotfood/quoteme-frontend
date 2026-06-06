// BrandShellLayout — persistent shell for all /brand/* routes.
//
// DESIGN-SWAP SEAM: NewspaperMobileShell (Desi) replaces this wrapper's markup
// when Desi's brand visual layer lands. The nav contract below is final —
// routes, active-tab derivation, and auth guard stay unchanged; only the
// surrounding markup/styles swap.
//
// Nav contract (final, do not reorder):
//   dashboard    → /brand
//   catalog      → /brand/catalog
//   packages     → /brand/packages
//   distributors → /brand/distributors
//   notifications → /brand/notifications
//   settings     → /brand/settings
//   profile      → /brand/profile
//
// Doctrine: brands receive NO quotes. No "New Quote", no "Quotes", no
// "Customers", no incoming-quote surfaces anywhere in this shell.

import { createContext, useContext, useState } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type BrandNavTab =
  | 'dashboard'
  | 'catalog'
  | 'packages'
  | 'distributors'
  | 'notifications'
  | 'settings'
  | 'profile';

// ─── Context (sidebar mode, for future drawer control) ────────────────────────

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
  if (pathname.startsWith('/brand/catalog')) return 'catalog';
  if (pathname.startsWith('/brand/packages')) return 'packages';
  if (pathname.startsWith('/brand/distributors')) return 'distributors';
  if (pathname.startsWith('/brand/notifications')) return 'notifications';
  if (pathname.startsWith('/brand/settings')) return 'settings';
  if (pathname.startsWith('/brand/profile')) return 'profile';
  return 'dashboard';
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  sidebar: '#F5F4F1',
  gray500: '#6B7280',
  gray700: '#4F4F4F',
  activeInk: '#1A1A1A',
  activeBg: '#EDECE8',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{ tab: BrandNavTab; label: string; path: string }> = [
  { tab: 'dashboard',     label: 'Dashboard',     path: '/brand' },
  { tab: 'catalog',       label: 'Catalog',        path: '/brand/catalog' },
  { tab: 'packages',      label: 'Packages',       path: '/brand/packages' },
  { tab: 'distributors',  label: 'Distributors',   path: '/brand/distributors' },
  { tab: 'notifications', label: 'Notifications',  path: '/brand/notifications' },
  { tab: 'settings',      label: 'Settings',       path: '/brand/settings' },
  { tab: 'profile',       label: 'Profile',        path: '/brand/profile' },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  active: BrandNavTab;
  brandName: string;
  onNav: (path: string) => void;
  onLogout: () => void;
}

function BrandSidebar({ active, brandName, onNav, onLogout }: SidebarProps) {
  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        background: C.sidebar,
        borderRight: `1px solid ${C.softLine}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: `1px solid ${C.softLine}`,
        }}
      >
        <div
          style={{
            ...serif,
            fontSize: 18,
            fontWeight: 700,
            color: C.charcoal,
            letterSpacing: '-0.01em',
          }}
        >
          QuoteMe
        </div>
        <div
          style={{
            ...sans,
            fontSize: 11,
            color: C.gray500,
            marginTop: 2,
            fontWeight: 500,
          }}
        >
          {brandName}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV_ITEMS.map(({ tab, label, path }) => {
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onNav(path)}
              style={{
                ...sans,
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 20px',
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? C.activeInk : C.gray700,
                background: isActive ? C.activeBg : 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0,
                transition: 'background 0.1s',
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* Bottom: sign out */}
      <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.softLine}` }}>
        <button
          type="button"
          onClick={onLogout}
          style={{
            ...sans,
            fontSize: 12,
            color: C.gray500,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── BrandShellLayout ─────────────────────────────────────────────────────────

export function BrandShellLayout() {
  const { user, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Brand guard: non-brand roles must never land here.
  if (!isLoading && user && user.role !== 'brand') {
    const landing =
      user.role === 'quoteme_admin' ? '/qm-admin' :
      user.role === 'distributor_admin' ? '/distributor-admin' :
      user.role === 'rep' ? '/rep/quotes/inbound' :
      '/dashboard';
    return <Navigate to={landing} replace />;
  }

  const active = activeTabFromPath(location.pathname);
  const brandName = user?.brand?.name ?? user?.first_name ?? 'Brand';

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <BrandShellContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#fff',
          ...sans,
        }}
      >
        {/* Sidebar — DESIGN-SWAP SEAM: NewspaperMobileShell replaces this aside */}
        {sidebarOpen && (
          <BrandSidebar
            active={active}
            brandName={brandName}
            onNav={(path) => navigate(path)}
            onLogout={handleLogout}
          />
        )}

        {/* Main content */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            background: '#fff',
          }}
        >
          <div
            style={{
              ...sans,
              padding: '36px 40px',
              maxWidth: 1100,
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </BrandShellContext.Provider>
  );
}
