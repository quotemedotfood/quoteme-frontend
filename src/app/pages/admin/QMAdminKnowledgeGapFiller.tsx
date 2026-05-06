import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Undo2, RotateCcw } from 'lucide-react';
import {
  KnowledgeGapSubmission,
  KnowledgeGapEditedData,
  KnowledgeGapHistoryRow,
  ParentClusterLabelResult,
  listKnowledgeGapSubmissions,
  approveKnowledgeGapSubmission,
  archiveKnowledgeGapSubmission,
  restoreKnowledgeGapSubmission,
  approveKnowledgeGapAsTail,
  setKnowledgeGapPlacement,
  searchClusterLabelParents,
  bulkApproveAsTail,
  bulkArchiveKnowledgeGap,
  bulkMoveToHead,
  listKnowledgeGapHistory,
  undoKnowledgeGapTail,
} from '../../services/adminApi';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  'produce', 'meat', 'poultry', 'seafood', 'dairy', 'cheese',
  'dry_goods', 'frozen', 'bakery', 'beverage', 'prepared',
  'non_food', 'other', 'tobacco',
] as const;

const FORM_TYPE_OPTIONS = [
  'fresh_raw', 'fresh_raw_protein', 'minimally_processed',
  'frozen_raw', 'frozen_prepared', 'prepared', 'preserved',
  'dried', 'powdered', 'liquid', 'baked_good', 'condiment', 'other',
] as const;

const COMPOUND_TYPE_OPTIONS = [
  { value: '', label: '(none)' },
  { value: 'identity', label: 'identity' },
  { value: 'modified', label: 'modified' },
  { value: 'true', label: 'true' },
] as const;

const PAGE_SIZE = 50;
const HISTORY_PAGE_SIZE = 25;

// Confidence thresholds per spec (0.85/0.65). Verified: ConfidenceDot already uses these.
const CONF_GREEN = 0.85;
const CONF_YELLOW = 0.65;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPlacement(sd: KnowledgeGapSubmission['source_data']): 'tail_to_existing_head' | 'new_head' {
  const p = (sd as Record<string, unknown>)['placement'];
  if (p === 'tail_to_existing_head') return 'tail_to_existing_head';
  return 'new_head';
}

function getLlmSuggestion(sd: KnowledgeGapSubmission['source_data']): Record<string, unknown> | null {
  const llm = (sd as Record<string, unknown>)['llm_suggestion'];
  if (llm && typeof llm === 'object' && !Array.isArray(llm)) return llm as Record<string, unknown>;
  return null;
}

function getConfidence(sd: KnowledgeGapSubmission['source_data']): number | null {
  const llm = getLlmSuggestion(sd);
  if (!llm) return null;
  const c = llm['confidence'];
  if (typeof c === 'number') return c;
  return null;
}

function getCategory(sd: KnowledgeGapSubmission['source_data']): string {
  const llm = getLlmSuggestion(sd);
  if (llm) {
    const cat = llm['suggested_category'];
    if (typeof cat === 'string' && cat) return cat;
  }
  const cat = (sd as Record<string, unknown>)['suggested_category'];
  if (typeof cat === 'string' && cat) return cat;
  return '';
}

function ConfidenceDot({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="no confidence data" />;
  }
  const color = confidence >= CONF_GREEN
    ? 'bg-green-500'
    : confidence >= CONF_YELLOW
    ? 'bg-yellow-400'
    : 'bg-red-500';
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color}`}
      title={`Haiku confidence: ${pct}%`}
    />
  );
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return <span className="text-xs text-gray-400">--</span>;
  }
  const pct = Math.round(confidence * 100);
  const cls = confidence >= CONF_GREEN
    ? 'text-green-700 bg-green-50'
    : confidence >= CONF_YELLOW
    ? 'text-yellow-700 bg-yellow-50'
    : 'text-red-700 bg-red-50';
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cls}`}>{pct}%</span>
  );
}

// ── Portal dropdown (G5: escapes table overflow clipping) ─────────────────────
// Uses @radix-ui/react-popover available in package.json.
// For the parent-search typeahead we hand-roll a portal to document.body
// positioned below the trigger input. Radix Popover would also work but
// requires a controlled content pattern. Direct portal gives cleaner control
// over the typeahead UX (debounced search, close-on-outside-click, etc.).

interface PortalDropdownListProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: React.ReactNode;
}

function PortalDropdownList({ anchorRef, open, children }: PortalDropdownListProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    function reposition() {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: rect.bottom + 2,
        left: rect.left,
        width: Math.max(rect.width, 200),
        zIndex: 9999,
      });
    }

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      style={style}
      className="bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto"
    >
      {children}
    </div>,
    document.body
  );
}

// ── Portal select (for HEAD Queue dropdowns that clip in 1-2 row tables) ──────

interface PortalSelectProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  options: ReadonlyArray<string | { value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

function PortalSelect({ value, onChange, disabled, options, placeholder, className }: PortalSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const normalizedOptions = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  const selectedLabel = value
    ? (normalizedOptions.find((o) => o.value === value)?.label ?? value)
    : (placeholder ?? '(select)');

  function reposition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setStyle({
      position: 'fixed',
      top: rect.bottom + 2,
      left: rect.left,
      minWidth: Math.max(rect.width, 160),
      zIndex: 9999,
    });
  }

  function handleOpen() {
    if (disabled) return;
    reposition();
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full border rounded px-2 py-1 text-xs text-left text-[#2A2A2A] bg-white focus:outline-none focus:ring-1 focus:ring-[#7FAEC2] disabled:bg-gray-50 flex items-center justify-between gap-1 ${className ?? 'border-gray-200'}`}
      >
        <span className={value ? '' : 'text-gray-400'}>{selectedLabel}</span>
        <ChevronDown size={10} className="shrink-0 text-gray-400" />
      </button>
      {open && createPortal(
        <div style={style} className="bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto" ref={containerRef}>
          {!value && placeholder && (
            <button
              type="button"
              onMouseDown={() => { onChange(''); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50"
            >
              {placeholder}
            </button>
          )}
          {normalizedOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#EAF3F8] ${o.value === value ? 'font-semibold text-[#2A2A2A]' : 'text-[#4F4F4F]'}`}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Parent dropdown (portal-escaped typeahead) ────────────────────────────────

interface ParentDropdownProps {
  initialParentId: string | null;
  initialParentCanonical: string | null;
  onSelect: (result: ParentClusterLabelResult | null) => void;
  disabled?: boolean;
}

function ParentDropdown({ initialParentId, initialParentCanonical, onSelect, disabled }: ParentDropdownProps) {
  const [query, setQuery] = useState(initialParentCanonical ?? '');
  const [results, setResults] = useState<ParentClusterLabelResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ParentClusterLabelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-populate when initialParentId is known
  useEffect(() => {
    if (initialParentId && initialParentCanonical) {
      const pre: ParentClusterLabelResult = {
        id: initialParentId,
        canonical_product: initialParentCanonical,
        category: null,
      };
      setSelected(pre);
      setQuery(initialParentCanonical);
      onSelect(pre);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const res = await searchClusterLabelParents(q, 20);
    setLoading(false);
    if (res.data) setResults(res.data);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    onSelect(null);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 250);
  }

  function handleSelect(item: ParentClusterLabelResult) {
    setSelected(item);
    setQuery(item.canonical_product);
    setResults([]);
    setOpen(false);
    onSelect(item);
  }

  // Close on outside click (portal-safe: check both input and portal list)
  useEffect(() => {
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (inputRef.current && !inputRef.current.contains(target)) {
        // If the click is NOT on the portal list (which is mounted on body),
        // close. We can't check portal's ref directly, so we rely on onMouseDown
        // in the portal list items to fire before this blur-like close.
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          disabled={disabled}
          placeholder="Search corpus..."
          className={`w-full border rounded px-2 py-1 text-xs text-[#2A2A2A] focus:outline-none focus:ring-1 focus:ring-[#7FAEC2] disabled:bg-gray-50 ${
            selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
          }`}
          spellCheck={false}
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>
        )}
      </div>
      <PortalDropdownList anchorRef={inputRef} open={open && results.length > 0}>
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onMouseDown={() => handleSelect(r)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#EAF3F8] flex items-center justify-between gap-2"
          >
            <span className="font-medium text-[#2A2A2A]">{r.canonical_product}</span>
            {r.category && (
              <span className="text-[#4F4F4F] shrink-0">{r.category}</span>
            )}
          </button>
        ))}
      </PortalDropdownList>
    </div>
  );
}

// ── Filter + sort helpers ─────────────────────────────────────────────────────

type ConfFilter = 'all' | 'green' | 'yellow' | 'red';
type SortOrder = 'conf_asc' | 'conf_desc' | 'alpha';

function applyConfFilter(items: KnowledgeGapSubmission[], f: ConfFilter): KnowledgeGapSubmission[] {
  if (f === 'all') return items;
  return items.filter((s) => {
    const c = getConfidence(s.source_data);
    if (c === null) return false;
    if (f === 'green') return c >= CONF_GREEN;
    if (f === 'yellow') return c >= CONF_YELLOW && c < CONF_GREEN;
    return c < CONF_YELLOW;
  });
}

function applySort(items: KnowledgeGapSubmission[], order: SortOrder): KnowledgeGapSubmission[] {
  const arr = [...items];
  if (order === 'conf_asc') {
    return arr.sort((a, b) => {
      const ca = getConfidence(a.source_data) ?? 2;
      const cb = getConfidence(b.source_data) ?? 2;
      return ca - cb;
    });
  }
  if (order === 'conf_desc') {
    return arr.sort((a, b) => {
      const ca = getConfidence(a.source_data) ?? -1;
      const cb = getConfidence(b.source_data) ?? -1;
      return cb - ca;
    });
  }
  // alpha
  return arr.sort((a, b) => {
    const ta = String((a.source_data as Record<string, unknown>)['component_text'] ?? '');
    const tb = String((b.source_data as Record<string, unknown>)['component_text'] ?? '');
    return ta.localeCompare(tb);
  });
}

function filterBySearch(items: KnowledgeGapSubmission[], q: string): KnowledgeGapSubmission[] {
  if (!q.trim()) return items;
  const lq = q.toLowerCase();
  return items.filter((s) => {
    const ct = String((s.source_data as Record<string, unknown>)['component_text'] ?? '');
    return ct.toLowerCase().includes(lq);
  });
}

// ── Filter bar component ──────────────────────────────────────────────────────

interface FilterBarProps {
  confFilter: ConfFilter;
  onConfFilter: (f: ConfFilter) => void;
  sortOrder: SortOrder;
  onSortOrder: (s: SortOrder) => void;
  categoryFilter: string[];
  onCategoryFilter: (cats: string[]) => void;
  availableCategories: string[];
  extraFilter?: React.ReactNode;
  totalVisible: number;
  totalSelected: number;
}

function FilterBar({
  confFilter, onConfFilter,
  sortOrder, onSortOrder,
  categoryFilter, onCategoryFilter,
  availableCategories,
  extraFilter,
  totalVisible, totalSelected,
}: FilterBarProps) {
  const confLabels: Record<ConfFilter, string> = {
    all: 'All', green: 'Green (≥85%)', yellow: 'Yellow (65-84%)', red: 'Red (<65%)',
  };
  const sortLabels: Record<SortOrder, string> = {
    conf_asc: 'Confidence (low first)', conf_desc: 'Confidence (high first)', alpha: 'A-Z',
  };

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-5 py-2 flex flex-wrap items-center gap-3 text-xs">
      <span className="text-[#4F4F4F] font-medium">Filter:</span>

      {/* Confidence filter */}
      <div className="flex items-center gap-1">
        {(['all', 'green', 'yellow', 'red'] as ConfFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onConfFilter(f)}
            className={`px-2 py-0.5 rounded text-xs border transition-colors ${
              confFilter === f
                ? 'bg-[#2A2A2A] text-white border-[#2A2A2A]'
                : 'bg-white text-[#4F4F4F] border-gray-200 hover:bg-gray-100'
            }`}
          >
            {confLabels[f]}
          </button>
        ))}
      </div>

      {/* Category filter */}
      {availableCategories.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-[#4F4F4F]">Category:</span>
          <select
            multiple
            value={categoryFilter}
            onChange={(e) => {
              const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
              onCategoryFilter(vals);
            }}
            className="border border-gray-200 rounded px-1 py-0 text-xs text-[#2A2A2A] bg-white max-h-12"
          >
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {categoryFilter.length > 0 && (
            <button
              type="button"
              onClick={() => onCategoryFilter([])}
              className="text-xs text-[#7FAEC2] hover:underline"
            >
              clear
            </button>
          )}
        </div>
      )}

      {/* Extra filter slot (by-parent-HEAD for Tails) */}
      {extraFilter}

      {/* Sort */}
      <div className="flex items-center gap-1 ml-auto">
        <span className="text-[#4F4F4F]">Sort:</span>
        <select
          value={sortOrder}
          onChange={(e) => onSortOrder(e.target.value as SortOrder)}
          className="border border-gray-200 rounded px-1 py-0.5 text-xs text-[#2A2A2A] bg-white"
        >
          {(Object.entries(sortLabels) as [SortOrder, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Selection counter */}
      {totalSelected > 0 && (
        <span className="text-blue-700 font-medium ml-1">
          {totalSelected} selected{totalVisible !== totalSelected ? `, ${totalVisible} visible` : ''}
        </span>
      )}
    </div>
  );
}

// ── Table 1: Tails Queue row ──────────────────────────────────────────────────

interface TailRowProps {
  sub: KnowledgeGapSubmission;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onActionComplete: (updated: KnowledgeGapSubmission, action: 'tail_approved' | 'moved_to_head' | 'archived' | 'deferred') => void;
  onParentSelected: (id: string, parent: ParentClusterLabelResult | null) => void;
}

function TailRow({ sub, selected, onToggleSelect, onActionComplete, onParentSelected }: TailRowProps) {
  const sd = sub.source_data as Record<string, unknown>;
  const componentText = String(sd['component_text'] ?? '');
  const suggestedParentId = sd['suggested_parent_id'] as string | null;
  const llm = getLlmSuggestion(sub.source_data);
  const suggestedParentCanonical = llm ? (llm['suggested_parent_head_canonical'] as string | null) : null;
  const confidence = getConfidence(sub.source_data);

  const [selectedParent, setSelectedParent] = useState<ParentClusterLabelResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleParentSelect(parent: ParentClusterLabelResult | null) {
    setSelectedParent(parent);
    onParentSelected(sub.id, parent);
  }

  async function handleAddAsTail() {
    if (!selectedParent) return;
    setError(null);
    setSubmitting(true);
    const res = await approveKnowledgeGapAsTail(sub.id, selectedParent.id);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    if (res.data) onActionComplete(res.data, 'tail_approved');
  }

  async function handleMoveToHead() {
    setError(null);
    setSubmitting(true);
    const res = await setKnowledgeGapPlacement(sub.id, 'new_head');
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    if (res.data) onActionComplete(res.data, 'moved_to_head');
  }

  async function handleArchive() {
    setError(null);
    setSubmitting(true);
    const res = await archiveKnowledgeGapSubmission(sub.id);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    if (res.data) onActionComplete(res.data, 'archived');
  }

  function handleDefer() {
    onActionComplete(sub, 'deferred');
  }

  return (
    <tr className={`border-b border-blue-50 hover:bg-blue-50/30 ${selected ? 'bg-blue-50' : ''}`}>
      <td className="px-3 py-2 align-middle">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(sub.id)}
          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label={`Select ${componentText}`}
        />
      </td>
      <td className="px-3 py-2 text-sm font-mono text-[#2A2A2A] break-all align-top min-w-[140px]">
        {componentText}
      </td>
      <td className="px-3 py-2 align-top min-w-[220px]">
        <ParentDropdown
          initialParentId={suggestedParentId ?? null}
          initialParentCanonical={suggestedParentCanonical ?? null}
          onSelect={handleParentSelect}
          disabled={submitting}
        />
        {!selectedParent && (
          <p className="text-xs text-gray-400 mt-0.5">No parent selected</p>
        )}
      </td>
      <td className="px-3 py-2 align-top text-center">
        <ConfidenceBadge confidence={confidence} />
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Approve as tail */}
          <button
            type="button"
            onClick={handleAddAsTail}
            disabled={submitting || !selectedParent}
            title="Approve / Add as tail"
            className="text-base leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? '...' : '✅'}
          </button>
          {/* Move to HEAD (first-class, per Justin) */}
          <button
            type="button"
            onClick={handleMoveToHead}
            disabled={submitting}
            title="Move to HEAD Queue"
            className="text-base leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⬇️
          </button>
          {/* Archive */}
          <button
            type="button"
            onClick={handleArchive}
            disabled={submitting}
            title="Archive (noise/garbage, recoverable)"
            className="text-base leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📦
          </button>
          {/* Defer */}
          <button
            type="button"
            onClick={handleDefer}
            disabled={submitting}
            title="Defer (reappears in queue later)"
            className="text-base leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ❓
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </td>
    </tr>
  );
}

// ── Table 2: HEAD Queue row ───────────────────────────────────────────────────

interface HeadRowProps {
  sub: KnowledgeGapSubmission;
  onActionComplete: (updated: KnowledgeGapSubmission, action: 'approved' | 'archived' | 'deferred' | 'moved_to_tail') => void;
}

function HeadRow({ sub, onActionComplete }: HeadRowProps) {
  const sd = sub.source_data as Record<string, unknown>;
  const llm = getLlmSuggestion(sub.source_data);
  const componentText = String(sd['component_text'] ?? '');
  const confidence = getConfidence(sub.source_data);

  const [canonical, setCanonical] = useState(String(llm?.['suggested_canonical'] ?? ''));
  const [category, setCategory] = useState(String(llm?.['suggested_category'] ?? ''));
  const [formType, setFormType] = useState(String(llm?.['suggested_form_type'] ?? ''));
  const [compoundType, setCompoundType] = useState(String(llm?.['suggested_compound_type'] ?? ''));
  const [canonicalEdited, setCanonicalEdited] = useState(false);
  const [categoryEdited, setCategoryEdited] = useState(false);
  const [formTypeEdited, setFormTypeEdited] = useState(false);
  const [compoundTypeEdited, setCompoundTypeEdited] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const haiku_category = String(llm?.['suggested_category'] ?? '');
  const haiku_form_type = String(llm?.['suggested_form_type'] ?? '');
  const haiku_compound_type = String(llm?.['suggested_compound_type'] ?? '');

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    const editedData: KnowledgeGapEditedData = {};
    if (canonical.trim()) editedData.suggested_canonical = canonical.trim();
    if (category) editedData.suggested_category = category;
    if (formType) editedData.suggested_form_type = formType;
    editedData.suggested_compound_type = compoundType
      ? (compoundType as 'identity' | 'modified' | 'true')
      : null;
    const res = await approveKnowledgeGapSubmission(sub.id, editedData);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    if (res.data) onActionComplete(res.data, 'approved');
  }

  async function handleArchive() {
    setError(null);
    setSubmitting(true);
    const res = await archiveKnowledgeGapSubmission(sub.id);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    if (res.data) onActionComplete(res.data, 'archived');
  }

  function handleDefer() {
    setDeferred(true);
    onActionComplete(sub, 'deferred');
  }

  async function handleMoveToTail() {
    setError(null);
    setSubmitting(true);
    const res = await setKnowledgeGapPlacement(sub.id, 'tail_to_existing_head');
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    if (res.data) onActionComplete(res.data, 'moved_to_tail');
  }

  if (deferred) return null;

  return (
    <tr className="border-b border-green-50 hover:bg-green-50/30">
      {/* Candidate */}
      <td className="px-3 py-2 text-sm font-mono text-[#2A2A2A] break-all align-top min-w-[120px]">
        {componentText}
      </td>

      {/* Canonical */}
      <td className="px-2 py-2 align-top min-w-[160px]">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={canonical}
            onChange={(e) => { setCanonical(e.target.value); setCanonicalEdited(true); }}
            disabled={submitting}
            placeholder="Canonical..."
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-[#2A2A2A] bg-white focus:outline-none focus:ring-1 focus:ring-[#7FAEC2] disabled:bg-gray-50"
            spellCheck={false}
          />
          <div className="flex items-center gap-0.5 shrink-0">
            {canonicalEdited
              ? <Pencil size={10} className="text-[#7FAEC2]" />
              : <ConfidenceDot confidence={confidence} />
            }
          </div>
        </div>
      </td>

      {/* Category (portal select) */}
      <td className="px-2 py-2 align-top min-w-[120px]">
        <div className="flex items-center gap-1">
          <PortalSelect
            value={category}
            onChange={(v) => { setCategory(v); setCategoryEdited(v !== haiku_category); }}
            disabled={submitting}
            options={CATEGORY_OPTIONS as unknown as string[]}
            placeholder="(category)"
            className={categoryEdited ? 'border-[#7FAEC2]' : 'border-gray-200'}
          />
          <div className="shrink-0">
            {categoryEdited
              ? <Pencil size={10} className="text-[#7FAEC2]" />
              : <ConfidenceDot confidence={confidence} />
            }
          </div>
        </div>
      </td>

      {/* Form type (portal select) */}
      <td className="px-2 py-2 align-top min-w-[130px]">
        <div className="flex items-center gap-1">
          <PortalSelect
            value={formType}
            onChange={(v) => { setFormType(v); setFormTypeEdited(v !== haiku_form_type); }}
            disabled={submitting}
            options={FORM_TYPE_OPTIONS as unknown as string[]}
            placeholder="(form type)"
            className={formTypeEdited ? 'border-[#7FAEC2]' : 'border-gray-200'}
          />
          <div className="shrink-0">
            {formTypeEdited
              ? <Pencil size={10} className="text-[#7FAEC2]" />
              : <ConfidenceDot confidence={confidence} />
            }
          </div>
        </div>
      </td>

      {/* Compound type (portal select) */}
      <td className="px-2 py-2 align-top min-w-[110px]">
        <div className="flex items-center gap-1">
          <PortalSelect
            value={compoundType}
            onChange={(v) => { setCompoundType(v); setCompoundTypeEdited(v !== haiku_compound_type); }}
            disabled={submitting}
            options={COMPOUND_TYPE_OPTIONS as unknown as Array<{ value: string; label: string }>}
            placeholder="(none)"
            className={compoundTypeEdited ? 'border-[#7FAEC2]' : 'border-gray-200'}
          />
          <div className="shrink-0">
            {compoundTypeEdited
              ? <Pencil size={10} className="text-[#7FAEC2]" />
              : <ConfidenceDot confidence={confidence} />
            }
          </div>
        </div>
      </td>

      {/* Actions (single-line emoji row) */}
      <td className="px-2 py-2 align-top">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting}
            title="Approve as new HEAD"
            className="text-base leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? '...' : '✅'}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={submitting}
            title="Archive (noise/garbage, recoverable)"
            className="text-base leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📦
          </button>
          <button
            type="button"
            onClick={handleDefer}
            disabled={submitting}
            title="Defer (reappears in queue later)"
            className="text-base leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ❓
          </button>
          <button
            type="button"
            onClick={handleMoveToTail}
            disabled={submitting}
            title="Move to Tails Queue"
            className="text-base leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⬆️
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </td>
    </tr>
  );
}

// ── History section ───────────────────────────────────────────────────────────

interface HistorySectionProps {
  onRefreshPending: () => void;
}

function HistorySection({ onRefreshPending }: HistorySectionProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<KnowledgeGapHistoryRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<'all' | 'approved_as_tail' | 'approved_as_new_head' | 'archived' | 'restored'>('all');

  async function loadHistory(newOffset: number, append: boolean) {
    setLoading(true);
    setLoadError(null);
    const res = await listKnowledgeGapHistory(HISTORY_PAGE_SIZE, newOffset);
    setLoading(false);
    if (res.error) { setLoadError(res.error); return; }
    if (res.data) {
      setTotalCount(res.data.total_count);
      setRows((prev) => append ? [...prev, ...res.data!.history] : res.data!.history);
      setOffset(newOffset + res.data.history.length);
    }
  }

  useEffect(() => {
    if (open && rows.length === 0) {
      loadHistory(0, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleUndo(row: KnowledgeGapHistoryRow) {
    const confirmed = window.confirm(
      `Undo tail approval? This removes "${row.candidate_text}" from the parent cluster and returns the submission to pending.`
    );
    if (!confirmed) return;

    setUndoingId(row.id);
    const res = await undoKnowledgeGapTail(row.id);
    setUndoingId(null);

    if (res.error) {
      showToast(`Undo failed: ${res.error}`);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setTotalCount((c) => c - 1);
    onRefreshPending();
    showToast('Tail approval undone. Submission returned to pending.');
  }

  async function handleRestore(row: KnowledgeGapHistoryRow) {
    setRestoringId(row.id);
    const res = await restoreKnowledgeGapSubmission(row.id);
    setRestoringId(null);

    if (res.error) {
      showToast(`Restore failed: ${res.error}`);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setTotalCount((c) => c - 1);
    onRefreshPending();
    showToast('Archived submission restored to pending queue.');
  }

  function actionClass(action: KnowledgeGapHistoryRow['action']): string {
    if (action === 'approved_as_tail') return 'text-green-700 bg-green-50';
    if (action === 'approved_as_new_head') return 'text-blue-700 bg-blue-50';
    if (action === 'archived') return 'text-gray-500 bg-gray-50';
    return 'text-gray-500 bg-gray-50';
  }

  function actionLabel(action: KnowledgeGapHistoryRow['action']): string {
    if (action === 'approved_as_tail') return 'tail';
    if (action === 'approved_as_new_head') return 'new HEAD';
    if (action === 'archived') return 'archived';
    return action;
  }

  const filteredRows = actionFilter === 'all'
    ? rows
    : rows.filter((r) => r.action === actionFilter);

  return (
    <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <h2 className="text-base font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            History
          </h2>
          <p className="text-xs text-[#4F4F4F] mt-0.5">
            Resolved submissions (approved and archived). Tail approvals can be undone. Archived rows can be restored.
          </p>
        </div>
        <div className="shrink-0 ml-4">
          {open ? <ChevronDown size={16} className="text-[#4F4F4F]" /> : <ChevronRight size={16} className="text-[#4F4F4F]" />}
        </div>
      </button>

      {open && (
        <div className="bg-white">
          {toast && (
            <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-700">
              {toast}
            </div>
          )}

          {/* Action filter */}
          <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-2 text-xs">
            <span className="text-[#4F4F4F]">Show:</span>
            {(['all', 'approved_as_tail', 'approved_as_new_head', 'archived'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActionFilter(f)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  actionFilter === f
                    ? 'bg-[#2A2A2A] text-white border-[#2A2A2A]'
                    : 'bg-white text-[#4F4F4F] border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'All' : f === 'approved_as_tail' ? 'Tail' : f === 'approved_as_new_head' ? 'New HEAD' : 'Archived'}
              </button>
            ))}
          </div>

          {loadError && (
            <div className="px-5 py-3 bg-red-50 border-b border-red-200 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {loading && rows.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-[#4F4F4F]">Loading...</div>
          )}

          {!loading && rows.length === 0 && !loadError && (
            <div className="px-5 py-8 text-center text-sm text-[#4F4F4F]">No resolved submissions yet.</div>
          )}

          {filteredRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Candidate', 'Action', 'Parent HEAD', 'Reviewer', 'Timestamp', 'Notes', ''].map((col) => (
                      <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-[#4F4F4F] uppercase tracking-wide whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/40 ${row.action === 'archived' ? 'opacity-60' : ''}`}
                    >
                      <td className="px-3 py-2 text-xs font-mono text-[#2A2A2A] break-all max-w-[160px]">
                        {row.candidate_text ?? '(unknown)'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${actionClass(row.action)}`}>
                          {actionLabel(row.action)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-[#4F4F4F]">
                        {row.parent_canonical ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-[#4F4F4F]">
                        {row.reviewed_by ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-[#4F4F4F] whitespace-nowrap">
                        {row.reviewed_at ? new Date(row.reviewed_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-[#4F4F4F] max-w-[160px] truncate" title={row.review_notes ?? undefined}>
                        {row.review_notes ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-2 flex items-center gap-1">
                        {row.action === 'approved_as_tail' && (
                          <button
                            type="button"
                            onClick={() => handleUndo(row)}
                            disabled={undoingId === row.id}
                            title="Undo tail approval (↩️)"
                            className="p-1 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-40"
                          >
                            <Undo2 size={14} />
                          </button>
                        )}
                        {row.action === 'archived' && (
                          <button
                            type="button"
                            onClick={() => handleRestore(row)}
                            disabled={restoringId === row.id}
                            title="Restore from archive (↩️)"
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length < totalCount && (
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => loadHistory(offset, true)}
                disabled={loading}
                className="px-4 py-1.5 rounded text-xs font-medium border border-gray-200 text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-40"
              >
                {loading ? 'Loading...' : `Load more (${totalCount - rows.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function QMAdminKnowledgeGapFiller() {
  const [allSubmissions, setAllSubmissions] = useState<KnowledgeGapSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Collapsible state (default: expanded)
  const [tailsOpen, setTailsOpen] = useState(true);
  const [headOpen, setHeadOpen] = useState(true);

  // Tail table state
  const [tailSearch, setTailSearch] = useState('');
  const [tailPage, setTailPage] = useState(1);
  const [tailConfFilter, setTailConfFilter] = useState<ConfFilter>('all');
  const [tailCategoryFilter, setTailCategoryFilter] = useState<string[]>([]);
  const [tailSortOrder, setTailSortOrder] = useState<SortOrder>('conf_asc');
  const [tailParentFilter, setTailParentFilter] = useState('');

  // Head table state
  const [headSearch, setHeadSearch] = useState('');
  const [headPage, setHeadPage] = useState(1);
  const [headConfFilter, setHeadConfFilter] = useState<ConfFilter>('all');
  const [headCategoryFilter, setHeadCategoryFilter] = useState<string[]>([]);
  const [headSortOrder, setHeadSortOrder] = useState<SortOrder>('conf_asc');

  // Multi-select state: G4 - selected set is independent of filter
  const [selectedTailIds, setSelectedTailIds] = useState<Set<string>>(new Set());
  const [selectedHeadIds, setSelectedHeadIds] = useState<Set<string>>(new Set());
  // Map from submission id to the currently-selected parent in its dropdown
  const [tailParentMap, setTailParentMap] = useState<Map<string, ParentClusterLabelResult>>(new Map());

  // Bulk action state
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkToast, setBulkToast] = useState<string | null>(null);
  const [headBulkSubmitting, setHeadBulkSubmitting] = useState(false);
  const [headBulkToast, setHeadBulkToast] = useState<string | null>(null);

  async function loadSubmissions() {
    setLoading(true);
    setLoadError(null);
    const res = await listKnowledgeGapSubmissions('pending', showArchived);
    setLoading(false);
    if (res.error) { setLoadError(res.error); return; }
    setAllSubmissions(res.data ?? []);
    setSelectedTailIds(new Set());
    setSelectedHeadIds(new Set());
  }

  useEffect(() => { loadSubmissions(); }, [showArchived]); // eslint-disable-line react-hooks/exhaustive-deps

  // Partition into tail and head queues
  const tailItems = allSubmissions.filter(
    (s) => getPlacement(s.source_data) === 'tail_to_existing_head'
  );
  const headItems = allSubmissions.filter(
    (s) => getPlacement(s.source_data) === 'new_head'
  );

  // Derive available categories for filter dropdowns
  const tailCategories = Array.from(new Set(tailItems.map((s) => getCategory(s.source_data)).filter(Boolean))).sort();
  const headCategories = Array.from(new Set(headItems.map((s) => getCategory(s.source_data)).filter(Boolean))).sort();

  // Distinct proposed parent canonicals for by-parent-HEAD tails filter
  const tailParentOptions = Array.from(new Set(
    tailItems.map((s) => {
      const llm = getLlmSuggestion(s.source_data);
      return llm ? (llm['suggested_parent_head_canonical'] as string | null) : null;
    }).filter((p): p is string => Boolean(p))
  )).sort();

  // Apply filters + sort (G4: filters are display-only, selection persists)
  function applyTailFilters(items: KnowledgeGapSubmission[]) {
    let r = filterBySearch(items, tailSearch);
    r = applyConfFilter(r, tailConfFilter);
    if (tailCategoryFilter.length > 0) {
      r = r.filter((s) => tailCategoryFilter.includes(getCategory(s.source_data)));
    }
    if (tailParentFilter) {
      r = r.filter((s) => {
        const llm = getLlmSuggestion(s.source_data);
        const parent = llm ? (llm['suggested_parent_head_canonical'] as string | null) : null;
        return parent === tailParentFilter;
      });
    }
    return applySort(r, tailSortOrder);
  }

  function applyHeadFilters(items: KnowledgeGapSubmission[]) {
    let r = filterBySearch(items, headSearch);
    r = applyConfFilter(r, headConfFilter);
    if (headCategoryFilter.length > 0) {
      r = r.filter((s) => headCategoryFilter.includes(getCategory(s.source_data)));
    }
    return applySort(r, headSortOrder);
  }

  const filteredTail = applyTailFilters(tailItems);
  const filteredHead = applyHeadFilters(headItems);

  // Paginate
  const pagedTail = filteredTail.slice((tailPage - 1) * PAGE_SIZE, tailPage * PAGE_SIZE);
  const pagedHead = filteredHead.slice((headPage - 1) * PAGE_SIZE, headPage * PAGE_SIZE);

  // Multi-select helpers - Tails
  const visibleTailIds = pagedTail.map((s) => s.id);
  const allVisibleTailSelected = visibleTailIds.length > 0 && visibleTailIds.every((id) => selectedTailIds.has(id));
  const someVisibleTailSelected = visibleTailIds.some((id) => selectedTailIds.has(id));
  const tailIndeterminate = someVisibleTailSelected && !allVisibleTailSelected;

  function handleToggleTailId(id: string) {
    setSelectedTailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function handleSelectAllVisibleTail(checked: boolean) {
    setSelectedTailIds((prev) => {
      const next = new Set(prev);
      if (checked) { visibleTailIds.forEach((id) => next.add(id)); }
      else { visibleTailIds.forEach((id) => next.delete(id)); }
      return next;
    });
  }

  // Multi-select helpers - HEAD
  const visibleHeadIds = pagedHead.map((s) => s.id);
  const allVisibleHeadSelected = visibleHeadIds.length > 0 && visibleHeadIds.every((id) => selectedHeadIds.has(id));
  const someVisibleHeadSelected = visibleHeadIds.some((id) => selectedHeadIds.has(id));
  const headIndeterminate = someVisibleHeadSelected && !allVisibleHeadSelected;

  function handleToggleHeadId(id: string) {
    setSelectedHeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function handleSelectAllVisibleHead(checked: boolean) {
    setSelectedHeadIds((prev) => {
      const next = new Set(prev);
      if (checked) { visibleHeadIds.forEach((id) => next.add(id)); }
      else { visibleHeadIds.forEach((id) => next.delete(id)); }
      return next;
    });
  }

  function handleParentSelected(subId: string, parent: ParentClusterLabelResult | null) {
    setTailParentMap((prev) => {
      const next = new Map(prev);
      if (parent) { next.set(subId, parent); } else { next.delete(subId); }
      return next;
    });
  }

  function showBulkToast(msg: string) {
    setBulkToast(msg);
    setTimeout(() => setBulkToast(null), 4000);
  }

  function showHeadBulkToast(msg: string) {
    setHeadBulkToast(msg);
    setTimeout(() => setHeadBulkToast(null), 4000);
  }

  // Tails bulk operations
  async function handleBulkTailApprove() {
    const approvals = Array.from(selectedTailIds)
      .map((id) => {
        const parent = tailParentMap.get(id);
        if (!parent) return null;
        return { id, parent_cluster_label_id: parent.id };
      })
      .filter((a): a is { id: string; parent_cluster_label_id: string } => a !== null);

    if (approvals.length === 0) {
      showBulkToast('No rows have a parent selected. Select parents first.');
      return;
    }

    setBulkSubmitting(true);
    const res = await bulkApproveAsTail(approvals);
    setBulkSubmitting(false);

    if (res.error) { showBulkToast(`Bulk approve failed: ${res.error}`); return; }

    if (res.data) {
      const { approved, failed } = res.data;
      setAllSubmissions((prev) => prev.filter((s) => !approved.includes(s.id)));
      setSelectedTailIds((prev) => {
        const next = new Set(prev);
        approved.forEach((id) => next.delete(id));
        return next;
      });
      if (failed.length > 0) {
        showBulkToast(`Approved ${approved.length}, failed ${failed.length}: ${failed.map((f) => f.error).join(', ')}`);
      } else {
        showBulkToast(`Approved ${approved.length} tail${approved.length !== 1 ? 's' : ''} successfully.`);
      }
    }
  }

  async function handleBulkTailArchive() {
    const ids = Array.from(selectedTailIds);
    if (ids.length === 0) return;
    setBulkSubmitting(true);
    const res = await bulkArchiveKnowledgeGap(ids);
    setBulkSubmitting(false);
    if (res.error) { showBulkToast(`Bulk archive failed: ${res.error}`); return; }
    if (res.data) {
      const { archived, failed } = res.data;
      setAllSubmissions((prev) => prev.filter((s) => !archived.includes(s.id)));
      setSelectedTailIds((prev) => {
        const next = new Set(prev); archived.forEach((id) => next.delete(id)); return next;
      });
      showBulkToast(failed.length > 0
        ? `Archived ${archived.length}, failed ${failed.length}.`
        : `Archived ${archived.length} submission${archived.length !== 1 ? 's' : ''}.`);
    }
  }

  // FIRST-CLASS: Bulk move Tails -> HEAD
  async function handleBulkMoveToHead() {
    const ids = Array.from(selectedTailIds);
    if (ids.length === 0) return;
    setBulkSubmitting(true);
    const res = await bulkMoveToHead(ids);
    setBulkSubmitting(false);
    if (res.error) { showBulkToast(`Bulk move to HEAD failed: ${res.error}`); return; }
    if (res.data) {
      const { moved, failed } = res.data;
      // Reload to get updated placement in source_data
      await loadSubmissions();
      showBulkToast(failed.length > 0
        ? `Moved ${moved.length} to HEAD, failed ${failed.length}.`
        : `Moved ${moved.length} submission${moved.length !== 1 ? 's' : ''} to HEAD Queue.`);
    }
  }

  function handleBulkTailDefer() {
    const ids = Array.from(selectedTailIds);
    setAllSubmissions((prev) => prev.filter((s) => !ids.includes(s.id)));
    setSelectedTailIds(new Set());
    showBulkToast(`Deferred ${ids.length} submission${ids.length !== 1 ? 's' : ''}.`);
  }

  // HEAD bulk operations
  async function handleBulkHeadArchive() {
    const ids = Array.from(selectedHeadIds);
    if (ids.length === 0) return;
    setHeadBulkSubmitting(true);
    const res = await bulkArchiveKnowledgeGap(ids);
    setHeadBulkSubmitting(false);
    if (res.error) { showHeadBulkToast(`Bulk archive failed: ${res.error}`); return; }
    if (res.data) {
      const { archived, failed } = res.data;
      setAllSubmissions((prev) => prev.filter((s) => !archived.includes(s.id)));
      setSelectedHeadIds((prev) => {
        const next = new Set(prev); archived.forEach((id) => next.delete(id)); return next;
      });
      showHeadBulkToast(failed.length > 0
        ? `Archived ${archived.length}, failed ${failed.length}.`
        : `Archived ${archived.length} submission${archived.length !== 1 ? 's' : ''}.`);
    }
  }

  // Bulk move HEAD -> Tails
  async function handleBulkMoveToTail() {
    const ids = Array.from(selectedHeadIds);
    if (ids.length === 0) return;
    setHeadBulkSubmitting(true);
    // Move each individually via set_placement (no bulk endpoint for this direction)
    let ok = 0; let fail = 0;
    for (const id of ids) {
      const res = await setKnowledgeGapPlacement(id, 'tail_to_existing_head');
      if (res.data) ok++;
      else fail++;
    }
    await loadSubmissions();
    setHeadBulkSubmitting(false);
    showHeadBulkToast(fail > 0
      ? `Moved ${ok} to Tails, failed ${fail}.`
      : `Moved ${ok} submission${ok !== 1 ? 's' : ''} to Tails Queue.`);
  }

  function handleBulkHeadDefer() {
    const ids = Array.from(selectedHeadIds);
    setAllSubmissions((prev) => prev.filter((s) => !ids.includes(s.id)));
    setSelectedHeadIds(new Set());
    showHeadBulkToast(`Deferred ${ids.length} submission${ids.length !== 1 ? 's' : ''}.`);
  }

  function handleTailAction(updated: KnowledgeGapSubmission, action: 'tail_approved' | 'moved_to_head' | 'archived' | 'deferred') {
    if (action === 'tail_approved' || action === 'archived' || action === 'deferred') {
      setAllSubmissions((prev) => prev.filter((s) => s.id !== updated.id));
      setSelectedTailIds((prev) => { const n = new Set(prev); n.delete(updated.id); return n; });
    } else {
      setAllSubmissions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    }
  }

  function handleHeadAction(
    updated: KnowledgeGapSubmission,
    action: 'approved' | 'archived' | 'deferred' | 'moved_to_tail'
  ) {
    if (action === 'deferred' || action === 'approved' || action === 'archived') {
      setAllSubmissions((prev) => prev.filter((s) => s.id !== updated.id));
      setSelectedHeadIds((prev) => { const n = new Set(prev); n.delete(updated.id); return n; });
    } else {
      // moved_to_tail: update placement, moves between queues
      setAllSubmissions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    }
  }

  // Action bar for Tails multi-select
  const tailVisibleSelected = visibleTailIds.filter((id) => selectedTailIds.has(id)).length;
  const tailActionBar = selectedTailIds.size > 0 ? (
    <div className="bg-blue-50 border-t border-blue-100 px-5 py-2.5 flex flex-wrap items-center gap-2">
      {bulkToast ? (
        <span className="text-xs text-blue-700 font-medium">{bulkToast}</span>
      ) : (
        <>
          <span className="text-xs text-blue-700 font-medium">
            {selectedTailIds.size} selected{tailVisibleSelected !== selectedTailIds.size ? `, ${tailVisibleSelected} visible` : ''}
          </span>
          {/* FIRST-CLASS: Bulk move to HEAD */}
          <button
            type="button"
            onClick={handleBulkMoveToHead}
            disabled={bulkSubmitting}
            className="px-3 py-1 rounded text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center gap-1"
            title="Move selected to HEAD Queue"
          >
            <ArrowDown size={12} />
            {bulkSubmitting ? '...' : `Move ${selectedTailIds.size} to HEAD`}
          </button>
          <button
            type="button"
            onClick={handleBulkTailApprove}
            disabled={bulkSubmitting}
            className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {bulkSubmitting ? '...' : `Approve ${selectedTailIds.size} as tail`}
          </button>
          <button
            type="button"
            onClick={handleBulkTailArchive}
            disabled={bulkSubmitting}
            className="px-3 py-1 rounded text-xs font-semibold border border-gray-300 text-[#4F4F4F] hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            📦 Archive
          </button>
          <button
            type="button"
            onClick={handleBulkTailDefer}
            disabled={bulkSubmitting}
            className="px-3 py-1 rounded text-xs font-semibold border border-gray-200 text-[#4F4F4F] hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            ❓ Defer
          </button>
          <button
            type="button"
            onClick={() => setSelectedTailIds(new Set())}
            disabled={bulkSubmitting}
            className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            clear
          </button>
        </>
      )}
    </div>
  ) : bulkToast ? (
    <div className="bg-blue-50 border-t border-blue-100 px-5 py-2 text-xs text-blue-700">{bulkToast}</div>
  ) : undefined;

  // Action bar for HEAD multi-select
  const headVisibleSelected = visibleHeadIds.filter((id) => selectedHeadIds.has(id)).length;
  const headActionBar = selectedHeadIds.size > 0 ? (
    <div className="bg-green-50 border-t border-green-100 px-5 py-2.5 flex flex-wrap items-center gap-2">
      {headBulkToast ? (
        <span className="text-xs text-green-700 font-medium">{headBulkToast}</span>
      ) : (
        <>
          <span className="text-xs text-green-700 font-medium">
            {selectedHeadIds.size} selected{headVisibleSelected !== selectedHeadIds.size ? `, ${headVisibleSelected} visible` : ''}
          </span>
          <button
            type="button"
            onClick={handleBulkMoveToTail}
            disabled={headBulkSubmitting}
            className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-1"
            title="Move selected to Tails Queue"
          >
            <ArrowUp size={12} />
            {headBulkSubmitting ? '...' : `Move ${selectedHeadIds.size} to Tails`}
          </button>
          <button
            type="button"
            onClick={handleBulkHeadArchive}
            disabled={headBulkSubmitting}
            className="px-3 py-1 rounded text-xs font-semibold border border-gray-300 text-[#4F4F4F] hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            📦 Archive
          </button>
          <button
            type="button"
            onClick={handleBulkHeadDefer}
            disabled={headBulkSubmitting}
            className="px-3 py-1 rounded text-xs font-semibold border border-gray-200 text-[#4F4F4F] hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            ❓ Defer
          </button>
          <button
            type="button"
            onClick={() => setSelectedHeadIds(new Set())}
            disabled={headBulkSubmitting}
            className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            clear
          </button>
        </>
      )}
    </div>
  ) : headBulkToast ? (
    <div className="bg-green-50 border-t border-green-100 px-5 py-2 text-xs text-green-700">{headBulkToast}</div>
  ) : undefined;

  // Header checkboxes
  const tailSelectAllHeader = (
    <th className="px-3 py-2 w-8">
      <input
        type="checkbox"
        checked={allVisibleTailSelected}
        ref={(el) => { if (el) el.indeterminate = tailIndeterminate; }}
        onChange={(e) => handleSelectAllVisibleTail(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        aria-label="Select all visible"
      />
    </th>
  );

  const headSelectAllHeader = (
    <th className="px-3 py-2 w-8">
      <input
        type="checkbox"
        checked={allVisibleHeadSelected}
        ref={(el) => { if (el) el.indeterminate = headIndeterminate; }}
        onChange={(e) => handleSelectAllVisibleHead(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
        aria-label="Select all visible"
      />
    </th>
  );

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[#2A2A2A] mb-1"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Knowledge Gap Filler
          </h1>
          <p className="text-sm text-[#4F4F4F]">
            Two-queue review: tail variants get appended to existing corpus clusters; new concepts create new HEAD entries.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#4F4F4F] cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300"
          />
          Show archived
        </label>
      </div>

      <div className="space-y-8">
        {/* ─ Table 1: Tails Queue ─ */}
        <div className="rounded-xl border-2 border-blue-200 overflow-hidden">
          {/* Collapsible header */}
          <button
            type="button"
            onClick={() => setTailsOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-blue-50 px-5 py-4 hover:bg-blue-100/50 transition-colors text-left"
          >
            <div>
              <h2 className="text-base font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Tails Queue
              </h2>
              <p className="text-xs text-[#4F4F4F] mt-0.5">
                Terms where Haiku suggests tailing to an existing corpus HEAD.
                Select the parent and click add, or move to HEAD if the placement is wrong.
              </p>
            </div>
            <div className="shrink-0 ml-4">
              {tailsOpen ? <ChevronDown size={16} className="text-[#4F4F4F]" /> : <ChevronRight size={16} className="text-[#4F4F4F]" />}
            </div>
          </button>

          {tailsOpen && (
            <>
              {/* Search bar */}
              <div className="bg-white px-5 py-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={tailSearch}
                    onChange={(e) => { setTailSearch(e.target.value); setTailPage(1); }}
                    placeholder="Filter by candidate string..."
                    className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm text-[#2A2A2A] focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
                  />
                  <span className="text-xs text-[#4F4F4F] shrink-0">{filteredTail.length} item{filteredTail.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Filter bar */}
              <FilterBar
                confFilter={tailConfFilter}
                onConfFilter={(f) => { setTailConfFilter(f); setTailPage(1); }}
                sortOrder={tailSortOrder}
                onSortOrder={(s) => { setTailSortOrder(s); setTailPage(1); }}
                categoryFilter={tailCategoryFilter}
                onCategoryFilter={(c) => { setTailCategoryFilter(c); setTailPage(1); }}
                availableCategories={tailCategories}
                totalVisible={filteredTail.length}
                totalSelected={selectedTailIds.size}
                extraFilter={tailParentOptions.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[#4F4F4F]">Parent HEAD:</span>
                    <select
                      value={tailParentFilter}
                      onChange={(e) => { setTailParentFilter(e.target.value); setTailPage(1); }}
                      className="border border-gray-200 rounded px-1 py-0.5 text-xs text-[#2A2A2A] bg-white"
                    >
                      <option value="">All parents</option>
                      {tailParentOptions.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                ) : undefined}
              />

              {tailActionBar}

              {loadError && (
                <div className="bg-red-50 border-t border-red-200 px-5 py-3 text-sm text-red-700">{loadError}</div>
              )}
              {loading && (
                <div className="bg-white px-5 py-6 text-center text-sm text-[#4F4F4F]">Loading...</div>
              )}
              {!loading && pagedTail.length === 0 && !loadError && (
                <div className="bg-white px-5 py-10 text-center text-sm text-[#4F4F4F]">No tail submissions pending.</div>
              )}
              {!loading && pagedTail.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {tailSelectAllHeader}
                        {['Candidate', 'Suggested Parent HEAD', 'Confidence', 'Actions'].map((col) => (
                          <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-[#4F4F4F] uppercase tracking-wide whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedTail.map((sub) => (
                        <TailRow
                          key={sub.id}
                          sub={sub}
                          selected={selectedTailIds.has(sub.id)}
                          onToggleSelect={handleToggleTailId}
                          onActionComplete={handleTailAction}
                          onParentSelected={handleParentSelected}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {Math.ceil(filteredTail.length / PAGE_SIZE) > 1 && (
                <div className="bg-white border-t border-gray-100 px-5 py-3 flex items-center gap-2">
                  <button type="button" onClick={() => setTailPage((p) => p - 1)} disabled={tailPage <= 1} className="px-3 py-1 rounded text-xs font-medium border border-gray-200 text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-40">Prev</button>
                  <span className="text-xs text-[#4F4F4F]">Page {tailPage} of {Math.ceil(filteredTail.length / PAGE_SIZE)}</span>
                  <button type="button" onClick={() => setTailPage((p) => p + 1)} disabled={tailPage >= Math.ceil(filteredTail.length / PAGE_SIZE)} className="px-3 py-1 rounded text-xs font-medium border border-gray-200 text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-40">Next</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─ Table 2: HEAD Queue ─ */}
        <div className="rounded-xl border-2 border-green-200 overflow-hidden">
          {/* Collapsible header */}
          <button
            type="button"
            onClick={() => setHeadOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-green-50 px-5 py-4 hover:bg-green-100/50 transition-colors text-left"
          >
            <div>
              <h2 className="text-base font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                HEAD Queue
              </h2>
              <p className="text-xs text-[#4F4F4F] mt-0.5">Novel terms that require a new corpus entry. Edit fields inline and approve to add to the corpus.</p>
            </div>
            <div className="shrink-0 ml-4">
              {headOpen ? <ChevronDown size={16} className="text-[#4F4F4F]" /> : <ChevronRight size={16} className="text-[#4F4F4F]" />}
            </div>
          </button>

          {headOpen && (
            <>
              {/* Search bar */}
              <div className="bg-white px-5 py-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={headSearch}
                    onChange={(e) => { setHeadSearch(e.target.value); setHeadPage(1); }}
                    placeholder="Filter by candidate string..."
                    className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm text-[#2A2A2A] focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
                  />
                  <span className="text-xs text-[#4F4F4F] shrink-0">{filteredHead.length} item{filteredHead.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Filter bar */}
              <FilterBar
                confFilter={headConfFilter}
                onConfFilter={(f) => { setHeadConfFilter(f); setHeadPage(1); }}
                sortOrder={headSortOrder}
                onSortOrder={(s) => { setHeadSortOrder(s); setHeadPage(1); }}
                categoryFilter={headCategoryFilter}
                onCategoryFilter={(c) => { setHeadCategoryFilter(c); setHeadPage(1); }}
                availableCategories={headCategories}
                totalVisible={filteredHead.length}
                totalSelected={selectedHeadIds.size}
              />

              {headActionBar}

              {loadError && (
                <div className="bg-red-50 border-t border-red-200 px-5 py-3 text-sm text-red-700">{loadError}</div>
              )}
              {loading && (
                <div className="bg-white px-5 py-6 text-center text-sm text-[#4F4F4F]">Loading...</div>
              )}
              {!loading && pagedHead.length === 0 && !loadError && (
                <div className="bg-white px-5 py-10 text-center text-sm text-[#4F4F4F]">No HEAD submissions pending.</div>
              )}
              {!loading && pagedHead.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {headSelectAllHeader}
                        {['Candidate', 'Canonical', 'Category', 'Form Type', 'Compound Type', 'Actions'].map((col) => (
                          <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-[#4F4F4F] uppercase tracking-wide whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedHead.map((sub) => (
                        <HeadRow
                          key={sub.id}
                          sub={sub}
                          onActionComplete={handleHeadAction}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {Math.ceil(filteredHead.length / PAGE_SIZE) > 1 && (
                <div className="bg-white border-t border-gray-100 px-5 py-3 flex items-center gap-2">
                  <button type="button" onClick={() => setHeadPage((p) => p - 1)} disabled={headPage <= 1} className="px-3 py-1 rounded text-xs font-medium border border-gray-200 text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-40">Prev</button>
                  <span className="text-xs text-[#4F4F4F]">Page {headPage} of {Math.ceil(filteredHead.length / PAGE_SIZE)}</span>
                  <button type="button" onClick={() => setHeadPage((p) => p + 1)} disabled={headPage >= Math.ceil(filteredHead.length / PAGE_SIZE)} className="px-3 py-1 rounded text-xs font-medium border border-gray-200 text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-40">Next</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* History section */}
        <HistorySection onRefreshPending={loadSubmissions} />
      </div>
    </div>
  );
}
