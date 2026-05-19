// ChefTabDesktopShell — newspaper-sidebar wrapper for chef desktop tab views.
//
// Ported from source/screens-tabs.jsx (Desi V2 handoff, 2026-05-19).
// V3 spec refs: Part 5, Part 6.7.
// Intended route: /dashboard (desktop layout, wire-up pending A3 promotion).
//
// Translation notes (JSX → TSX):
//   • NewspaperSidebar — prototype-only component. Rendered here as a minimal
//     left-rail stub (Quotes / Distributors / Settings nav + collapse toggle).
//     Full NewspaperSidebar fidelity is out of scope for B1; it is a structural
//     placeholder that preserves the flex layout contract.
//   • TrustRibbon — prototype-only; omitted (showTrust prop accepted but no-ops).
//   • SidebarRestoreButton — rendered as a minimal "> sidebar" floating button.
//   • CSS vars (--qm-*) → FE color constants.

import React, { useState } from 'react';

const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

type SidebarMode = 'open' | 'collapsed' | 'hidden';
type ActiveTab = 'home' | 'distributors' | 'settings';

export interface ChefTabDesktopShellProps {
  active: ActiveTab;
  nav?: (target: string) => void;
  children?: React.ReactNode;
  /** showTrust accepted for API parity; no-ops in B1 (TrustRibbon is B4 scope) */
  showTrust?: boolean;
  initialMode?: SidebarMode;
}

// ─── Minimal NewspaperSidebar stub ────────────────────────────────────────────
// Preserves the structural contract (flex left rail, ~200px wide, collapses).
// Full NewspaperSidebar design will be delivered in a subsequent track.

const NAV_ITEMS: { id: ActiveTab; label: string; target: string }[] = [
  { id: 'home',         label: 'Quotes',       target: 'tab-home' },
  { id: 'distributors', label: 'Distributors', target: 'tab-distributors' },
  { id: 'settings',     label: 'Settings',     target: 'tab-settings' },
];

function NewspaperSidebarStub({
  mode,
  onModeChange,
  active,
  onNav,
}: {
  mode: SidebarMode;
  onModeChange: (m: SidebarMode) => void;
  active: ActiveTab;
  onNav: (target: string) => void;
}) {
  const collapsed = mode === 'collapsed';
  return (
    <div
      style={{
        width: collapsed ? 52 : 200,
        flexShrink: 0,
        borderRight: `1px solid ${C.softLine}`,
        background: C.warmPaper,
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '20px 0' : '20px 0',
        transition: 'width 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Wordmark */}
      {!collapsed && (
        <div style={{ ...serif, fontSize: 17, fontWeight: 700, color: C.charcoal, padding: '0 20px 20px' }}>
          QuoteMe
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const on = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNav(item.target)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: collapsed ? '10px 16px' : '10px 20px',
                background: on ? 'rgba(43,43,43,.07)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                ...sans,
                fontSize: 14,
                fontWeight: on ? 600 : 400,
                color: on ? C.charcoal : C.gray700,
                borderLeft: on ? `3px solid ${C.charcoal}` : '3px solid transparent',
              }}
            >
              {collapsed ? item.label[0] : item.label}
            </button>
          );
        })}
      </nav>

      {/* Build Quote action */}
      {!collapsed && (
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.softLine}` }}>
          <button
            type="button"
            onClick={() => onNav('entry')}
            style={{
              ...sans,
              width: '100%',
              padding: '8px 0',
              fontSize: 13,
              fontWeight: 600,
              color: C.orange,
              border: `1.5px solid ${C.orange}`,
              background: 'transparent',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Build Quote
          </button>
        </div>
      )}

      {/* Collapse / expand toggle */}
      <button
        type="button"
        onClick={() => onModeChange(collapsed ? 'open' : collapsed ? 'open' : mode === 'open' ? 'collapsed' : 'open')}
        style={{
          ...sans,
          margin: '8px auto 0',
          fontSize: 11,
          color: C.gray500,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </div>
  );
}

// ─── SidebarRestoreButton stub ────────────────────────────────────────────────

function SidebarRestoreButton({ onShow }: { onShow: () => void }) {
  return (
    <button
      type="button"
      onClick={onShow}
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
        writingMode: 'vertical-rl',
      }}
      aria-label="Show sidebar"
    >
      › sidebar
    </button>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function ChefTabDesktopShell({
  active,
  nav = () => {},
  children,
  showTrust: _showTrust = false, // accepted, no-ops — TrustRibbon is out of B1 scope
  initialMode = 'open',
}: ChefTabDesktopShellProps) {
  const [mode, setMode] = useState<SidebarMode>(initialMode);
  const hidden = mode === 'hidden';

  return (
    <div
      className="flex"
      style={{ position: 'relative', height: '100%' }}
    >
      {!hidden && (
        <NewspaperSidebarStub
          mode={mode}
          onModeChange={setMode}
          active={active}
          onNav={nav}
        />
      )}

      <div
        className="flex flex-col overflow-hidden"
        style={{ flex: 1, minWidth: 0 }}
      >
        {/* showTrust → TrustRibbon omitted; accepted by prop for future B4 wiring */}
        <div className="flex-1 overflow-auto">
          <div style={{ padding: '36px 40px' }}>
            <div style={{ maxWidth: 880 }}>{children}</div>
          </div>
        </div>
      </div>

      {hidden && <SidebarRestoreButton onShow={() => setMode('open')} />}
    </div>
  );
}
