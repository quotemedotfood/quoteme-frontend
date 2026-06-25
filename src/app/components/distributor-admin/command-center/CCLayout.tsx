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

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { ManagerSidebar } from './ManagerSidebar';
import { CCSearchBar } from './CCSearchBar';
import { sans, C } from './cc-atoms';
import type { CCActiveTab, CCSidebarMode, CCManagerInfo } from './ManagerSidebar';
import { useAuth } from '../../../contexts/AuthContext';
import { Link2 } from 'lucide-react';
import { getCommandCenterUnassigned, getCommandCenterInbound, getDistributorHome } from '../../../services/api';
import { canAccessCCInbound, REP_INBOUND_REDIRECT } from '../../../utils/ccInboundAccess';

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

// P5: Build the cold-landing URL for copy-link. Uses quoteme.food as the
// production host (no VITE_ env var exists for the app host).
const COLD_LANDING_HOST = 'https://quoteme.food';

function buildMenuDropUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return `${COLD_LANDING_HOST}/d/${encodeURIComponent(slug)}`;
}

export function CCLayout() {
  const [mode, setMode] = useState<CCSidebarMode>('open');
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [inboundOpenCount, setInboundOpenCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  // P5: distributor slug from home payload (not yet in API — graceful hide when absent)
  const [distributorSlug, setDistributorSlug] = useState<string | null>(null);
  const [copyConfirm, setCopyConfirm] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // P8: Rep count for Team badge. P5: slug if BE adds it.
    getDistributorHome().then((res) => {
      if (cancelled) return;
      if (res.data) {
        setTeamCount(res.data.rep_count ?? 0);
        // P5: BE needs to add `slug` to DistributorHomeData — hide until present.
        const maybeSlug = (res.data as any).slug as string | undefined;
        setDistributorSlug(maybeSlug ?? null);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // B-42: Guard — reps and other non-distributor_admin roles must not access the
  // Command Center shell at all. Redirect reps to their own inbound queue; all other
  // non-admin authenticated users fall back to /. This early return sits AFTER all
  // hooks so React's rules-of-hooks are satisfied.
  if (user && !canAccessCCInbound(user.role)) {
    const redirectTarget = user.role === 'rep' ? REP_INBOUND_REDIRECT : '/';
    return <Navigate to={redirectTarget} replace />;
  }

  // P5: cleanup copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
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
            teamCount={teamCount}
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

            {/* P5 — Menu Drop copy-link: only shown when distributor slug is available */}
            {buildMenuDropUrl(distributorSlug) && (
              <button
                type="button"
                onClick={() => {
                  const url = buildMenuDropUrl(distributorSlug)!;
                  navigator.clipboard.writeText(url).then(() => {
                    setCopyConfirm(true);
                    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                    copyTimeoutRef.current = setTimeout(() => setCopyConfirm(false), 1500);
                  }).catch(() => {
                    // Fallback: execCommand for browsers without clipboard API
                    const el = document.createElement('textarea');
                    el.value = url;
                    el.style.position = 'fixed';
                    el.style.opacity = '0';
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                    setCopyConfirm(true);
                    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                    copyTimeoutRef.current = setTimeout(() => setCopyConfirm(false), 1500);
                  });
                }}
                aria-label="Copy Menu Drop link"
                title={`Copy Menu Drop link: ${buildMenuDropUrl(distributorSlug)}`}
                style={{
                  ...sans,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: copyConfirm ? '#2A5F6F' : C.gray500,
                  background: copyConfirm ? '#EAF4F7' : 'transparent',
                  border: `1px solid ${copyConfirm ? '#A5CFDD' : C.softLine}`,
                  borderRadius: 6,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  transition: 'color 150ms, background 150ms, border-color 150ms',
                  whiteSpace: 'nowrap',
                }}
              >
                <Link2 size={13} strokeWidth={1.8} />
                {copyConfirm ? 'Copied!' : 'Menu Drop'}
              </button>
            )}

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

            {/* P6 — Manager avatar: clickable button → /settings */}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              aria-label={`${manager.name} — open settings`}
              title={`${manager.name} · Settings`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: `1px solid ${C.softLine}`,
                background: C.warmPaper,
                width: 34,
                height: 34,
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: 'border-color 150ms, background 150ms',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#A5CFDD';
                (e.currentTarget as HTMLButtonElement).style.background = '#F0F8FB';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.softLine;
                (e.currentTarget as HTMLButtonElement).style.background = C.warmPaper;
              }}
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
            </button>
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
