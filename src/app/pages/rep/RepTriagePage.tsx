// RepTriagePage — `/rep/triage`
//
// The rep's dispatch queue. Doctrine 9.2: "what quote am I building next?"
// Desktop: rendered inside RepLayout (persistent sidebar shell).
// Mobile: slim header, scrollable queue.
//
// Three visible buckets per design:
//   Incoming (preview=true)  · In progress (draft, partially priced)
//   Confirmed (done)
// Quote-level grouping mirrors the design prototype's match-state-first
// ordering within the incoming bucket (review → coverage → ready), then
// in-progress, then confirmed.
//
// D5 icons (always-visible per row): blue review + orange price.
// Row click → /rep/quotes/:id.
//
// Doctrine compliance:
//   - No dollar totals in triage view (Q3 LOCKED — no qty, no totals)
//   - Sacred Orange = var(--primary)
//   - Coverage dots = var(--accent)
//   - Base44 verb test: "Review" / "Price" / "Open" — no platform/AI copy
//   - NEVER show catalog name; distributor name only
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · RepTriageQueue.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Inbox,
  SquarePen,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { RepMatchStateBadge } from '../../components/rep/RepMatchStateBadge';
import { CatalogConfirmBanner } from '../../components/rep/CatalogConfirmBanner';
import { getRepIncomingQuotes } from '../../services/api';
import type { RepIncomingQuote } from '../../services/api';

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
} as const;

function eyebrow(size = 10): React.CSSProperties {
  return {
    ...sans, fontSize: size, fontWeight: 600,
    letterSpacing: '.12em', textTransform: 'uppercase', color: C.gray700,
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────
export function RepTriagePage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<RepIncomingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    getRepIncomingQuotes().then((res) => {
      if (res.data) setQuotes(res.data);
      setLoading(false);
    });
  }, []);

  const nav = (dest: string, opts?: { quoteId?: string }) => {
    if (dest === 'rep-triage' || dest === 'rep-quotes-inbound') navigate('/rep/quotes/inbound');
    else if (dest === 'rep-quotes-history') navigate('/rep/quotes/history');
    else if (dest === 'rep-incoming' && opts?.quoteId) navigate(`/rep/quotes/${opts.quoteId}`);
    else if (dest === 'rep-pricing' && opts?.quoteId) navigate(`/rep/quotes/${opts.quoteId}?mode=pricing`);
    else if (dest === 'rep-catalog') navigate('/distributor-admin/catalog');
    else if (dest === 'rep-settings') navigate('/settings');
  };

  const body = <TriageBody quotes={quotes} loading={loading} nav={nav} bannerDismissed={bannerDismissed} onDismissBanner={() => setBannerDismissed(true)} />;

  // Desktop: RepLayout provides shell + sidebar. Render body directly.
  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block">
        {body}
      </div>
      {/* Mobile view */}
      <div className="block md:hidden" style={{ minHeight: '100vh', background: '#fff' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: `1px solid ${C.softLine}`,
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal, lineHeight: 1 }}>QuoteMe</span>
            <span style={{ ...eyebrow(9), letterSpacing: '.16em' }}>REP</span>
          </div>
          <Inbox size={18} color={C.gray700} strokeWidth={1.8} />
        </div>
        <div style={{ padding: '20px' }}>
          {body}
        </div>
      </div>
    </>
  );
}

// ─── Triage body ───────────────────────────────────────────────────────────
function TriageBody({
  quotes,
  loading,
  nav,
  bannerDismissed,
  onDismissBanner,
}: {
  quotes: RepIncomingQuote[];
  loading: boolean;
  nav: (dest: string, opts?: { quoteId?: string }) => void;
  bannerDismissed: boolean;
  onDismissBanner: () => void;
}) {
  // Group into buckets
  const incoming = quotes.filter((q) => !q.confirmed && (q.state === 'preview' || q.match_state));
  const inProgress = quotes.filter((q) => !q.confirmed && q.priced_count != null && (q.priced_count ?? 0) > 0 && q.state !== 'preview');
  const confirmed = quotes.filter((q) => q.confirmed);

  const incomingCount = incoming.length;

  type Group = {
    key: string;
    label: string;
    state: 'ready' | 'review' | 'coverage' | 'draft' | 'done';
    rows: RepIncomingQuote[];
  };

  // Within incoming, order: review → coverage → ready (worst-first)
  const incomingByState: Group[] = [
    {
      key: 'review',
      label: 'Needs my review',
      state: 'review',
      rows: incoming.filter((q) => q.match_state === 'review').sort((a, b) => (b.waiting_hours ?? 0) - (a.waiting_hours ?? 0)),
    },
    {
      key: 'coverage',
      label: 'Coverage gaps',
      state: 'coverage',
      rows: incoming.filter((q) => q.match_state === 'coverage').sort((a, b) => (b.waiting_hours ?? 0) - (a.waiting_hours ?? 0)),
    },
    {
      key: 'ready',
      label: 'Ready to price',
      state: 'ready',
      rows: incoming.filter((q) => q.match_state === 'ready').sort((a, b) => (b.waiting_hours ?? 0) - (a.waiting_hours ?? 0)),
    },
  ].filter((g) => g.rows.length > 0);

  const groups: Group[] = [
    ...incomingByState,
    inProgress.length > 0
      ? { key: 'draft', label: 'In progress', state: 'draft' as const, rows: inProgress }
      : null,
    confirmed.length > 0
      ? { key: 'done', label: 'Confirmed', state: 'done' as const, rows: confirmed }
      : null,
  ].filter(Boolean) as Group[];

  return (
    <>
      {/* Header */}
      <div>
        <div style={eyebrow(11)}>TRIAGE</div>
        <h1 style={{ ...serif, fontSize: 28, fontWeight: 600, color: C.charcoal, marginTop: 4, lineHeight: 1.1 }}>
          What are you building next?
        </h1>
        <p style={{ ...sans, fontSize: 13, color: C.gray700, lineHeight: 1.6, marginTop: 6, maxWidth: 540 }}>
          {loading
            ? 'Loading your queue…'
            : `${incomingCount} new ${incomingCount === 1 ? 'quote' : 'quotes'} in your queue, ordered by what's waiting longest.`}
        </p>
      </div>

      {/* Catalog banner — only on this page, dismissable */}
      {!bannerDismissed && (
        <div style={{ marginTop: 16 }}>
          <CatalogConfirmBanner
            onReview={() => nav('rep-catalog')}
            onDismiss={onDismissBanner}
            distributorName={undefined}
          />
        </div>
      )}

      {/* Queue groups */}
      {!loading && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groups.length === 0 && (
            <div style={{ ...sans, fontSize: 13, color: C.gray700, padding: '32px 0', textAlign: 'center' }}>
              No quotes yet.
            </div>
          )}
          {groups.map((g) => (
            <section key={g.key}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  {g.state === 'draft' || g.state === 'done'
                    ? <RepMatchStateBadge state="ready" />
                    : <RepMatchStateBadge state={g.state as 'ready' | 'review' | 'coverage'} />}
                  {g.state === 'draft' && (
                    <span style={{ ...sans, fontSize: 11, color: C.gray500, fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>
                      · pricing in progress
                    </span>
                  )}
                  {g.state === 'done' && (
                    <span style={{ ...sans, fontSize: 11, color: C.gray500, fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>
                      · confirmed &amp; sent
                    </span>
                  )}
                </div>
                <span style={{ ...sans, fontSize: 11, color: C.gray500, fontVariantNumeric: 'tabular-nums' }}>{g.rows.length}</span>
              </div>

              {/* Thick divider */}
              <div style={{ borderTop: `2px solid ${C.charcoal}`, marginBottom: 0 }} />

              {/* Rows */}
              {g.rows.map((q) => (
                <TriageRow key={q.id} q={q} isDone={g.state === 'done'} nav={nav} />
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Triage row ────────────────────────────────────────────────────────────
function TriageRow({
  q,
  isDone,
  nav,
}: {
  q: RepIncomingQuote;
  isDone: boolean;
  nav: (dest: string, opts?: { quoteId?: string }) => void;
}) {
  return (
    <div
      role={isDone ? undefined : 'link'}
      tabIndex={isDone ? undefined : 0}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 0',
        borderBottom: `1px solid ${C.softLine}`,
        opacity: isDone ? 0.7 : 1,
        cursor: isDone ? 'default' : 'pointer',
      }}
      onClick={() => !isDone && nav('rep-incoming', { quoteId: q.id })}
      onKeyDown={(e) => { if (!isDone && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nav('rep-incoming', { quoteId: q.id }); } }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ ...serif, fontSize: 14.5, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
            {q.restaurant}
          </span>
          {isDone && q.confirmed_at && (
            <span style={{ ...sans, fontSize: 10, color: C.gray500, letterSpacing: '.06em' }}>
              CONFIRMED {q.confirmed_at}
            </span>
          )}
        </div>
        <div style={{ ...sans, fontSize: 12, color: C.gray700, lineHeight: 1.35, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {q.label || q.id} · {q.chef_first} {q.chef_last} · {q.item_count} items
          {!isDone && (q.waiting_hours ?? 0) > 0 && (
            <span style={{ color: C.gray500 }}> · waiting {q.waiting_hours}h</span>
          )}
          {q.priced_count != null && q.total_count != null && (
            <span style={{ color: C.gray500 }}> · {q.priced_count}/{q.total_count} priced</span>
          )}
        </div>
      </div>

      {/* D5 icons — always visible, never hidden. Context = "quote" on triage rows. */}
      {!isDone ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <RowIconBtn
            onClick={(e) => { e.stopPropagation(); nav('rep-incoming', { quoteId: q.id }); }}
            color="var(--accent, #7FAEC2)"
            bg="rgba(127,174,194,.10)"
            border="rgba(127,174,194,.55)"
            title="Review this quote"
            icon={<SquarePen size={13} color="var(--accent, #7FAEC2)" strokeWidth={1.8} />}
          />
          <RowIconBtn
            onClick={(e) => { e.stopPropagation(); nav('rep-pricing', { quoteId: q.id }); }}
            color="#fff"
            bg="var(--primary)"
            border="var(--primary)"
            title="Price this whole quote"
            icon={<DollarSign size={13} color="#fff" strokeWidth={1.8} />}
          />
        </span>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); nav('rep-incoming', { quoteId: q.id }); }}
          style={{
            ...sans, display: 'inline-flex', alignItems: 'center', gap: 2,
            fontSize: 11, color: C.gray500, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Open <ChevronRight size={12} color={C.gray500} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

// ─── Row icon button ───────────────────────────────────────────────────────
function RowIconBtn({
  onClick,
  color,
  bg,
  border,
  title,
  icon,
}: {
  onClick: (e: React.MouseEvent) => void;
  color: string;
  bg: string;
  border: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 28, height: 28,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%',
        background: bg,
        border: `1px solid ${border}`,
        color,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );
}
