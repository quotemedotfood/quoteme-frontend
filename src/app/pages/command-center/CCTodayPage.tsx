// CCTodayPage — The Board. Landing dispatch surface for the Command Center.
//
// Reads:
//   0. STAT CARDS    — Products (from getDistributorHome), Inbound Quotes
//                       (from getCommandCenterInbound), Reps (from getDistributorHome).
//                       All three are clickable.
//   0b. INBOUND TABLE — compact RoutingTable of unrouted leads. Reason the
//                       manager logs in. Loads getCommandCenterInbound rows.
//   1. NEEDS AN OWNER — from getCommandCenterUnassigned() items
//   2. MOVING         — from getCommandCenterQuotes(): accepted count + recent accepted rows
//   3. RECENCY        — thin signal only from getCommandCenterRepActivity(): count of
//                       reps with no last_activity_at in past 7 days. One quiet line.
//
// What is deliberately NOT here:
//   - Going-Cold / Team Health full block (Section 5 excluded)
//   - Per-rep cold list with rankings or scoreboard
//   - KPI tiles, charts, trends, percentages
//
// Exactly ONE Sacred Orange on this surface: the "Pick owners →" button.
// Count line is attention signals, not tiles — inline serif numbers + labels.
// Playfair Display headings, DM Sans body, tabular figures, no gradients.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, FileText, ChevronRight, Package, Inbox, Users, Plus } from 'lucide-react';
import {
  CCSectionHead,
  RepAvatar,
  CCStatusTag,
  CountLine,
  AttentionRule,
  sans,
  serif,
  tabular,
  C,
  SACRED_ORANGE,
  CC_ACK_NAVY,
} from '../../components/distributor-admin/command-center/cc-atoms';
import { RoutingTable } from '../../components/distributor-admin/command-center/RoutingTable';
import {
  getCommandCenterUnassigned,
  getCommandCenterQuotes,
  getCommandCenterRepActivity,
  getCommandCenterInbound,
  getDistributorAdminReps,
  getDistributorHome,
  assignInboundOpportunity,
  assignQuote,
  type CCUnassignedItem,
  type CCQuoteRow,
  type RepActivityRow,
  type InboundRow,
  type DistributorRep,
} from '../../services/api';

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  count: number | null;
  label: string;
  onClick: () => void;
}

function StatCard({ icon, count, label, onClick }: StatCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        background: hovered ? '#F9FAFB' : '#fff',
        border: `1px solid ${hovered ? '#A5CFDD' : C.softLine}`,
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 150ms, border-color 150ms',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: '#E8F2F7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#7FAEC2',
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            ...serif,
            fontSize: 22,
            fontWeight: 600,
            color: C.charcoal,
            lineHeight: 1.1,
            ...tabular,
          }}
        >
          {count === null ? '—' : count}
        </div>
        <div
          style={{
            ...sans,
            fontSize: 11.5,
            color: C.gray500,
            marginTop: 2,
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
      </div>
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();
}

// Days since an ISO timestamp. Returns null if null/blank.
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LineSkeleton({ width = 280 }: { width?: number }) {
  return (
    <div
      style={{
        height: 14,
        width,
        maxWidth: '100%',
        background: '#E5E7EB',
        borderRadius: 4,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

function RowSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 0',
        borderBottom: `1px solid ${C.softLine}`,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#E5E7EB',
          flexShrink: 0,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <LineSkeleton width={200} />
        <LineSkeleton width={140} />
      </div>
    </div>
  );
}

// ── Read wrapper — a vertical section with top margin ────────────────────────

function Read({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 28 }}>{children}</div>;
}

// ── Section eyebrow + heading + rule ─────────────────────────────────────────

function SectionHead({
  eyebrow,
  eyebrowColor,
  title,
  right,
}: {
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              ...sans,
              fontSize: 10,
              letterSpacing: '.12em',
              textTransform: 'uppercase' as const,
              color: eyebrowColor ?? C.gray700,
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </div>
          <h3
            style={{
              ...serif,
              fontWeight: 600,
              color: C.charcoal,
              fontSize: 19,
              lineHeight: 1.15,
              marginTop: 4,
            }}
          >
            {title}
          </h3>
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      <AttentionRule />
    </div>
  );
}

// ── Unassigned row ────────────────────────────────────────────────────────────

function UnassignedRow({
  item,
  onClick,
}: {
  item: CCUnassignedItem;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const sub =
    item.kind === 'quote'
      ? `${item.q_label ?? item.id}${item.items != null ? ` · ${item.items} items` : ''}${item.city ? ` · ${item.city}` : ''}`
      : `${item.city ?? ''}${item.age ? ` · ${item.age}` : ''}`.replace(/^·\s*/, '');

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        background: hovered ? '#F9FAFB' : 'transparent',
        border: 'none',
        borderBottom: `1px solid ${C.softLine}`,
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
    >
      <FileText size={15} color={C.gray500} strokeWidth={1.6} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...serif,
            fontWeight: 500,
            color: C.charcoal,
            fontSize: 14.5,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.restaurant}
        </div>
        {sub && (
          <div
            style={{
              ...sans,
              ...tabular,
              fontSize: 11.5,
              color: C.gray500,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <ChevronRight size={14} color={C.gray400} style={{ flexShrink: 0 }} />
    </button>
  );
}

// ── Accepted row ──────────────────────────────────────────────────────────────

function AcceptedRow({
  q,
  onClick,
}: {
  q: CCQuoteRow;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        background: hovered ? '#F9FAFB' : 'transparent',
        border: 'none',
        borderBottom: `1px solid ${C.softLine}`,
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
    >
      {q.rep ? (
        <RepAvatar initials={q.rep.initials} name={q.rep.name} size={26} />
      ) : (
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: `1px dashed ${C.gray400}`,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...serif,
            fontWeight: 500,
            color: C.charcoal,
            fontSize: 13.5,
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
          {q.id}
          {q.rep ? ` · ${q.rep.name}` : ''}
          {` · ${q.sent}`}
        </div>
      </div>
      <CCStatusTag status={q.status} size="xs" />
    </button>
  );
}

// ── CCTodayPage ───────────────────────────────────────────────────────────────

export function CCTodayPage() {
  const navigate = useNavigate();

  // Stat cards: home data (product count, rep count)
  const [productCount, setProductCount] = useState<number | null>(null);
  const [homeRepCount, setHomeRepCount] = useState<number | null>(null);

  // Inbound table: rows + reps for routing
  const [inboundRows, setInboundRows] = useState<InboundRow[]>([]);
  const [inboundReps, setInboundReps] = useState<{ id: string; name: string }[]>([]);
  const [inboundLoading, setInboundLoading] = useState(true);
  const [inboundErrorByRowId, setInboundErrorByRowId] = useState<Record<string, string>>({});

  // Read 1: Needs an owner
  const [unassignedItems, setUnassignedItems] = useState<CCUnassignedItem[]>([]);
  const [unassignedLoading, setUnassignedLoading] = useState(true);

  // Read 2: Moving (week range)
  const [quoteRows, setQuoteRows] = useState<CCQuoteRow[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);

  // Read 3: Recency (thin signal)
  const [repActivity, setRepActivity] = useState<RepActivityRow[]>([]);
  const [repLoading, setRepLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Stat cards: home data
    getDistributorHome().then((res) => {
      if (cancelled) return;
      if (res.data) {
        setProductCount(res.data.catalog_product_count);
        setHomeRepCount(res.data.rep_count);
      }
    });

    // Inbound table: rows + rep list
    Promise.all([
      getCommandCenterInbound(),
      getDistributorAdminReps(),
    ]).then(([inboundRes, repsRes]) => {
      if (cancelled) return;
      setInboundRows(inboundRes.data ?? []);
      if (repsRes.data) {
        const mapped = (repsRes.data as DistributorRep[])
          .filter((r) => r.is_active && r.user_id)
          .map((r) => ({
            id: r.user_id as string,
            name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email,
          }));
        setInboundReps(mapped);
      }
      setInboundLoading(false);
    });

    getCommandCenterUnassigned().then((res) => {
      if (cancelled) return;
      if (res.data) setUnassignedItems(res.data.items);
      setUnassignedLoading(false);
    });

    getCommandCenterQuotes({ range: 'week' }).then((res) => {
      if (cancelled) return;
      if (res.data) setQuoteRows(res.data);
      setQuotesLoading(false);
    });

    getCommandCenterRepActivity().then((res) => {
      if (cancelled) return;
      if (res.data) setRepActivity(res.data);
      setRepLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  // ── Inbound forward handler (mirrors CCInboundPage) ────────────────────────
  const handleInboundForward = React.useCallback(
    async (row: InboundRow, repId: string) => {
      setInboundErrorByRowId((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });

      const res = row.kind === 'opportunity'
        ? await assignInboundOpportunity(row.id, repId)
        : await assignQuote(row.id, repId);

      if (res.error) {
        setInboundErrorByRowId((prev) => ({ ...prev, [row.id]: res.error! }));
        return;
      }

      const rep = inboundReps.find((r) => r.id === repId);
      const updatedRep = rep ? { id: rep.id, name: rep.name } : null;
      setInboundRows((prev) =>
        prev.map((r) =>
          r.id === row.id && r.kind === row.kind
            ? { ...r, assigned_rep: updatedRep }
            : r
        )
      );
    },
    [inboundReps]
  );

  // ── Derived counts ────────────────────────────────────────────────────────

  const acceptedRows = quoteRows.filter((q) => q.status === 'accepted');
  const pendingCount = quoteRows.filter((q) => q.status === 'pending').length;
  const sentCount    = quoteRows.filter((q) => q.status === 'sent').length;
  const recentAccepted = acceptedRows.slice(0, 4);

  const unassignedCount = unassignedItems.length;

  // Reps inactive in last 7 days
  const coldRepCount = repActivity.filter((r) => {
    const d = daysSince(r.last_activity_at);
    return d === null || d >= 7;
  }).length;

  // Count line counts
  const countLineCounts = {
    total:      quoteRows.length,
    accepted:   acceptedRows.length,
    pending:    pendingCount,
    sent:       sentCount,
    unassigned: unassignedCount,
  };

  // ── Navigation helpers ─────────────────────────────────────────────────────

  const goAssign    = () => navigate('/distributor-admin/command-center/assign');
  const goQuoteDetail = (id: string) =>
    navigate(`/distributor-admin/command-center/quotes/${encodeURIComponent(id)}`);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Page header */}
      <CCSectionHead
        eyebrow={`THE BOARD · ${todayLabel()}`}
        title="What needs you this morning."
        right={
          <button
            type="button"
            onClick={() => navigate('/start-new-quote')}
            style={{
              ...sans,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: SACRED_ORANGE,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '9px 15px',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 150ms',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#E0852C';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = SACRED_ORANGE;
            }}
          >
            <Plus size={13} color="#fff" />
            New Quote
          </button>
        }
      />

      {/* ── STAT CARDS ── Products / Inbound Quotes / Reps ─────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 20,
          flexWrap: 'wrap',
        }}
      >
        <StatCard
          icon={<Package size={17} />}
          count={productCount}
          label="Products"
          onClick={() => navigate('/distributor-admin/catalog')}
        />
        <StatCard
          icon={<Inbox size={17} />}
          count={inboundLoading ? null : inboundRows.length}
          label="Inbound Quotes"
          onClick={() => navigate('/distributor-admin/command-center/inbound')}
        />
        <StatCard
          icon={<Users size={17} />}
          count={homeRepCount}
          label="Reps"
          onClick={() => navigate('/distributor-admin/reps')}
        />
      </div>

      {/* ── INBOUND QUOTES TABLE ─────────────────────────────────────────── */}
      <Read>
        <SectionHead
          eyebrow="INBOUND QUOTES"
          eyebrowColor={CC_ACK_NAVY}
          title={
            inboundLoading
              ? 'Loading…'
              : inboundRows.length === 0
              ? 'No inbound leads right now.'
              : `${inboundRows.length} ${inboundRows.length === 1 ? 'lead' : 'leads'} waiting to be routed.`
          }
          right={
            !inboundLoading && inboundRows.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/distributor-admin/command-center/inbound')}
                style={{
                  ...sans,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  color: CC_ACK_NAVY,
                  border: `1px solid ${CC_ACK_NAVY}`,
                  borderRadius: 6,
                  padding: '7px 13px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                See all
                <ArrowRight size={12} color={CC_ACK_NAVY} />
              </button>
            ) : undefined
          }
        />

        {inboundLoading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : inboundRows.length === 0 ? (
          <div
            style={{
              ...sans,
              padding: '20px 0',
              fontSize: 13,
              color: C.gray500,
            }}
          >
            No inbound opportunities yet.
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <RoutingTable
              rows={inboundRows.slice(0, 8)}
              reps={inboundReps}
              onForward={handleInboundForward}
              canForward
              loading={false}
              errorByRowId={inboundErrorByRowId}
            />
            {inboundRows.length > 8 && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => navigate('/distributor-admin/command-center/inbound')}
                  style={{
                    ...sans,
                    fontSize: 12.5,
                    color: CC_ACK_NAVY,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  View all {inboundRows.length} inbound leads →
                </button>
              </div>
            )}
          </div>
        )}
      </Read>

      {/* Count line — attention signals, not KPI tiles */}
      <div style={{ marginTop: 28 }}>
        {quotesLoading ? (
          <LineSkeleton width={400} />
        ) : (
          <CountLine counts={countLineCounts} />
        )}
      </div>

      {/* ── READ 1: NEEDS AN OWNER ───────────────────────────────────────── */}
      <Read>
        <SectionHead
          eyebrow="NEEDS AN OWNER"
          eyebrowColor={SACRED_ORANGE}
          title={
            unassignedLoading
              ? 'Loading…'
              : unassignedCount === 0
              ? 'Nothing sitting without a rep.'
              : `${unassignedCount} ${unassignedCount === 1 ? 'thing' : 'things'} sitting without a rep.`
          }
          right={
            !unassignedLoading && unassignedCount > 0 ? (
              <button
                type="button"
                onClick={goAssign}
                style={{
                  ...sans,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: SACRED_ORANGE,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '9px 15px',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#E0852C';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = SACRED_ORANGE;
                }}
              >
                Pick owners
                <ArrowRight size={13} color="#fff" />
              </button>
            ) : undefined
          }
        />

        {unassignedLoading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : unassignedCount === 0 ? (
          <div
            style={{
              ...sans,
              padding: '20px 0',
              fontSize: 13,
              color: C.gray500,
            }}
          >
            Nothing needs an owner right now.
          </div>
        ) : (
          unassignedItems.map((item, i) => (
            <UnassignedRow
              key={`${item.kind}-${item.id}-${i}`}
              item={item}
              onClick={goAssign}
            />
          ))
        )}
      </Read>

      {/* ── READ 2: MOVING ───────────────────────────────────────────────── */}
      <Read>
        <SectionHead
          eyebrow="MOVING"
          eyebrowColor={CC_ACK_NAVY}
          title={
            quotesLoading
              ? 'Loading…'
              : `${acceptedRows.length} accepted this week. ${pendingCount} waiting to hear back.`
          }
        />

        {quotesLoading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : recentAccepted.length === 0 ? (
          <div
            style={{
              ...sans,
              padding: '20px 0',
              fontSize: 13,
              color: C.gray500,
            }}
          >
            No accepted quotes this week yet.
          </div>
        ) : (
          recentAccepted.map((q) => (
            <AcceptedRow
              key={q.id}
              q={q}
              onClick={() => goQuoteDetail(q.id)}
            />
          ))
        )}
      </Read>

      {/* ── READ 3: RECENCY — thin signal only ───────────────────────────── */}
      {!repLoading && coldRepCount > 0 && (
        <div
          style={{
            ...sans,
            marginTop: 24,
            fontSize: 12.5,
            color: C.gray500,
            lineHeight: 1.6,
          }}
        >
          {coldRepCount === 1
            ? "1 rep hasn't sent a quote recently."
            : `${coldRepCount} reps haven't sent a quote recently.`}{' '}
          <button
            type="button"
            onClick={() => navigate('/distributor-admin/command-center/quotes')}
            style={{
              ...sans,
              fontSize: 12.5,
              color: C.gray700,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            See all rep activity.
          </button>
          {' '}
          <span
            style={{
              ...sans,
              fontSize: 11,
              color: C.gray500,
              fontStyle: 'italic',
            }}
          >
            (Quotes created / sent / accepted are all-time per rep.)
          </span>
        </div>
      )}
    </div>
  );
}
