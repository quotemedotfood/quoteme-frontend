// RepPricingOnlyView — mobile pricing surface (`?mode=pricing`)
//
// Justin lock May 27:
//   - Rep arrives with most lines PREFILLED from catalog match.
//   - Job is confirmation: scan, edit where needed, fill unmatched.
//   - Three line states: PREFILLED (read-only + pencil), EDITING, EMPTY.
//   - Q3 LOCKED: NO qty column. Column shape: ITEM · UNIT $ · pencil.
//   - Footer reads: "Lines priced · X of N" (not a dollar total).
//   - Confirm & send back CTA. Sacred Orange = var(--primary).
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · RepPricingOnlyView.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { getRepQuote, repPriceQuote, repConfirmQuote } from '../../services/api';
import type { QuoteLineResponse } from '../../services/api';
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

function eyebrow(size = 9.5): React.CSSProperties {
  return {
    ...sans, fontSize: size, fontWeight: 600,
    letterSpacing: '.12em', textTransform: 'uppercase', color: C.gray700,
  };
}

interface PricingLine {
  id: string;
  name: string;
  pack: string;
  matched: boolean;
  priceCents: number; // current price in cents
}

export function RepPricingOnlyView({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate();
  const [lines, setLines] = useState<PricingLine[]>([]);
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [restaurant, setRestaurant] = useState('');
  const [quoteLabel, setQuoteLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRepQuote(quoteId).then((res) => {
      if (res.data) {
        setRestaurant(res.data.restaurant || '');
        setQuoteLabel(res.data.working_label || '');
        const mapped: PricingLine[] = res.data.lines.map((l: QuoteLineResponse) => ({
          id: l.id,
          name: l.component?.name || l.product?.product || '—',
          pack: l.product?.pack_size || '',
          matched: l.unit_price_cents != null && l.unit_price_cents > 0,
          priceCents: l.unit_price_cents ?? 0,
        }));
        setLines(mapped);
      }
      setLoading(false);
    });
  }, [quoteId]);

  const matchedCount = useMemo(() => lines.filter((l) => l.matched).length, [lines]);
  const pricedCount = useMemo(
    () => lines.filter((l) => l.priceCents > 0).length,
    [lines],
  );
  const totalCount = lines.length;

  const toggleEdit = (id: string) => {
    setEditing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setPrice = (id: string, dollarStr: string) => {
    const num = parseFloat(dollarStr);
    if (Number.isNaN(num)) return;
    setLines((prev) =>
      prev.map((l) => l.id === id ? { ...l, priceCents: Math.round(num * 100) } : l),
    );
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const priced = lines.filter((l) => l.priceCents > 0).map((l) => ({ id: l.id, unit_price_cents: l.priceCents }));
    await repPriceQuote(quoteId, priced);
    setSaving(false);
    setEditing(new Set());
  };

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    await handleSave();
    const res = await repConfirmQuote(quoteId);
    if (res.data) navigate('/rep/quotes/inbound');
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.softLine}`, borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${C.softLine}`, background: '#fff' }}>
        <button
          type="button"
          onClick={() => navigate(`/rep/quotes/${quoteId}`)}
          style={{ ...sans, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.gray700, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={13} strokeWidth={1.8} /> Quote
        </button>
        <span style={{ ...sans, fontSize: 11, color: C.gray500, fontVariantNumeric: 'tabular-nums' }}>{stripSeedPrefix(quoteLabel) || 'Q-' + quoteId.split('-')[0].toUpperCase()}</span>
      </div>

      {/* Header strip */}
      <div style={{ padding: '16px 20px 12px', background: C.warmPaper, borderBottom: `1px solid ${C.softLine}` }}>
        <div style={eyebrow(9.5)}>PRICING MODE</div>
        <div style={{ ...serif, fontSize: 17, fontWeight: 500, color: C.charcoal, marginTop: 2, lineHeight: 1.2 }}>
          {restaurant} · {totalCount} lines
        </div>
        <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, ...sans, fontSize: 11, color: C.gray700 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent, #7FAEC2)', display: 'inline-block' }} />
          {matchedCount} of {totalCount} priced from your catalog
          {totalCount - matchedCount > 0 && ` · ${totalCount - matchedCount} need your eye`}
        </div>
      </div>

      {/* Price table — Q3 LOCKED: ITEM · UNIT $ · pencil. NO qty column. */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 32px',
            gap: 8,
            padding: '10px 0 8px',
            borderBottom: `1px solid ${C.softLine}`,
          }}
        >
          <div style={eyebrow(9)}>ITEM</div>
          <div style={{ ...eyebrow(9), textAlign: 'right' }}>UNIT $</div>
          <div />
        </div>

        {/* Rows */}
        {lines.map((l) => {
          const isEditing = editing.has(l.id);
          return (
            <div
              key={l.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 32px',
                gap: 8,
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: `1px solid ${C.softLine}`,
              }}
            >
              {/* Item */}
              <div style={{ minWidth: 0 }}>
                <div style={{ ...sans, fontSize: 12.5, color: C.charcoal, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                {l.pack && <div style={{ ...sans, fontSize: 10.5, color: C.gray500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>{l.pack}</div>}
              </div>

              {/* Unit $ */}
              <div style={{ textAlign: 'right' }}>
                {l.matched && !isEditing ? (
                  <span style={{ ...sans, fontSize: 12.5, color: C.charcoal, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    ${(l.priceCents / 100).toFixed(2)}
                  </span>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={l.priceCents > 0 ? (l.priceCents / 100).toFixed(2) : ''}
                    placeholder="$ —"
                    autoFocus={isEditing}
                    onBlur={(e) => {
                      setPrice(l.id, e.target.value);
                      if (isEditing) toggleEdit(l.id);
                    }}
                    style={{
                      ...sans,
                      width: '100%',
                      textAlign: 'right',
                      fontSize: 12.5,
                      padding: '5px 7px',
                      border: `1px solid ${C.softLine}`,
                      borderRadius: 4,
                      background: '#fff',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                )}
              </div>

              {/* Pencil */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => toggleEdit(l.id)}
                  style={{
                    width: 26, height: 26,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 4,
                    color: l.matched ? C.gray500 : 'var(--primary)',
                  }}
                  title={l.matched ? 'Edit this price' : 'Price this line'}
                  aria-label={l.matched ? 'Edit this price' : 'Price this line'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — "Lines priced · X of N" per Q3 lock. NO dollar total. */}
      <div style={{ padding: '16px 20px', background: C.warmPaper, borderTop: `1px solid ${C.softLine}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ ...sans, fontSize: 12, color: C.gray700 }}>Lines priced</span>
          <span style={{ ...serif, fontSize: 17, fontWeight: 500, color: C.charcoal, fontVariantNumeric: 'tabular-nums' }}>
            {pricedCount} of {totalCount}
          </span>
        </div>
        <div style={{ ...sans, fontSize: 10.5, color: C.gray500, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {totalCount - pricedCount > 0
            ? `${totalCount - pricedCount} lines still need a price.`
            : 'All lines priced.'}
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          style={{
            ...sans,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            marginTop: 12,
            padding: '11px 14px',
            fontSize: 13.5,
            fontWeight: 500,
            color: '#fff',
            background: saving ? C.gray500 : 'var(--primary)',
            border: 'none',
            borderRadius: 6,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Sending…' : 'Confirm & send back'}
          {!saving && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
        <div style={{ ...sans, fontSize: 10.5, color: C.gray500, textAlign: 'center', marginTop: 6, lineHeight: 1.4 }}>
          Stamps the quote as confirmed. The chef gets emailed.
        </div>
      </div>
    </div>
  );
}
