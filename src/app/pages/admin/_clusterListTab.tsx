/**
 * ClusterListTab — private to QMAdminMatchingEngine
 * Displays a paginated, filterable list of cluster labels.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Clock, Star, AlertTriangle, TrendingDown, RotateCcw } from 'lucide-react';
import {
  listClusterLabels,
  type ClusterLabelListFilters,
  type ClusterLabelListRow,
  type ClusterLabelListPriorityCounts,
} from '../../services/adminApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  'produce', 'meat', 'poultry', 'seafood', 'dairy', 'cheese',
  'dry_goods', 'frozen', 'bakery', 'beverage', 'prepared',
  'non_food', 'other', 'tobacco',
];

const FORM_TYPE_OPTIONS = [
  'fresh_raw', 'fresh_raw_protein', 'minimally_processed', 'frozen_raw',
  'frozen_prepared', 'prepared', 'preserved', 'dried', 'powdered',
  'liquid', 'baked_good', 'condiment', 'other',
];

const COMPOUND_TYPE_OPTIONS = ['identity', 'modified', 'true', 'null'];

const CREATED_VIA_OPTIONS = [
  'algorithmic', 'admin_seeded', 'knowledge_gap_promotion', 'merge_target',
];

const PER_PAGE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
}

function confidenceColor(confidence: number | null): string {
  if (confidence === null) return 'text-gray-400';
  if (confidence >= 0.70) return 'text-green-600';
  if (confidence >= 0.40) return 'text-amber-600';
  return 'text-red-600';
}

// ─── Priority card ─────────────────────────────────────────────────────────────

interface PriorityCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function PriorityCard({ icon: Icon, label, count, active, onClick }: PriorityCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors ${
        active
          ? 'border-[#7FAEC2] bg-[#f0f7fb]'
          : 'border-gray-200 bg-white hover:border-[#7FAEC2] hover:bg-gray-50'
      }`}
    >
      <Icon size={16} className={active ? 'text-[#7FAEC2] mb-1' : 'text-gray-400 mb-1'} />
      <span className="text-2xl font-bold text-[#2A2A2A] leading-none">{count}</span>
      <span className="text-xs text-[#4F4F4F] mt-1">{label}</span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClusterListTab() {
  const navigate = useNavigate();

  // Filters
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [formType, setFormType] = useState('');
  const [compoundType, setCompoundType] = useState('');
  const [createdVia, setCreatedVia] = useState('');
  const [hasBeenEdited, setHasBeenEdited] = useState(false);
  const [recentlyEdited, setRecentlyEdited] = useState(false);
  const [page, setPage] = useState(1);

  // Active priority card — tracks which card is toggled on
  type PriorityKey = 'recently_edited' | 'umbrella' | 'high_product_count' | 'low_confidence' | 'recently_rolled_back';
  const [activeCard, setActiveCard] = useState<PriorityKey | null>(null);

  // Data
  const [rows, setRows] = useState<ClusterLabelListRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [priorityCounts, setPriorityCounts] = useState<ClusterLabelListPriorityCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce ref for text input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (overrideFilters?: Partial<ClusterLabelListFilters & { page: number }>) => {
    setLoading(true);
    setError(null);

    const filters: ClusterLabelListFilters = {
      q: q || undefined,
      category: category || undefined,
      form_type: formType || undefined,
      compound_type: (compoundType || undefined) as ClusterLabelListFilters['compound_type'],
      created_via: createdVia || undefined,
      has_been_edited: hasBeenEdited || undefined,
      recently_edited: recentlyEdited || undefined,
      page,
      per_page: PER_PAGE,
      ...overrideFilters,
    };

    // Remove undefined keys
    (Object.keys(filters) as (keyof ClusterLabelListFilters)[]).forEach((k) => {
      if (filters[k] === undefined || filters[k] === false) delete filters[k];
    });

    const res = await listClusterLabels(filters);
    setLoading(false);

    if (res.data) {
      setRows(res.data.rows);
      setTotalCount(res.data.total_count);
      setTotalPages(res.data.total_pages);
      setPriorityCounts(res.data.priority_counts);
    } else {
      setError(res.error || 'Failed to load cluster labels.');
    }
  }, [q, category, formType, compoundType, createdVia, hasBeenEdited, recentlyEdited, page]);

  // Fetch on mount and whenever non-text filters or page changes
  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, formType, compoundType, createdVia, hasBeenEdited, recentlyEdited, page]);

  // ── Text input with debounce ──────────────────────────────────────────────

  const handleQChange = (val: string) => {
    setQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData({ q: val || undefined, page: 1 });
    }, 250);
  };

  const handleQKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setPage(1);
      fetchData({ q: q || undefined, page: 1 });
    }
  };

  // ── Priority card click ──────────────────────────────────────────────────

  function handleCardClick(key: PriorityKey) {
    // Toggle off if already active
    if (activeCard === key) {
      setActiveCard(null);
      setRecentlyEdited(false);
      setHasBeenEdited(false);
      setPage(1);
      return;
    }
    setActiveCard(key);
    // Reset relevant filters
    setRecentlyEdited(false);
    setHasBeenEdited(false);
    setPage(1);

    // For recently_edited, use the recently_edited filter
    if (key === 'recently_edited') {
      setRecentlyEdited(true);
    }
    // For has_been_edited (umbrella / high_product_count / low_confidence / recently_rolled_back),
    // the counts come from the BE and are sorted by last_edited DESC already;
    // we just filter has_been_edited to surface actionable rows
    if (key === 'umbrella' || key === 'high_product_count' || key === 'low_confidence' || key === 'recently_rolled_back') {
      setHasBeenEdited(false); // no filter change — just reset page; BE returns all sorted by last_edited
    }
  }

  // ── Reset filters ─────────────────────────────────────────────────────────

  function resetFilters() {
    setQ('');
    setCategory('');
    setFormType('');
    setCompoundType('');
    setCreatedVia('');
    setHasBeenEdited(false);
    setRecentlyEdited(false);
    setActiveCard(null);
    setPage(1);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Priority cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <PriorityCard
          icon={Clock}
          label="Recently edited"
          count={priorityCounts?.recently_edited ?? 0}
          active={activeCard === 'recently_edited'}
          onClick={() => handleCardClick('recently_edited')}
        />
        <PriorityCard
          icon={Star}
          label="Umbrella terms"
          count={priorityCounts?.umbrella ?? 0}
          active={activeCard === 'umbrella'}
          onClick={() => handleCardClick('umbrella')}
        />
        <PriorityCard
          icon={AlertTriangle}
          label="High product count"
          count={priorityCounts?.high_product_count ?? 0}
          active={activeCard === 'high_product_count'}
          onClick={() => handleCardClick('high_product_count')}
        />
        <PriorityCard
          icon={TrendingDown}
          label="Low confidence"
          count={priorityCounts?.low_confidence ?? 0}
          active={activeCard === 'low_confidence'}
          onClick={() => handleCardClick('low_confidence')}
        />
        <PriorityCard
          icon={RotateCcw}
          label="Recently rolled back"
          count={priorityCounts?.recently_rolled_back ?? 0}
          active={activeCard === 'recently_rolled_back'}
          onClick={() => handleCardClick('recently_rolled_back')}
        />
      </div>

      {/* Filter row */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Text search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-[#4F4F4F] mb-1">Search canonical product</label>
            <input
              type="text"
              value={q}
              onChange={(e) => handleQChange(e.target.value)}
              onKeyDown={handleQKeyDown}
              placeholder="Search canonical product…"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
            />
          </div>

          {/* Category */}
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-[#4F4F4F] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); setActiveCard(null); }}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
            >
              <option value="">(any)</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Form type */}
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-[#4F4F4F] mb-1">Form type</label>
            <select
              value={formType}
              onChange={(e) => { setFormType(e.target.value); setPage(1); setActiveCard(null); }}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
            >
              <option value="">(any)</option>
              {FORM_TYPE_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Compound type */}
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-[#4F4F4F] mb-1">Compound type</label>
            <select
              value={compoundType}
              onChange={(e) => { setCompoundType(e.target.value); setPage(1); setActiveCard(null); }}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
            >
              <option value="">(any)</option>
              {COMPOUND_TYPE_OPTIONS.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
            </select>
          </div>

          {/* Created via */}
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-[#4F4F4F] mb-1">Created via</label>
            <select
              value={createdVia}
              onChange={(e) => { setCreatedVia(e.target.value); setPage(1); setActiveCard(null); }}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
            >
              <option value="">(any)</option>
              {CREATED_VIA_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Second row: checkboxes + reset */}
        <div className="flex flex-wrap gap-4 items-center mt-3">
          <label className="flex items-center gap-2 text-sm text-[#4F4F4F] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasBeenEdited}
              onChange={(e) => { setHasBeenEdited(e.target.checked); setPage(1); setActiveCard(null); }}
              className="rounded border-gray-300 text-[#7FAEC2] focus:ring-[#7FAEC2]"
            />
            Has been edited
          </label>
          <label className="flex items-center gap-2 text-sm text-[#4F4F4F] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recentlyEdited}
              onChange={(e) => { setRecentlyEdited(e.target.checked); setPage(1); setActiveCard(null); }}
              className="rounded border-gray-300 text-[#7FAEC2] focus:ring-[#7FAEC2]"
            />
            Edited in last 7 days
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-sm text-[#7FAEC2] underline underline-offset-2 hover:text-[#5a8fa8]"
          >
            Reset filters
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-[#4F4F4F]">
          {loading ? 'Loading…' : `${totalCount.toLocaleString()} rows`}
        </p>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-[#4F4F4F]">
                <th className="px-3 py-2">Canonical</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Form type</th>
                <th className="px-3 py-2">Compound</th>
                <th className="px-3 py-2">Confidence</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created via</th>
                <th className="px-3 py-2">Flags</th>
                <th className="px-3 py-2">Last edited</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm text-[#4F4F4F] italic">
                    No cluster labels found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm text-[#4F4F4F]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 align-middle">
                  <td className="px-3 py-2 font-medium text-[#2A2A2A] max-w-[180px] truncate">
                    {row.canonical_product ?? <span className="italic text-[#4F4F4F]">—</span>}
                  </td>
                  <td className="px-3 py-2 text-[#4F4F4F]">
                    {row.category ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-3 py-2 text-[#4F4F4F]">
                    {row.form_type ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-3 py-2 text-[#4F4F4F]">
                    {row.compound_type ?? <span className="italic">—</span>}
                  </td>
                  <td className={`px-3 py-2 font-medium tabular-nums ${confidenceColor(row.confidence)}`}>
                    {row.confidence !== null ? `${Math.round(row.confidence * 100)}%` : <span className="italic text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-[#4F4F4F]">{row.status}</td>
                  <td className="px-3 py-2 text-[#4F4F4F]">{row.created_via}</td>
                  <td className="px-3 py-2 text-center">
                    {row.identity_flags_count > 0 ? (
                      <span
                        title={`${row.identity_flags_count} identity flag${row.identity_flags_count !== 1 ? 's' : ''}`}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold cursor-default"
                      >
                        {row.identity_flags_count}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#4F4F4F] whitespace-nowrap text-xs">
                    {relativeTime(row.last_edited)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/qm-admin/cluster-labels?id=${row.id}`)}
                      className="text-xs text-[#7FAEC2] underline underline-offset-2 hover:text-[#5a8fa8] whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[#4F4F4F]">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
