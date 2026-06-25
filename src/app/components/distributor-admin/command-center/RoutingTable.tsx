// RoutingTable — shared presentational + lightly-stateful inbound routing table.
//
// Used by CCInboundPage (admin view, canForward=true) and, in future, by a rep
// view (canForward=false, Forward To column renders assigned rep name as text).
//
// Columns:
//   Location  · Source  · Date  · Items  · Forward To  · Actions
//
// Forward To:
//   canForward=true + unassigned  → <select> rep list; calls onForward(row, repId) on change.
//   canForward=true + assigned    → disabled <select> pre-selected to the rep (same outline,
//                                   non-actionable; reassigning is blocked BE-side 409).
//   canForward=false              → plain text (assigned rep name or "—")
//
// Sortable headers: Location · Source · Date · Items · Forward To (toggle asc/desc).
//
// Date column: "Today" when received_at matches today; else short calendar date (e.g. "Jun 18").
//   Fallback: age_days=0 → "Today"; else compute calendar date from age_days.
//
// Rep names in Forward-To (assigned rows) link to CC quotes filtered by rep.
//
// Mobile: stacked cards below 768px, mirroring CCQuotesPage ManagerPhone pattern.
//
// NO gradients. No orange on this surface (read-only routing table).

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronUp, ChevronDown, ArrowUpRight } from 'lucide-react';
import {
  sans,
  serif,
  tabular,
  C,
  CC_ACK_NAVY,
} from './cc-atoms';
import type { InboundRow } from '../../../services/api';
import { stripSeedPrefix, formatColdLandingArtifact } from '../../../utils/format';
import { RepTypeahead } from './RepTypeahead';
import { QuoteRowActions } from './QuoteRowActions';

// ── B-116 interim: opportunity-row "View" target ────────────────────────────────
// An opportunity row may reference a downstream artifact (polymorphic on the BE:
// artifact_type/artifact_id). When that artifact is a Quote, "View" should open
// the quote detail — the SAME target the quote-row Edit uses (/rep/quotes/:id).
// When there is no Quote artifact (e.g. a menu-only standing_page lead), there is
// no detail to show yet, so "View" is disabled with a "No detail yet" tooltip.
//
// INTERIM ONLY: this does not build an opportunity-detail drawer (scoped separately).
// Returns the nav path when a quote artifact is present, else null (→ disable View).
export function resolveOpportunityViewTarget(
  artifact: { type: string; id: string; name?: string | null } | null | undefined
): string | null {
  if (!artifact) return null;
  if (artifact.type !== 'Quote') return null;
  if (!artifact.id) return null;
  // B-130: RoutingTable is CC-admin-only; route Quote artifacts to the
  // command-center quote view, not the rep-only /rep/quotes/:id route (which
  // 403s/crashes for a CC admin). Mirrors the quote-row Edit nav.
  return `/distributor-admin/command-center/quotes/${artifact.id}`;
}

// ── Date helper ────────────────────────────────────────────────────────────────

function formatRowDate(received_at: string | null | undefined, age_days: number): string {
  const now = new Date();

  if (received_at) {
    const d = new Date(received_at);
    if (isNaN(d.getTime())) {
      // Fallback if parse fails
      return age_days === 0 ? 'Today' : formatFromAgeDays(age_days, now);
    }
    // Same calendar day?
    if (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    ) {
      return 'Today';
    }
    return formatShortDate(d, now);
  }

  // Fallback: use age_days
  if (age_days === 0) return 'Today';
  return formatFromAgeDays(age_days, now);
}

function formatFromAgeDays(age_days: number, now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - age_days);
  return formatShortDate(d, now);
}

function formatShortDate(d: Date, now: Date): string {
  const sameYear = d.getFullYear() === now.getFullYear();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mon = months[d.getMonth()];
  const day = d.getDate();
  return sameYear ? `${mon} ${day}` : `${mon} ${day}, ${d.getFullYear()}`;
}

// ── Source badge ──────────────────────────────────────────────────────────────
// Colored pill — source is visually distinct from the row's status text so a
// manager can tell "where this came from" apart from "what state it's in".
//
// Color map (no gradients; all flat fills):
//   cold_landing / website / direct → slate blue tint  (#EEF2FF / #3730A3)
//   secure_upload / upload          → teal tint         (#F0FDFA / #0F766E)
//   brand / referral                → amber tint        (#FFFBEB / #92400E)
//   outbound / manual               → warm paper tint   (C.warmPaper / C.gray700)
//   (anything else)                 → plain             (#F3F4F6 / C.gray700)

function sourceColors(source: string | null): { bg: string; color: string; border: string } {
  const s = (source ?? '').toLowerCase();
  if (s.includes('cold') || s.includes('website') || s.includes('direct') || s.includes('landing')) {
    return { bg: '#EEF2FF', color: '#3730A3', border: '#C7D2FE' };
  }
  if (s.includes('upload') || s.includes('secure')) {
    return { bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' };
  }
  if (s.includes('brand') || s.includes('referral')) {
    return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' };
  }
  if (s.includes('outbound') || s.includes('manual')) {
    return { bg: '#FAF9F7', color: '#4B5563', border: '#E5E7EB' };
  }
  return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
}

function InlineSourceBadge({ label, source }: { label: string | null; source?: string | null }) {
  if (!label) return <span style={{ ...sans, fontSize: 11, color: C.gray400 }}>—</span>;
  // P2: color by rendered label so identical labels always get identical chips.
  // Fall back to raw source only when label is absent (already guarded above).
  const { bg, color, border } = sourceColors(label ?? source ?? '');
  return (
    <span
      style={{
        ...sans,
        display: 'inline-block',
        fontSize: 10.5,
        color,
        border: `1px solid ${border}`,
        borderRadius: 999,
        padding: '2px 9px',
        background: bg,
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}

// ── "Needs owner" badge ───────────────────────────────────────────────────────
// Shown on unassigned rows to make assignability obvious at a glance.

function NeedsOwnerBadge() {
  return (
    <span
      style={{
        ...sans,
        display: 'inline-block',
        fontSize: 9.5,
        color: '#92400E',
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 999,
        padding: '1px 7px',
        lineHeight: 1.5,
        fontWeight: 500,
        letterSpacing: '.04em',
        whiteSpace: 'nowrap',
      }}
    >
      Needs owner
    </span>
  );
}

// ── Sort types ────────────────────────────────────────────────────────────────

type SortCol = 'location' | 'source' | 'date' | 'items' | 'forwardTo';
type SortDir = 'asc' | 'desc';

function sortRows(rows: InboundRow[], col: SortCol, dir: SortDir): InboundRow[] {
  const now = new Date();
  const asc = dir === 'asc';

  return [...rows].sort((a, b) => {
    let cmp = 0;

    if (col === 'location') {
      const la = (a.restaurant_name || a.contact_name || '').toLowerCase();
      const lb = (b.restaurant_name || b.contact_name || '').toLowerCase();
      cmp = la.localeCompare(lb);
    } else if (col === 'source') {
      const sa = (a.source_label || a.source || '').toLowerCase();
      const sb = (b.source_label || b.source || '').toLowerCase();
      cmp = sa.localeCompare(sb);
    } else if (col === 'date') {
      // Sort by received_at timestamp first; fallback to age_days
      let ta: number;
      let tb: number;
      if (a.received_at) {
        ta = new Date(a.received_at).getTime();
      } else {
        ta = now.getTime() - a.age_days * 86400000;
      }
      if (b.received_at) {
        tb = new Date(b.received_at).getTime();
      } else {
        tb = now.getTime() - b.age_days * 86400000;
      }
      // Newer = smaller age → ascending means "oldest first" (earliest date)
      cmp = ta - tb;
    } else if (col === 'items') {
      // B-139: sort by numeric item count (quote rows); opportunities have no count so rank last
      const numA = typeof a.items === 'number' ? a.items : -1;
      const numB = typeof b.items === 'number' ? b.items : -1;
      cmp = numA - numB;
    } else if (col === 'forwardTo') {
      const fa = (a.assigned_rep?.name ?? '').toLowerCase();
      const fb = (b.assigned_rep?.name ?? '').toLowerCase();
      cmp = fa.localeCompare(fb);
    }

    return asc ? cmp : -cmp;
  });
}

// ── RoutingTable props ────────────────────────────────────────────────────────

export interface RoutingTableProps {
  rows: InboundRow[];
  reps: { id: string; name: string }[];
  /** Called when the admin picks a rep for a row. */
  onForward: (row: InboundRow, repId: string) => Promise<void>;
  /** true = admin view (shows dropdown). false = rep view (shows plain text). */
  canForward: boolean;
  loading?: boolean;
  /** Map of row.id → error message to show inline (e.g. 409 "Rep owns it" guard). */
  errorByRowId?: Record<string, string>;
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function TableRowSkeleton({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div
        style={{
          padding: '14px 0',
          borderBottom: `1px solid ${C.softLine}`,
        }}
      >
        <div
          style={{
            height: 14,
            width: 180,
            background: '#E5E7EB',
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
        <div
          style={{ height: 11, width: 120, background: '#E5E7EB', borderRadius: 4 }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 120px 90px 140px 160px 80px',
        gap: 12,
        padding: '12px 0',
        borderBottom: `1px solid ${C.softLine}`,
        alignItems: 'center',
      }}
    >
      {[180, 90, 60, 110, 130, 50].map((w, i) => (
        <div
          key={i}
          style={{
            height: 13,
            width: w,
            maxWidth: '100%',
            background: '#E5E7EB',
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  );
}

// ── Row-level forwarding cell ─────────────────────────────────────────────────

interface ForwardCellProps {
  row: InboundRow;
  reps: { id: string; name: string }[];
  canForward: boolean;
  onForward: (row: InboundRow, repId: string) => Promise<void>;
  errorByRowId?: Record<string, string>;
}

function ForwardCell({ row, reps, canForward, onForward, errorByRowId }: ForwardCellProps) {
  const [forwarding, setForwarding] = useState(false);
  const rowError = errorByRowId?.[row.id];
  const navigate = useNavigate();

  if (!canForward) {
    // Rep view — plain text
    return (
      <span style={{ ...sans, fontSize: 12.5, color: C.gray700 }}>
        {row.assigned_rep?.name ?? '—'}
      </span>
    );
  }

  // Bug 1 — Admin view, row already assigned: plain read-only rep name.
  // NO select element (not even disabled). The rep name is followed by an icon
  // button (P1) with a native tooltip that navigates to their activity feed.
  if (row.assigned_rep) {
    const rep = row.assigned_rep;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            ...sans,
            fontSize: 12.5,
            color: CC_ACK_NAVY,
            fontWeight: 500,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {rep.name}
        </span>
        {/* B-117 fix: visible "Activity" label added alongside icon so button reads as actionable */}
        <button
          type="button"
          title="View activity"
          onClick={() =>
            navigate(
              `/distributor-admin/command-center/quotes?rep=${encodeURIComponent(rep.id)}`
            )
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            padding: 2,
            cursor: 'pointer',
            color: CC_ACK_NAVY,
            flexShrink: 0,
            opacity: 0.7,
            ...sans,
            fontSize: 11.5,
          }}
        >
          <span>Activity</span>
          <ArrowUpRight size={13} strokeWidth={2} />
        </button>
      </div>
    );
  }

  // P3 — Admin view, row unassigned: RepTypeahead with typeahead filter.
  async function handleRepSelect(repId: string) {
    if (!repId) return;
    setForwarding(true);
    try {
      await onForward(row, repId);
    } finally {
      setForwarding(false);
    }
  }

  return (
    <div>
      <RepTypeahead
        reps={reps}
        onSelect={handleRepSelect}
        placeholder={forwarding ? 'Forwarding…' : 'Assign rep…'}
        disabled={forwarding}
      />
      {rowError && (
        <div
          style={{
            ...sans,
            fontSize: 11,
            color: '#C0392B',
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {rowError}
        </div>
      )}
    </div>
  );
}

// ── Sort arrow indicator ──────────────────────────────────────────────────────

function SortArrow({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (active !== col) {
    return (
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          marginLeft: 3,
          verticalAlign: 'middle',
          opacity: 0.3,
        }}
      >
        <ChevronUp size={8} strokeWidth={2} style={{ display: 'block', marginBottom: -1 }} />
        <ChevronDown size={8} strokeWidth={2} style={{ display: 'block' }} />
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        marginLeft: 3,
        verticalAlign: 'middle',
        color: C.charcoal,
      }}
    >
      {dir === 'asc' ? (
        <ChevronUp size={10} strokeWidth={2.5} />
      ) : (
        <ChevronDown size={10} strokeWidth={2.5} />
      )}
    </span>
  );
}

// ── Desktop header ────────────────────────────────────────────────────────────

interface TableHeaderProps {
  sortCol: SortCol;
  sortDir: SortDir;
  onSort: (col: SortCol) => void;
}

function TableHeader({ sortCol, sortDir, onSort }: TableHeaderProps) {
  const headerCols: { col: SortCol; label: string }[] = [
    { col: 'location', label: 'Location' },
    { col: 'source', label: 'Source' },
    { col: 'date', label: 'Date' },
    { col: 'items', label: 'Items' },
    { col: 'forwardTo', label: 'Forward To' },
  ];

  const cell = (isActive: boolean): React.CSSProperties => ({
    ...sans,
    fontSize: 9.5,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: isActive ? C.charcoal : C.gray500,
    fontWeight: 600,
    lineHeight: 1.4,
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    background: 'none',
    border: 'none',
    padding: 0,
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 120px 90px 140px 160px 80px',
        gap: 12,
        padding: '0 0 8px',
        borderBottom: `2px solid ${C.charcoal}`,
      }}
    >
      {headerCols.map(({ col, label }) => (
        <button
          key={col}
          type="button"
          onClick={() => onSort(col)}
          style={cell(sortCol === col)}
        >
          {label}
          <SortArrow col={col} active={sortCol} dir={sortDir} />
        </button>
      ))}
      <span
        style={{
          ...sans,
          fontSize: 9.5,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: C.gray500,
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        Actions
      </span>
    </div>
  );
}

// ── Desktop row ───────────────────────────────────────────────────────────────

function DesktopRow({
  row,
  reps,
  canForward,
  onForward,
  errorByRowId,
}: {
  row: InboundRow;
  reps: { id: string; name: string }[];
  canForward: boolean;
  onForward: (row: InboundRow, repId: string) => Promise<void>;
  errorByRowId?: Record<string, string>;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationPrimary = row.restaurant_name || row.contact_name || '—';
  const locationSub = row.contact_name && row.restaurant_name ? row.contact_name : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 120px 90px 140px 160px 80px',
        gap: 12,
        padding: '13px 0',
        borderBottom: `1px solid ${C.softLine}`,
        alignItems: 'start',
      }}
    >
      {/* Location */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            ...serif,
            fontSize: 14,
            fontWeight: 500,
            color: C.charcoal,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {locationPrimary}
        </div>
        {locationSub && (
          <div
            style={{
              ...sans,
              fontSize: 11.5,
              color: C.gray500,
              marginTop: 2,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {locationSub}
          </div>
        )}
        {/* Needs-owner emphasis: unassigned + canForward rows get a badge */}
        {canForward && !row.assigned_rep && (
          <div style={{ marginTop: 5 }}>
            <NeedsOwnerBadge />
          </div>
        )}
      </div>

      {/* Source — colored pill, visually distinct from status text */}
      <div style={{ paddingTop: 2 }}>
        <InlineSourceBadge label={row.source_label} source={row.source} />
      </div>

      {/* Date — "Today" or short calendar date */}
      <div
        style={{
          ...sans,
          ...tabular,
          fontSize: 12,
          color: C.gray500,
          lineHeight: 1.4,
          paddingTop: 3,
        }}
      >
        {formatRowDate(row.received_at, row.age_days)}
      </div>

      {/* B-139 — Items: quote rows show numeric line count; opportunity rows
          show artifact label (e.g. "Quote") or a formatted source label. */}
      <div
        style={{
          ...sans,
          fontSize: 12.5,
          color: C.gray700,
          lineHeight: 1.4,
          paddingTop: 3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.kind === 'quote' && typeof row.items === 'number' && row.items > 0
          ? `${row.items} items`
          : formatColdLandingArtifact(row.source, stripSeedPrefix(row.artifact?.name)) || '—'}
      </div>

      {/* Forward To */}
      <ForwardCell
        row={row}
        reps={reps}
        canForward={canForward}
        onForward={onForward}
        errorByRowId={errorByRowId}
      />

      {/* B-138 — Actions: quote rows get View (PDF) + Edit; opportunity rows get
          View (when a Quote artifact exists) + Start Quote (when rep assigned)
          or Assign first (when no rep yet — disabled with tooltip). */}
      <div style={{ paddingTop: 3 }}>
        {row.kind === 'quote' ? (
          <QuoteRowActions
            quoteId={row.id}
            // B-130: route to the CC-admin quote view, not the rep-only route.
            // /rep/quotes/:id renders RepIncomingQuotePage (rep-scoped fetch) which
            // 403s/crashes for a CC admin and has no CC back-nav. CCQuoteDetailPage
            // loads via the command-center endpoint and carries the back link.
            onEdit={() => navigate(`/distributor-admin/command-center/quotes/${row.id}`, { state: { from: location.pathname } })}
          />
        ) : (
          (() => {
            const viewTarget = resolveOpportunityViewTarget(row.artifact);
            const hasRep = !!row.assigned_rep;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {viewTarget && (
                  <button
                    type="button"
                    onClick={() => navigate(viewTarget)}
                    style={{
                      ...sans,
                      fontSize: 11.5,
                      color: C.charcoal,
                      background: 'none',
                      border: `1px solid ${C.softLine}`,
                      borderRadius: 5,
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                )}
                {hasRep ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/rep/quotes/new?opportunity_id=${encodeURIComponent(row.id)}`)
                    }
                    style={{
                      ...sans,
                      fontSize: 11.5,
                      color: CC_ACK_NAVY,
                      background: 'none',
                      border: `1px solid ${CC_ACK_NAVY}`,
                      borderRadius: 5,
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Start Quote
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Assign a rep first"
                    style={{
                      ...sans,
                      fontSize: 11.5,
                      color: C.gray500,
                      background: 'none',
                      border: `1px solid ${C.softLine}`,
                      borderRadius: 5,
                      padding: '4px 10px',
                      cursor: 'default',
                      opacity: 0.6,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Assign first
                  </button>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function MobileCard({
  row,
  reps,
  canForward,
  onForward,
  errorByRowId,
}: {
  row: InboundRow;
  reps: { id: string; name: string }[];
  canForward: boolean;
  onForward: (row: InboundRow, repId: string) => Promise<void>;
  errorByRowId?: Record<string, string>;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationPrimary = row.restaurant_name || row.contact_name || '—';

  return (
    <div
      style={{
        padding: '14px 0',
        borderBottom: `1px solid ${C.softLine}`,
      }}
    >
      {/* Header: name + source badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            ...serif,
            fontSize: 14,
            fontWeight: 500,
            color: C.charcoal,
            lineHeight: 1.3,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {locationPrimary}
        </div>
        <InlineSourceBadge label={row.source_label} source={row.source} />
      </div>

      {/* Meta row */}
      <div
        style={{
          ...sans,
          fontSize: 11.5,
          color: C.gray500,
          marginBottom: 10,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span style={tabular}>{formatRowDate(row.received_at, row.age_days)}</span>
        {row.artifact?.name && (
          <span>{formatColdLandingArtifact(row.source, stripSeedPrefix(row.artifact.name))}</span>
        )}
        {/* Needs-owner badge on mobile for unassigned actionable rows */}
        {canForward && !row.assigned_rep && <NeedsOwnerBadge />}
      </div>

      {/* Forward To */}
      {canForward && (
        <ForwardCell
          row={row}
          reps={reps}
          canForward={canForward}
          onForward={onForward}
          errorByRowId={errorByRowId}
        />
      )}
      {!canForward && row.assigned_rep && (
        <div style={{ ...sans, fontSize: 12, color: CC_ACK_NAVY }}>
          {row.assigned_rep.name}
        </div>
      )}

      {/* B-138 — quote-kind rows: View (PDF) + Edit. Opportunity rows: View (when
          a Quote artifact exists) + Start Quote (when rep assigned) or Assign first
          (when no rep yet — disabled with tooltip). */}
      {row.kind === 'quote' ? (
        <div style={{ marginTop: 10 }}>
          <QuoteRowActions
            quoteId={row.id}
            // B-130: route to the CC-admin quote view, not the rep-only route.
            // /rep/quotes/:id renders RepIncomingQuotePage (rep-scoped fetch) which
            // 403s/crashes for a CC admin and has no CC back-nav. CCQuoteDetailPage
            // loads via the command-center endpoint and carries the back link.
            onEdit={() => navigate(`/distributor-admin/command-center/quotes/${row.id}`, { state: { from: location.pathname } })}
          />
        </div>
      ) : (
        (() => {
          const viewTarget = resolveOpportunityViewTarget(row.artifact);
          const hasRep = !!row.assigned_rep;
          return (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {viewTarget && (
                <button
                  type="button"
                  onClick={() => navigate(viewTarget)}
                  style={{
                    ...sans,
                    fontSize: 11.5,
                    color: C.charcoal,
                    background: 'none',
                    border: `1px solid ${C.softLine}`,
                    borderRadius: 5,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  View
                </button>
              )}
              {hasRep ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/rep/quotes/new?opportunity_id=${encodeURIComponent(row.id)}`)
                  }
                  style={{
                    ...sans,
                    fontSize: 11.5,
                    color: CC_ACK_NAVY,
                    background: 'none',
                    border: `1px solid ${CC_ACK_NAVY}`,
                    borderRadius: 5,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    alignSelf: 'flex-start',
                  }}
                >
                  Start Quote
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Assign a rep first"
                  style={{
                    ...sans,
                    fontSize: 11.5,
                    color: C.gray500,
                    background: 'none',
                    border: `1px solid ${C.softLine}`,
                    borderRadius: 5,
                    padding: '4px 10px',
                    cursor: 'default',
                    opacity: 0.6,
                    alignSelf: 'flex-start',
                  }}
                >
                  Assign first
                </button>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}

// ── RoutingTable ──────────────────────────────────────────────────────────────

export function RoutingTable({
  rows,
  reps,
  onForward,
  canForward,
  loading = false,
  errorByRowId = {},
}: RoutingTableProps) {
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
  const [sortCol, setSortCol] = React.useState<SortCol>('date');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');

  React.useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  if (loading) {
    return (
      <div>
        {!isMobile && (
          <TableHeader sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
        )}
        {[...Array(4)].map((_, i) => (
          <TableRowSkeleton key={i} isMobile={isMobile} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return null; // Caller renders the empty state so it can carry the section context.
  }

  const sorted = sortRows(rows, sortCol, sortDir);

  return (
    <div>
      {!isMobile && (
        <TableHeader sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
      )}
      {sorted.map((row) =>
        isMobile ? (
          <MobileCard
            key={`${row.kind}-${row.id}`}
            row={row}
            reps={reps}
            canForward={canForward}
            onForward={onForward}
            errorByRowId={errorByRowId}
          />
        ) : (
          <DesktopRow
            key={`${row.kind}-${row.id}`}
            row={row}
            reps={reps}
            canForward={canForward}
            onForward={onForward}
            errorByRowId={errorByRowId}
          />
        )
      )}
    </div>
  );
}
