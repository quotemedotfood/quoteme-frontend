// ChefMenuSpreadPage — /chef/menus/:id/spread
//
// Price-comparison reference document: menu items × distributors.
// Desktop: wide CSS grid (item column + one column per distributor).
// Mobile: per-item cards with stacked distributor prices + horizontal-scroll
//         summary chips at the top.
//
// Locked copy doctrine:
//   - Reference document voice, NOT marketplace
//   - No "best price", "buy", "compare prices", "shop"
//   - No gradients
//   - Banned words: AI, intelligent, automated, platform, ecosystem, seamless,
//     "best", "deal", "save"

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  getMenuSpread,
  type MenuSpreadResponse,
  type SpreadDistributor,
  type SpreadMenuItem,
  type SpreadMatrixCell,
  type SpreadColumnTotal,
} from '../../services/api';

// ─── Design tokens ───────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  charcoalSoft: '#4F4F4F',
  gray400: '#9E9E9E',
  gray200: '#E0E0E0',
  gray100: '#F5F5F5',
  orange: '#F9A64B',
  orangeSoft: 'rgba(249,166,75,0.12)',
  cheapIndicator: '#5A5A5A', // faint charcoal ↓
  white: '#FFFFFF',
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatPct(pct: number): string {
  return Math.round(pct) + '%';
}

// Build a lookup: itemId + distributorId → cell
function buildLookup(
  matrix: SpreadMatrixCell[]
): Map<string, SpreadMatrixCell> {
  const m = new Map<string, SpreadMatrixCell>();
  for (const cell of matrix) {
    m.set(`${cell.item_id}__${cell.distributor_id}`, cell);
  }
  return m;
}

// For a given item row, find the distributor_id with the cheapest unit_price.
// Returns null if fewer than 2 distributors have a matched price (no real choice).
function cheapestDistributorId(
  itemId: string,
  distributors: SpreadDistributor[],
  lookup: Map<string, SpreadMatrixCell>
): string | null {
  const matched: Array<{ distId: string; price: number }> = [];
  for (const d of distributors) {
    const cell = lookup.get(`${itemId}__${d.id}`);
    if (cell && !cell.unmatched && cell.unit_price_cents !== null) {
      matched.push({ distId: d.id, price: cell.unit_price_cents });
    }
  }
  if (matched.length < 2) return null;
  matched.sort((a, b) => a.price - b.price);
  return matched[0].distId;
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function SpinnerFull() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 240 }}>
      <div
        className="w-9 h-9 rounded-full border-4"
        style={{
          borderColor: C.gray200,
          borderTopColor: C.orange,
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ menuId }: { menuId: string }) {
  const navigate = useNavigate();
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6"
      style={{ minHeight: 320, ...sans }}
    >
      <p
        style={{
          ...serif,
          fontSize: 22,
          fontWeight: 600,
          color: C.charcoal,
          marginBottom: 8,
        }}
      >
        This menu hasn't been quoted yet.
      </p>
      <p style={{ fontSize: 14, color: C.gray400, marginBottom: 24, maxWidth: 340 }}>
        Run this menu against a distributor's catalog to generate a spread.
      </p>
      <button
        onClick={() => navigate(`/chef/pull/entry`)}
        style={{
          background: C.orange,
          color: C.white,
          border: 'none',
          borderRadius: 6,
          padding: '10px 22px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Pull a quote
      </button>
    </div>
  );
}

// ─── Desktop grid ────────────────────────────────────────────────────────────
// Uses CSS grid with dynamic column count. Each distributor gets one column.
// Column layout: [item label] [dist1] [dist2] … [distN]

interface DesktopGridProps {
  spread: MenuSpreadResponse;
  selectedDistId: string | null;
  onSelectDist: (id: string) => void;
}

function DesktopGrid({ spread, selectedDistId, onSelectDist }: DesktopGridProps) {
  const { menu, distributors, matrix, column_totals } = spread;
  const lookup = useMemo(() => buildLookup(matrix), [matrix]);

  const colCount = distributors.length;
  // CSS grid: first col = item name (minmax 160px, 1fr), rest = equal (minmax 110px, 1fr)
  const gridTemplate = `minmax(180px, 2fr) repeat(${colCount}, minmax(110px, 1fr))`;

  const totalsMap = useMemo(() => {
    const m = new Map<string, SpreadColumnTotal>();
    for (const t of column_totals) m.set(t.distributor_id, t);
    return m;
  }, [column_totals]);

  // Group items by section
  const sections = useMemo(() => {
    const map = new Map<string, SpreadMenuItem[]>();
    for (const item of menu.items) {
      const key = item.section || 'Menu Items';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [menu.items]);

  const headerCell: React.CSSProperties = {
    ...sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: C.gray400,
    padding: '10px 10px 8px',
    borderBottom: `1px solid ${C.gray200}`,
    background: C.white,
  };

  const dataCell: React.CSSProperties = {
    ...sans,
    fontSize: 13,
    color: C.charcoal,
    padding: '9px 10px',
    borderBottom: `1px solid ${C.gray100}`,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
  };

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          minWidth: 460 + colCount * 120,
        }}
      >
        {/* ── Column headers ── */}
        {/* Item label header */}
        <div style={{ ...headerCell }}>Item</div>
        {distributors.map((dist) => {
          const isSelected = selectedDistId === dist.id;
          return (
            <div
              key={dist.id}
              style={{
                ...headerCell,
                textAlign: 'right' as const,
                background: isSelected ? C.orangeSoft : C.white,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => onSelectDist(dist.id)}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 6,
                }}
              >
                {/* Radio indicator */}
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? C.orange : C.gray200}`,
                    background: isSelected ? C.orange : 'transparent',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                />
                <span
                  style={{
                    color: isSelected ? C.charcoal : C.gray400,
                  }}
                >
                  {toTitleCase(dist.name)}
                </span>
              </div>
            </div>
          );
        })}

        {/* ── Section rows ── */}
        {Array.from(sections.entries()).map(([section, items]) => (
          <SectionRows
            key={section}
            section={section}
            items={items}
            distributors={distributors}
            lookup={lookup}
            selectedDistId={selectedDistId}
            colCount={colCount}
            dataCell={dataCell}
          />
        ))}

        {/* ── Section subtotals ── */}
        {/* Grand totals row */}
        <div
          style={{
            ...sans,
            fontSize: 12,
            fontWeight: 700,
            color: C.charcoalSoft,
            padding: '11px 10px',
            borderTop: `2px solid ${C.gray200}`,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Total
        </div>
        {distributors.map((dist) => {
          const t = totalsMap.get(dist.id);
          const isSelected = selectedDistId === dist.id;
          return (
            <div
              key={dist.id}
              style={{
                ...sans,
                fontSize: 13,
                fontWeight: 700,
                color: C.charcoal,
                padding: '11px 10px',
                borderTop: `2px solid ${C.gray200}`,
                textAlign: 'right' as const,
                background: isSelected ? C.orangeSoft : 'transparent',
              }}
            >
              {t ? formatCurrency(t.total_cents) : '—'}
            </div>
          );
        })}

        {/* Coverage row */}
        <div
          style={{
            ...sans,
            fontSize: 11,
            color: C.gray400,
            padding: '4px 10px 10px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Coverage
        </div>
        {distributors.map((dist) => {
          const t = totalsMap.get(dist.id);
          const isSelected = selectedDistId === dist.id;
          return (
            <div
              key={dist.id}
              style={{
                ...sans,
                fontSize: 11,
                color: C.gray400,
                padding: '4px 10px 10px',
                textAlign: 'right' as const,
                background: isSelected ? C.orangeSoft : 'transparent',
              }}
            >
              {t !== undefined ? formatPct(t.coverage_pct) : '—'}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SectionRows (desktop) ───────────────────────────────────────────────────

interface SectionRowsProps {
  section: string;
  items: SpreadMenuItem[];
  distributors: SpreadDistributor[];
  lookup: Map<string, SpreadMatrixCell>;
  selectedDistId: string | null;
  colCount: number;
  dataCell: React.CSSProperties;
}

function SectionRows({
  section,
  items,
  distributors,
  lookup,
  selectedDistId,
  colCount,
  dataCell,
}: SectionRowsProps) {
  return (
    <>
      {/* Section header — spans all columns */}
      <div
        style={{
          gridColumn: `1 / span ${colCount + 1}`,
          ...sans,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase' as const,
          color: C.gray400,
          padding: '14px 10px 4px',
          borderBottom: `1px solid ${C.gray200}`,
          background: C.gray100,
        }}
      >
        {toTitleCase(section)}
      </div>

      {/* Item rows */}
      {items.map((item) => {
        const cheapId = cheapestDistributorId(item.id, distributors, lookup);
        return (
          <ItemRow
            key={item.id}
            item={item}
            distributors={distributors}
            lookup={lookup}
            cheapId={cheapId}
            selectedDistId={selectedDistId}
            dataCell={dataCell}
          />
        );
      })}
    </>
  );
}

// ─── ItemRow (desktop) ───────────────────────────────────────────────────────

interface ItemRowProps {
  item: SpreadMenuItem;
  distributors: SpreadDistributor[];
  lookup: Map<string, SpreadMatrixCell>;
  cheapId: string | null;
  selectedDistId: string | null;
  dataCell: React.CSSProperties;
}

function ItemRow({
  item,
  distributors,
  lookup,
  cheapId,
  selectedDistId,
  dataCell,
}: ItemRowProps) {
  return (
    <>
      {/* Item name cell */}
      <div style={{ ...dataCell }}>
        <span style={{ fontWeight: 500, fontSize: 13, color: C.charcoal, lineHeight: 1.3 }}>
          {toTitleCase(item.name)}
        </span>
      </div>

      {/* Price cells */}
      {distributors.map((dist) => {
        const cell = lookup.get(`${item.id}__${dist.id}`);
        const isCheap = cheapId === dist.id;
        const isSelected = selectedDistId === dist.id;
        const unmatched = !cell || cell.unmatched;

        return (
          <div
            key={dist.id}
            style={{
              ...dataCell,
              textAlign: 'right' as const,
              alignItems: 'flex-end',
              background: isSelected ? C.orangeSoft : 'transparent',
            }}
          >
            {unmatched ? (
              <span style={{ color: C.gray400, fontSize: 13 }}>—</span>
            ) : (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 4,
                }}
              >
                {/* Cheapest indicator — faint charcoal ↓, only when real choice exists */}
                {isCheap && (
                  <span
                    style={{
                      fontSize: 11,
                      color: C.cheapIndicator,
                      opacity: 0.45,
                      lineHeight: 1,
                    }}
                    title="Per-unit pricing — distributor reference"
                  >
                    ↓
                  </span>
                )}
                <span style={{ fontWeight: 500 }}>
                  {formatCurrency(cell!.unit_price_cents!)}
                </span>
              </span>
            )}
            {/* Line total (secondary) */}
            {!unmatched && cell?.line_total_cents !== null && cell?.line_total_cents !== undefined && (
              <span style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>
                {formatCurrency(cell.line_total_cents)}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── Mobile card list ─────────────────────────────────────────────────────────

interface MobileViewProps {
  spread: MenuSpreadResponse;
  selectedDistId: string | null;
  onSelectDist: (id: string) => void;
}

function MobileView({ spread, selectedDistId, onSelectDist }: MobileViewProps) {
  const { menu, distributors, matrix, column_totals } = spread;
  const lookup = useMemo(() => buildLookup(matrix), [matrix]);

  const totalsMap = useMemo(() => {
    const m = new Map<string, SpreadColumnTotal>();
    for (const t of column_totals) m.set(t.distributor_id, t);
    return m;
  }, [column_totals]);

  return (
    <div>
      {/* ── Horizontal-scroll distributor chips ── */}
      <div
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 6,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', gap: 8, padding: '2px 0', width: 'max-content' }}>
          {distributors.map((dist) => {
            const t = totalsMap.get(dist.id);
            const isSelected = selectedDistId === dist.id;
            return (
              <button
                key={dist.id}
                onClick={() => onSelectDist(dist.id)}
                style={{
                  ...sans,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '8px 12px',
                  border: `1.5px solid ${isSelected ? C.orange : C.gray200}`,
                  borderRadius: 8,
                  background: isSelected ? C.orangeSoft : C.white,
                  cursor: 'pointer',
                  minWidth: 130,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isSelected ? C.charcoal : C.charcoalSoft,
                    marginBottom: 3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {toTitleCase(dist.name)}
                </span>
                <span style={{ fontSize: 11, color: C.gray400, whiteSpace: 'nowrap' }}>
                  {t ? `${formatCurrency(t.total_cents)} · ${formatPct(t.coverage_pct)}` : 'No data'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Per-item cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {menu.items.map((item) => {
          const cheapId = cheapestDistributorId(item.id, distributors, lookup);
          return (
            <MobileItemCard
              key={item.id}
              item={item}
              distributors={distributors}
              lookup={lookup}
              cheapId={cheapId}
              selectedDistId={selectedDistId}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Mobile item card ────────────────────────────────────────────────────────

interface MobileItemCardProps {
  item: SpreadMenuItem;
  distributors: SpreadDistributor[];
  lookup: Map<string, SpreadMatrixCell>;
  cheapId: string | null;
  selectedDistId: string | null;
}

function MobileItemCard({
  item,
  distributors,
  lookup,
  cheapId,
  selectedDistId,
}: MobileItemCardProps) {
  return (
    <div
      style={{
        border: `1px solid ${C.gray200}`,
        borderRadius: 8,
        overflow: 'hidden',
        background: C.white,
      }}
    >
      {/* Item name */}
      <div
        style={{
          ...sans,
          padding: '9px 12px 7px',
          borderBottom: `1px solid ${C.gray100}`,
          fontSize: 13,
          fontWeight: 600,
          color: C.charcoal,
          background: C.gray100,
        }}
      >
        {toTitleCase(item.name)}
      </div>

      {/* Distributor price rows */}
      <div>
        {distributors.map((dist) => {
          const cell = lookup.get(`${item.id}__${dist.id}`);
          const unmatched = !cell || cell.unmatched;
          const isCheap = cheapId === dist.id;
          const isSelected = selectedDistId === dist.id;

          return (
            <div
              key={dist.id}
              style={{
                ...sans,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 12px',
                borderBottom: `1px solid ${C.gray100}`,
                background: isSelected ? C.orangeSoft : 'transparent',
              }}
            >
              <span style={{ fontSize: 12, color: C.charcoalSoft, fontWeight: 500 }}>
                {toTitleCase(dist.name)}
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 13,
                  fontWeight: unmatched ? 400 : 500,
                  color: unmatched ? C.gray400 : C.charcoal,
                }}
              >
                {!unmatched && isCheap && (
                  <span
                    style={{ fontSize: 10, color: C.cheapIndicator, opacity: 0.45 }}
                    title="Per-unit pricing — distributor reference"
                  >
                    ↓
                  </span>
                )}
                {unmatched
                  ? '—'
                  : formatCurrency(cell!.unit_price_cents!)}
                {!unmatched && cell?.line_total_cents !== null && cell?.line_total_cents !== undefined && (
                  <span style={{ fontSize: 11, color: C.gray400, fontWeight: 400 }}>
                    ({formatCurrency(cell.line_total_cents)})
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bottom rail CTA ─────────────────────────────────────────────────────────

interface BottomRailProps {
  distributor: SpreadDistributor | null;
  menuId: string;
}

function BottomRail({ distributor, menuId }: BottomRailProps) {
  const navigate = useNavigate();
  if (!distributor) return null;

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: C.white,
        borderTop: `1px solid ${C.gray200}`,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        zIndex: 20,
        ...sans,
      }}
    >
      <span style={{ fontSize: 13, color: C.charcoalSoft }}>
        {toTitleCase(distributor.name)}
      </span>
      <button
        onClick={() =>
          navigate(`/chef/pull/entry`, {
            state: { distributor_id: distributor.id, distributor_name: distributor.name },
          })
        }
        style={{
          background: C.orange,
          color: C.white,
          border: 'none',
          borderRadius: 6,
          padding: '9px 20px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Pull a quote from {toTitleCase(distributor.name)}
      </button>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ChefMenuSpreadPage() {
  const { id: menuId } = useParams<{ id: string }>();
  const [spread, setSpread] = useState<MenuSpreadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDistId, setSelectedDistId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );

  // Responsive breakpoint listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fetch spread data
  useEffect(() => {
    if (!menuId) return;
    setLoading(true);
    getMenuSpread(menuId).then((res) => {
      if (res.data) {
        setSpread(res.data);
        // Auto-select first distributor
        if (res.data.distributors.length > 0) {
          setSelectedDistId(res.data.distributors[0].id);
        }
      } else {
        setError(res.error || 'Could not load spread');
      }
      setLoading(false);
    });
  }, [menuId]);

  const selectedDist = useMemo(
    () => spread?.distributors.find((d) => d.id === selectedDistId) ?? null,
    [spread, selectedDistId]
  );

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <SpinnerFull />
        </div>
      </div>
    );
  }

  // ── Error / not-yet-quoted ────────────────────────────────────────────────

  if (error || !spread || spread.distributors.length === 0 || spread.menu.items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <EmptyState menuId={menuId ?? ''} />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: C.white, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>

        {/* ── Page header ── */}
        <header style={{ padding: '28px 0 20px' }}>
          <p
            style={{
              ...sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: C.gray400,
              marginBottom: 6,
            }}
          >
            Price Spread
          </p>
          <h1
            style={{
              ...serif,
              fontSize: isDesktop ? 30 : 24,
              fontWeight: 700,
              color: C.charcoal,
              margin: 0,
              marginBottom: 6,
            }}
          >
            {toTitleCase(spread.menu.name)}
          </h1>
          <p style={{ ...sans, fontSize: 13, color: C.gray400, margin: 0 }}>
            {spread.menu.items.length} item{spread.menu.items.length !== 1 ? 's' : ''} ·{' '}
            {spread.distributors.length} distributor{spread.distributors.length !== 1 ? 's' : ''}
          </p>
        </header>

        {/* ── Grid / card view ── */}
        {isDesktop ? (
          <DesktopGrid
            spread={spread}
            selectedDistId={selectedDistId}
            onSelectDist={setSelectedDistId}
          />
        ) : (
          <MobileView
            spread={spread}
            selectedDistId={selectedDistId}
            onSelectDist={setSelectedDistId}
          />
        )}
      </div>

      {/* ── Sticky bottom rail — pull-quote CTA ── */}
      <BottomRail distributor={selectedDist} menuId={menuId ?? ''} />
    </div>
  );
}
