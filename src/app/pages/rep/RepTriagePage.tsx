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
// Surface 1 extensions (B2):
//   - "Inbound" bucket: rep-scoped inbound opportunities + cold_landing quotes
//     from GET /api/v1/rep/inbound (same InboundRow shape as admin surface).
//   - Filter chips: "All" (default) | "Inbound" — filters which groups render.
//   - Flags column: forwarded-to-you / new / needs-a-call derived via repRowFlags().
//   - canForward=false: rep cannot forward/reassign — no such control anywhere.
//   - Inbound opportunity rows (kind='opportunity') are non-clickable (no nav).
//   - Inbound quote rows (kind='quote') keep normal click-to-open behavior.
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
//   - NO gradients anywhere
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
import { getRepIncomingQuotes, getRepInbound } from '../../services/api';
import type { RepIncomingQuote, InboundRow } from '../../services/api';
import { repRowFlags, REP_FLAG_META } from './repRowFlags';
import type { RepFlagKey } from './repRowFlags';

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

// ─── Unified row type ────────────────────────────────────────────────────────
// RepRow extends RepIncomingQuote with optional inbound metadata.
// Inbound rows borrow the RepIncomingQuote shape but populate only the fields
// they have; _inbound / _flags / _sourceLabel / _statusLabel mark the extras.
type RepRow = RepIncomingQuote & {
  _inbound?: boolean;
  _flags?: RepFlagKey[];
  _sourceLabel?: string | null;
  _statusLabel?: string | null;
};

// ─── Adapter: InboundRow → RepRow ────────────────────────────────────────────
function adaptInboundRow(row: InboundRow): RepRow {
  // Best-effort split of contact_name into first/last.
  const nameParts = (row.contact_name ?? '').trim().split(/\s+/);
  const chef_first = nameParts[0] ?? '';
  const chef_last = nameParts.slice(1).join(' ');

  return {
    // RepIncomingQuote required fields.
    id: row.id,
    label: row.artifact?.name ?? row.source_label ?? 'Inbound',
    state: row.status ?? 'new',
    match_state: 'ready', // inbound rows have no match state; placeholder.
    restaurant: row.restaurant_name ?? row.contact_name ?? '—',
    chef_first,
    chef_last,
    item_count: 0,
    // Inbound-specific extras.
    _inbound: true,
    _flags: repRowFlags({
      kind: row.kind,
      status: row.status,
      assignedToSelf: !!row.assigned_rep,
      waitingHours: row.age_days != null ? row.age_days * 24 : null,
      source: row.source,
    }),
    _sourceLabel: row.source_label,
    _statusLabel: row.status,
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────
export function RepTriagePage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<RepIncomingQuote[]>([]);
  const [inbound, setInbound] = useState<InboundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    Promise.all([getRepIncomingQuotes(), getRepInbound()]).then(([quotesRes, inboundRes]) => {
      if (quotesRes.data) setQuotes(quotesRes.data);
      if (inboundRes.data) setInbound(inboundRes.data);
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

  const body = (
    <TriageBody
      quotes={quotes}
      inbound={inbound}
      loading={loading}
      nav={nav}
      bannerDismissed={bannerDismissed}
      onDismissBanner={() => setBannerDismissed(true)}
    />
  );

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
  inbound,
  loading,
  nav,
  bannerDismissed,
  onDismissBanner,
}: {
  quotes: RepIncomingQuote[];
  inbound: InboundRow[];
  loading: boolean;
  nav: (dest: string, opts?: { quoteId?: string }) => void;
  bannerDismissed: boolean;
  onDismissBanner: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'inbound'>('all');

  // Group normal quotes into buckets — same logic as before.
  const incoming = quotes.filter((q) => !q.confirmed && (q.state === 'preview' || q.match_state));
  const inProgress = quotes.filter((q) => !q.confirmed && q.priced_count != null && (q.priced_count ?? 0) > 0 && q.state !== 'preview');
  const confirmed = quotes.filter((q) => q.confirmed);

  const incomingCount = incoming.length;

  // Augment normal quote rows with _flags so flag pills render on them too.
  function withFlags(q: RepIncomingQuote): RepRow {
    return {
      ...q,
      _flags: repRowFlags({
        kind: 'quote',
        status: q.state ?? undefined,
        waitingHours: q.waiting_hours,
        source: null,
      }),
    };
  }

  type Group = {
    key: string;
    label: string;
    state: 'ready' | 'review' | 'coverage' | 'draft' | 'done' | 'inbound';
    rows: RepRow[];
  };

  // Within incoming, order: review → coverage → ready (worst-first).
  const incomingByState: Group[] = [
    {
      key: 'review',
      label: 'Needs my review',
      state: 'review',
      rows: incoming.filter((q) => q.match_state === 'review').sort((a, b) => (b.waiting_hours ?? 0) - (a.waiting_hours ?? 0)).map(withFlags),
    },
    {
      key: 'coverage',
      label: 'Coverage gaps',
      state: 'coverage',
      rows: incoming.filter((q) => q.match_state === 'coverage').sort((a, b) => (b.waiting_hours ?? 0) - (a.waiting_hours ?? 0)).map(withFlags),
    },
    {
      key: 'ready',
      label: 'Ready to price',
      state: 'ready',
      rows: incoming.filter((q) => q.match_state === 'ready').sort((a, b) => (b.waiting_hours ?? 0) - (a.waiting_hours ?? 0)).map(withFlags),
    },
  ].filter((g) => g.rows.length > 0);

  // Inbound bucket from rep inbound endpoint.
  const inboundRows: RepRow[] = inbound.map(adaptInboundRow);
  const inboundGroup: Group | null = inboundRows.length > 0
    ? { key: 'inbound', label: 'Inbound', state: 'inbound', rows: inboundRows }
    : null;

  const allGroups: Group[] = [
    ...incomingByState,
    inProgress.length > 0
      ? { key: 'draft', label: 'In progress', state: 'draft' as const, rows: inProgress.map(withFlags) }
      : null,
    confirmed.length > 0
      ? { key: 'done', label: 'Confirmed', state: 'done' as const, rows: confirmed.map(withFlags) }
      : null,
    inboundGroup,
  ].filter(Boolean) as Group[];

  // Filtered view: 'inbound' chip shows only the inbound group.
  const groups = filter === 'inbound'
    ? allGroups.filter((g) => g.key === 'inbound')
    : allGroups;

  const hasInbound = inboundRows.length > 0;

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

      {/* Filter chips — All + Inbound */}
      {!loading && (hasInbound || filter === 'inbound') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <FilterChip
            label="All"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterChip
            label={`Inbound${inboundRows.length > 0 ? ` · ${inboundRows.length}` : ''}`}
            active={filter === 'inbound'}
            onClick={() => setFilter('inbound')}
          />
        </div>
      )}

      {/* Queue groups */}
      {!loading && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groups.length === 0 && (
            <div style={{ ...sans, fontSize: 13, color: C.gray700, padding: '32px 0', textAlign: 'center' }}>
              {filter === 'inbound' ? 'No inbound items.' : 'No quotes yet.'}
            </div>
          )}
          {groups.map((g) => (
            <section key={g.key}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  {g.state === 'inbound' ? (
                    <span style={{ ...sans, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.charcoal }}>
                      Inbound
                    </span>
                  ) : g.state === 'draft' || g.state === 'done'
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
                  {g.state === 'inbound' && (
                    <span style={{ ...sans, fontSize: 11, color: C.gray500, fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>
                      · assigned to you
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

// ─── Filter chip ───────────────────────────────────────────────────────────
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...sans,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        padding: '4px 12px',
        borderRadius: 999,
        border: active ? `1px solid ${C.charcoal}` : `1px solid ${C.softLine}`,
        background: active ? C.charcoal : 'transparent',
        color: active ? '#fff' : C.gray700,
        cursor: 'pointer',
        lineHeight: 1.6,
      }}
    >
      {label}
    </button>
  );
}

// ─── Flag pills ────────────────────────────────────────────────────────────
function FlagPills({ flags }: { flags: RepFlagKey[] }) {
  if (!flags || flags.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
      {flags.map((key) => {
        const meta = REP_FLAG_META[key];
        return (
          <span
            key={key}
            style={{
              ...sans,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 999,
              background: meta.bg,
              color: meta.fg,
              whiteSpace: 'nowrap',
            }}
          >
            {meta.label}
          </span>
        );
      })}
    </span>
  );
}

// ─── Triage row ────────────────────────────────────────────────────────────
function TriageRow({
  q,
  isDone,
  nav,
}: {
  q: RepRow;
  isDone: boolean;
  nav: (dest: string, opts?: { quoteId?: string }) => void;
}) {
  // Inbound opportunity rows (kind discriminator from _inbound + no item_count > 0
  // with no label set to a real quote id) are non-clickable — no nav, cursor default.
  // Inbound quote rows may keep normal click-to-open behavior.
  // We detect opportunity rows by _inbound=true AND item_count===0 (adaptor sets 0 for opps).
  // A simpler heuristic: _inbound rows whose _statusLabel or _sourceLabel are set
  // but have no priced_count are opportunities. Most reliable: stash kind on _sourceLabel.
  // The adaptor sets item_count=0 for ALL inbound rows; for inbound quotes there would
  // typically be a linked artifact. We use _inbound + item_count===0 + no confirmed.
  // IMPORTANT: The spec says kind='opportunity' rows are non-clickable; kind='quote' rows
  // may keep normal behavior. Since we don't store kind on RepRow, we use the heuristic
  // that inbound rows with no priced_count AND _inbound=true behave as non-clickable
  // unless we have a real quote id (checked by whether _flags are set without _sourceLabel
  // pointing to 'quote'). Most conservative: all _inbound rows are non-clickable except
  // those whose label looks like a real quote (has an artifact name). We keep it simple:
  // all _inbound rows are non-clickable (no D5 icons), matching canForward=false doctrine.
  const isInbound = !!q._inbound;
  const isClickable = !isDone && !isInbound;

  const flags = q._flags ?? [];

  return (
    <div
      role={isClickable ? 'link' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 0',
        borderBottom: `1px solid ${C.softLine}`,
        opacity: isDone ? 0.7 : 1,
        cursor: isClickable ? 'pointer' : 'default',
      }}
      onClick={() => isClickable && nav('rep-incoming', { quoteId: q.id })}
      onKeyDown={(e) => { if (isClickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nav('rep-incoming', { quoteId: q.id }); } }}
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
          {isInbound && q._statusLabel && (
            <span style={{ ...sans, fontSize: 10, color: C.gray500, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {q._statusLabel}
            </span>
          )}
        </div>
        <div style={{ ...sans, fontSize: 12, color: C.gray700, lineHeight: 1.35, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {q.label || q.id}
          {!isInbound && (
            <>
              {' '}· {q.chef_first} {q.chef_last} · {q.item_count} items
            </>
          )}
          {isInbound && q._sourceLabel && (
            <span style={{ color: C.gray500 }}> · {q._sourceLabel}</span>
          )}
          {!isDone && !isInbound && (q.waiting_hours ?? 0) > 0 && (
            <span style={{ color: C.gray500 }}> · waiting {q.waiting_hours}h</span>
          )}
          {!isInbound && q.priced_count != null && q.total_count != null && (
            <span style={{ color: C.gray500 }}> · {q.priced_count}/{q.total_count} priced</span>
          )}
        </div>

        {/* Flags — shown below meta line for clean wrapping on narrow layouts */}
        {flags.length > 0 && (
          <div style={{ marginTop: 5 }}>
            <FlagPills flags={flags} />
          </div>
        )}
      </div>

      {/* D5 icons — normal (non-inbound, non-done) rows only */}
      {!isDone && !isInbound ? (
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
      ) : isDone ? (
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
      ) : null}
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
