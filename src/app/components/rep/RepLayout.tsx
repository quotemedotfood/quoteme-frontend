// RepLayout — persistent shell for all /rep/* routes.
//
// Solves the sidebar-reset-on-nav bug: previously each rep page mounted its own
// <RepDesktopShell> with local useState, so every navigation remounted the shell
// and reset sidebar mode to 'open'. RepLayout sits above the route outlet, so
// its useState survives across all /rep/* transitions.
//
// Structure:
//   RepLayout (holds mode: RepSidebarMode in useState)
//   ├── RepNewspaperSidebar  ← state lives HERE, never remounts
//   └── <main> wrapper
//       └── <Outlet />      ← rep pages render their content body here
//
// Active tab is derived from useLocation().pathname — no prop drilling.
//
// Sidebar context: pages/sub-components that need to control sidebar mode
// (e.g., a "hide sidebar" action deeper in the tree) consume RepSidebarContext.
//
// RepDesktopShell: the per-page wrapper is now unused for routed pages. It is
// kept in RepDesktopShell.tsx as a named export to avoid breaking any future
// one-off usage, but it is no longer instantiated by any routed page.

import React, { createContext, useContext, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { RepNewspaperSidebar } from './RepDesktopShell';
import type { RepActiveTab, RepSidebarMode } from './RepDesktopShell';

// ─── Sidebar context ──────────────────────────────────────────────────────────

interface RepSidebarContextValue {
  mode: RepSidebarMode;
  setMode: (m: RepSidebarMode) => void;
}

export const RepSidebarContext = createContext<RepSidebarContextValue>({
  mode: 'open',
  setMode: () => {},
});

export function useRepSidebar() {
  return useContext(RepSidebarContext);
}

// ─── Active tab derivation ────────────────────────────────────────────────────

function activeTabFromPath(pathname: string): RepActiveTab {
  if (pathname.startsWith('/rep/quotes/history')) return 'quotes-history';
  if (pathname.startsWith('/rep/quotes/inbound')) return 'quotes-inbound';
  // /rep/quotes/:id and any sub-mode (?mode=review, ?mode=pricing)
  if (pathname.startsWith('/rep/quotes')) return 'quotes';
  if (pathname.startsWith('/rep/customers')) return 'customers';
  if (pathname.startsWith('/rep/settings') || pathname.startsWith('/settings')) return 'settings';
  // Default to inbound
  return 'quotes-inbound';
}

// ─── RepLayout ────────────────────────────────────────────────────────────────

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export function RepLayout() {
  const [mode, setMode] = useState<RepSidebarMode>('open');
  const location = useLocation();
  const navigate = useNavigate();

  const active = activeTabFromPath(location.pathname);
  const hidden = mode === 'hidden';

  const nav = (dest: string, opts?: { quoteId?: string }) => {
    if (dest === 'rep-triage' || dest === 'rep-quotes-inbound') navigate('/rep/quotes/inbound');
    else if (dest === 'rep-quotes-history') navigate('/rep/quotes/history');
    else if (dest === 'rep-incoming' && opts?.quoteId) navigate(`/rep/quotes/${opts.quoteId}`);
    else if (dest === 'rep-pricing' && opts?.quoteId) navigate(`/rep/quotes/${opts.quoteId}?mode=pricing`);
    else if (dest === 'rep-catalog') navigate('/distributor-admin/catalog');
    else if (dest === 'rep-customers') navigate('/rep/customers');
    else if (dest === 'rep-settings') navigate('/settings');
  };

  return (
    <RepSidebarContext.Provider value={{ mode, setMode }}>
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
              ...sans,
              padding: '36px 40px',
              maxWidth: 1180,
            }}
          >
            <Outlet />
          </div>
        </main>

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
              fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: 11,
              color: '#6B7280',
              background: '#FBFAF7',
              border: '1px solid #E8E8E8',
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
    </RepSidebarContext.Provider>
  );
}
