// RepReviewThreePanelDesktop — desktop three-panel review surface.
//
// Justin May 27 Q4 lock: three columns, simultaneous visibility (doctrine 9.3
// — NEVER tabs on desktop).
//
//   LEFT   Menu      — chef's source, grouped by category. Click = select.
//   CENTER Products  — catalog SKUs for the selected line; alternatives below.
//   RIGHT  Quote     — the document being built; per-line pencil jumps back.
//
// Per-line actions: inline note, "Mark unavailable", "Ask the chef".
// CTA strip at top: "Skip to pricing" (secondary) + "Send to chef" (primary).
// Sacred Orange = var(--primary). No qty.
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · RepReviewThreePanelDesktop.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Search, X, MessageCircle, Plus, SquarePen, Check } from 'lucide-react';
import { QuoteCoverageLabelRep } from '../../components/rep/QuoteCoverageLabelRep';
import { LineCoverageDot } from '../../components/rep/CoverageDots';
import { getRepQuote, repConfirmQuote } from '../../services/api';
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
  amber: '#C99A3F',
  success: '#2F8F4F',
} as const;

function eyebrow(size = 10): React.CSSProperties {
  return {
    ...sans, fontSize: size, fontWeight: 600,
    letterSpacing: '.12em', textTransform: 'uppercase', color: C.gray700,
  };
}

// Simulated alternatives for a line (would come from alignment_candidates in real data)
function getAlternatives(line: QuoteLineResponse) {
  const name = line.product?.product || line.component?.name || '—';
  const brand = line.product?.brand || '';
  const pack = line.product?.pack_size || '';
  return [
    { name, brand, pack, strength: 'strong' as const, current: true },
    { name, brand: `${brand} (alt)`, pack, strength: 'partial' as const },
    { name, brand: 'Generic', pack, strength: 'thin' as const },
  ].filter((_, i) => i < (line.alignment_candidates?.length ?? 1) + 1);
}

type Strength = 'strong' | 'partial' | 'thin';

interface AltItem {
  name: string;
  brand: string;
  pack: string;
  strength: Strength;
  current?: boolean;
}

export function RepReviewThreePanelDesktop({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate();
  const [lines, setLines] = useState<QuoteLineResponse[]>([]);
  const [restaurant, setRestaurant] = useState('');
  const [quoteLabel, setQuoteLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [commits, setCommits] = useState<Map<number, number>>(new Map());
  const [notes, setNotes] = useState<Map<number, string>>(new Map());
  const [unavailable, setUnavailable] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const nav = (dest: string, opts?: { quoteId?: string }) => {
    if (dest === 'rep-triage' || dest === 'rep-quotes-inbound') navigate('/rep/quotes/inbound');
    else if (dest === 'rep-quotes-history') navigate('/rep/quotes/history');
    else if (dest === 'rep-incoming') navigate(`/rep/quotes/${opts?.quoteId || quoteId}`);
    else if (dest === 'rep-pricing') navigate(`/rep/quotes/${opts?.quoteId || quoteId}?mode=pricing`);
    else if (dest === 'rep-catalog') navigate('/distributor-admin/catalog');
    else if (dest === 'rep-settings') navigate('/settings');
  };

  useEffect(() => {
    getRepQuote(quoteId).then((res) => {
      if (res.data) {
        setRestaurant(res.data.restaurant || '');
        setQuoteLabel(res.data.working_label || '');
        setLines(res.data.lines || []);
        const m = new Map<number, number>();
        res.data.lines.forEach((_, i) => m.set(i, 0));
        setCommits(m);
      }
      setLoading(false);
    });
  }, [quoteId]);

  // Group lines by category for left panel
  const groups = useMemo(() => {
    const map = new Map<string, { line: QuoteLineResponse; idx: number }[]>();
    lines.forEach((l, i) => {
      const cat = l.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push({ line: l, idx: i });
    });
    return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
  }, [lines]);

  const selectedLine = lines[selectedIdx];
  const alternatives: AltItem[] = selectedLine ? getAlternatives(selectedLine) : [];
  const committedAltIdx = commits.get(selectedIdx) ?? 0;

  const swap = (altIdx: number) => {
    setCommits((prev) => new Map(prev).set(selectedIdx, altIdx));
  };

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    const res = await repConfirmQuote(quoteId);
    if (res.data) navigate('/rep/quotes/inbound');
    setSaving(false);
  };

  const matchState: 'ready' | 'review' | 'coverage' = useMemo(() => {
    const misses = lines.filter((l) => l.availability_status === 'not_in_catalog' || !l.product).length;
    if (misses > 0) return 'coverage';
    const flagged = lines.filter((l) => l.alignment_selected === 0 && l.product).length;
    if (flagged > 0) return 'review';
    return 'ready';
  }, [lines]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.softLine}`, borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // RepLayout provides sidebar + main chrome — render content body bare.
  return (
    <>
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => nav('rep-triage')}
        style={{ ...sans, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: C.gray700, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}
      >
        <ChevronLeft size={14} strokeWidth={1.8} /> Triage
      </button>

      {/* Masthead */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={eyebrow(10)}>REVIEWING QUOTE · {stripSeedPrefix(quoteLabel) || 'Q-' + quoteId.split('-')[0].toUpperCase()}</div>
          <h1 style={{ ...serif, fontSize: 30, fontWeight: 600, color: C.charcoal, marginTop: 4, lineHeight: 1.1 }}>
            {restaurant}
          </h1>
          <div style={{ marginTop: 8 }}>
            <QuoteCoverageLabelRep state={matchState} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => nav('rep-pricing', { quoteId })}
            style={{
              ...sans, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 14px', fontSize: 13, color: C.charcoal,
              background: '#fff', border: `1px solid ${C.softLine}`,
              borderRadius: 6, cursor: 'pointer',
            }}
          >
            Skip to pricing
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            style={{
              ...sans, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '11px 22px', fontSize: 13.5, fontWeight: 500,
              color: '#fff', background: saving ? C.gray500 : 'var(--primary)',
              border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <Check size={13} color="#fff" strokeWidth={2} />
            {saving ? 'Sending…' : 'Send to chef'}
          </button>
        </div>
      </div>

      {/* Three-panel grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr 320px',
          gap: 16,
          minHeight: 540,
        }}
      >
        {/* LEFT — Menu */}
        <aside
          style={{
            background: '#fff',
            borderRadius: 8,
            border: `1px solid ${C.softLine}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: `2px solid ${C.charcoal}` }}>
            <div style={eyebrow(10)}>MENU · CHEF'S SOURCE</div>
            <div style={{ ...sans, fontSize: 11, color: C.gray500, marginTop: 2 }}>
              {lines.length} components · click to inspect
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
            {groups.map((g) => (
              <div key={g.cat} style={{ marginTop: 8 }}>
                <div style={{ ...eyebrow(9), padding: '8px 16px 4px', letterSpacing: '.14em' }}>
                  {g.cat}
                </div>
                {g.items.map(({ line, idx }) => {
                  const sel = idx === selectedIdx;
                  const missing = !line.product || line.availability_status === 'not_in_catalog';
                  return (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        background: sel ? C.warmPaper : 'transparent',
                        borderLeft: `2px solid ${sel ? C.charcoal : 'transparent'}`,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <LineCoverageDot strength={missing ? 'thin' : 'strong'} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...sans, fontSize: 12.5, color: C.charcoal, lineHeight: 1.3 }}>
                          {line.component?.name || line.product?.product || '—'}
                        </div>
                        {line.product?.pack_size && (
                          <div style={{ ...sans, fontSize: 10.5, color: C.gray500, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
                            {line.product.pack_size}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER — Products */}
        <section
          style={{
            background: '#fff',
            borderRadius: 8,
            border: `1px solid ${C.softLine}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {selectedLine ? (
            <>
              <div
                style={{
                  padding: '12px 20px',
                  borderBottom: `2px solid ${C.charcoal}`,
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={eyebrow(10)}>PRODUCTS · CATALOG MATCHES</div>
                  <div style={{ ...serif, fontSize: 17, fontWeight: 500, color: C.charcoal, marginTop: 2, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedLine.component?.name || selectedLine.product?.product || '—'}
                  </div>
                  <div style={{ ...sans, fontSize: 11, color: C.gray500, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
                    {selectedLine.product?.pack_size} · {selectedLine.category}
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    ...sans, display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 12px', fontSize: 12, color: C.charcoal,
                    background: '#fff', border: `1px solid ${C.softLine}`,
                    borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <Search size={11} color={C.charcoal} strokeWidth={1.8} />
                  Search catalog
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {/* Matched SKU */}
                <div style={eyebrow(10)}>MATCHED SKU</div>
                <ProductAltCard alt={alternatives[committedAltIdx]} selected primary />

                {/* Other SKUs */}
                {alternatives.length > 1 && (
                  <>
                    <div style={{ ...eyebrow(10), marginTop: 20 }}>OTHER SKUS IN YOUR CATALOG</div>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {alternatives.map((alt, ai) =>
                        ai === committedAltIdx ? null : (
                          <ProductAltCard key={ai} alt={alt} onClick={() => swap(ai)} />
                        ),
                      )}
                    </div>
                  </>
                )}

                {/* Actions */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.softLine}`, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <ActionBtn icon={<Plus size={12} color={C.charcoal} strokeWidth={1.8} />} label="Add a different SKU" onClick={() => {}} />
                  <ActionBtn icon={<X size={12} color={C.charcoal} strokeWidth={1.8} />} label="Mark unavailable" onClick={() => setUnavailable((prev) => { const n = new Set(prev); n.add(selectedIdx); return n; })} />
                  <ActionBtn icon={<MessageCircle size={12} color={C.charcoal} strokeWidth={1.8} />} label="Ask the chef about this" onClick={() => {}} />
                </div>

                {/* Inline note */}
                <div style={{ marginTop: 16 }}>
                  <label style={{ ...eyebrow(10), display: 'block' }} htmlFor={`line-note-${selectedIdx}`}>
                    NOTE ON THIS LINE
                  </label>
                  <input
                    id={`line-note-${selectedIdx}`}
                    value={notes.get(selectedIdx) || ''}
                    onChange={(e) => setNotes((prev) => new Map(prev).set(selectedIdx, e.target.value))}
                    placeholder="e.g. Subbed Colavita for chef's request — better fit"
                    style={{
                      ...sans,
                      width: '100%',
                      marginTop: 4,
                      padding: '8px 12px',
                      fontSize: 12.5,
                      border: `1px solid ${C.softLine}`,
                      borderRadius: 6,
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gray500, ...sans, fontSize: 13 }}>
              Select a line to inspect
            </div>
          )}
        </section>

        {/* RIGHT — Quote being built */}
        <aside
          style={{
            background: '#fff',
            borderRadius: 8,
            border: `1px solid ${C.softLine}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: `2px solid ${C.charcoal}` }}>
            <div style={eyebrow(10)}>QUOTE · BUILDING</div>
            <div style={{ ...sans, fontSize: 11, color: C.gray500, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {lines.length} of {lines.length} aligned
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
            {lines.map((line, idx) => {
              const altIdx = commits.get(idx) ?? 0;
              const alt = getAlternatives(line)[altIdx] || getAlternatives(line)[0];
              const sel = idx === selectedIdx;
              const isUnavailable = unavailable.has(idx);
              return (
                <div
                  key={line.id}
                  style={{
                    padding: '8px 12px',
                    borderBottom: `1px solid ${C.softLine}`,
                    background: sel ? C.warmPaper : 'transparent',
                    opacity: isUnavailable ? 0.4 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...sans, fontSize: 12, color: C.charcoal, lineHeight: 1.3 }}>
                        {line.component?.name || line.product?.product || '—'}
                      </div>
                      {alt && (
                        <div style={{ ...sans, fontSize: 10.5, color: C.gray500, lineHeight: 1.3 }}>
                          {alt.brand} · {alt.pack}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      title="Edit this line"
                      aria-label="Edit this line"
                    >
                      <SquarePen size={11} color={C.gray700} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              padding: '12px 16px',
              background: C.warmPaper,
              borderTop: `1px solid ${C.softLine}`,
              ...sans, fontSize: 11, color: C.gray500, lineHeight: 1.5,
            }}
          >
            Quote shows aligned SKUs. Prices fill in when you confirm via{' '}
            <span style={{ color: C.charcoal }}>Use my catalog prices</span> or per-line.
          </div>
        </aside>
      </div>
    </>
  );
}

// ─── ProductAltCard ────────────────────────────────────────────────────────
function ProductAltCard({
  alt,
  selected,
  primary,
  onClick,
}: {
  alt: AltItem;
  selected?: boolean;
  primary?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      style={{
        padding: '10px 14px',
        borderRadius: 6,
        border: selected ? `1.5px solid ${C.charcoal}` : `1px solid ${C.softLine}`,
        background: selected ? C.warmPaper : '#fff',
        cursor: onClick ? 'pointer' : 'default',
        marginTop: primary ? 8 : 0,
        width: onClick ? '100%' : undefined,
        textAlign: onClick ? 'left' as const : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <LineCoverageDot strength={alt.strength} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.3 }}>{alt.name}</div>
          <div style={{ ...sans, fontSize: 11.5, color: C.gray700, lineHeight: 1.3 }}>
            {alt.brand} · {alt.pack}
          </div>
        </div>
        {!selected && onClick && (
          <span style={{ ...sans, fontSize: 11, color: C.charcoal, flexShrink: 0, textDecoration: 'underline' }}>
            Swap
          </span>
        )}
        {selected && (
          <span style={{ ...sans, fontSize: 10, color: C.gray500, letterSpacing: '.12em', textTransform: 'uppercase', flexShrink: 0 }}>
            Current
          </span>
        )}
      </div>
    </Tag>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────
function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...sans,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', fontSize: 12.5, color: C.charcoal,
        background: '#fff', border: `1px solid ${C.softLine}`,
        borderRadius: 4, cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
