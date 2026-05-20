// V2 W4 inc 4 — ChefDashboardPage  (/dashboard for chef role)
//
// Mounted by DashboardRoleRouter when the authenticated user's role is
// "chef". Returning chefs land here after sign-in; first-arrival chefs
// land on /chef/welcome first and continue to a specific quote, not
// here.
//
// Tab chrome renders ONLY when quotes.length > 0 (brand-new chefs see
// the minimal empty state with no tabs — per V3 Part 6 Step 7).
//
// Tabs (post-V2.1 expansion):
//   Overview     — quote-count indicator (suppressed, V2.5 target),
//                  Previous Questions strip, quote history.
//   Distributors — "Your distributors" derived from quotes payload +
//                  "Available in your area" empty state (Phase B.2).
//   Settings     — Contact info, restaurant, billing (read-only V1).
//   Discovery    — Locked placeholder for free-tier chefs.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock } from 'lucide-react';
import { getChefQuotes, type ChefQuoteRow, type ChefQuotesIndexResponse } from '../../services/api';
import { PreviewPill } from '../../components/chef/PreviewPill';
import { ChefDistributorsTab } from '../../components/chef';
import { ChefSettingsTab } from '../../components/chef/ChefSettingsTab';

const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  lightBlue: '#A5CFDD',
  hoverBlue: '#7FAEC2',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  success: '#16A34A',
  warning: '#D97706',
};
const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

type Tab = 'home' | 'order-guides' | 'distributors' | 'settings';

export function ChefDashboardPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<ChefQuotesIndexResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('home');

  // navTab handles intra-page tab switching. The outer ChefShellLayout
  // owns the shell chrome (sidebar / bottom bar) and handles cross-route
  // navigation; this adapter is kept for renderTab() dispatch.
  const navTab = (target: string) => {
    if (target === 'entry') return navigate('/chef/entry');
    if (target === 'tab-home') return setActiveTab('home');
    if (target === 'tab-order-guides') return setActiveTab('order-guides');
    if (target === 'tab-distributors') return setActiveTab('distributors');
    if (target === 'tab-settings') return setActiveTab('settings');
  };

  // Landing on the dashboard is an intentional context-reset for the chef:
  // any stored "most recent quote" marker is a back-navigation hint only,
  // not a permanent state. Clear it so subsequent /chef/entry visits show
  // the form instead of bouncing the chef back to their last quote.
  useEffect(() => {
    sessionStorage.removeItem('chef_recent_quote_id');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getChefQuotes();
      if (cancelled) return;
      if (res.data) {
        setData(res.data);
        setState('ready');
      } else {
        setErrorMsg(res.error || 'Could not load your quotes');
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const quotes = data?.quotes ?? [];
  const count = data?.count ?? 0;
  const limit = data?.free_tier_limit ?? 5;
  const questionsWithText = quotes.filter((q) => q.latest_question);
  const hasQuotes = quotes.length > 0;

  // RootLayout renders the ChefTopbar for chef-role users; this page no
  // longer needs its own header chrome.
  const onPickQuote = (q: ChefQuoteRow) => navigate(`/chef/quotes/${q.id}`);

  const renderTab = () => {
    if (activeTab === 'home') {
      return (
        <OverviewTab
          quotes={quotes}
          questionsWithText={questionsWithText}
          count={count}
          limit={limit}
          onPick={onPickQuote}
        />
      );
    }
    if (activeTab === 'order-guides') {
      return <OrderGuidesTab quotes={quotes} onPick={(id) => navigate(`/chef/order-guide/${id}`)} />;
    }
    if (activeTab === 'distributors') {
      return <ChefDistributorsTab nav={navTab} />;
    }
    if (activeTab === 'settings') {
      return <ChefSettingsTab />;
    }
    return null;
  };

  // ChefShellLayout (the parent router layout) owns the tab chrome.
  // This page renders content-only inside the shell's <Outlet />.
  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-12">
      {state === 'loading' && <LoadingRow />}
      {state === 'error' && <ErrorRow message={errorMsg} />}
      {state === 'ready' && !hasQuotes && <EmptyState />}
      {state === 'ready' && hasQuotes && renderTab()}
    </div>
  );
}

// ─── Order Guides tab (B6 stub — lists quotes with linked order guides) ────

function OrderGuidesTab({ quotes, onPick }: { quotes: ChefQuoteRow[]; onPick: (id: string) => void }) {
  const withOG = quotes.filter((q) => q.has_order_guide && q.order_guide_id);
  return (
    <>
      <div className="mb-6 pb-5" style={{ borderBottom: `1px solid ${C.softLine}` }}>
        <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
          Order Guides
        </h1>
      </div>
      {withOG.length === 0 ? (
        <p style={{ ...sans, fontSize: 14, color: C.gray500 }}>
          You don't have any order guides yet. They appear here once your distributor builds one for you.
        </p>
      ) : (
        <div className="divide-y" style={{ borderTop: `1px solid ${C.softLine}`, borderBottom: `1px solid ${C.softLine}` }}>
          {withOG.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => onPick(q.order_guide_id!)}
              className="w-full text-left py-3 px-1 hover:bg-gray-50 flex items-baseline justify-between gap-3"
            >
              <span style={{ ...sans, fontSize: 14, color: C.charcoal }}>{q.label}</span>
              <span style={{ ...sans, fontSize: 11.5, color: C.gray500 }}>{q.distributor?.name ?? '—'}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Tab nav ─────────────────────────────────────────────────────────────────

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'distributors', label: 'Distributors' },
  { id: 'settings', label: 'Settings' },
  { id: 'discovery', label: 'Discovery' },
];

function TabNav({ activeTab, onSelect }: { activeTab: Tab; onSelect: (t: Tab) => void }) {
  return (
    <nav
      className="flex gap-6 mb-7"
      style={{ borderBottom: `1px solid ${C.softLine}` }}
      aria-label="Dashboard sections"
    >
      {TAB_LABELS.map(({ id, label }) => {
        const isActive = id === activeTab;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            style={{
              ...sans,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? C.charcoal : C.gray500,
              background: 'none',
              border: 'none',
              borderBottom: isActive ? `2px solid ${C.charcoal}` : '2px solid transparent',
              padding: '0 0 10px 0',
              cursor: 'pointer',
              lineHeight: 1.4,
              transition: 'color 0.1s, border-color 0.1s',
            }}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({
  quotes,
  questionsWithText,
  count,
  limit,
  onPick,
}: {
  quotes: ChefQuoteRow[];
  questionsWithText: ChefQuoteRow[];
  count: number;
  limit: number;
  onPick: (q: ChefQuoteRow) => void;
}) {
  return (
    <>
      <div
        className="mb-6 pb-5"
        style={{ borderBottom: `1px solid ${C.softLine}` }}
      >
        <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
          Your quotes
        </h1>
      </div>
      {questionsWithText.length > 0 && (
        <PreviousQuestions
          quotes={questionsWithText.slice(0, 3)}
          onPick={onPick}
        />
      )}
      <QuoteHistory quotes={quotes} onPick={onPick} />
    </>
  );
}

// ─── Distributors tab ─────────────────────────────────────────────────────────

interface DistributorEntry {
  id: string;
  name: string;
  repName: string | null;
  lastQuoteDate: string;
  catalogStatus: 'connected' | 'unaffiliated';
  unclaimed: boolean;
}

function buildDistributorEntries(quotes: ChefQuoteRow[]): DistributorEntry[] {
  const map = new Map<string, DistributorEntry>();

  for (const q of quotes) {
    if (!q.distributor) continue;
    const { id, name } = q.distributor;

    const existing = map.get(id);
    const date = q.sent_at || q.created_at;

    // catalog_status heuristic: rep presence signals a real distributor
    // relationship (rep-sourced quote), meaning the distributor's catalog
    // is connected. ChefQuoteRow doesn't carry quote_type directly, so we
    // use rep presence as the proxy. Cast to any for future quote_type field
    // if the BE adds it.
    const qt: string | null = (q as any).quote_type ?? null;
    const isConnected = q.rep !== null || (qt !== null && qt !== 'guest_quote');

    if (!existing) {
      map.set(id, {
        id,
        name,
        repName: q.rep?.name ?? null,
        lastQuoteDate: date,
        catalogStatus: isConnected ? 'connected' : 'unaffiliated',
        // unclaimed field from BE (feat-distributor-unclaimed-flag); read
        // defensively — the field lands once that branch is merged to main.
        unclaimed: (q.distributor as any).unclaimed === true,
      });
    } else {
      // Keep most-recent date
      if (date > existing.lastQuoteDate) existing.lastQuoteDate = date;
      // Upgrade to connected if any quote qualifies
      if (isConnected) existing.catalogStatus = 'connected';
      // Pick up rep name if not yet set
      if (!existing.repName && q.rep?.name) existing.repName = q.rep.name;
    }
  }

  // Sort: connected first, then by most recent
  return Array.from(map.values()).sort((a, b) => {
    if (a.catalogStatus !== b.catalogStatus) {
      return a.catalogStatus === 'connected' ? -1 : 1;
    }
    return b.lastQuoteDate.localeCompare(a.lastQuoteDate);
  });
}

function DistributorsTab({ quotes }: { quotes: ChefQuoteRow[] }) {
  const entries = buildDistributorEntries(quotes);

  return (
    <div>
      {/* Your distributors */}
      <h2
        style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, marginBottom: 16 }}
      >
        Your distributors
      </h2>

      {entries.length === 0 ? (
        <p style={{ ...sans, fontSize: 14, color: C.gray700, lineHeight: 1.55, marginBottom: 32 }}>
          No distributors on record yet. Once a rep sends you a quote, they'll appear here.
        </p>
      ) : (
        <div
          className="mb-10"
          style={{ border: `1px solid ${C.softLine}`, borderRadius: 8, overflow: 'hidden' }}
        >
          {entries.map((entry, i) => (
            <DistributorRow key={entry.id} entry={entry} isLast={i === entries.length - 1} />
          ))}
        </div>
      )}

      {/* Available in your area */}
      <h2
        style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, marginBottom: 12 }}
      >
        Available in your area
      </h2>
      <p style={{ ...sans, fontSize: 14, color: C.gray700, lineHeight: 1.6 }}>
        More distributors coming soon. We'll surface ones servicing your area as their catalogs
        come online.
      </p>
    </div>
  );
}

function DistributorRow({ entry, isLast }: { entry: DistributorEntry; isLast: boolean }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : `1px solid ${C.softLine}`,
        background: '#fff',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ ...sans, fontSize: 14, fontWeight: 500, color: C.charcoal }}>
              {entry.name}
            </span>
            {entry.unclaimed && (
              <span
                style={{
                  ...sans,
                  fontSize: 10,
                  fontWeight: 500,
                  color: C.gray700,
                  background: '#F3F4F6',
                  padding: '2px 7px',
                  borderRadius: 999,
                }}
              >
                Unclaimed
              </span>
            )}
            <span
              style={{
                ...sans,
                fontSize: 10,
                fontWeight: 500,
                color: entry.catalogStatus === 'connected' ? '#166534' : C.gray700,
                background: entry.catalogStatus === 'connected' ? '#DCFCE7' : '#F3F4F6',
                padding: '2px 7px',
                borderRadius: 999,
              }}
            >
              {entry.catalogStatus === 'connected' ? 'Connected' : 'Unaffiliated'}
            </span>
          </div>
          <div
            className="mt-1"
            style={{ ...sans, fontSize: 12, color: C.gray500, lineHeight: 1.45 }}
          >
            {entry.repName ? `Rep: ${entry.repName}` : 'No rep on record'}
            {' · '}
            Last quote {formatDate(entry.lastQuoteDate)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab({ user }: { user: import('../../services/api').User | null }) {
  return (
    <div className="space-y-10">
      {/* Contact info */}
      <section>
        <h2 style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, marginBottom: 16 }}>
          Contact info
        </h2>
        <div
          style={{ border: `1px solid ${C.softLine}`, borderRadius: 8, overflow: 'hidden', background: '#fff' }}
        >
          <SettingsRow label="Name" value={user ? `${user.first_name} ${user.last_name}`.trim() : ''} />
          <SettingsRow label="Email" value={user?.email ?? ''} />
          <SettingsRow label="Phone" value={user?.phone ?? 'Not on file'} isLast />
        </div>
      </section>

      {/* Restaurant */}
      <section>
        <h2 style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, marginBottom: 16 }}>
          Restaurant
        </h2>
        <div
          style={{ border: `1px solid ${C.softLine}`, borderRadius: 8, overflow: 'hidden', background: '#fff' }}
        >
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.softLine}` }}>
            <div style={{ ...sans, fontSize: 11, color: C.gray500, marginBottom: 3 }}>Logo</div>
            <button
              type="button"
              onClick={() => alert('Coming soon')}
              style={{
                ...sans,
                fontSize: 13,
                color: C.charcoal,
                background: '#F3F4F6',
                border: `1px solid ${C.softLine}`,
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              Upload logo
            </button>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.softLine}` }}>
            <div style={{ ...sans, fontSize: 11, color: C.gray500, marginBottom: 3 }}>Add a chef</div>
            <span style={{ ...sans, fontSize: 13, color: C.gray400 }}>Coming soon</span>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ ...sans, fontSize: 11, color: C.gray500, marginBottom: 3 }}>Add a restaurant location</div>
            <span style={{ ...sans, fontSize: 13, color: C.gray400 }}>Coming soon</span>
          </div>
        </div>
      </section>

      {/* Billing */}
      <section>
        <h2 style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, marginBottom: 16 }}>
          Billing
        </h2>
        <div
          style={{ border: `1px solid ${C.softLine}`, borderRadius: 8, overflow: 'hidden', background: '#fff' }}
        >
          <SettingsRow label="Plan" value="Free tier, 5 quotes per month" isLast />
        </div>
      </section>
    </div>
  );
}

function SettingsRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : `1px solid ${C.softLine}`,
      }}
    >
      <div style={{ ...sans, fontSize: 11, color: C.gray500, marginBottom: 2 }}>{label}</div>
      <div style={{ ...sans, fontSize: 14, color: C.charcoal }}>{value || 'Not on file'}</div>
    </div>
  );
}

// ─── Discovery tab ────────────────────────────────────────────────────────────

function DiscoveryTab() {
  return (
    <div
      className="flex flex-col items-center text-center py-16"
      style={{ maxWidth: 380, margin: '0 auto' }}
    >
      <Lock
        size={28}
        strokeWidth={1.5}
        style={{ color: C.gray400, marginBottom: 16 }}
        aria-hidden="true"
      />
      <p style={{ ...sans, fontSize: 15, fontWeight: 500, color: C.charcoal, marginBottom: 8 }}>
        Discovery is available on paid plans.
      </p>
      <p style={{ ...sans, fontSize: 13, color: C.gray700, lineHeight: 1.6 }}>
        Send one menu to multiple distributors over time.
      </p>
    </div>
  );
}

// ─── Shared subcomponents ────────────────────────────────────────────────────

// V2.1.0 — counter rendering temporarily suppressed; counts received-not-sent
// semantics are wrong until chef-initiated send flow ships. Component
// retained as the V2.5 restoration target (P-V2.5-quote-count-restored-semantics).
function QuoteCount({ count, limit }: { count: number; limit: number }) {
  const remaining = Math.max(0, limit - count);
  return (
    <div
      className="mb-6 pb-5"
      style={{ borderBottom: `1px solid ${C.softLine}` }}
    >
      <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
        Your quotes
      </h1>
      <p
        className="mt-1"
        style={{ ...sans, fontSize: 12, color: C.gray700, lineHeight: 1.5 }}
      >
        {count} of {limit} free quotes used · {remaining} remaining
      </p>
    </div>
  );
}

function PreviousQuestions({
  quotes,
  onPick,
}: {
  quotes: ChefQuoteRow[];
  onPick: (q: ChefQuoteRow) => void;
}) {
  return (
    <section className="mb-7">
      <div
        style={{ ...sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gray700 }}
      >
        Recent questions you've sent
      </div>
      <div className="mt-2 space-y-2">
        {quotes.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onPick(q)}
            className="w-full text-left bg-white rounded-lg p-3.5 transition-shadow hover:shadow-sm"
            style={{ border: `1px solid ${C.softLine}` }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div
                className="min-w-0"
                style={{ ...sans, fontSize: 12, fontWeight: 500, color: C.gray700 }}
              >
                {q.distributor?.name || 'Distributor'} · {q.label}
              </div>
              <div
                className="shrink-0"
                style={{ ...sans, fontSize: 11, color: C.gray500 }}
              >
                {formatDate(q.sent_at || q.created_at)}
              </div>
            </div>
            <div
              className="mt-1.5"
              style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.45 }}
            >
              "{q.latest_question}"
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function QuoteHistory({
  quotes,
  onPick,
}: {
  quotes: ChefQuoteRow[];
  onPick: (q: ChefQuoteRow) => void;
}) {
  return (
    <section>
      <div
        style={{ ...sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gray700 }}
      >
        All quotes
      </div>
      <div className="mt-2 divide-y" style={{ borderTop: `1px solid ${C.softLine}`, borderBottom: `1px solid ${C.softLine}` }}>
        {quotes.map((q) => (
          <div key={q.id} className="py-3 px-1 hover:bg-gray-50">
            {/* Label row — label + PreviewPill placeholder on left, StatusPill on right */}
            <div className="flex items-baseline justify-between gap-3">
              <button
                type="button"
                onClick={() => onPick(q)}
                className="min-w-0 flex-1 text-left flex items-baseline gap-2 hover:opacity-80"
              >
                <span
                  className="truncate"
                  style={{ ...sans, fontSize: 14, fontWeight: 500, color: C.charcoal }}
                >
                  {q.label}
                </span>
                {q.preview && <PreviewPill size="xs" />}
              </button>
              <StatusPill status={q.status} hasOG={q.has_order_guide} />
            </div>
            {/* Meta line — V3 Part 3 format */}
            <div
              className="mt-0.5"
              style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.4, fontVariantNumeric: 'tabular-nums' }}
            >
              {q.quote_number} · {q.distributor?.name ?? 'Unaffiliated'} · {formatDate(q.created_at)} · {q.item_count} {q.item_count === 1 ? 'item' : 'items'} · {money(q.total_cents)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ status, hasOG }: { status: string; hasOG: boolean }) {
  let label = status;
  let bg = '#F3F4F6';
  let color = C.gray700;

  if (status === 'won' && hasOG) { label = 'Ordered'; bg = '#DCFCE7'; color = '#166534'; }
  else if (status === 'won') { label = 'Accepted'; bg = '#DCFCE7'; color = '#166534'; }
  else if (status === 'pending') { label = 'Ready'; bg = 'color-mix(in srgb, var(--accent) 20%, transparent)'; color = '#2A5F6F'; }
  else if (status === 'sent') { label = 'Sent'; bg = 'color-mix(in srgb, var(--accent) 20%, transparent)'; color = '#2A5F6F'; }
  else if (status === 'draft') { label = 'Processing'; bg = '#FEF3C7'; color = '#92400E'; }
  else if (status === 'expired') { label = 'Expired'; bg = '#F3F4F6'; color = C.gray500; }
  else if (status === 'lost') { label = 'Closed'; bg = '#F3F4F6'; color = C.gray500; }

  return (
    <span
      className="inline-flex items-center"
      style={{
        ...sans,
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
        No quotes yet.
      </h1>
      <p
        className="mt-3 max-w-md mx-auto"
        style={{ ...sans, fontSize: 14, color: C.gray700, lineHeight: 1.55 }}
      >
        Once your rep sends you a quote, it'll show up here. They can build one from a menu in a
        minute, ask them to send it from QuoteMe.
      </p>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div
        className="w-8 h-8 rounded-full border-4"
        style={{ borderColor: C.softLine, borderTopColor: C.orange, animation: 'spin 1s linear infinite' }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal }}>
        Couldn't load your quotes.
      </div>
      <p
        className="mt-2 max-w-md mx-auto"
        style={{ ...sans, fontSize: 13, color: C.gray700, lineHeight: 1.55 }}
      >
        {message || 'Try again in a moment.'}
      </p>
    </div>
  );
}
