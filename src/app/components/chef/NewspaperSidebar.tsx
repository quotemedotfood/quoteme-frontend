// NewspaperSidebar — V2 newspaper-aesthetic chef navigation
//
// Three modes:
//   open    — 240px, labels + icons visible
//   compact — 64px, icons only with hover tooltips
//   hidden  — sidebar removed; floating restore button in top-left viewport
//
// Mode persists under localStorage key 'chef_sidebar_mode'.
//
// Four locked destinations (per A1 dispatch):
//   Quotes, Order Guides, Distributors, Settings
// Settings expands to 3 sub-items (You / Restaurant / Billing) when Settings
// is the active route prefix.
//
// Part 13 four-test gate — all labels checked:
//   North Star: operational, not self-explaining
//   Verb: no banned verbs present
//   Canonical line: verbatim Quotes / Order Guides / Distributors / Settings
//   Confidence: shortest possible labels

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import {
  FileText,
  ClipboardList,
  Truck,
  Settings,
  PanelLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'chef_sidebar_mode';

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  hover: '#F1EFE8',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  white: '#FFFFFF',
};

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarMode = 'open' | 'compact' | 'hidden';

// ─── Nav destinations ─────────────────────────────────────────────────────────

const DESTINATIONS = [
  { key: 'quotes',       label: 'Quotes',       icon: FileText,      path: '/chef/dashboard' },
  { key: 'order-guides', label: 'Order Guides',  icon: ClipboardList, path: '/chef/order-guides' },
  { key: 'distributors', label: 'Distributors',  icon: Truck,         path: '/chef/distributors' },
  { key: 'settings',     label: 'Settings',      icon: Settings,      path: '/chef/settings' },
] as const;

const SETTINGS_SUB = [
  { key: 'you',        label: 'You',        path: '/chef/settings/you' },
  { key: 'restaurant', label: 'Restaurant', path: '/chef/settings/restaurant' },
  { key: 'billing',    label: 'Billing',    path: '/chef/settings/billing' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readMode(): SidebarMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'open' || raw === 'compact' || raw === 'hidden') return raw;
  } catch {
    // localStorage unavailable in some private-browsing modes
  }
  return 'open';
}

function saveMode(m: SidebarMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, m);
  } catch {
    // no-op
  }
}

// ─── Tooltip wrapper (compact mode) ──────────────────────────────────────────

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          style={{
            ...sans,
            position: 'absolute',
            left: 'calc(100% + 8px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: C.charcoal,
            color: C.white,
            fontSize: 12,
            fontWeight: 500,
            padding: '5px 10px',
            borderRadius: 5,
            whiteSpace: 'nowrap',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  isActive: boolean;
  mode: SidebarMode;
}

function NavItem({ icon: Icon, label, path, isActive, mode }: NavItemProps) {
  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: mode === 'open' ? 10 : 0,
    justifyContent: mode === 'compact' ? 'center' : 'flex-start',
    padding: mode === 'compact' ? '10px 0' : '10px 16px',
    cursor: 'pointer',
    borderLeft: isActive ? `2px solid ${C.charcoal}` : '2px solid transparent',
    background: isActive ? C.hover : 'transparent',
    transition: 'background 0.1s',
    textDecoration: 'none',
    color: C.charcoal,
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const labelStyle: React.CSSProperties = {
    ...sans,
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    color: C.charcoal,
    whiteSpace: 'nowrap' as const,
  };

  const inner = (
    <Link
      to={path}
      style={itemStyle}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = C.hover;
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} color={C.charcoal} aria-hidden="true" />
      {mode === 'open' && <span style={labelStyle}>{label}</span>}
    </Link>
  );

  if (mode === 'compact') {
    return <Tooltip label={label}>{inner}</Tooltip>;
  }
  return inner;
}

// ─── Settings sub-items (open mode only, active route) ────────────────────────

function SettingsSubNav({ pathname }: { pathname: string }) {
  return (
    <div style={{ paddingLeft: 16, marginTop: 2 }}>
      {SETTINGS_SUB.map((sub) => {
        const isSubActive = pathname === sub.path || pathname.startsWith(sub.path + '/');
        return (
          <Link
            key={sub.key}
            to={sub.path}
            style={{
              ...sans,
              display: 'block',
              fontSize: 12,
              fontWeight: isSubActive ? 600 : 400,
              color: isSubActive ? C.charcoal : C.gray500,
              padding: '6px 16px',
              paddingLeft: 32,
              textDecoration: 'none',
              borderLeft: isSubActive ? `2px solid ${C.charcoal}` : '2px solid transparent',
              background: isSubActive ? C.hover : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isSubActive) (e.currentTarget as HTMLElement).style.background = C.hover;
            }}
            onMouseLeave={(e) => {
              if (!isSubActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {sub.label}
          </Link>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function NewspaperSidebar() {
  const [mode, setMode] = useState<SidebarMode>(readMode);
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    saveMode(mode);
  }, [mode]);

  function toggleMode() {
    setMode((prev) => {
      if (prev === 'open') return 'compact';
      if (prev === 'compact') return 'hidden';
      return 'open';
    });
  }

  // Determine active destination
  function isDestActive(key: string, path: string): boolean {
    if (key === 'quotes') {
      return pathname === '/chef/dashboard'
        || pathname === '/dashboard'
        || pathname === '/chef/quotes'
        || pathname.startsWith('/chef/quotes/');
    }
    if (key === 'settings') return pathname === '/chef/settings' || pathname.startsWith('/chef/settings/');
    if (key === 'order-guides') return pathname === '/chef/order-guides' || pathname.startsWith('/chef/order-guides/');
    if (key === 'distributors') return pathname === '/chef/distributors' || pathname.startsWith('/chef/distributors/');
    return pathname === path;
  }

  const settingsIsActive = isDestActive('settings', '/chef/settings');

  // Hidden mode: render only the floating restore button
  if (mode === 'hidden') {
    return (
      <button
        type="button"
        aria-label="Show navigation"
        onClick={() => setMode('open')}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: C.white,
          border: `1px solid ${C.softLine}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100,
          boxShadow: '0 1px 4px rgba(43,43,43,.10)',
        }}
      >
        <PanelLeft size={16} color={C.charcoal} aria-hidden="true" />
      </button>
    );
  }

  const width = mode === 'open' ? 240 : 64;

  return (
    <div
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        height: '100%',
        background: C.warmPaper,
        borderRight: `1px solid ${C.softLine}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Collapse toggle — visible on the right edge of the sidebar */}
      <button
        type="button"
        aria-label={mode === 'open' ? 'Collapse sidebar' : 'Expand sidebar'}
        onClick={toggleMode}
        style={{
          position: 'absolute',
          top: 12,
          right: -12,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: C.white,
          border: `1px solid ${C.softLine}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: '0 1px 3px rgba(43,43,43,.08)',
        }}
      >
        <ChevronRight
          size={12}
          color={C.gray400}
          aria-hidden="true"
          style={{ transform: mode === 'open' ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Navigation */}
      <nav
        aria-label="Chef navigation"
        style={{ paddingTop: 16, flex: 1 }}
      >
        {DESTINATIONS.map((dest) => {
          const active = isDestActive(dest.key, dest.path);
          return (
            <div key={dest.key}>
              <NavItem
                icon={dest.icon}
                label={dest.label}
                path={dest.path}
                isActive={active}
                mode={mode}
              />
              {/* Settings sub-items: only in open mode, only when settings is active */}
              {dest.key === 'settings' && mode === 'open' && settingsIsActive && (
                <SettingsSubNav pathname={pathname} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Hide option at bottom in open mode */}
      {mode === 'open' && (
        <div style={{ borderTop: `1px solid ${C.softLine}`, padding: '12px 16px' }}>
          <button
            type="button"
            onClick={() => setMode('hidden')}
            style={{
              ...sans,
              fontSize: 11,
              color: C.gray400,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PanelLeft size={12} aria-hidden="true" />
            Hide
          </button>
        </div>
      )}
    </div>
  );
}
