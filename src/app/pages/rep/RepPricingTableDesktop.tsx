// RepPricingTableDesktop — desktop pricing surface.
//
// Justin lock May 27:
//   - Two cards stacked: Pricing Controls (bulk %) + the table.
//   - Table modes: read-only ↔ edit (toolbar toggle).
//   - Q3 LOCKED: NO qty column. Column shape: ITEM · UNIT $ · pencil.
//   - % Change column only in edit mode (tracks delta from baseline).
//   - Footer reads "Lines priced · X of N" — NOT a dollar total.
//   - +/− nudge buttons ±$1. Save → repPriceQuote.
//   - Sacred Orange = var(--primary).
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · RepPricingTableDesktop.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Filter, SquarePen, Plus } from 'lucide-react';
import { RepDesktopShell } from '../../components/rep/RepDesktopShell';
import { getRepQuote, repPriceQuote, repConfirmQuote } from '../../services/api';
import type { QuoteLineResponse } from '../../services/api';

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
  success: '#2F8F4F',
} as const;

interface PricingRow {
  id: string;
  dish: string;
  component: string;
  sku: string;
  brand: string;
  product: string;
  pack: string;
  priceCents: number;
}

export function RepPricingTableDesktop({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [baselines, setBaselines] = useState<Map<string, number>>(new Map());
  const [restaurant, setRestaurant] = useState('');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [bulkPercent, setBulkPercent] = useState<string>('0');
  const [appliedPct, setAppliedPct] = useState(0);
  const [saving, setSaving] = useState(false);

  const nav = (dest: string, opts?: { quoteId?: string }) => {
    if (dest === 'rep-triage') navigate('/rep/triage');
    else if (dest === 'rep-incoming') navigate(`/rep/quotes/${opts?.quoteId || quoteId}`);
    else if (dest === 'rep-pricing') navigate(`/rep/quotes/${opts?.quoteId || quoteId}?mode=pricing`);
    else if (dest === 'rep-catalog') navigate('/distributor-admin/catalog');
    else if (dest === 'rep-settings') navigate('/settings');
  };

  useEffect(() => {
    getRepQuote(quoteId).then((res) => {
      if (res.data) {
        setRestaurant(res.data.restaurant || '');
        const mapped: PricingRow[] = res.data.lines.map((l: QuoteLineResponse) => ({
          id: l.id,
          dish: l.component?.source_dish || '',
          component: l.component?.name || '',
          sku: l.product?.item_number || '',
          brand: l.product?.brand || '',
          product: l.product?.product || '—',
          pack: l.product?.pack_size || '',
          priceCents: l.unit_price_cents ?? 0,
        }));
        setRows(mapped);
        const bl = new Map<string, number>();
        mapped.forEach((r) => bl.set(r.id, r.priceCents));
        setBaselines(bl);
      }
      setLoading(false);
    });
  }, [quoteId]);

  const pricedCount = useMemo(() => rows.filter((r) => r.priceCents > 0).length, [rows]);
  const totalCount = rows.length;

  const pctChange = (id: string): number => {
    const base = baselines.get(id) ?? 0;
    const cur = rows.find((r) => r.id === id)?.priceCents ?? base;
    if (!base) return 0;
    return ((cur - base) / base) * 100;
  };

  const applyBulk = () => {
    const pct = Number(bulkPercent) || 0;
    setAppliedPct(pct);
    setRows((prev) =>
      prev.map((r) => {
        const base = baselines.get(r.id) ?? r.priceCents;
        return { ...r, priceCents: Math.round(base * (1 + pct / 100)) };
      }),
    );
  };

  const adjustPrice = (id: string, deltaDollars: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, priceCents: Math.max(0, r.priceCents + Math.round(deltaDollars * 100)) }
          : r,
      ),
    );
  };

  const setPriceDirect = (id: string, dollarStr: string) => {
    const num = parseFloat(dollarStr);
    if (!Number.isNaN(num)) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, priceCents: Math.round(num * 100) } : r));
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const priced = rows.filter((r) => r.priceCents > 0).map((r) => ({ id: r.id, unit_price_cents: r.priceCents }));
    await repPriceQuote(quoteId, priced);
    setSaving(false);
    setEditMode(false);
  };

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    await handleSave();
    const res = await repConfirmQuote(quoteId);
    if (res.data) navigate('/rep/triage');
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.softLine}`, borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <RepDesktopShell active="quotes" nav={nav}>
      <div>
        <h1 style={{ ...serif, fontSize: 28, fontWeight: 600, color: C.charcoal, lineHeight: 1.1 }}>{restaurant}</h1>
        <div style={{ ...sans, fontSize: 12.5, color: C.gray700, marginTop: 4 }}>Pricing — {totalCount} lines</div>

        {/* Pricing Controls card */}
        <div
          style={{
            marginTop: 20,
            background: '#fff',
            borderRadius: 8,
            border: `1px solid ${C.softLine}`,
            padding: '20px 28px 22px',
            boxShadow: '0 1px 2px rgba(43,43,43,0.04)',
          }}
        >
          <div style={{ ...serif, fontSize: 19, fontWeight: 600, color: C.charcoal, lineHeight: 1.2 }}>Pricing Controls</div>
          <div style={{ ...sans, fontSize: 12.5, color: C.gray700, marginTop: 4, lineHeight: 1.5 }}>
            Adjust pricing for all items or edit individual prices
          </div>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label htmlFor="bulkAdj" style={{ ...sans, fontSize: 14, color: C.charcoal }}>Bulk Adjustment</label>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                id="bulkAdj"
                type="number"
                value={bulkPercent}
                onChange={(e) => setBulkPercent(e.target.value)}
                step="0.5"
                style={{
                  ...sans,
                  width: 88, padding: '8px 10px',
                  border: `1px solid ${C.softLine}`,
                  borderRadius: 8, background: '#fff', fontSize: 14,
                  textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                }}
              />
              <span style={{ ...sans, color: C.gray700, fontSize: 14 }}>%</span>
            </div>
            <button
              type="button"
              onClick={applyBulk}
              style={{
                ...sans,
                padding: '9px 26px', fontSize: 14, fontWeight: 500,
                color: '#fff', background: 'var(--primary)',
                border: 'none', borderRadius: 8, cursor: 'pointer',
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Table card */}
        <div
          style={{
            marginTop: 20,
            background: '#fff',
            borderRadius: 8,
            border: `1px solid ${C.softLine}`,
            boxShadow: '0 1px 2px rgba(43,43,43,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '14px 20px',
              borderBottom: `1px solid ${C.softLine}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                style={{
                  width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${C.softLine}`, borderRadius: 8, background: '#fff', cursor: 'pointer',
                }}
                title="Filter"
                aria-label="Filter"
              >
                <Filter size={14} color={C.charcoal} strokeWidth={1.8} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Lines priced footer indicator (in toolbar) */}
              <span style={{ ...sans, fontSize: 12, color: C.gray700, fontVariantNumeric: 'tabular-nums' }}>
                Lines priced · {pricedCount} of {totalCount}
              </span>

              {!editMode ? (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  style={{
                    ...sans,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', fontSize: 13,
                    border: `1px solid ${C.softLine}`,
                    background: '#fff', color: C.charcoal,
                    borderRadius: 8, cursor: 'pointer',
                  }}
                >
                  <SquarePen size={13} color={C.charcoal} strokeWidth={1.8} />
                  Edit price
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    ...sans,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', fontSize: 13, fontWeight: 500,
                    background: saving ? C.gray500 : 'var(--primary)', color: '#fff',
                    border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  <SquarePen size={13} color="#fff" strokeWidth={1.8} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              )}
              <button
                type="button"
                style={{
                  ...sans,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', fontSize: 13,
                  border: `1px solid ${C.softLine}`,
                  background: '#fff', color: C.charcoal,
                  borderRadius: 8, cursor: 'pointer',
                }}
              >
                <Plus size={13} color={C.charcoal} strokeWidth={1.8} />
                Add SKU
              </button>
            </div>
          </div>

          {/* Table — Q3 LOCKED: ITEM · UNIT $ · pencil. NO qty. */}
          <table style={{ width: '100%', borderCollapse: 'collapse', ...sans }}>
            <thead>
              <tr style={{ background: 'rgba(247,243,235,.7)' }}>
                <HeadCell label="Dish" width="18%" />
                <HeadCell label="Component" width="14%" />
                <HeadCell label="SKU" width="8%" />
                <HeadCell label="Brand" width="12%" />
                <HeadCell label="Product" width="20%" />
                <HeadCell label="Pack" width="10%" />
                {editMode && <HeadCell label="% Change" width="9%" align="right" />}
                <HeadCell label="Unit $" width={editMode ? '13%' : '18%'} align="right" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pct = pctChange(row.id);
                return (
                  <tr key={row.id} style={{ borderTop: `1px solid ${C.softLine}` }}>
                    <td style={{ ...sans, padding: '14px 16px 14px 20px', fontSize: 13, color: C.charcoal, lineHeight: 1.3, verticalAlign: 'middle' }}>
                      {row.dish}
                    </td>
                    <td style={{ ...sans, padding: '14px 16px', fontSize: 13, color: 'var(--accent, #7FAEC2)', lineHeight: 1.3, verticalAlign: 'middle' }}>
                      {row.component}
                    </td>
                    <td style={{ ...sans, padding: '14px 16px', fontSize: 12.5, color: C.charcoal, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                      {row.sku}
                    </td>
                    <td style={{ ...sans, padding: '14px 16px', fontSize: 13, color: C.charcoal, lineHeight: 1.3, verticalAlign: 'middle' }}>
                      {row.brand}
                    </td>
                    <td style={{ ...sans, padding: '14px 16px', fontSize: 13, color: C.charcoal, lineHeight: 1.3, verticalAlign: 'middle' }}>
                      {row.product}
                    </td>
                    <td style={{ ...sans, padding: '14px 16px', fontSize: 12.5, color: C.gray700, lineHeight: 1.3, verticalAlign: 'middle' }}>
                      {row.pack}
                    </td>
                    {editMode && (
                      <td style={{ textAlign: 'right', padding: '14px 12px', verticalAlign: 'middle' }}>
                        <PctChangeIndicator pct={pct} />
                      </td>
                    )}
                    <td style={{ textAlign: 'right', padding: '14px 20px 14px 12px', verticalAlign: 'middle' }}>
                      {editMode ? (
                        <PriceEditor
                          valueCents={row.priceCents}
                          onChange={(v) => setPriceDirect(row.id, v)}
                          onStep={(d) => adjustPrice(row.id, d)}
                        />
                      ) : (
                        <span style={{ ...sans, fontSize: 13.5, color: C.charcoal, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {row.priceCents > 0 ? `$${(row.priceCents / 100).toFixed(2)}` : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table footer — Lines priced · X of N */}
          <div
            style={{
              padding: '14px 20px',
              background: C.warmPaper,
              borderTop: `1px solid ${C.softLine}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ ...sans, fontSize: 12, color: C.gray700 }}>
              Lines priced · {pricedCount} of {totalCount}
            </span>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              style={{
                ...sans,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', fontSize: 13.5, fontWeight: 500,
                color: '#fff', background: saving ? C.gray500 : 'var(--primary)',
                border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Sending…' : 'Confirm & send back'}
            </button>
          </div>
        </div>
      </div>
    </RepDesktopShell>
  );
}

// ─── Head cell ────────────────────────────────────────────────────────────
function HeadCell({ label, width, align = 'left' }: { label: string; width: string; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        width,
        textAlign: align,
        padding: '12px 16px',
        fontSize: 11.5,
        color: C.gray700,
        fontWeight: 500,
        letterSpacing: '.02em',
        ...sans,
      }}
    >
      {label}
    </th>
  );
}

// ─── Pct change indicator ──────────────────────────────────────────────────
function PctChangeIndicator({ pct }: { pct: number }) {
  const positive = pct > 0.005;
  const negative = pct < -0.005;
  const color = positive ? C.success : C.charcoal;
  const sign = positive ? '+' : '';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', ...sans }}>
      {positive ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15" /></svg>
      ) : negative ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
      ) : null}
      {sign}{pct.toFixed(1)}%
    </span>
  );
}

// ─── Price editor (+/−) ───────────────────────────────────────────────────
function PriceEditor({
  valueCents,
  onChange,
  onStep,
}: {
  valueCents: number;
  onChange: (v: string) => void;
  onStep: (deltaDollars: number) => void;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={() => onStep(-1)}
        style={{
          width: 26, height: 30,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${C.softLine}`, borderRadius: 6, background: '#fff',
          cursor: 'pointer', ...sans, color: C.gray700, fontSize: 14,
        }}
        title="−$1"
        aria-label="Decrease price"
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={(valueCents / 100).toFixed(2)}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...sans,
          width: 84, padding: '6px 10px',
          border: `1px solid ${C.softLine}`,
          borderRadius: 6, background: '#fff', fontSize: 13,
          textAlign: 'right', fontVariantNumeric: 'tabular-nums',
        }}
      />
      <button
        type="button"
        onClick={() => onStep(1)}
        style={{
          width: 26, height: 30,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${C.softLine}`, borderRadius: 6, background: '#fff',
          cursor: 'pointer', ...sans, color: C.gray700, fontSize: 14,
        }}
        title="+$1"
        aria-label="Increase price"
      >
        +
      </button>
    </span>
  );
}
