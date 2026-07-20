import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { X, Check, Search, Plus, Repeat, Mic, Loader2 } from 'lucide-react';
import {
  searchCatalogProducts,
  submitYourCallSelection,
  toggleRepMemoryLock,
  CORRECTION_TYPES,
  type AlignmentCandidateResponse,
  type CatalogSearchProduct,
  type CorrectionType,
} from '../services/api';
import { toTitleCase, formatProductName } from '../utils/format';
import { categoryLabel } from '../utils/categoryLabel';
import { ChainToggle } from './ChainToggle';

// ─── MatchDrawer ──────────────────────────────────────────────────────────
// Multi-select redesign of MapComponentDrawer (see that file for the legacy
// single-select radio+checkbox drawer it replaces on MapIngredientsPage).
// Source of truth for markup/CSS/behavior: Desi's Match Drawer mockup.
// ONE control type throughout: checkbox. `picks` is an ORDERED array of
// selected product ids — picks[0] is the replacement, picks[1..] are
// additions. Rank = index in that array.

type MdVars = React.CSSProperties & {
  '--md-orange': string;
  '--md-orange-dark': string;
  '--md-green-bg': string;
  '--md-green-fg': string;
  '--md-blue-bg': string;
  '--md-blue-fg': string;
  '--md-panel-line': string;
};

const MD_VARS: MdVars = {
  '--md-orange': '#C8793B',
  '--md-orange-dark': '#B56B31',
  '--md-green-bg': '#E1F0E3',
  '--md-green-fg': '#2F7D4F',
  '--md-blue-bg': '#E6EDF5',
  '--md-blue-fg': '#3E6690',
  '--md-panel-line': '#ECE7DE',
} as MdVars;

function scoreLabel(score: number | null): { text: string; color: string; bg: string } | null {
  if (score == null) return null;
  const s = Math.round(score * 100);
  if (s >= 90) return { text: 'Strong Match', color: 'var(--md-green-fg)', bg: 'var(--md-green-bg)' };
  if (s >= 70) return { text: 'Good Match', color: 'var(--md-blue-fg)', bg: 'var(--md-blue-bg)' };
  if (s >= 50) return { text: 'Review Suggested', color: '#8A6114', bg: '#FBEFD8' };
  return { text: 'Needs Your Pick', color: '#B23A34', bg: '#FBE4E2' };
}

function tierLabel(position: number): string {
  if (position === 1) return 'Best Match';
  return 'Alternate';
}

// Plain reason picker for "why" this pick was made -- attributed by the
// promotion/memory system, not part of the memory label itself. No
// sparkles/confidence-number styling here, just a compact control.
const CORRECTION_TYPE_LABELS: Record<CorrectionType, string> = {
  wrong_product: 'Wrong product',
  wrong_form: 'Wrong form',
  wrong_pack: 'Wrong pack size',
  not_carried: 'Not carried',
  out_of_stock: 'Out of stock',
  better_fit: 'Better fit',
  rep_preference: 'Rep preference',
  distributor_preference: 'Distributor preference',
};

interface MatchDrawerCurrentProduct {
  id: string;
  item_number: string;
  brand: string;
  product: string;
  pack_size: string;
  category: string;
}

interface MatchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientName: string;
  /** The quote line's actual assigned product — reused as-is from whatever
   * the Match-Ingredients surface already loaded (no refetch). Rendered as
   * the green, non-clickable Current Match card. */
  currentProduct?: MatchDrawerCurrentProduct | null;
  /** Full alignment_candidates list for this line — REAL data from the
   * alignment engine, reused from the same source MapComponentDrawer already
   * consumed. Whichever candidate matches currentProduct (if any) is used to
   * score the Current Match card; everything else renders as an alternate. */
  candidates: AlignmentCandidateResponse[];
  /** Loads more candidates from the same candidate source (offset-style expansion). */
  onFindMoreMatches?: () => Promise<AlignmentCandidateResponse[]>;
  quoteId?: string | null;
  quoteLineId?: string | null;
  dishComponentId?: string | null;
  canonicalKey?: string | null;
  /** Called after a successful submit with the full ordered pick list
   * (rank 0 = replacement, rest = additions) so the parent surface can
   * update its own local "mapped" tracking, then refetch/refresh. */
  onSubmitted?: (pickedProductIds: string[]) => void;
}

export function MatchDrawer({
  open,
  onOpenChange,
  ingredientName,
  currentProduct,
  candidates,
  onFindMoreMatches,
  quoteId,
  quoteLineId,
  dishComponentId,
  canonicalKey,
  onSubmitted,
}: MatchDrawerProps) {
  const [picks, setPicks] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [correctionType, setCorrectionType] = useState<CorrectionType>('rep_preference');
  const [extraAlternates, setExtraAlternates] = useState<AlignmentCandidateResponse[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogSearchProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Operational Memory Epic, Lane 1 revision (Ruling 3): the ChainToggle is a
  // real bidirectional lock, not a read-only label, so its state can change
  // without a full quote refetch. lockOverrides tracks any product whose
  // lock state has been flipped in THIS drawer session; falls back to the
  // server-provided candidate.rep_memory when no override exists yet.
  const [lockOverrides, setLockOverrides] = useState<Record<string, boolean>>({});
  const [lockPending, setLockPending] = useState<string | null>(null);

  const isLocked = (productId: string, serverValue: boolean) =>
    lockOverrides[productId] ?? serverValue;

  const handleToggleLock = async (productId: string, currentlyLocked: boolean) => {
    if (!quoteId || !quoteLineId || lockPending) return;
    setLockPending(productId);
    const nextLocked = !currentlyLocked;
    const res = await toggleRepMemoryLock(quoteId, {
      quote_line_id: quoteLineId,
      product_id: productId,
      canonical_key: canonicalKey ?? null,
      locked: nextLocked,
    });
    setLockPending(null);
    if (!res.error) {
      setLockOverrides(prev => ({ ...prev, [productId]: nextLocked }));
    }
    // Errors are swallowed quietly here by design -- no modal, no toast.
    // The chain simply stays in its prior state if the call failed.
  };

  // BUG #26 precedent (MapComponentDrawer) — vaul's right-direction drawer
  // doesn't reliably fire onOpenChange on Esc/backdrop for horizontal
  // drawers. Guarantee an Escape route independent of vaul's detection.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Reset local state whenever the drawer is opened for a (possibly new)
  // ingredient, and auto-seed the catalog search with the component name so
  // results show immediately without a manual "search" step.
  useEffect(() => {
    if (!open) return;
    setPicks([]);
    setNotes('');
    setCorrectionType('rep_preference');
    setExtraAlternates([]);
    setQuery(ingredientName || '');
    setSearchResults([]);
    setSubmitError(null);
    setLockOverrides({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ingredientName]);

  // Catalog search — auto-fires on open (seeded above) and re-fires whenever
  // the query is edited. Debounced, only queries when non-empty.
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const res = await searchCatalogProducts(query.trim(), quoteId || undefined);
      if (res.data) setSearchResults(res.data);
      setSearchLoading(false);
    }, 250);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [query, quoteId]);

  // Current Match card: prefer the candidate that matches the line's actual
  // assigned product (for real score/tier), fall back to a synthetic
  // position-1 entry if the current product isn't in the candidate list
  // (e.g. it was set via a prior manual search pick).
  const currentMatch: AlignmentCandidateResponse | null = useMemo(() => {
    if (!currentProduct) return null;
    const scored = candidates.find(c => c.product.id === currentProduct.id);
    return {
      id: scored?.id ?? `current-${currentProduct.id}`,
      position: scored?.position ?? 1,
      tier: scored?.tier ?? 'current',
      score: scored?.score ?? null,
      rep_memory: scored?.rep_memory ?? false,
      product: currentProduct,
    };
  }, [currentProduct, candidates]);

  const allAlternates = useMemo(() => {
    const seen = new Set<string>();
    if (currentProduct) seen.add(currentProduct.id);
    const combined = [...candidates, ...extraAlternates];
    return combined.filter(c => {
      if (seen.has(c.product.id)) return false;
      seen.add(c.product.id);
      return true;
    });
  }, [candidates, extraAlternates, currentProduct]);

  const toggle = (id: string) => {
    setPicks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const isReplace = (id: string) => picks[0] === id;
  const isAdded = (id: string) => picks.includes(id) && picks[0] !== id;
  // Footer "+ Add N to Quote" count tracks the full live selection —
  // bound directly to picks.length, not picks.length - 1, so it always
  // matches how many alternates are currently checked.
  const addCount = picks.length;
  const canReplace = picks.length > 0;
  const addLabel = addCount > 0 ? `Add ${addCount} to Quote` : 'Add to Quote';

  const handleFindMore = async () => {
    if (!onFindMoreMatches) return;
    setLoadingMore(true);
    try {
      const more = await onFindMoreMatches();
      setExtraAlternates(prev => [...prev, ...more]);
    } catch {
      // silently fail — matches MapComponentDrawer's existing find-more behavior
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async () => {
    if (!quoteId || !quoteLineId || picks.length === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const selections = picks.map((productId, rank) => ({ product_id: productId, rank }));
    const res = await submitYourCallSelection(quoteId, {
      quote_line_id: quoteLineId,
      dish_component_id: dishComponentId ?? null,
      canonical_key: canonicalKey ?? null,
      selections,
      notes: notes.trim() ? notes.trim() : null,
      correction_type: correctionType,
    });
    setSubmitting(false);
    if (res.error) {
      // 401/403 from the your_call_selection endpoint means the session
      // isn't a valid rep session (expired, guest-only, or missing token) —
      // show plain copy instead of the raw BE/auth passthrough message.
      const isAuthFailure = res.status === 401 || res.status === 403;
      setSubmitError(isAuthFailure ? 'This needs a rep login.' : res.error);
      return;
    }
    onOpenChange(false);
    onSubmitted?.(picks);
  };

  const currentScore = scoreLabel(currentMatch?.score ?? null);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className="w-full sm:max-w-[480px] h-full flex flex-col p-0 bg-white"
        style={{ ...MD_VARS, boxShadow: '-18px 0 44px rgba(0,0,0,.22)' }}
      >
        {/* ── Header ── */}
        <DrawerHeader className="p-0 flex-shrink-0" style={{ borderBottom: '1px solid var(--qm-soft-line)' }}>
          <div className="flex items-start justify-between px-[22px] pt-5 pb-4">
            <div>
              <DrawerTitle style={{ fontFamily: 'var(--qm-serif)', fontSize: 20, fontWeight: 600, color: 'var(--qm-charcoal)' }}>
                Select Match for {toTitleCase(ingredientName)}
              </DrawerTitle>
              <DrawerDescription style={{ fontSize: 12.5, color: 'var(--qm-gray-500)', marginTop: 3 }}>
                Choose a product, then replace or add to quote
              </DrawerDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-[3px] cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--qm-gray-500)' }}
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
        </DrawerHeader>

        {/* ── Body ── */}
        <div className="qm-match-drawer-scroll flex-1 overflow-y-auto px-[22px] pt-[18px] pb-[10px] min-h-0">
          {/* Current Match — green, not clickable, no checkbox */}
          {currentMatch && (
            <div className="mb-5">
              <div
                className="text-[11px] font-bold uppercase mb-[9px]"
                style={{ letterSpacing: '.06em', color: 'var(--qm-gray-700)' }}
              >
                Current Match
              </div>
              <div
                className="rounded-[10px] px-[14px] py-[13px]"
                style={{ border: '1.5px solid var(--md-green-fg)', background: '#F6FBF7' }}
              >
                <div className="flex items-start gap-[10px]">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13.5px] font-semibold leading-[1.3] flex items-center gap-[6px]" style={{ color: 'var(--qm-charcoal)' }}>
                      {formatProductName(currentMatch.product.product, currentMatch.product.brand)}
                      {quoteId && quoteLineId && (
                        <ChainToggle
                          locked={isLocked(currentMatch.product.id, currentMatch.rep_memory)}
                          onToggle={() => handleToggleLock(currentMatch.product.id, isLocked(currentMatch.product.id, currentMatch.rep_memory))}
                          disabled={lockPending === currentMatch.product.id}
                        />
                      )}
                    </h4>
                    <p className="text-[11.5px] mt-[6px]" style={{ color: 'var(--qm-gray-500)' }}>
                      Item #{currentMatch.product.item_number} &middot; {toTitleCase(currentMatch.product.pack_size)} &middot; {categoryLabel(currentMatch.product.category)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-[6px] mt-[8px] flex-wrap">
                  <span
                    className="text-[10px] font-bold px-2 py-[2px] rounded-full"
                    style={{ background: 'var(--md-green-bg)', color: 'var(--md-green-fg)' }}
                  >
                    Best Match
                  </span>
                  {currentScore && (
                    <span
                      className="text-[10px] font-bold px-2 py-[2px] rounded-full"
                      style={{ background: currentScore.bg, color: currentScore.color }}
                    >
                      {currentScore.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alternate Products — the ONLY control is a checkbox */}
          {allAlternates.length > 0 && (
            <div>
              <div
                className="text-[11px] font-bold uppercase mb-[9px]"
                style={{ letterSpacing: '.06em', color: 'var(--qm-gray-700)' }}
              >
                Alternate Products ({allAlternates.length}) &middot; check any: the first replaces your pick, the rest add alongside it
              </div>
              {allAlternates.map((candidate) => {
                const id = candidate.product.id;
                const on = picks.includes(id);
                const replace = isReplace(id);
                const added = isAdded(id);
                const s = scoreLabel(candidate.score);
                return (
                  <div
                    key={candidate.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id); } }}
                    className="relative rounded-[10px] px-[14px] py-[13px] mb-[10px] cursor-pointer transition-colors"
                    style={{
                      border: `1.5px solid ${replace ? 'var(--md-orange)' : 'var(--qm-soft-line)'}`,
                      background: replace ? '#FDF6EF' : added ? 'var(--md-blue-bg)' : 'transparent',
                    }}
                  >
                    <div className="flex items-start gap-[10px]">
                      <span
                        className="w-[17px] h-[17px] rounded-[5px] flex items-center justify-center shrink-0 mt-[1px]"
                        style={{
                          border: `1.5px solid ${on ? 'var(--qm-charcoal)' : 'var(--qm-gray-400)'}`,
                          background: on ? 'var(--qm-charcoal)' : '#fff',
                        }}
                      >
                        {on && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13.5px] font-semibold leading-[1.3] flex items-center gap-[6px]" style={{ color: 'var(--qm-charcoal)' }}>
                          {formatProductName(candidate.product.product, candidate.product.brand)}
                          {quoteId && quoteLineId && (
                            <ChainToggle
                              locked={isLocked(candidate.product.id, candidate.rep_memory)}
                              onToggle={() => handleToggleLock(candidate.product.id, isLocked(candidate.product.id, candidate.rep_memory))}
                              disabled={lockPending === candidate.product.id}
                            />
                          )}
                        </h4>
                        <p className="text-[11.5px] mt-[6px]" style={{ color: 'var(--qm-gray-500)' }}>
                          Item #{candidate.product.item_number} &middot; {toTitleCase(candidate.product.pack_size)} &middot; {categoryLabel(candidate.product.category)}
                        </p>
                        <div className="flex items-center gap-[6px] mt-[8px] flex-wrap">
                          <span
                            className="text-[10px] font-bold px-2 py-[2px] rounded-full"
                            style={{ background: 'var(--md-blue-bg)', color: 'var(--md-blue-fg)' }}
                          >
                            {tierLabel(candidate.position)}
                          </span>
                          {s && (
                            <span className="text-[10px] font-bold px-2 py-[2px] rounded-full" style={{ background: s.bg, color: s.color }}>
                              {s.text}
                            </span>
                          )}
                          {replace && (
                            <span className="text-[10px] font-bold px-2 py-[2px] rounded-full" style={{ background: 'var(--md-orange)', color: '#fff' }}>
                              Replace with this
                            </span>
                          )}
                          {added && (
                            <span className="text-[10px] font-bold px-2 py-[2px] rounded-full" style={{ background: 'var(--qm-charcoal)', color: '#fff' }}>
                              + Adding to quote
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Find More Matches */}
          {onFindMoreMatches && (
            <button
              type="button"
              onClick={handleFindMore}
              disabled={loadingMore}
              className="w-full rounded-[8px] py-[10px] text-[13px] font-semibold mb-5 flex items-center justify-center gap-2"
              style={{ background: '#F3F0E9', border: '1px solid var(--qm-soft-line)', color: 'var(--qm-charcoal)' }}
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Finding matches&hellip;</>
              ) : (
                'Find 2 more matches'
              )}
            </button>
          )}

          {/* Catalog Search — auto-runs on open (seeded with the component
              name); same checkbox/pick semantics as alternates. Query stays
              editable so the chef/rep can refine and re-search. */}
          <div className="mb-2">
            <div
              className="text-[11px] font-bold uppercase mb-[9px]"
              style={{ letterSpacing: '.06em', color: 'var(--qm-gray-700)' }}
            >
              Catalog Search
            </div>

            <div className="relative mt-1">
              <div className="relative">
                <Search className="absolute left-[11px] top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--qm-gray-400)' }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search catalog by name, brand, or item #..."
                  className="w-full pl-[34px] pr-3 py-[10px] rounded-[8px] text-[13.5px] outline-none"
                  style={{ border: '1.5px solid var(--md-orange)', fontFamily: 'var(--qm-sans)', color: 'var(--qm-charcoal)' }}
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: 'var(--qm-gray-400)' }} />
                )}
              </div>

              {query.trim().length > 0 && (
                <div
                  className="qm-match-drawer-scroll mt-[6px] max-h-[220px] overflow-y-auto rounded-[8px]"
                  style={{ border: '1px solid var(--qm-soft-line)' }}
                >
                  {searchResults.length === 0 && !searchLoading && (
                    <p className="text-[13px] italic px-3 py-3" style={{ color: 'var(--qm-gray-500)' }}>
                      No products found
                    </p>
                  )}
                  {searchResults.map((product, idx) => {
                    const on = picks.includes(product.id);
                    const replace = isReplace(product.id);
                    const added = isAdded(product.id);
                    return (
                      <div
                        key={product.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggle(product.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(product.id); } }}
                        className="flex items-start gap-[10px] px-3 py-[10px] cursor-pointer transition-colors"
                        style={{
                          borderBottom: idx === searchResults.length - 1 ? 'none' : '1px solid var(--md-panel-line)',
                          background: replace ? '#FDF6EF' : added ? 'var(--md-blue-bg)' : 'transparent',
                        }}
                      >
                        <span
                          className="w-[17px] h-[17px] rounded-[5px] flex items-center justify-center shrink-0 mt-[1px]"
                          style={{
                            border: `1.5px solid ${on ? 'var(--qm-charcoal)' : 'var(--qm-gray-400)'}`,
                            background: on ? 'var(--qm-charcoal)' : '#fff',
                          }}
                        >
                          {on && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium leading-[1.3]" style={{ color: 'var(--qm-charcoal)' }}>
                            {formatProductName(product.product, product.brand)}
                          </p>
                          <p className="text-[11px] mt-[2px]" style={{ color: 'var(--qm-gray-500)' }}>
                            Item #{product.item_number} &middot; {toTitleCase(product.pack_size)} &middot; {categoryLabel(product.category)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Reason (Optional) -- plain picker, not part of the memory label.
              Shown once there's a replacement pick; defaults to
              "Rep preference" so it never blocks a one-click submit. */}
          {canReplace && (
            <div className="mt-[18px]">
              <label
                htmlFor="match-drawer-correction-type"
                className="text-[12.5px] font-semibold block mb-2"
                style={{ color: 'var(--qm-charcoal)' }}
              >
                Reason for this pick
              </label>
              <select
                id="match-drawer-correction-type"
                value={correctionType}
                onChange={(e) => setCorrectionType(e.target.value as CorrectionType)}
                className="w-full rounded-[8px] px-3 py-[10px] text-[13px] outline-none"
                style={{ border: '1px solid var(--qm-soft-line)', fontFamily: 'var(--qm-sans)', color: 'var(--qm-charcoal)', background: '#fff' }}
              >
                {CORRECTION_TYPES.map((code) => (
                  <option key={code} value={code}>{CORRECTION_TYPE_LABELS[code]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="flex items-center justify-between mt-[18px] mb-2">
            <label className="text-[12.5px] font-semibold" style={{ color: 'var(--qm-charcoal)' }}>
              Notes (Optional)
            </label>
            {/* Voice-note button HIDDEN until real Whisper transcription wires up
                (VoiceNoteButton is a UI-only stub — no mic capture / no real STT).
                No dead buttons on prod. Re-enable when the STT endpoint lands (task #42). */}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add chef notes, pack size details, or selling points..."
            className="w-full min-h-[90px] rounded-[8px] px-3 py-[10px] text-[13px] resize-y outline-none"
            style={{ border: '1px solid var(--qm-soft-line)', fontFamily: 'var(--qm-sans)', color: 'var(--qm-charcoal)' }}
          />
        </div>

        {/* ── Footer ── */}
        <DrawerFooter className="p-0 flex-shrink-0" style={{ borderTop: '1px solid var(--qm-soft-line)' }}>
          <div className="flex gap-[10px] px-[22px] pt-[14px] pb-[18px]">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canReplace || submitting}
              className="flex-1 rounded-[8px] py-3 text-[13.5px] font-semibold flex items-center justify-center gap-[7px] border-none cursor-pointer disabled:cursor-default"
              style={{
                background: '#F3D9BD',
                color: '#7A4A1D',
                opacity: !canReplace || submitting ? 0.5 : 1,
              }}
            >
              <Repeat className="w-4 h-4" /> Replace Match
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={addCount === 0 || submitting}
              className="flex-1 rounded-[8px] py-3 text-[13.5px] font-semibold flex items-center justify-center gap-[7px] border-none cursor-pointer disabled:cursor-default"
              style={{
                background: addCount === 0 ? '#D8D3C8' : 'var(--qm-charcoal)',
                color: addCount === 0 ? '#9C978A' : '#fff',
              }}
            >
              <Plus className="w-4 h-4" /> {addLabel}
            </button>
          </div>
          {submitError && (
            <p className="px-[22px] pb-3 text-xs" style={{ color: '#B23A34' }}>{submitError}</p>
          )}
        </DrawerFooter>

        <style>{`
          .qm-match-drawer-scroll { scrollbar-width: thin; scrollbar-color: rgba(120,110,95,.38) transparent; }
          .qm-match-drawer-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
          .qm-match-drawer-scroll::-webkit-scrollbar-track { background: transparent; }
          .qm-match-drawer-scroll::-webkit-scrollbar-thumb { background: rgba(120,110,95,.32); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
          .qm-match-drawer-scroll::-webkit-scrollbar-thumb:hover { background: rgba(120,110,95,.5); background-clip: content-box; }
          .qm-match-drawer-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
          @keyframes mdVoicePulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
        `}</style>
      </DrawerContent>
    </Drawer>
  );
}

// ─── VoiceNoteButton ───────────────────────────────────────────────────────
// UI-ONLY STUB: this codebase has no synchronous speech-to-text endpoint.
// The only existing voice-note flow (QMAdminConferenceCommand.tsx) uploads
// the raw audio file and lets the BE transcribe it asynchronously (~3s
// poll), which doesn't fit this drawer's need for an immediate transcript
// to drop into the Notes field. So: real idle/recording/transcribing UI
// states + timer, but no mic capture and no real transcription — a fixed
// delay stands in for the async STT call, then a placeholder is appended.

type VoiceState = 'idle' | 'recording' | 'transcribing';

function VoiceNoteButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [state, setState] = useState<VoiceState>('idle');
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const startRecording = () => {
    setState('recording');
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setState('transcribing');
    // STUB — no real STT wired here (see comment above). Fixed delay simulates
    // async transcription latency, then a placeholder lands in Notes.
    setTimeout(() => {
      onTranscript('[Voice note recorded, transcription pending]');
      setState('idle');
      setSeconds(0);
    }, 1400);
  };

  const handleClick = () => {
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'transcribing'}
      className="inline-flex items-center gap-[6px] text-[11.5px] font-semibold px-[10px] py-[5px] rounded-full cursor-pointer disabled:cursor-default"
      style={{
        border: `1px solid ${state === 'recording' ? '#C0433D' : 'var(--qm-soft-line)'}`,
        background: state === 'recording' ? 'rgba(192,67,61,.06)' : '#fff',
        color: state === 'recording' ? '#C0433D' : 'var(--qm-gray-700)',
      }}
    >
      {state === 'idle' && (<><Mic className="w-3.5 h-3.5" /> Add Voice Note</>)}
      {state === 'recording' && (
        <>
          <span
            className="w-[7px] h-[7px] rounded-full inline-block"
            style={{ background: '#C0433D', animation: 'mdVoicePulse 1.1s ease-in-out infinite' }}
          />
          Recording {formatTime(seconds)}
        </>
      )}
      {state === 'transcribing' && (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Transcribing&hellip;</>)}
    </button>
  );
}
