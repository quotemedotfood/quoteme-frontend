// RoutingTable — shared presentational + lightly-stateful inbound routing table.
//
// Used by CCInboundPage (admin view, canForward=true) and, in future, by a rep
// view (canForward=false, Forward To column renders assigned rep name as text).
//
// Columns:
//   Location  · Source  · Date  · Items  · Forward To  · Actions
//
// Forward To:
//   canForward=true  → <select> rep list; calls onForward(row, repId) on change.
//                      Shows assigned rep name pre-selected when row.assigned_rep set.
//                      409 guard: errorByRowId[row.id] shown inline in red.
//   canForward=false → plain text (assigned rep name or "—")
//
// Mobile: stacked cards below 768px, mirroring CCQuotesPage ManagerPhone pattern.
//
// NO gradients. No orange on this surface (read-only routing table).

import React, { useState } from 'react';
import {
  sans,
  serif,
  tabular,
  SoftRule,
  C,
  CC_ACK_NAVY,
} from './cc-atoms';
import type { InboundRow } from '../../../services/api';

// ── Age helper ────────────────────────────────────────────────────────────────

function formatAgeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
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
  const { bg, color, border } = sourceColors(source ?? label);
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

  if (!canForward) {
    // Rep view — plain text
    return (
      <span style={{ ...sans, fontSize: 12.5, color: C.gray700 }}>
        {row.assigned_rep?.name ?? '—'}
      </span>
    );
  }

  // Admin view, row already assigned — show rep name; no dropdown to avoid
  // accidental re-routing of owned rows.
  if (row.assigned_rep) {
    return (
      <span style={{ ...sans, fontSize: 12.5, color: CC_ACK_NAVY, fontWeight: 500 }}>
        {row.assigned_rep.name}
      </span>
    );
  }

  // Admin view, row unassigned — forward dropdown is the primary action.
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const repId = e.currentTarget.value;
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
      <select
        value=""
        onChange={handleChange}
        disabled={forwarding}
        style={{
          ...sans,
          fontSize: 12,
          color: C.gray500,
          background: '#fff',
          border: `1px solid ${rowError ? '#C0392B' : '#A5B4FC'}`,
          borderRadius: 5,
          padding: '5px 8px',
          cursor: forwarding ? 'default' : 'pointer',
          opacity: forwarding ? 0.6 : 1,
          width: '100%',
          maxWidth: 148,
          transition: 'opacity 150ms',
          // Subtle highlight so unassigned Forward To cells stand out
          boxShadow: rowError ? 'none' : '0 0 0 2px #EEF2FF',
        }}
      >
        <option value="">
          {forwarding ? 'Forwarding…' : 'Assign rep…'}
        </option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
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

// ── Desktop header ────────────────────────────────────────────────────────────

function TableHeader() {
  const cell = (label: string): React.CSSProperties => ({
    ...sans,
    fontSize: 9.5,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: C.gray500,
    fontWeight: 600,
    lineHeight: 1.4,
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
      <span style={cell('Location')}>Location</span>
      <span style={cell('Source')}>Source</span>
      <span style={cell('Date')}>Date</span>
      <span style={cell('Items')}>Items</span>
      <span style={cell('Forward To')}>Forward To</span>
      <span style={cell('Actions')}>Actions</span>
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

      {/* Date */}
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
        {formatAgeDays(row.age_days)}
      </div>

      {/* Items */}
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
        {row.artifact?.name ?? '—'}
      </div>

      {/* Forward To */}
      <ForwardCell
        row={row}
        reps={reps}
        canForward={canForward}
        onForward={onForward}
        errorByRowId={errorByRowId}
      />

      {/* Actions — placeholder slot */}
      <div style={{ paddingTop: 3 }}>
        <button
          type="button"
          disabled
          style={{
            ...sans,
            fontSize: 11.5,
            color: C.gray400,
            background: 'none',
            border: `1px solid ${C.softLine}`,
            borderRadius: 5,
            padding: '4px 10px',
            cursor: 'default',
          }}
        >
          View
        </button>
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
        <span style={tabular}>{formatAgeDays(row.age_days)}</span>
        {row.artifact?.name && (
          <span>{row.artifact.name}</span>
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

  React.useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (loading) {
    return (
      <div>
        {!isMobile && <TableHeader />}
        {[...Array(4)].map((_, i) => (
          <TableRowSkeleton key={i} isMobile={isMobile} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return null; // Caller renders the empty state so it can carry the section context.
  }

  return (
    <div>
      {!isMobile && <TableHeader />}
      {rows.map((row) =>
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
