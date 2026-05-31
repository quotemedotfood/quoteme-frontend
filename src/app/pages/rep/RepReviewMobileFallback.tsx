// RepReviewMobileFallback — mobile review surface for ?mode=review.
//
// Doctrine: three-panel layout (RepReviewThreePanelDesktop) collapses to one
// panel with a swap drawer per line on mobile (screens-rep.jsx line 1687).
//
//   • Single scrollable panel listing all menu lines
//   • Per-line swap drawer: tapping the blue Review icon expands an inline
//     panel showing the matched SKU + "Swap" / "Mark unavailable" / note
//   • Peeking footer with "Confirm & send back" orange CTA
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · RepReviewThreePanelDesktop
// comment + RepIncomingQuotePage mobile surface.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, SquarePen, Search, X, Check, ChevronDown } from 'lucide-react';
import { QuoteCoverageLabelRep } from '../../components/rep/QuoteCoverageLabelRep';
import { LineCoverageDot } from '../../components/rep/CoverageDots';
import { getRepQuote, repConfirmQuote } from '../../services/api';
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
  accent: '#7FAEC2',
} as const;

function eyebrow(size = 10): React.CSSProperties {
  return {
    ...sans, fontSize: size, fontWeight: 600,
    letterSpacing: '.12em', textTransform: 'uppercase', color: C.gray700,
  };
}

type AltItem = {
  name: string;
  brand: string;
  pack: string;
  strength: 'strong' | 'partial' | 'thin';
  current?: boolean;
};

// Derives simple alternatives from a line (matches RepReviewThreePanelDesktop logic)
function getAlternatives(line: QuoteLineResponse): AltItem[] {
  const name = line.product?.product || line.component?.name || '—';
  const brand = line.product?.brand || '';
  const pack = line.product?.pack_size || '';
  return [
    { name, brand, pack, strength: 'strong', current: true },
    { name, brand: `${brand} (alt)`, pack, strength: 'partial' },
    { name, brand: 'Generic', pack, strength: 'thin' },
  ].filter((_, i) => i < (line.alignment_candidates?.length ?? 1) + 1);
}

// ─── Per-line swap drawer ──────────────────────────────────────────────────
// Expands inline when the rep taps the blue Review icon. Shows the matched
// SKU, alternative SKUs, and quick actions — the "swap drawer" from the
// design's mobile collapse spec.

function LineSwapDrawer({
  line,
  lineIdx,
  committedAltIdx,
  note,
  onSwap,
  onNoteChange,
  onMarkUnavailable,
  onClose,
}: {
  line: QuoteLineResponse;
  lineIdx: number;
  committedAltIdx: number;
  note: string;
  onSwap: (altIdx: number) => void;
  onNoteChange: (note: string) => void;
  onMarkUnavailable: () => void;
  onClose: () => void;
}) {
  const alternatives = getAlternatives(line);
  const strengthColors: Record<string, string> = {
    strong: 'var(--qm-success, #2F8F4F)',
    partial: C.accent,
    thin: C.gray500,
  };

  return (
    <div
      style={{
        margin: '0 0 2px',
        background: C.warmPaper,
        border: `1px solid ${C.charcoal}`,
        borderRadius: 6,
        padding: '12px 14px',
      }}
    >
      {/* Drawer header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={eyebrow(9.5)}>PRODUCTS · CATALOG MATCHES</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close swap drawer"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
        >
          <ChevronDown size={14} color={C.gray700} strokeWidth={1.8} />
        </button>
      </div>

      {/* Matched SKU */}
      <div style={{ ...eyebrow(9), marginBottom: 4 }}>MATCHED SKU</div>
      {alternatives.slice(0, 1).map((alt, ai) => (
        <div
          key={ai}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: `1.5px solid ${C.charcoal}`,
            background: '#fff',
            marginBottom: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: strengthColors[alt.strength],
                display: 'inline-block', flexShrink: 0, marginTop: 4,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...sans, fontSize: 12.5, color: C.charcoal, lineHeight: 1.3 }}>{alt.name}</div>
              <div style={{ ...sans, fontSize: 11, color: C.gray700, lineHeight: 1.3 }}>{alt.brand} · {alt.pack}</div>
            </div>
            <span style={{ ...sans, fontSize: 10, color: C.gray500, letterSpacing: '.12em', textTransform: 'uppercase', flexShrink: 0 }}>
              Current
            </span>
          </div>
        </div>
      ))}

      {/* Other SKUs */}
      {alternatives.length > 1 && (
        <>
          <div style={{ ...eyebrow(9), marginTop: 10, marginBottom: 4 }}>OTHER SKUS IN YOUR CATALOG</div>
          {alternatives.slice(1).map((alt, ai) => {
            const actualIdx = ai + 1;
            const isCommitted = committedAltIdx === actualIdx;
            return (
              <div
                key={actualIdx}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: isCommitted ? `1.5px solid ${C.charcoal}` : `1px solid ${C.softLine}`,
                  background: isCommitted ? C.warmPaper : '#fff',
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span
                    style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: strengthColors[alt.strength],
                      display: 'inline-block', flexShrink: 0, marginTop: 4,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...sans, fontSize: 12.5, color: C.charcoal, lineHeight: 1.3 }}>{alt.name}</div>
                    <div style={{ ...sans, fontSize: 11, color: C.gray700, lineHeight: 1.3 }}>{alt.brand} · {alt.pack}</div>
                  </div>
                  {!isCommitted && (
                    <button
                      type="button"
                      onClick={() => onSwap(actualIdx)}
                      style={{ ...sans, fontSize: 11, color: C.charcoal, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
                    >
                      Swap
                    </button>
                  )}
                  {isCommitted && (
                    <span style={{ ...sans, fontSize: 10, color: C.gray500, letterSpacing: '.12em', textTransform: 'uppercase', flexShrink: 0 }}>
                      Current
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Quick actions */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.softLine}`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          onClick={onMarkUnavailable}
          style={{
            ...sans, display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', fontSize: 11.5, color: C.charcoal,
            background: '#fff', border: `1px solid ${C.softLine}`,
            borderRadius: 4, cursor: 'pointer',
          }}
        >
          <X size={11} color={C.charcoal} strokeWidth={1.8} />
          Mark unavailable
        </button>
      </div>

      {/* Inline note */}
      <div style={{ marginTop: 10 }}>
        <label style={{ ...eyebrow(9), display: 'block' }} htmlFor={`line-note-mobile-${lineIdx}`}>
          NOTE ON THIS LINE
        </label>
        <input
          id={`line-note-mobile-${lineIdx}`}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="e.g. Subbed Colavita for chef's request — better fit"
          style={{
            ...sans,
            width: '100%',
            marginTop: 4,
            padding: '7px 10px',
            fontSize: 12,
            border: `1px solid ${C.softLine}`,
            borderRadius: 6,
            background: '#fff',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export function RepReviewMobileFallback({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate();
  const [lines, setLines] = useState<QuoteLineResponse[]>([]);
  const [restaurant, setRestaurant] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDrawerIdx, setOpenDrawerIdx] = useState<number | null>(null);
  const [commits, setCommits] = useState<Map<number, number>>(new Map());
  const [notes, setNotes] = useState<Map<number, string>>(new Map());
  const [unavailable, setUnavailable] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRepQuote(quoteId).then((res) => {
      if (res.data) {
        setRestaurant(res.data.restaurant || '');
        setLines(res.data.lines || []);
        const m = new Map<number, number>();
        res.data.lines.forEach((_, i) => m.set(i, 0));
        setCommits(m);
      }
      setLoading(false);
    });
  }, [quoteId]);

  const matchState: 'ready' | 'review' | 'coverage' = useMemo(() => {
    const misses = lines.filter((l) => l.availability_status === 'not_in_catalog' || !l.product).length;
    if (misses > 0) return 'coverage';
    const flagged = lines.filter((l) => l.alignment_selected === 0 && l.product).length;
    if (flagged > 0) return 'review';
    return 'ready';
  }, [lines]);

  const groups = useMemo(() => {
    const map = new Map<string, { line: QuoteLineResponse; idx: number }[]>();
    lines.forEach((l, i) => {
      const cat = l.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push({ line: l, idx: i });
    });
    return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
  }, [lines]);

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    const res = await repConfirmQuote(quoteId);
    if (res.data) navigate('/rep/quotes/inbound');
    setSaving(false);
  };

  const toggleDrawer = (idx: number) => {
    setOpenDrawerIdx((prev) => (prev === idx ? null : idx));
  };

  const handleSwap = (lineIdx: number, altIdx: number) => {
    setCommits((prev) => new Map(prev).set(lineIdx, altIdx));
  };

  const handleNoteChange = (lineIdx: number, note: string) => {
    setNotes((prev) => new Map(prev).set(lineIdx, note));
  };

  const handleMarkUnavailable = (lineIdx: number) => {
    setUnavailable((prev) => {
      const n = new Set(prev);
      if (n.has(lineIdx)) n.delete(lineIdx);
      else n.add(lineIdx);
      return n;
    });
    setOpenDrawerIdx(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `3px solid ${C.softLine}`,
            borderTopColor: 'var(--primary)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Nav bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: `1px solid ${C.softLine}`,
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/rep/quotes/${quoteId}`)}
          style={{ ...sans, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.gray700, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={13} strokeWidth={1.8} /> Quote
        </button>
        <span style={{ ...sans, fontSize: 11, color: C.gray500 }}>{quoteId}</span>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Masthead */}
        <div
          style={{
            padding: '16px 20px 14px',
            background: C.warmPaper,
            borderBottom: `1px solid ${C.softLine}`,
          }}
        >
          <div style={eyebrow(9.5)}>REVIEWING QUOTE · {quoteId}</div>
          <h1 style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, marginTop: 4, lineHeight: 1.15 }}>
            {restaurant || '—'}
          </h1>
          <div style={{ marginTop: 8 }}>
            <QuoteCoverageLabelRep state={matchState} />
          </div>
          <div style={{ ...sans, fontSize: 11, color: C.gray700, marginTop: 6, lineHeight: 1.4 }}>
            {lines.length} components · tap{' '}
            <span style={{ color: C.accent }}>
              <SquarePen size={10} color={C.accent} strokeWidth={1.8} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </span>
            {' '}on any row to inspect and swap
          </div>
        </div>

        {/* Line items — one panel, swap drawer per line */}
        <div style={{ padding: '0 20px 100px' }}>
          {groups.map((g) => (
            <div key={g.cat} style={{ marginTop: 16 }}>
              {/* Category header */}
              <div
                style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <h3
                  style={{
                    ...serif, fontSize: 13, fontWeight: 500, color: C.charcoal,
                    letterSpacing: '.08em', textTransform: 'uppercase',
                  }}
                >
                  {g.cat}
                </h3>
                <span style={{ ...sans, fontSize: 11, color: C.gray500 }}>{g.items.length} items</span>
              </div>

              {g.items.map(({ line, idx }) => {
                const missing = !line.product || line.availability_status === 'not_in_catalog';
                const strength = missing ? 'thin' : 'strong';
                const isOpen = openDrawerIdx === idx;
                const isUnavail = unavailable.has(idx);
                const committedAltIdx = commits.get(idx) ?? 0;

                return (
                  <div key={line.id} style={{ opacity: isUnavail ? 0.4 : 1 }}>
                    {/* Line row */}
                    <div
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        padding: '10px 0',
                        borderBottom: isOpen ? 'none' : `1px solid ${C.softLine}`,
                        borderTop: 'none',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                          <LineCoverageDot strength={strength} />
                          <span style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.35 }}>
                            {line.component?.name || line.product?.product || '—'}
                          </span>
                        </div>
                        <div style={{ ...sans, fontSize: 11, color: C.gray500, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                          {line.product?.pack_size || ''}
                          {line.product?.brand ? ` · ${line.product.brand}` : ''}
                        </div>
                        {missing && (
                          <div style={{ ...serif, fontSize: 10.5, color: C.charcoal, fontStyle: 'italic', marginTop: 3, lineHeight: 1.3 }}>
                            {line.availability_status === 'not_in_catalog'
                              ? 'Not in your catalog yet.'
                              : 'Matcher unsure — confirm or swap.'}
                          </div>
                        )}
                        {isUnavail && (
                          <div style={{ ...sans, fontSize: 10.5, color: C.gray500, marginTop: 3 }}>
                            Marked unavailable
                          </div>
                        )}
                      </div>

                      {/* D5 icons — blue Review icon opens the swap drawer */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 2 }}>
                        <button
                          type="button"
                          onClick={() => toggleDrawer(idx)}
                          title={isOpen ? 'Close swap drawer' : 'Review this line'}
                          aria-label={isOpen ? 'Close swap drawer' : 'Review this line'}
                          aria-expanded={isOpen}
                          style={{
                            width: 26, height: 26,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%',
                            background: isOpen ? `rgba(127,174,194,.25)` : `rgba(127,174,194,.10)`,
                            border: `1px solid ${isOpen ? C.accent : 'rgba(127,174,194,.55)'}`,
                            cursor: 'pointer',
                          }}
                        >
                          <SquarePen size={13} color={C.accent} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/rep/quotes/${quoteId}?mode=pricing`)}
                          title="Price this line"
                          aria-label="Price this line"
                          style={{
                            width: 26, height: 26,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            border: '1px solid var(--primary)',
                            cursor: 'pointer',
                          }}
                        >
                          <Search size={13} color="#fff" strokeWidth={1.8} />
                        </button>
                      </span>
                    </div>

                    {/* Inline swap drawer — expands below the row */}
                    {isOpen && (
                      <LineSwapDrawer
                        line={line}
                        lineIdx={idx}
                        committedAltIdx={committedAltIdx}
                        note={notes.get(idx) || ''}
                        onSwap={(altIdx) => handleSwap(idx, altIdx)}
                        onNoteChange={(note) => handleNoteChange(idx, note)}
                        onMarkUnavailable={() => handleMarkUnavailable(idx)}
                        onClose={() => setOpenDrawerIdx(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Peeking quote footer — always visible, confirms and sends back */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: C.warmPaper,
          borderTop: `1px solid ${C.softLine}`,
          padding: '12px 20px 20px',
          boxShadow: '0 -4px 12px rgba(43,43,43,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ ...sans, fontSize: 11, color: C.gray700 }}>
            {lines.length} line{lines.length !== 1 ? 's' : ''} · review complete
          </span>
          <button
            type="button"
            onClick={() => navigate(`/rep/quotes/${quoteId}?mode=pricing`)}
            style={{ ...sans, fontSize: 12, color: C.gray700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Skip to pricing
          </button>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          style={{
            ...sans,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%',
            padding: '12px 16px',
            fontSize: 14, fontWeight: 500,
            color: '#fff',
            background: saving ? C.gray500 : 'var(--primary)',
            border: 'none',
            borderRadius: 6,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <Check size={14} color="#fff" strokeWidth={2} />
          {saving ? 'Sending…' : 'Confirm & send back'}
        </button>
        <div style={{ ...sans, fontSize: 10.5, color: C.gray500, textAlign: 'center', marginTop: 6, lineHeight: 1.4 }}>
          Stamps the quote as confirmed. The chef gets emailed.
        </div>
      </div>
    </div>
  );
}
