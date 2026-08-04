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
import { ChefTabBar } from '../../chef/ChefTabBar';
import type { TabDef } from '../../chef/ChefTabBar';
import type { CCActiveTab, CCSidebarMode, CCManagerInfo } from './ManagerSidebar';
import { useAuth } from '../../../contexts/AuthContext';
import { Link2 } from 'lucide-react';
import { getCommandCenterUnassigned, getCommandCenterInbound, getDistributorHome } from '../../../services/api';
import { canAccessCCInbound, REP_INBOUND_REDIRECT } from '../../../utils/ccInboundAccess';

// ── Role label ──────────────────────────────────────────────────────────────
// Was hardcoded to the literal "Sales lead" regardless of who was signed in.
// The User model (src/app/services/api.ts) has no job-title field, so the
// truthful, real value we can show is the authenticated user's actual role,
// human-labeled — same ROLE_LABEL pattern already used in
// pages/admin/QMAdminUsers.tsx and pages/admin/QMAdminUserDetail.tsx.
const ROLE_LABEL: Record<string, string> = {
  distributor_admin: 'Distributor Admin',
  quoteme_admin: 'QM Admin',
  rep: 'Rep',
  chef: 'Chef',
  buyer: 'Buyer',
  group_admin: 'Group Admin',
  brand: 'Brand',
};

function roleLabel(role: string | undefined): string {
  if (!role) return 'Manager';
  return ROLE_LABEL[role] ?? role;
}

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

// P5: Build the cold-landing URL for copy-link. The standing page lives on the
// `prod.quoteme.food` host — the bare apex `quoteme.food` does NOT serve /d/:slug
// and 404s, which is what the emitted copy-links were doing. (No VITE_ env var
// exists for the app host, so this is a constant.)
const COLD_LANDING_HOST = 'https://prod.quoteme.food';

function buildMenuDropUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return `${COLD_LANDING_HOST}/d/${encodeURIComponent(slug)}`;
}

// ── Mobile bottom nav (Justin's nav ruling, extends RepLayout's gate) ─────────
// Below 768px the ManagerSidebar (280px flex) is not rendered — on a real
// handset it stole 43% of a 658px window and there was no bottom nav at all.
// Full-width content + a fixed bottom bar carrying the primary CC destinations,
// EXCEPT on quote detail (/quote-builder, /export-finalize) where Send owns the
// bottom exclusively (Ch XXII — secondary actions never compete with Send).
// Reuses ChefTabBar's fixed-bottom + scroll-hide chrome, same as RepLayout.
const CC_BOTTOM_TABS: TabDef[] = [
  { id: 'today',   label: 'Today',   target: 'cc-tab-today' },
  { id: 'inbound', label: 'Inbound', target: 'cc-tab-inbound' },
  { id: 'quotes',  label: 'Quotes',  target: 'cc-tab-quotes' },
];

function ccBottomTabFromPath(pathname: string): string {
  if (pathname.startsWith('/distributor-admin/command-center/inbound')) return 'inbound';
  if (pathname.startsWith('/distributor-admin/command-center/quotes')) return 'quotes';
  if (pathname.startsWith('/distributor-admin/command-center')) return 'today';
  return '';
}

// Quote-detail / Review-and-Send surfaces — Send wins, bottom nav suppressed.
export function isCCQuoteDetailRoute(pathname: string): boolean {
  return pathname.startsWith('/quote-builder') || pathname.startsWith('/export-finalize');
}

// Test envs without matchMedia default to desktop so existing desktop-oriented
// behavior is unaffected — real browsers all support it.
function supportsMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(
    supportsMatchMedia() ? window.matchMedia('(min-width: 768px)').matches : true
  );
  useEffect(() => {
    if (!supportsMatchMedia()) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export function CCLayout() {
  const [mode, setMode] = useState<CCSidebarMode>('open');
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [inboundOpenCount, setInboundOpenCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  // P5: distributor slug from home payload — nil for pre-existing distributors, hide when absent.
  const [distributorSlug, setDistributorSlug] = useState<string | null>(null);
  const [copyConfirm, setCopyConfirm] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const isDesktop = useIsDesktop();

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
    // P8: Rep count for Team badge. P5: slug for menu-drop copy-link.
    getDistributorHome().then((res) => {
      if (cancelled) return;
      if (res.data) {
        setTeamCount(res.data.rep_count ?? 0);
        setDistributorSlug(res.data.slug);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Unauth guard (pattern fix, matches BrandShellLayout / QMAdminLayout). A shell
  // whose only auth check is `if (user && ...)` silently renders for an
  // unauthenticated visitor (user == null matches neither branch). CCLayout is
  // gated by RootLayout today, so this is defense-in-depth rather than a live
  // hole, but the guard SHAPE is the bug, so we fix the pattern, not the instance.
  if (!isLoading && !user) return <Navigate to="/auth" replace />;

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
  // Below 768px the aside never renders, so "hidden" (the desktop-only
  // collapse-to-nothing mode) is meaningless there — gate it to desktop.
  const hidden = isDesktop && mode === 'hidden';
  // Below 768px a bottom bar carries nav, except on quote detail where Send wins.
  const showBottomNav = !isDesktop && !isCCQuoteDetailRoute(location.pathname);

  const manager: CCManagerInfo = {
    name: user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Manager' : 'Manager',
    role: roleLabel(user?.role),
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

  const navBottom = (target: string) => {
    if (target === 'cc-tab-today') navigate('/distributor-admin/command-center');
    else if (target === 'cc-tab-inbound') navigate('/distributor-admin/command-center/inbound');
    else if (target === 'cc-tab-quotes') navigate('/distributor-admin/command-center/quotes');
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
        {isDesktop && !hidden && (
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
              padding: isDesktop ? '16px 40px' : '12px 16px',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              rowGap: 8,
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
              aria-label={`${manager.name}: open settings`}
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
          <div
            style={{
              padding: isDesktop ? '32px 40px' : '20px 16px',
              // Reserve space above the fixed bottom nav so scrolled content
              // never sits underneath it.
              paddingBottom: showBottomNav ? 84 : undefined,
              maxWidth: 1140,
            }}
          >
            <Outlet />
          </div>
        </main>

        {showBottomNav && (
          <ChefTabBar
            active={ccBottomTabFromPath(location.pathname)}
            nav={navBottom}
            tabs={CC_BOTTOM_TABS}
          />
        )}

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
