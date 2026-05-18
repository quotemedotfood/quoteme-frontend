// ChefMobileTabBar — bottom-fixed mobile navigation for chef routes
//
// Three tabs (Order Guides folds into Quotes context on mobile per dispatch):
//   Quotes / Distributors / Settings
//
// Visible below md breakpoint (768px) only.
// Active state derived from current pathname.
// 60px height, charcoal active / gray inactive, label below 20px icon.
//
// Part 13 four-test gate:
//   North Star: operational tab labels, no explanation
//   Verb: no banned verbs
//   Canonical line: Quotes / Distributors / Settings (Order Guides folded)
//   Confidence: shortest possible

import { Link, useLocation } from 'react-router';
import { FileText, Truck, Settings } from 'lucide-react';

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  gray400: '#9CA3AF',
  white: '#FFFFFF',
};

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const TABS = [
  { key: 'quotes',       label: 'Quotes',       icon: FileText, path: '/chef/dashboard' },
  { key: 'distributors', label: 'Distributors',  icon: Truck,    path: '/chef/distributors' },
  { key: 'settings',     label: 'Settings',      icon: Settings, path: '/chef/settings' },
] as const;

function isTabActive(key: string, pathname: string): boolean {
  if (key === 'quotes') {
    return pathname === '/chef/dashboard'
      || pathname === '/dashboard'
      || pathname.startsWith('/chef/quotes')
      || pathname.startsWith('/chef/order-guides');
  }
  if (key === 'settings') return pathname === '/chef/settings' || pathname.startsWith('/chef/settings/');
  if (key === 'distributors') return pathname === '/chef/distributors' || pathname.startsWith('/chef/distributors/');
  return false;
}

export function ChefMobileTabBar() {
  const { pathname } = useLocation();

  return (
    // md:hidden — only shown below 768px
    <div
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: C.white,
        borderTop: `1px solid ${C.softLine}`,
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 50,
      }}
    >
      {TABS.map((tab) => {
        const active = isTabActive(tab.key, pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            to={tab.path}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: active ? C.charcoal : C.gray400,
            }}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
            <span
              style={{
                ...sans,
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                lineHeight: 1,
                color: active ? C.charcoal : C.gray400,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
