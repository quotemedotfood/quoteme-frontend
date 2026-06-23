// CCLayout — persistent Command Center shell.
//
// Mirrors RepLayout (components/rep/RepLayout.tsx) pattern exactly:
//   • Holds sidebar mode in useState so it survives across sub-route navigation
//   • Derives active tab from useLocation().pathname
//   • Renders ManagerSidebar + sticky CCSearchBar command bar + <Outlet />
//   • Restore FAB when sidebar is hidden
//
// Usage: wrap all /distributor-admin/command-center/* routes in this layout.
// Pages render their content bodies as <Outlet /> children — no per-page shell.
//
// Mobile: ManagerPhone is used by CCQuotes/CCQuoteDetail on small screens;
// CCLayout renders the desktop shell only (lg+ breakpoint would need a media
// query — for now the layout is desktop-first per rep-suite pattern).

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { ManagerSidebar } from './ManagerSidebar';
import { CCSearchBar } from './CCSearchBar';
import { sans, C } from './cc-atoms';
import type { CCActiveTab, CCSidebarMode, CCManagerInfo } from './ManagerSidebar';
import { useAuth } from '../../../contexts/AuthContext';
import { getCommandCenterUnassigned, getCommandCenterInbound } from '../../../services/api';

// ── Sidebar context ───────────────────────────────────────────────────────────

interface CCLayoutContextValue {
  mode: CCSidebarMode;
  setMode: (m: CCSidebarMode) => void;
}

const CCLayoutContext = createContext<CCLayoutContextValue>({
  mode: 'open',
  setMode: () => {},
});

export function useCCLayout() {
  return useContext(CCLayoutContext);
}

// ── Active tab from path ──────────────────────────────────────────────────────

function activeTabFromPath(pathname: string): CCActiveTab {
  if (pathname.startsWith('/distributor-admin/command-center/quotes')) return 'quotes';
  if (pathname.startsWith('/distributor-admin/command-center/assign')) return 'assign';
  if (pathname.startsWith('/distributor-admin/command-center/search')) return 'search';
  if (pathname.startsWith('/distributor-admin/command-center/team')) return 'team';
  if (pathname.startsWith('/distributor-admin/command-center/inbound')) return 'inbound';
  return 'today';
}

// ── CCLayout ──────────────────────────────────────────────────────────────────

export function CCLayout() {
  const [mode, setMode] = useState<CCSidebarMode>('open');
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [inboundOpenCount, setInboundOpenCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch unassigned + inbound counts once on mount so sidebar badges are live
  // across all CC screens (including satellite pages like catalog/reps) without polling.
  useEffect(() => {
    let cancelled = false;
    getCommandCenterUnassigned().then((res) => {
      if (cancelled) return;
      if (res.data) setUnassignedCount(res.data.items.length);
    });
    getCommandCenterInbound().then((res) => {
      if (cancelled) return;
      if (res.data) setInboundOpenCount(res.data.length);
    });
    return () => { cancelled = true; };
  }, []);

  const active = activeTabFromPath(location.pathname);
  const hidden = mode === 'hidden';

  const manager: CCManagerInfo = {
    name: user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Manager' : 'Manager',
    role: 'Sales lead',
    company: user?.distributor?.name ?? user?.distributor_name ?? 'Your company',
    region: '',
    today: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  };

  const onNav = (dest: CCActiveTab) => {
    if (dest === 'today')   navigate('/distributor-admin/command-center');
    else if (dest === 'quotes')  navigate('/distributor-admin/command-center/quotes');
    else if (dest === 'assign')  navigate('/distributor-admin/command-center/assign');
    else if (dest === 'search')  navigate('/distributor-admin/command-center/search');
    else if (dest === 'team')    navigate('/distributor-admin/reps');
    else if (dest === 'inbound') navigate('/distributor-admin/command-center/inbound');
    else if (dest === 'settings') navigate('/settings');
  };

  return (
    <CCLayoutContext.Provider value={{ mode, setMode }}>
      <div
        style={{
          display: 'flex',
          position: 'relative',
          minHeight: '100vh',
          background: '#fff',
        }}
      >
        {!hidden && (
          <ManagerSidebar
            mode={mode}
            onModeChange={setMode}
            active={active}
            onNav={onNav}
            manager={manager}
            unassignedCount={unassignedCount}
            inboundOpenCount={inboundOpenCount}
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
          {/* Command bar — sticky, always present on desktop */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              padding: '16px 40px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: '#fff',
              borderBottom: `1px solid ${C.softLine}`,
            }}
          >
            <div style={{ flex: 1, maxWidth: 460 }}>
              <CCSearchBar />
            </div>
            <div style={{ flex: 1 }} />
            <div
              style={{
                ...sans,
                fontSize: 12,
                color: C.gray500,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {manager.today}
            </div>
            {/* Manager avatar */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: `1px solid ${C.softLine}`,
                background: C.warmPaper,
                width: 34,
                height: 34,
              }}
              title={manager.name}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.charcoal,
                }}
              >
                {manager.name
                  .split(' ')
                  .map((s) => s[0] ?? '')
                  .join('')
                  .slice(0, 2)}
              </span>
            </span>
          </div>

          {/* Page content */}
          <div style={{ padding: '32px 40px', maxWidth: 1140 }}>
            <Outlet />
          </div>
        </main>

        {/* Restore FAB when sidebar hidden */}
        {hidden && (
          <button
            type="button"
            onClick={() => setMode('open')}
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
        )}
      </div>
    </CCLayoutContext.Provider>
  );
}
