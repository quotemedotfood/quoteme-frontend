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
  Package,
} from 'lucide-react';
import { RepMatchStateBadge } from '../../components/rep/RepMatchStateBadge';
import { CatalogConfirmBanner } from '../../components/rep/CatalogConfirmBanner';
import { getRepIncomingQuotes, getRepInbound, convertRepInboundOpportunity } from '../../services/api';
import type { RepIncomingQuote, InboundRow, InboundBrandItem } from '../../services/api';
import { repRowFlags, REP_FLAG_META } from './repRowFlags';
import type { RepFlagKey } from './repRowFlags';
import { useAuth } from '../../contexts/AuthContext';
import { stripSeedPrefix } from '../../utils/format';

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
  /** Populated for brand_package opportunity rows. */
  _brandName?: string | null;
  _brandItems?: InboundBrandItem[] | null;
  /** The original inbound opportunity id (for convert call). */
  _opportunityId?: string | null;
  /** P0-1: the Quote id this row navigates to for the rep quote detail. Real
   * quote rows use q.id; inbound rows carry a feed/opportunity id in q.id, so
   * their Quote target is captured here (kind 'quote' → the quote id; an
   * opportunity with a Quote artifact → the artifact id). Null when the row maps
   * to no Quote yet (Menu/BrandPackage/cold opportunity) — those must NOT route
   * to /rep/quotes/:id, which 404s ("Couldn't find Quote"). */
  _navQuoteId?: string | null;
};

/**
 * P0-1: Resolve the Quote id a rep-inbound row should navigate to (rep quote
 * detail = /rep/quotes/:id, which queries the Quote model), or null when the
 * row maps to no Quote yet.
 *
 * - quote-kind inbound rows: row.id IS the quote id (serialize_inbound_quote).
 * - opportunity rows: row.id is the InboundOpportunity id — only a Quote
 *   artifact yields a real quote, so navigate to artifact.id.
 * - Menu / BrandPackage / cold opportunities: no quote → null. Routing these to
 *   /rep/quotes/:id produced "Couldn't find Quote with id=" 404s (P0-1).
 */
export function resolveInboundNavQuoteId(row: InboundRow): string | null {
  if (row.kind === 'quote') return row.id;
  if (row.artifact?.type === 'Quote' && row.artifact?.id) return row.artifact.id;
  return null;
}

// ─── Adapter: InboundRow → RepRow ────────────────────────────────────────────
function adaptInboundRow(row: InboundRow): RepRow {
  // Best-effort split of contact_name into first/last.
  const nameParts = (row.contact_name ?? '').trim().split(/\s+/);
  const chef_first = nameParts[0] ?? '';
  const chef_last = nameParts.slice(1).join(' ');

  return {
    // RepIncomingQuote required fields.
    id: row.id,
    label: stripSeedPrefix(row.artifact?.name ?? row.source_label ?? 'Inbound'),
    state: row.status ?? 'new',
    match_state: 'ready', // inbound rows have no match state; placeholder.
    restaurant: row.restaurant_name ?? row.contact_name ?? '-',
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
    // Brand package extras — only present when payload_type == "brand_package"
    _brandName: row.brand_name ?? null,
    _brandItems: row.brand_items ?? null,
    // Keep the raw opportunity id so the convert call can target it directly.
    _opportunityId: row.kind === 'opportunity' ? row.id : null,
    // P0-1: resolve the real Quote id to navigate to (null when the row maps to
    // no Quote — see resolveInboundNavQuoteId).
    _navQuoteId: resolveInboundNavQuoteId(row),
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────
export function RepTriagePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<RepIncomingQuote[]>([]);
  const [inbound, setInbound] = useState<InboundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // P7: CatalogConfirmBanner is admin-only — never shown to pure reps.
  const isDistributorAdmin = user?.role === 'distributor_admin';

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
    // P0: old triage view (/rep/quotes/:id) deleted — route into the canonical
    // quote-build flow instead (MapIngredientsPage loads the existing quote).
    else if (dest === 'rep-incoming' && opts?.quoteId) navigate('/map-ingredients', { state: { quoteId: opts.quoteId } });
    else if (dest === 'rep-pricing' && opts?.quoteId) navigate('/map-ingredients', { state: { quoteId: opts.quoteId } });
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
      showCatalogBanner={isDistributorAdmin}
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
  showCatalogBanner,
}: {
  quotes: RepIncomingQuote[];
  inbound: InboundRow[];
  loading: boolean;
  nav: (dest: string, opts?: { quoteId?: string }) => void;
  bannerDismissed: boolean;
  onDismissBanner: () => void;
  showCatalogBanner?: boolean;
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

  // allGroups: inbound always included (shown in 'all' view and 'inbound' filter).
  // This ensures a freshly forwarded quote is never hidden behind a filter the rep
  // didn't click — Bug 2 FE fix: inbound bucket always visible in default 'all' view.
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

  // Filtered view: 'inbound' chip shows only the inbound group; 'all' shows everything
  // (including inbound — so admin-forwarded items are always visible by default).
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

      {/* Catalog banner — only on this page, dismissable; P7: admin-only */}
      {showCatalogBanner && !bannerDismissed && (
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
                <TriageRow
                  key={q.id}
                  q={q}
                  isDone={g.state === 'done'}
                  nav={nav}
                  onConvertSuccess={(_quoteId) => {
                    // Remove the converted opportunity from the inbound list so it
                    // doesn't appear as a stale row; navigation handles the rest.
                  }}
                />
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
  onConvertSuccess,
}: {
  q: RepRow;
  isDone: boolean;
  nav: (dest: string, opts?: { quoteId?: string }) => void;
  onConvertSuccess?: (quoteId: string) => void;
}) {
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  // Bug 2 FE: inbound QUOTE rows must be actionable so reps can open/price them.
  // Inbound opportunity rows (no linked artifact/quote) stay non-clickable.
  // Heuristic: an inbound row is a quote if it has a real artifact label (anything
  // other than the fallback 'Inbound') or if _sourceLabel is 'quote'. Opportunity
  // rows come through with label='Inbound' and no artifact name.
  const isInbound = !!q._inbound;
  // P0-1: the quote-detail target. Non-inbound rows carry a real Quote id in
  // q.id; inbound rows resolve to _navQuoteId (null unless they actually map to
  // a Quote). This replaces the old `label !== 'Inbound'` heuristic, which
  // wrongly treated every artifact-bearing opportunity (Menu/BrandPackage) as a
  // quote and routed it to /rep/quotes/:id → 404.
  const quoteNavId: string | null = isInbound ? (q._navQuoteId ?? null) : q.id;
  const isInboundQuote = isInbound && !!quoteNavId;
  const isBrandPackageOpp = isInbound && !isInboundQuote && !!(q._brandItems);
  const isClickable = !isDone && !!quoteNavId && (!isInbound || isInboundQuote);

  const flags = q._flags ?? [];

  const handleConvert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!q._opportunityId || converting) return;
    setConverting(true);
    setConvertError(null);
    const res = await convertRepInboundOpportunity(q._opportunityId);
    setConverting(false);
    if (res.error || !res.data) {
      setConvertError(res.error ?? 'Conversion failed');
      return;
    }
    onConvertSuccess?.(res.data.quote_id);
    nav('rep-incoming', { quoteId: res.data.quote_id });
  };

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
      onClick={() => isClickable && quoteNavId && nav('rep-incoming', { quoteId: quoteNavId })}
      onKeyDown={(e) => { if (isClickable && quoteNavId && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nav('rep-incoming', { quoteId: quoteNavId }); } }}
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
          {stripSeedPrefix(q.label) || q.id}
          {!isInbound && (
            <>
              {' '}· {q.chef_first} {q.chef_last} · {q.item_count} items
            </>
          )}
          {isInbound && q._sourceLabel &&
            // B-106: suppress sourceLabel when it's the same string as the label
            // (happens on cold_landing rows where label = source_label = "Cold landing").
            stripSeedPrefix(q.label).trim().toLowerCase() !== q._sourceLabel.trim().toLowerCase() && (
            <span style={{ color: C.gray500 }}> · {q._sourceLabel}</span>
          )}
          {isInbound && q._brandName && (
            <span style={{ color: C.gray500 }}> · {q._brandName}</span>
          )}
          {!isDone && !isInbound && (q.waiting_hours ?? 0) > 0 && (
            <span style={{ color: C.gray500 }}> · waiting {q.waiting_hours}h</span>
          )}
          {!isInbound && q.priced_count != null && q.total_count != null && (
            <span style={{ color: C.gray500 }}> · {q.priced_count}/{q.total_count} priced</span>
          )}
        </div>

        {/* Brand package items — shown for brand_package opportunity rows only */}
        {isBrandPackageOpp && q._brandItems && q._brandItems.length > 0 && (
          <div style={{
            marginTop: 8,
            paddingLeft: 10,
            borderLeft: `2px solid var(--primary, #E05C1A)`,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {q._brandItems.map((item, i) => (
              <div key={i} style={{ ...sans, fontSize: 11, color: C.gray700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={10} color="var(--primary, #E05C1A)" strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{item.product_name}</span>
                {item.pack_size && (
                  <span style={{ color: C.gray500 }}>{item.pack_size}</span>
                )}
                {item.sku && (
                  <span style={{ color: C.gray500, fontVariantNumeric: 'tabular-nums' }}>#{item.sku}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Flags — shown below meta line for clean wrapping on narrow layouts */}
        {flags.length > 0 && (
          <div style={{ marginTop: 5 }}>
            <FlagPills flags={flags} />
          </div>
        )}

        {/* Convert error */}
        {convertError && (
          <div style={{ ...sans, fontSize: 11, color: '#B91C1C', marginTop: 4 }}>
            {convertError}
          </div>
        )}
      </div>

      {/* D5 icons — normal rows + inbound quote rows (actionable). Inbound opportunity rows: none. */}
      {!isDone && (!isInbound || isInboundQuote) ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <RowIconBtn
            onClick={(e) => { e.stopPropagation(); if (quoteNavId) nav('rep-incoming', { quoteId: quoteNavId }); }}
            color="var(--accent, #7FAEC2)"
            bg="rgba(127,174,194,.10)"
            border="rgba(127,174,194,.55)"
            title="Review this quote"
            icon={<SquarePen size={13} color="var(--accent, #7FAEC2)" strokeWidth={1.8} />}
          />
          <RowIconBtn
            onClick={(e) => { e.stopPropagation(); if (quoteNavId) nav('rep-pricing', { quoteId: quoteNavId }); }}
            color="#fff"
            bg="var(--primary)"
            border="var(--primary)"
            title="Price this whole quote"
            icon={<DollarSign size={13} color="#fff" strokeWidth={1.8} />}
          />
        </span>
      ) : isDone && quoteNavId ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (quoteNavId) nav('rep-incoming', { quoteId: quoteNavId }); }}
          style={{
            ...sans, display: 'inline-flex', alignItems: 'center', gap: 2,
            fontSize: 11, color: C.gray500, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Open <ChevronRight size={12} color={C.gray500} strokeWidth={1.8} />
        </button>
      ) : isBrandPackageOpp ? (
        /* "Build quote" button — Sacred Orange primary action for brand_package opps */
        <button
          type="button"
          onClick={handleConvert}
          disabled={converting}
          style={{
            ...sans,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 600,
            padding: '6px 13px',
            borderRadius: 6,
            background: converting ? 'var(--primary-light, rgba(224,92,26,.12))' : 'var(--primary, #E05C1A)',
            color: converting ? 'var(--primary, #E05C1A)' : '#fff',
            border: `1.5px solid var(--primary, #E05C1A)`,
            cursor: converting ? 'default' : 'pointer',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          {converting ? 'Building…' : 'Build quote'}
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
