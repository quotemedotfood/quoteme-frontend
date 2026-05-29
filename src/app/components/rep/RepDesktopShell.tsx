// RepDesktopShell + RepNewspaperSidebar — rep desktop chrome.
//
// Mirrors ChefTabDesktopShell / NewspaperSidebarStub (chef-side) with
// rep-specific nav destinations:
//   Quotes > Inbound · Quotes > History · Settings
//
// Sidebar modes: 'open' (280px) · 'collapsed' (64px) · 'hidden' (no sidebar).
// When hidden, a restore button floats at the left edge.
//
// "WORKING AS" block: rep name + distributor name (never catalog name).
//
// Nav group structure (Stage 1 restructure 2026-05-28):
//   THE DAILY WORK: Quotes (with sub-items: Inbound · History)
//   [bottom]:       Settings · Hide sidebar
//
// Catalog removed from rep sidebar — reps access catalog via
// /distributor-admin/catalog links embedded in the triage banners.
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · RepNewspaperSidebar
// and RepDesktopShell. Translated from prototype conventions to FE idioms.
//
// Cross-cutting constraint: Sacred Orange = var(--primary), never #F9A64B.
// Coverage/accent dots = var(--accent).
//
// SIDEBAR PERSISTENCE BUG — FIXED:
//   Previously each rep page (RepTriagePage, RepIncomingQuotePage,
//   RepReviewThreePanelDesktop) rendered its own <RepDesktopShell> instance,
//   causing the shell to unmount/remount on every navigation and sidebar mode
//   to reset to 'open'. Fixed in RepLayout.tsx: a persistent layout component
//   wraps all /rep/* routes via <Outlet />, holding sidebar useState at the
//   layout level. RepDesktopShell is no longer used by any routed rep page.

import React, { useState } from 'react';
import {
  FileText,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import quotemeLogo from '../../../assets/quoteme-logo.png';

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

export type RepSidebarMode = 'open' | 'collapsed' | 'hidden';
// 'quotes-inbound' and 'quotes-history' are sub-tab states under the Quotes parent.
// 'quotes' is a catch-all when on a quote detail page (/rep/quotes/:id).
export type RepActiveTab = 'quotes-inbound' | 'quotes-history' | 'quotes' | 'customers' | 'settings';

// ─── Nav destination config ──────────────────────────────────────────────────

interface NavDestConfig {
  id: RepActiveTab;
  label: string;
  target: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  group: 'daily' | 'bottom';
  sub?: { label: string; meta: string; target: string; id: RepActiveTab }[];
}

const NAV_ITEMS: NavDestConfig[] = [
  {
    id: 'quotes',
    label: 'Quotes',
    target: 'rep-quotes-inbound',
    Icon: FileText,
    group: 'daily',
    sub: [
      { id: 'quotes-inbound',  label: 'Inbound', meta: '', target: 'rep-quotes-inbound' },
      { id: 'quotes-history',  label: 'History', meta: '', target: 'rep-quotes-history' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    target: 'rep-customers',
    Icon: Users,
    group: 'daily',
  },
  {
    id: 'settings',
    label: 'Settings',
    target: 'rep-settings',
    Icon: Settings,
    group: 'bottom',
  },
];

// ─── NavGroupLabel ────────────────────────────────────────────────────────────

function NavGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div
      style={{
        ...sans,
        fontSize: 9.5,
        letterSpacing: '0.18em',
        color: C.gray500,
        textTransform: 'uppercase' as const,
        fontWeight: 500,
        padding: '8px 24px 4px',
      }}
    >
      {label}
    </div>
  );
}

// ─── NavDestination ───────────────────────────────────────────────────────────

function NavDestination({
  item,
  active,
  collapsed,
  count,
  onNav,
}: {
  item: NavDestConfig;
  active: RepActiveTab;
  collapsed: boolean;
  count?: number;
  onNav: (target: string) => void;
}) {
  // Parent item is "on" when active matches any of its sub-item ids, or itself.
  const subIds = item.sub?.map((s) => s.id) ?? [];
  const on = item.id === active || subIds.includes(active);
  const { Icon } = item;

  return (
    <div>
      <button
        type="button"
        onClick={() => onNav(item.target)}
        title={collapsed ? item.label : undefined}
        style={{
          ...sans,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '10px 0' : '10px 24px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: on ? 'rgba(43,43,43,.07)' : 'transparent',
          border: 'none',
          borderLeft: on ? `3px solid ${C.charcoal}` : '3px solid transparent',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: on ? 600 : 400,
          color: on ? C.charcoal : C.gray700,
        }}
      >
        <Icon size={18} strokeWidth={on ? 2 : 1.6} />
        {!collapsed && (
          <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
        )}
        {!collapsed && count !== undefined && count > 0 && (
          <span
            style={{
              ...sans,
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              background: C.charcoal,
              borderRadius: 999,
              padding: '1px 6px',
              lineHeight: 1.5,
            }}
          >
            {count}
          </span>
        )}
      </button>

      {/* Sub-items — always shown when parent is active, open mode only */}
      {!collapsed && on && item.sub && (
        <div style={{ paddingLeft: 52 }}>
          {item.sub.map((s) => {
            const subOn = s.id === active;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => onNav(s.target)}
                style={{
                  ...sans,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '4px 24px 4px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: subOn ? 600 : 400,
                  color: subOn ? C.charcoal : C.gray700,
                }}
              >
                <span>{s.label}</span>
                {s.meta && (
                  <span style={{ ...sans, fontSize: 11, color: C.gray500 }}>{s.meta}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── RepNewspaperSidebar ──────────────────────────────────────────────────────

export interface RepNewspaperSidebarProps {
  mode: RepSidebarMode;
  onModeChange: (m: RepSidebarMode) => void;
  active: RepActiveTab;
  onNav: (target: string) => void;
  /** Rep's full name */
  repName?: string;
  /** Distributor name — never catalog name */
  distributorName?: string;
  /** Stage 2: badge count on Inbound sub-item (not wired yet) */
  incomingCount?: number;
}

export function RepNewspaperSidebar({
  mode,
  onModeChange,
  active,
  onNav,
  repName = 'Marcus Rivera',
  distributorName = "D'Lisius Distribution Co.",
  incomingCount = 0,
}: RepNewspaperSidebarProps) {
  const collapsed = mode === 'collapsed';
  const width = collapsed ? 64 : 280;

  const initials = repName
    .split(' ')
    .map((s) => s[0] ?? '')
    .join('');

  const dailyItems = NAV_ITEMS.filter((n) => n.group === 'daily');
  const bottomItems = NAV_ITEMS.filter((n) => n.group === 'bottom');

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        borderRight: `1px solid ${C.softLine}`,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Masthead */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'flex-start',
          gap: 8,
          padding: collapsed ? '20px 8px 16px' : '28px 24px 20px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <img
            src={collapsed ? quotemeLogo : '/quoteme-horizontal.png'}
            alt="QuoteMe"
            style={{
              width: collapsed ? 40 : 150,
              height: 'auto',
              display: 'block',
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <button
              type="button"
              onClick={() => onModeChange('collapsed')}
              aria-label="Collapse sidebar"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.gray500,
              }}
            >
              <PanelLeftClose size={16} strokeWidth={1.6} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={() => onModeChange('open')}
            aria-label="Expand sidebar"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.gray500,
            }}
          >
            <PanelLeftOpen size={16} strokeWidth={1.6} />
          </button>
        )}
      </div>

      {/* "Working as" identity block */}
      {!collapsed ? (
        <div
          style={{
            padding: '16px 24px 20px',
            borderTop: `2px solid ${C.charcoal}`,
          }}
        >
          <div
            style={{
              ...sans,
              fontSize: 10,
              letterSpacing: '0.18em',
              color: C.gray500,
              textTransform: 'uppercase' as const,
              fontWeight: 500,
            }}
          >
            WORKING AS
          </div>
          <div
            style={{
              ...serif,
              fontSize: 16,
              fontWeight: 500,
              color: C.charcoal,
              lineHeight: 1.2,
              marginTop: 6,
            }}
          >
            {repName}
          </div>
          <div
            style={{
              ...sans,
              fontSize: 12,
              color: C.gray500,
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {distributorName}
          </div>
        </div>
      ) : (
        <div
          style={{
            margin: '0 8px 8px',
            paddingTop: 8,
            paddingBottom: 8,
            display: 'flex',
            justifyContent: 'center',
            borderTop: `2px solid ${C.charcoal}`,
          }}
          title={`${repName} · ${distributorName}`}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${C.softLine}`,
              background: C.warmPaper,
            }}
          >
            <span style={{ ...serif, fontSize: 12, fontWeight: 600, color: C.charcoal }}>
              {initials}
            </span>
          </div>
        </div>
      )}

      {/* Daily work nav group */}
      <div
        style={{
          paddingTop: 4,
          paddingBottom: 8,
          borderTop: `1px solid ${C.softLine}`,
        }}
      >
        <NavGroupLabel label="THE DAILY WORK" collapsed={collapsed} />
        {dailyItems.map((item) => (
          <NavDestination
            key={item.id}
            item={item}
            active={active}
            collapsed={collapsed}
            onNav={onNav}
          />
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom: Settings + Hide */}
      <div
        style={{
          paddingTop: 8,
          paddingBottom: 8,
          borderTop: `1px solid ${C.softLine}`,
        }}
      >
        {bottomItems.map((item) => (
          <NavDestination
            key={item.id}
            item={item}
            active={active}
            collapsed={collapsed}
            onNav={onNav}
          />
        ))}
        <div
          style={{
            padding: collapsed ? '4px 8px' : '4px 24px',
          }}
        >
          <button
            type="button"
            onClick={() => onModeChange('hidden')}
            aria-label="Hide sidebar"
            style={{
              ...sans,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '8px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11.5,
              color: C.gray500,
            }}
          >
            <X size={14} color={C.gray500} strokeWidth={1.6} />
            {!collapsed && <span>Hide sidebar</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── SidebarRestoreButton ─────────────────────────────────────────────────────

function SidebarRestoreButton({ onShow }: { onShow: () => void }) {
  return (
    <button
      type="button"
      onClick={onShow}
      aria-label="Show sidebar"
      style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        ...sans,
        fontSize: 11,
        color: C.gray500,
        background: C.warmPaper,
        border: `1px solid ${C.softLine}`,
        borderRadius: 6,
        padding: '6px 10px',
        cursor: 'pointer',
        zIndex: 10,
        writingMode: 'vertical-rl' as React.CSSProperties['writingMode'],
      }}
    >
      › sidebar
    </button>
  );
}

// ─── RepDesktopShell ──────────────────────────────────────────────────────────

export interface RepDesktopShellProps {
  active: RepActiveTab;
  nav?: (target: string) => void;
  children?: React.ReactNode;
  initialMode?: RepSidebarMode;
  repName?: string;
  distributorName?: string;
  incomingCount?: number;
}

export function RepDesktopShell({
  active,
  nav = () => {},
  children,
  initialMode = 'open',
  repName,
  distributorName,
  incomingCount,
}: RepDesktopShellProps) {
  const [mode, setMode] = useState<RepSidebarMode>(initialMode);
  const hidden = mode === 'hidden';

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        height: '100%',
        background: '#fff',
      }}
    >
      {!hidden && (
        <RepNewspaperSidebar
          mode={mode}
          onModeChange={setMode}
          active={active}
          onNav={nav}
          repName={repName}
          distributorName={distributorName}
          incomingCount={incomingCount}
        />
      )}

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
            padding: '36px 40px',
            maxWidth: 1180,
          }}
        >
          {children}
        </div>
      </main>

      {hidden && <SidebarRestoreButton onShow={() => setMode('open')} />}
    </div>
  );
}
