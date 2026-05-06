import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Undo2 } from 'lucide-react';
import {
  KnowledgeGapSubmission,
  KnowledgeGapEditedData,
  KnowledgeGapHistoryRow,
  ParentClusterLabelResult,
  listKnowledgeGapSubmissions,
  approveKnowledgeGapSubmission,
  rejectKnowledgeGapSubmission,
  approveKnowledgeGapAsTail,
  setKnowledgeGapPlacement,
  searchClusterLabelParents,
  bulkApproveAsTail,
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

function ConfidenceDot({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="no confidence data" />;
  }
  const color = confidence >= 0.85
    ? 'bg-green-500'
    : confidence >= 0.65
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
  const cls = confidence >= 0.85
    ? 'text-green-700 bg-green-50'
    : confidence >= 0.65
    ? 'text-yellow-700 bg-yellow-50'
    : 'text-red-700 bg-red-50';
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cls}`}>{pct}%</span>
  );
}

// ── Parent dropdown ───────────────────────────────────────────────────────────

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
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
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
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
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
        </div>
      )}
    </div>
  );
}

// ── Table 1: Tails Queue row ──────────────────────────────────────────────────

interface TailRowProps {
  sub: KnowledgeGapSubmission;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onActionComplete: (updated: KnowledgeGapSubmission, action: 'tail_approved' | 'moved_to_head') => void;
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
          initialParentCanonical={suggestedParentCanonical ?? (suggestedParentId ? null : null)}
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
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleAddAsTail}
            disabled={submitting || !selectedParent}
            className="px-3 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {submitting ? 'Saving...' : 'Add as tail'}
          </button>
          <button
            type="button"
            onClick={handleMoveToHead}
            disabled={submitting}
            aria-label="Move to new HEAD queue"
            className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-[#4F4F4F] hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
          >
            <ArrowDown size={12} />
            New HEAD
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </td>
    </tr>
  );
}

// ── Table 2: New HEAD Queue ───────────────────────────────────────────────────

interface HeadRowProps {
  sub: KnowledgeGapSubmission;
  onActionComplete: (updated: KnowledgeGapSubmission, action: 'approved' | 'rejected' | 'deferred' | 'moved_to_tail') => void;
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

  async function handleReject() {
    setError(null);
    setSubmitting(true);
    const res = await rejectKnowledgeGapSubmission(sub.id);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    if (res.data) onActionComplete(res.data, 'rejected');
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

      {/* Category */}
      <td className="px-2 py-2 align-top min-w-[120px]">
        <div className="flex items-center gap-1">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setCategoryEdited(e.target.value !== haiku_category); }}
            disabled={submitting}
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-[#2A2A2A] bg-white focus:outline-none focus:ring-1 focus:ring-[#7FAEC2] disabled:bg-gray-50"
          >
            <option value="">(category)</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="shrink-0">
            {categoryEdited
              ? <Pencil size={10} className="text-[#7FAEC2]" />
              : <ConfidenceDot confidence={confidence} />
            }
          </div>
        </div>
      </td>

      {/* Form type */}
      <td className="px-2 py-2 align-top min-w-[130px]">
        <div className="flex items-center gap-1">
          <select
            value={formType}
            onChange={(e) => { setFormType(e.target.value); setFormTypeEdited(e.target.value !== haiku_form_type); }}
            disabled={submitting}
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-[#2A2A2A] bg-white focus:outline-none focus:ring-1 focus:ring-[#7FAEC2] disabled:bg-gray-50"
          >
            <option value="">(form type)</option>
            {FORM_TYPE_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="shrink-0">
            {formTypeEdited
              ? <Pencil size={10} className="text-[#7FAEC2]" />
              : <ConfidenceDot confidence={confidence} />
            }
          </div>
        </div>
      </td>

      {/* Compound type */}
      <td className="px-2 py-2 align-top min-w-[110px]">
        <div className="flex items-center gap-1">
          <select
            value={compoundType}
            onChange={(e) => { setCompoundType(e.target.value); setCompoundTypeEdited(e.target.value !== haiku_compound_type); }}
            disabled={submitting}
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-[#2A2A2A] bg-white focus:outline-none focus:ring-1 focus:ring-[#7FAEC2] disabled:bg-gray-50"
          >
            {COMPOUND_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="shrink-0">
            {compoundTypeEdited
              ? <Pencil size={10} className="text-[#7FAEC2]" />
              : <ConfidenceDot confidence={confidence} />
            }
          </div>
        </div>
      </td>

      {/* Actions */}
      <td className="px-2 py-2 align-top">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="px-2.5 py-1 rounded text-xs font-semibold bg-[#A5CFDD] text-[#2A2A2A] hover:bg-[#7FAEC2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '...' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={submitting}
              className="px-2.5 py-1 rounded text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={handleDefer}
              disabled={submitting}
              className="px-2.5 py-1 rounded text-xs font-semibold text-[#4F4F4F] border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Defer
            </button>
          </div>
          <button
            type="button"
            onClick={handleMoveToTail}
            disabled={submitting}
            aria-label="Move to tails queue"
            className="px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-[#4F4F4F] hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
          >
            <ArrowUp size={12} />
            Tails
          </button>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Table wrapper ─────────────────────────────────────────────────────────────

interface TableSectionProps {
  title: string;
  description: string;
  accentClass: string;
  headerBgClass: string;
  items: KnowledgeGapSubmission[];
  totalCount: number;
  page: number;
  onPageChange: (p: number) => void;
  search: string;
  onSearchChange: (s: string) => void;
  loading: boolean;
  loadError: string | null;
  renderRow: (sub: KnowledgeGapSubmission) => React.ReactNode;
  columns: string[];
  emptyLabel: string;
  actionBar?: React.ReactNode;
}

function TableSection({
  title, description, accentClass, headerBgClass,
  items, totalCount, page, onPageChange,
  search, onSearchChange, loading, loadError,
  renderRow, columns, emptyLabel, actionBar,
}: TableSectionProps) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className={`rounded-xl border-2 ${accentClass} overflow-hidden`}>
      <div className={`${headerBgClass} px-5 py-4`}>
        <h2 className="text-base font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {title}
        </h2>
        <p className="text-xs text-[#4F4F4F] mt-0.5">{description}</p>
      </div>

      <div className="bg-white px-5 py-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter by candidate string..."
            className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm text-[#2A2A2A] focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
          />
          <span className="text-xs text-[#4F4F4F] shrink-0">{totalCount} item{totalCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {actionBar}

      {loadError && (
        <div className="bg-red-50 border-t border-red-200 px-5 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {loading && (
        <div className="bg-white px-5 py-6 text-center text-sm text-[#4F4F4F]">
          Loading...
        </div>
      )}

      {!loading && items.length === 0 && !loadError && (
        <div className="bg-white px-5 py-10 text-center text-sm text-[#4F4F4F]">
          {emptyLabel}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-[#4F4F4F] uppercase tracking-wide whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((sub) => renderRow(sub))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-100 px-5 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded text-xs font-medium border border-gray-200 text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-[#4F4F4F]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded text-xs font-medium border border-gray-200 text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
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
  const [toast, setToast] = useState<string | null>(null);

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

    // Remove from history list and refetch pending queue
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setTotalCount((c) => c - 1);
    onRefreshPending();
    showToast('Tail approval undone. Submission returned to pending.');
  }

  function actionClass(action: KnowledgeGapHistoryRow['action']): string {
    if (action === 'approved_as_tail') return 'text-green-700 bg-green-50';
    if (action === 'approved_as_new_head') return 'text-blue-700 bg-blue-50';
    return 'text-red-700 bg-red-50';
  }

  function actionLabel(action: KnowledgeGapHistoryRow['action']): string {
    if (action === 'approved_as_tail') return 'tail';
    if (action === 'approved_as_new_head') return 'new HEAD';
    return 'rejected';
  }

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
          <p className="text-xs text-[#4F4F4F] mt-0.5">Resolved submissions (approved and rejected). Tail approvals can be undone here.</p>
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

          {rows.length > 0 && (
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
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/40">
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
                      <td className="px-3 py-2">
                        {row.action === 'approved_as_tail' && (
                          <button
                            type="button"
                            onClick={() => handleUndo(row)}
                            disabled={undoingId === row.id}
                            aria-label="Undo tail approval"
                            className="p-1 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-40"
                            title="Undo tail approval"
                          >
                            <Undo2 size={14} />
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

  // Tail table state
  const [tailSearch, setTailSearch] = useState('');
  const [tailPage, setTailPage] = useState(1);

  // Head table state
  const [headSearch, setHeadSearch] = useState('');
  const [headPage, setHeadPage] = useState(1);

  // Multi-select state for tail queue
  const [selectedTailIds, setSelectedTailIds] = useState<Set<string>>(new Set());
  // Map from submission id to the currently-selected parent in its dropdown
  const [tailParentMap, setTailParentMap] = useState<Map<string, ParentClusterLabelResult>>(new Map());

  // Bulk action state
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkToast, setBulkToast] = useState<string | null>(null);

  async function loadSubmissions() {
    setLoading(true);
    setLoadError(null);
    const res = await listKnowledgeGapSubmissions('pending');
    setLoading(false);
    if (res.error) { setLoadError(res.error); return; }
    setAllSubmissions(res.data ?? []);
    // Clear selection when reloading
    setSelectedTailIds(new Set());
  }

  useEffect(() => { loadSubmissions(); }, []);

  // Partition into tail and head queues
  const tailItems = allSubmissions.filter(
    (s) => getPlacement(s.source_data) === 'tail_to_existing_head'
  );
  const headItems = allSubmissions.filter(
    (s) => getPlacement(s.source_data) === 'new_head'
  );

  // Sort both by confidence ascending (review-needed first)
  function byConfidenceAsc(a: KnowledgeGapSubmission, b: KnowledgeGapSubmission) {
    const ca = getConfidence(a.source_data) ?? 2;
    const cb = getConfidence(b.source_data) ?? 2;
    return ca - cb;
  }

  const sortedTail = [...tailItems].sort(byConfidenceAsc);
  const sortedHead = [...headItems].sort(byConfidenceAsc);

  // Filter by search
  function filterBySearch(items: KnowledgeGapSubmission[], q: string) {
    if (!q.trim()) return items;
    const lq = q.toLowerCase();
    return items.filter((s) => {
      const ct = String((s.source_data as Record<string, unknown>)['component_text'] ?? '');
      return ct.toLowerCase().includes(lq);
    });
  }

  const filteredTail = filterBySearch(sortedTail, tailSearch);
  const filteredHead = filterBySearch(sortedHead, headSearch);

  // Paginate
  const pagedTail = filteredTail.slice((tailPage - 1) * PAGE_SIZE, tailPage * PAGE_SIZE);
  const pagedHead = filteredHead.slice((headPage - 1) * PAGE_SIZE, headPage * PAGE_SIZE);

  // Multi-select helpers
  const visibleTailIds = pagedTail.map((s) => s.id);
  const allVisibleSelected = visibleTailIds.length > 0 && visibleTailIds.every((id) => selectedTailIds.has(id));
  const someVisibleSelected = visibleTailIds.some((id) => selectedTailIds.has(id));
  const indeterminate = someVisibleSelected && !allVisibleSelected;

  function handleToggleTailId(id: string) {
    setSelectedTailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function handleSelectAllVisible(checked: boolean) {
    setSelectedTailIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        visibleTailIds.forEach((id) => next.add(id));
      } else {
        visibleTailIds.forEach((id) => next.delete(id));
      }
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

  async function handleBulkApprove() {
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

    if (res.error) {
      showBulkToast(`Bulk approve failed: ${res.error}`);
      return;
    }

    if (res.data) {
      const { approved, failed } = res.data;
      // Remove approved from local state
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

  function handleTailAction(updated: KnowledgeGapSubmission, action: 'tail_approved' | 'moved_to_head') {
    if (action === 'tail_approved') {
      setAllSubmissions((prev) => prev.filter((s) => s.id !== updated.id));
      setSelectedTailIds((prev) => { const n = new Set(prev); n.delete(updated.id); return n; });
    } else {
      setAllSubmissions((prev) =>
        prev.map((s) => s.id === updated.id ? updated : s)
      );
    }
  }

  function handleHeadAction(
    updated: KnowledgeGapSubmission,
    action: 'approved' | 'rejected' | 'deferred' | 'moved_to_tail'
  ) {
    if (action === 'deferred') {
      setAllSubmissions((prev) => prev.filter((s) => s.id !== updated.id));
    } else {
      setAllSubmissions((prev) =>
        prev.map((s) => s.id === updated.id ? updated : s).filter((s) =>
          action === 'moved_to_tail' ? true : s.status === 'pending'
        )
      );
      if (action !== 'moved_to_tail') {
        setAllSubmissions((prev) => prev.filter((s) => s.id !== updated.id));
      } else {
        setAllSubmissions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      }
    }
  }

  // Bulk selection action bar for Tails Queue
  const tailActionBar = selectedTailIds.size > 0 ? (
    <div className="bg-blue-50 border-t border-blue-100 px-5 py-2.5 flex items-center gap-3">
      {bulkToast && (
        <span className="text-xs text-blue-700 font-medium">{bulkToast}</span>
      )}
      {!bulkToast && (
        <>
          <span className="text-xs text-blue-700 font-medium">{selectedTailIds.size} selected</span>
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={bulkSubmitting}
            className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {bulkSubmitting ? 'Approving...' : `Approve ${selectedTailIds.size} as tail`}
          </button>
          <button
            type="button"
            onClick={() => setSelectedTailIds(new Set())}
            disabled={bulkSubmitting}
            className="px-3 py-1 rounded text-xs font-medium border border-blue-300 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-40"
          >
            Clear selection
          </button>
        </>
      )}
    </div>
  ) : bulkToast ? (
    <div className="bg-blue-50 border-t border-blue-100 px-5 py-2 text-xs text-blue-700">{bulkToast}</div>
  ) : undefined;

  // Header checkbox for select-all
  const tailSelectAllHeader = (
    <th className="px-3 py-2 w-8">
      <input
        type="checkbox"
        checked={allVisibleSelected}
        ref={(el) => { if (el) el.indeterminate = indeterminate; }}
        onChange={(e) => handleSelectAllVisible(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        aria-label="Select all visible"
      />
    </th>
  );

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
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

      <div className="space-y-8">
        {/* Table 1: Tails Queue */}
        <div className={`rounded-xl border-2 border-blue-200 overflow-hidden`}>
          <div className="bg-blue-50 px-5 py-4">
            <h2 className="text-base font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Tails Queue
            </h2>
            <p className="text-xs text-[#4F4F4F] mt-0.5">Terms where Haiku suggests tailing to an existing corpus HEAD. Select the parent and click Add as tail.</p>
          </div>

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
        </div>

        {/* Table 2: New HEAD Queue */}
        <TableSection
          title="New HEAD Queue"
          description="Novel terms that require a new corpus entry. Edit fields inline and approve to add to the corpus."
          accentClass="border-green-200"
          headerBgClass="bg-green-50"
          items={pagedHead}
          totalCount={filteredHead.length}
          page={headPage}
          onPageChange={setHeadPage}
          search={headSearch}
          onSearchChange={(s) => { setHeadSearch(s); setHeadPage(1); }}
          loading={loading}
          loadError={loadError}
          columns={['Candidate', 'Canonical', 'Category', 'Form Type', 'Compound Type', 'Actions']}
          emptyLabel="No new HEAD submissions pending."
          renderRow={(sub) => (
            <HeadRow
              key={sub.id}
              sub={sub}
              onActionComplete={handleHeadAction}
            />
          )}
        />

        {/* History section */}
        <HistorySection onRefreshPending={loadSubmissions} />
      </div>
    </div>
  );
}
