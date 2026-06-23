// CCQuotes — Rep Activity ledger. Section 2 core surface.
//
// Every quote across the team. Filter by rep, status, date.
// Counts as attention signals — never KPI tiles.
// Each row → /distributor-admin/command-center/quotes/:quoteId (read-only).
//
// No orange on this surface (read-only — one-orange rule: orange lives on
// action surfaces only). Status tags use dots; count line uses ack-navy for
// accepted and charcoal for all others.
//
// Desktop: CSS grid 180px 1fr 78px 130px 64px (REP / RESTAURANT / TOTAL / STATUS / SENT).
// Mobile: stacked rows.
//
// BE contract: GET /api/v1/distributor_admin/command_center/quotes
//   → CCQuoteRow[] (id, rep, restaurant, city, status, sent, items, total|null, requote, wait)

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { User } from 'lucide-react';
import {
  CCStatusTag,
  CCSectionHead,
  CountLine,
  AttentionRule,
  RepAvatar,
  sans,
  serif,
  tabular,
  C,
  CC_ACK_NAVY,
} from '../../components/distributor-admin/command-center/cc-atoms';
import {
  getCommandCenterQuotes,
  type CCQuoteRow,
  type CCQuoteStatus,
} from '../../services/api';

// ── Money formatter ───────────────────────────────────────────────────────────

function money(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 78px 130px 64px',
        gap: 12,
        padding: '14px 0',
        borderBottom: `1px solid ${C.softLine}`,
        alignItems: 'center',
      }}
    >
      {[180, 240, 60, 120, 50].map((w, i) => (
        <div
          key={i}
          style={{
            height: 14,
            width: w,
            maxWidth: '100%',
            background: '#E5E7EB',
            borderRadius: 4,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function FilterChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...sans,
        padding: '5px 12px',
        fontSize: 12,
        whiteSpace: 'nowrap',
        background: on ? C.charcoal : '#fff',
        color: on ? '#fff' : C.charcoal,
        border: `1px solid ${on ? C.charcoal : C.softLine}`,
        borderRadius: 999,
        fontWeight: on ? 500 : 400,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ── Rep chip (avatar + first name) ────────────────────────────────────────────

function RepChip({
  id,
  label,
  initials,
  on,
  onClick,
}: {
  id: string;
  label: string;
  initials?: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...sans,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: id === 'all' ? '5px 12px' : '4px 11px 4px 5px',
        fontSize: 12,
        whiteSpace: 'nowrap',
        background: on ? C.charcoal : '#fff',
        color: on ? '#fff' : C.charcoal,
        border: `1px solid ${on ? C.charcoal : C.softLine}`,
        borderRadius: 999,
        fontWeight: on ? 500 : 400,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {id !== 'all' && initials && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            width: 20,
            height: 20,
            background: on ? 'rgba(255,255,255,.18)' : C.warmPaper,
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: 9,
              color: on ? '#fff' : C.charcoal,
            }}
          >
            {initials}
          </span>
        </span>
      )}
      {label}
    </button>
  );
}

// ── Desktop row ───────────────────────────────────────────────────────────────

function DeskRow({ q, onClick, onRepClick }: { q: CCQuoteRow; onClick: () => void; onRepClick?: (repId: string, e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 78px 130px 64px',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        alignItems: 'center',
        padding: '14px 0',
        background: hovered ? '#F9FAFB' : 'transparent',
        border: 'none',
        borderBottom: `1px solid ${C.softLine}`,
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
    >
      {/* REP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {q.rep ? (
          <RepAvatar initials={q.rep.initials} name={q.rep.name} size={28} />
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: `1px dashed ${C.gray400}`,
              width: 28,
              height: 28,
              flexShrink: 0,
            }}
          >
            <User size={13} color={C.gray400} strokeWidth={1.6} />
          </span>
        )}
        {q.rep ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => onRepClick?.(q.rep!.id, e)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRepClick?.(q.rep!.id, e as unknown as React.MouseEvent); }}
            style={{
              ...sans,
              fontSize: 13,
              color: CC_ACK_NAVY,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
              cursor: 'pointer',
            }}
          >
            {q.rep.name}
          </span>
        ) : (
          <span
            style={{
              ...sans,
              fontSize: 13,
              color: C.charcoal,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Unassigned
          </span>
        )}
      </div>

      {/* RESTAURANT */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            ...serif,
            fontSize: 14.5,
            fontWeight: 500,
            color: C.charcoal,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {q.restaurant}
        </div>
        <div
          style={{
            ...sans,
            ...tabular,
            fontSize: 11.5,
            color: C.gray500,
            lineHeight: 1.3,
          }}
        >
          {q.id} · {q.city} · {q.items} items
          {q.requote > 0 ? ` · re-quoted ${q.requote}×` : ''}
        </div>
      </div>

      {/* TOTAL */}
      <div style={{ ...sans, ...tabular, fontSize: 12.5, color: C.gray700 }}>
        {q.total != null ? money(q.total) : '—'}
      </div>

      {/* STATUS */}
      <div>
        <CCStatusTag status={q.status} />
      </div>

      {/* SENT */}
      <div style={{ ...sans, ...tabular, fontSize: 12, color: C.gray500, textAlign: 'right' }}>
        {q.sent}
      </div>
    </button>
  );
}

// ── Mobile row ────────────────────────────────────────────────────────────────

function PhoneRow({ q, onClick, onRepClick }: { q: CCQuoteRow; onClick: () => void; onRepClick?: (repId: string, e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '12px 0',
        background: hovered ? '#F9FAFB' : 'transparent',
        border: 'none',
        borderBottom: `1px solid ${C.softLine}`,
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
    >
      {q.rep ? (
        <RepAvatar initials={q.rep.initials} name={q.rep.name} size={30} />
      ) : (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: `1px dashed ${C.gray400}`,
            width: 30,
            height: 30,
            flexShrink: 0,
          }}
        >
          <User size={14} color={C.gray400} strokeWidth={1.6} />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span
            style={{
              ...serif,
              fontSize: 14.5,
              fontWeight: 500,
              color: C.charcoal,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {q.restaurant}
          </span>
          <span style={{ ...sans, ...tabular, fontSize: 11, color: C.gray500, flexShrink: 0 }}>
            {q.sent}
          </span>
        </div>
        <div style={{ ...sans, ...tabular, fontSize: 11.5, color: C.gray700, lineHeight: 1.3 }}>
          {q.id} ·{' '}
          {q.rep ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => onRepClick?.(q.rep!.id, e)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRepClick?.(q.rep!.id, e as unknown as React.MouseEvent); }}
              style={{
                color: CC_ACK_NAVY,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                cursor: 'pointer',
              }}
            >
              {q.rep.name}
            </span>
          ) : (
            'unassigned'
          )}{' '}
          · {q.items} items
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CCStatusTag status={q.status} size="xs" />
          {q.requote > 0 && (
            <span style={{ ...sans, ...tabular, fontSize: 10.5, color: C.gray500 }}>
              re-quoted {q.requote}×
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Scrollbar-hiding style ────────────────────────────────────────────────────

const noScrollbar: React.CSSProperties = {
  overflowX: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
};

// ── CCQuotesPage ──────────────────────────────────────────────────────────────

export function CCQuotesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<CCQuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hydrate repFilter from ?rep=<id> query param on mount.
  // Absent → 'all'. Does not respond to subsequent param changes (stable mount).
  const initialRep = searchParams.get('rep') ?? 'all';
  const [repFilter, setRepFilter] = useState<string>(initialRep);
  const [statusFilter, setStatusFilter] = useState<CCQuoteStatus | 'all'>('all');
  const [rangeFilter, setRangeFilter] = useState<'week' | 'month'>('week');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCommandCenterQuotes({ range: rangeFilter }).then((res) => {
      if (cancelled) return;
      if (res.data) setRows(res.data);
      else setError(res.error ?? 'Could not load quotes.');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [rangeFilter]);

  // Derive unique reps from rows
  const reps = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; initials: string }>();
    for (const q of rows) {
      if (q.rep && !seen.has(q.rep.id)) seen.set(q.rep.id, q.rep);
    }
    return Array.from(seen.values());
  }, [rows]);

  // Apply local filters (rep + status) — range is sent to BE
  const filtered = useMemo(() => {
    return rows.filter((q) => {
      const repOk = repFilter === 'all' || q.rep?.id === repFilter;
      const statusOk = statusFilter === 'all' || q.status === statusFilter;
      return repOk && statusOk;
    });
  }, [rows, repFilter, statusFilter]);

  const counts = useMemo(() => ({
    total:      filtered.length,
    accepted:   filtered.filter((q) => q.status === 'accepted').length,
    pending:    filtered.filter((q) => q.status === 'pending').length,
    sent:       filtered.filter((q) => q.status === 'sent').length,
    unassigned: filtered.filter((q) => q.status === 'unassigned').length,
  }), [filtered]);

  const statusFilters: { id: CCQuoteStatus | 'all'; label: string }[] = [
    { id: 'all',        label: 'All' },
    { id: 'accepted',   label: 'Accepted' },
    { id: 'pending',    label: 'Waiting' },
    { id: 'sent',       label: 'Sent' },
    { id: 'unassigned', label: 'Needs owner' },
  ];

  const rangeFilters: { id: 'week' | 'month'; label: string }[] = [
    { id: 'week',  label: 'This week' },
    { id: 'month', label: '30 days' },
  ];

  const goToDetail = (quoteId: string) => {
    navigate(`/distributor-admin/command-center/quotes/${encodeURIComponent(quoteId)}`);
  };

  const goToRep = (repId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't also trigger the row's goToDetail
    navigate(`/distributor-admin/command-center/quotes?rep=${encodeURIComponent(repId)}`);
    // Also update local repFilter so the chips reflect the navigation
    setRepFilter(repId);
  };

  return (
    <div>
      <CCSectionHead
        eyebrow="REP ACTIVITY"
        title="Every quote across the team."
        sub="What each rep has out, and where it landed. Tap a row to read the quote — you see everything, editing stays with the rep."
      />

      <div style={{ marginTop: 16 }}>
        <CountLine counts={counts} />
      </div>

      {/* Filter bar */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* REP row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...noScrollbar }}>
          <span
            style={{
              ...sans,
              fontSize: 9,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: C.gray700,
              fontWeight: 600,
              flexShrink: 0,
              width: 44,
            }}
          >
            REP
          </span>
          <RepChip
            id="all"
            label="All reps"
            on={repFilter === 'all'}
            onClick={() => setRepFilter('all')}
          />
          {reps.map((r) => (
            <RepChip
              key={r.id}
              id={r.id}
              label={r.name.split(' ')[0]}
              initials={r.initials}
              on={repFilter === r.id}
              onClick={() => setRepFilter(r.id)}
            />
          ))}
        </div>

        {/* STATUS row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...noScrollbar }}>
          <span
            style={{
              ...sans,
              fontSize: 9,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: C.gray700,
              fontWeight: 600,
              flexShrink: 0,
              width: 44,
            }}
          >
            STATUS
          </span>
          {statusFilters.map((s) => (
            <FilterChip
              key={s.id}
              on={statusFilter === s.id}
              onClick={() => setStatusFilter(s.id)}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>

        {/* WHEN row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              ...sans,
              fontSize: 9,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: C.gray700,
              fontWeight: 600,
              flexShrink: 0,
              width: 44,
            }}
          >
            WHEN
          </span>
          {rangeFilters.map((s) => (
            <FilterChip
              key={s.id}
              on={rangeFilter === s.id}
              onClick={() => setRangeFilter(s.id)}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Ledger */}
      <div style={{ marginTop: 20 }}>
        {/* Desktop column headers */}
        <div
          className="hidden lg:grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr 78px 130px 64px',
            gap: 12,
            paddingBottom: 8,
          }}
        >
          {(['REP', 'RESTAURANT', 'TOTAL', 'STATUS', 'SENT'] as const).map((h, i) => (
            <div
              key={h}
              style={{
                ...sans,
                fontSize: 9,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: C.gray700,
                fontWeight: 600,
                textAlign: i === 4 ? 'right' : 'left',
              }}
            >
              {h}
            </div>
          ))}
        </div>

        <AttentionRule />

        {loading ? (
          <>
            {[...Array(5)].map((_, i) => <RowSkeleton key={i} />)}
          </>
        ) : error ? (
          <div
            style={{
              ...sans,
              padding: '48px 0',
              textAlign: 'center',
              fontSize: 13,
              color: C.gray500,
            }}
          >
            {error}
          </div>
        ) : rows.length === 0 ? (
          // No quotes at all — the global "nothing here yet" state
          <div
            style={{
              ...sans,
              padding: '64px 0',
              textAlign: 'center',
              fontSize: 13,
              color: C.gray500,
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontSize: 15, color: C.charcoal, fontWeight: 500, marginBottom: 6 }}>
              No quotes yet.
            </div>
            <div>Once reps send quotes this week, they'll show up here.</div>
          </div>
        ) : filtered.length === 0 ? (
          // Quotes exist, but none match the active filters — show in-table message
          // with filter chips still visible above
          <div
            style={{
              ...sans,
              padding: '40px 0',
              textAlign: 'center',
              fontSize: 13,
              color: C.gray500,
              lineHeight: 1.7,
            }}
          >
            {(() => {
              const activeStatus = statusFilters.find((s) => s.id === statusFilter);
              const activeRep = reps.find((r) => r.id === repFilter);
              const statusLabel = activeStatus && activeStatus.id !== 'all' ? activeStatus.label.toLowerCase() : null;
              const repLabel = activeRep ? activeRep.name.split(' ')[0] : null;

              if (statusLabel && repLabel) {
                return `No ${statusLabel} quotes for ${repLabel} this period.`;
              }
              if (statusLabel) {
                return `No ${statusLabel} quotes this period.`;
              }
              if (repLabel) {
                return `No quotes for ${repLabel} this period.`;
              }
              return 'No quotes match that filter.';
            })()}
          </div>
        ) : (
          filtered.map((q) => (
            <React.Fragment key={q.id}>
              {/* Desktop row — hidden on small screens */}
              <div className="hidden lg:block">
                <DeskRow q={q} onClick={() => goToDetail(q.id)} onRepClick={goToRep} />
              </div>
              {/* Mobile row — hidden on large screens */}
              <div className="lg:hidden">
                <PhoneRow q={q} onClick={() => goToDetail(q.id)} onRepClick={goToRep} />
              </div>
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}
