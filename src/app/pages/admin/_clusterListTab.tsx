/**
 * ClusterListTab — private to QMAdminMatchingEngine
 * Displays a paginated, filterable list of cluster labels with bulk edit support.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Clock, Star, AlertTriangle, TrendingDown, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import {
  listClusterLabels,
  bulkUpdateClusterLabels,
  type ClusterLabelListFilters,
  type ClusterLabelListRow,
  type ClusterLabelListPriorityCounts,
  type ClusterLabelReasonCode,
  type BulkUpdatePayload,
  type BulkUpdateResult,
  type BulkUpdateWarning,
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

interface ReasonOption {
  code: ClusterLabelReasonCode;
  label: string;
}

const REASON_OPTIONS: ReasonOption[] = [
  { code: 'misclassified_category',   label: 'Misclassified category' },
  { code: 'wrong_form_type',          label: 'Wrong form type' },
  { code: 'identity_lock_fix',        label: 'Identity lock fix' },
  { code: 'compound_type_correction', label: 'Compound type correction' },
  { code: 'admin_seeded_truth',       label: 'Admin-seeded truth' },
  { code: 'merge_consolidation',      label: 'Merge consolidation' },
  { code: 'other',                    label: 'Other (specify reason)' },
];

const BULK_CAP = 100;
const PER_PAGE = 50;

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortCol =
  | 'canonical_product'
  | 'category'
  | 'form_type'
  | 'compound_type'
  | 'confidence'
  | 'status'
  | 'created_via'
  | 'last_edited';

type SortDir = 'asc' | 'desc';

const DEFAULT_SORT_COL: SortCol = 'last_edited';
const DEFAULT_SORT_DIR: SortDir = 'desc';

function parseSortParam(raw: string | null): { col: SortCol; dir: SortDir } {
  if (!raw) return { col: DEFAULT_SORT_COL, dir: DEFAULT_SORT_DIR };
  const VALID_COLS: SortCol[] = [
    'canonical_product', 'category', 'form_type', 'compound_type',
    'confidence', 'status', 'created_via', 'last_edited',
  ];
  const VALID_DIRS: SortDir[] = ['asc', 'desc'];
  const lastUnderscore = raw.lastIndexOf('_');
  if (lastUnderscore === -1) return { col: DEFAULT_SORT_COL, dir: DEFAULT_SORT_DIR };
  const col = raw.slice(0, lastUnderscore) as SortCol;
  const dir = raw.slice(lastUnderscore + 1) as SortDir;
  if (VALID_COLS.includes(col) && VALID_DIRS.includes(dir)) return { col, dir };
  return { col: DEFAULT_SORT_COL, dir: DEFAULT_SORT_DIR };
}

interface SortableThProps {
  col: SortCol;
  label: string;
  currentCol: SortCol;
  currentDir: SortDir;
  onSort: (col: SortCol) => void;
  className?: string;
}

function SortableTh({ col, label, currentCol, currentDir, onSort, className = '' }: SortableThProps) {
  const active = currentCol === col;
  return (
    <th
      className={`px-3 py-2 cursor-pointer select-none hover:text-[#7FAEC2] transition-colors whitespace-nowrap ${active ? 'text-[#7FAEC2]' : ''} ${className}`}
      onClick={() => onSort(col)}
      title={`Sort by ${label}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          currentDir === 'asc'
            ? <ArrowUp size={12} className="text-[#7FAEC2]" />
            : <ArrowDown size={12} className="text-[#7FAEC2]" />
        ) : (
          <span className="w-3 inline-block" />
        )}
      </span>
    </th>
  );
}

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

// ─── Bulk edit modal ──────────────────────────────────────────────────────────

type BulkModalStep =
  | 'form'          // initial field edit
  | 'confirm'       // "apply N changes to N rows — confirm?"
  | 'warnings'      // server returned soft warnings
  | 'result';       // 200 response

interface BulkEditModalProps {
  selectedIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}

function BulkEditModal({ selectedIds, onClose, onSuccess }: BulkEditModalProps) {
  const count = selectedIds.size;

  // Form state
  const [category, setCategory]             = useState('');
  const [formType, setFormType]             = useState('');
  const [compoundType, setCompoundType]     = useState('');
  const [identityFlagsRaw, setIdentityFlagsRaw] = useState('');
  const [reasonCode, setReasonCode]         = useState<ClusterLabelReasonCode | ''>('');
  const [reason, setReason]                 = useState('');

  // Modal flow
  const [step, setStep] = useState<BulkModalStep>('form');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting]         = useState(false);
  const [serverError, setServerError]       = useState<string | null>(null);

  // Server warnings on 422
  const [warnings, setWarnings]             = useState<BulkUpdateWarning[]>([]);

  // Final result
  const [result, setResult]                 = useState<BulkUpdateResult | null>(null);

  // Pending payload (to resubmit with confirm_warnings: true)
  const pendingPayloadRef = useRef<BulkUpdatePayload | null>(null);

  function buildPayload(confirmWarnings: boolean): BulkUpdatePayload | null {
    setValidationError(null);

    if (!reasonCode) {
      setValidationError('Reason code is required.');
      return null;
    }
    if (reasonCode === 'other' && !reason.trim()) {
      setValidationError('Free-text reason is required when reason code is "Other (specify reason)".');
      return null;
    }

    const updates: BulkUpdatePayload['updates'] = {};

    if (category !== '') updates.category = category || null;
    if (formType !== '')  updates.form_type = formType || null;
    if (compoundType !== '') {
      if (compoundType === '__clear__') {
        updates.compound_type = null;
      } else {
        updates.compound_type = compoundType as 'identity' | 'modified' | 'true';
      }
    }

    if (identityFlagsRaw.trim() !== '') {
      try {
        const parsed = JSON.parse(identityFlagsRaw.trim());
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
          setValidationError('Identity flags must be a JSON object.');
          return null;
        }
        updates.identity_flags = parsed as Record<string, unknown>;
      } catch {
        setValidationError('Identity flags is not valid JSON.');
        return null;
      }
    }

    if (Object.keys(updates).length === 0) {
      setValidationError('Select at least one field to update.');
      return null;
    }

    return {
      ids: Array.from(selectedIds),
      updates,
      reason_code: reasonCode as ClusterLabelReasonCode,
      reason: reason.trim() || undefined,
      confirm_warnings: confirmWarnings,
    };
  }

  function handleFormNext() {
    const payload = buildPayload(false);
    if (!payload) return;
    pendingPayloadRef.current = payload;
    setStep('confirm');
  }

  async function handleConfirm() {
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    await doSubmit(payload);
  }

  async function handleWarningsConfirm() {
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    await doSubmit({ ...payload, confirm_warnings: true });
  }

  async function doSubmit(payload: BulkUpdatePayload) {
    setSubmitting(true);
    setServerError(null);
    const res = await bulkUpdateClusterLabels(payload);
    setSubmitting(false);

    if (res.data) {
      setResult(res.data);
      setStep('result');
    } else if (res.warnings && res.warnings.length > 0) {
      setWarnings(res.warnings);
      setStep('warnings');
    } else {
      setServerError(res.error || 'Unknown error from server.');
      // Stay on confirm step so error is visible
    }
  }

  function handleResultClose() {
    onSuccess(); // triggers list refresh
    onClose();
  }

  const fieldCount = [
    category !== '',
    formType !== '',
    compoundType !== '',
    identityFlagsRaw.trim() !== '',
  ].filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Form step ─────────────────────────────────────────────────────── */}
        {step === 'form' && (
          <>
            <h2
              className="text-lg font-semibold text-[#2A2A2A] mb-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Bulk edit
            </h2>
            <p className="text-sm text-[#4F4F4F] mb-4">
              Apply field changes to {count} selected row{count !== 1 ? 's' : ''}.
              Only filled-in fields will be updated; blank fields are skipped.
              Identity flags use merge semantics.
            </p>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
                >
                  <option value="">(no change)</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Form type */}
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Form type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
                >
                  <option value="">(no change)</option>
                  {FORM_TYPE_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Compound type */}
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Compound type</label>
                <select
                  value={compoundType}
                  onChange={(e) => setCompoundType(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
                >
                  <option value="">(no change)</option>
                  <option value="identity">identity</option>
                  <option value="modified">modified</option>
                  <option value="true">true</option>
                  <option value="__clear__">(clear — set to null)</option>
                </select>
              </div>

              {/* Identity flags */}
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
                  Identity flags (JSON — merge semantics)
                </label>
                <textarea
                  value={identityFlagsRaw}
                  onChange={(e) => setIdentityFlagsRaw(e.target.value)}
                  placeholder={'{\n  "key": "value"\n}'}
                  rows={3}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] resize-y"
                  spellCheck={false}
                />
                <p className="text-xs text-[#4F4F4F] mt-1">
                  Merged into each row's existing flags. Leave empty to skip.
                </p>
              </div>

              {/* Reason code */}
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
                  Reason code <span className="text-red-500">*</span>
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value as ClusterLabelReasonCode | '')}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
                >
                  <option value="">Select a reason code</option>
                  {REASON_OPTIONS.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Reason text */}
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
                  Reason{reasonCode === 'other' ? <span className="text-red-500"> *</span> : ' (optional)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    reasonCode === 'other'
                      ? 'Required: describe the specific reason'
                      : 'Brief note for the audit log'
                  }
                  rows={2}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] resize-y"
                />
              </div>
            </div>

            {validationError && (
              <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {validationError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-200 rounded-md text-[#4F4F4F] hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFormNext}
                className="px-4 py-2 text-sm bg-[#2A2A2A] text-white rounded-md hover:bg-[#1a1a1a] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* ── Confirm step ──────────────────────────────────────────────────── */}
        {step === 'confirm' && (
          <>
            <h2
              className="text-lg font-semibold text-[#2A2A2A] mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Confirm bulk edit
            </h2>
            <p className="text-sm text-[#4F4F4F] mb-4">
              Apply {fieldCount} field change{fieldCount !== 1 ? 's' : ''} to {count} row{count !== 1 ? 's' : ''}.
              This is reversible via individual rollback per row.
            </p>

            {/* Summary of changes */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-4 text-sm space-y-1">
              {category !== '' && (
                <div><span className="font-medium text-[#4F4F4F]">Category:</span> <span className="text-[#2A2A2A]">{category}</span></div>
              )}
              {formType !== '' && (
                <div><span className="font-medium text-[#4F4F4F]">Form type:</span> <span className="text-[#2A2A2A]">{formType}</span></div>
              )}
              {compoundType !== '' && (
                <div><span className="font-medium text-[#4F4F4F]">Compound type:</span> <span className="text-[#2A2A2A]">{compoundType === '__clear__' ? 'null (clear)' : compoundType}</span></div>
              )}
              {identityFlagsRaw.trim() !== '' && (
                <div><span className="font-medium text-[#4F4F4F]">Identity flags:</span> <span className="text-[#2A2A2A] font-mono">merged</span></div>
              )}
              <div><span className="font-medium text-[#4F4F4F]">Reason code:</span> <span className="text-[#2A2A2A]">{reasonCode}</span></div>
              {reason.trim() && (
                <div><span className="font-medium text-[#4F4F4F]">Reason:</span> <span className="text-[#2A2A2A]">{reason}</span></div>
              )}
            </div>

            {serverError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setStep('form'); setServerError(null); }}
                disabled={submitting}
                className="px-4 py-2 text-sm border border-gray-200 rounded-md text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-[#2A2A2A] text-white rounded-md hover:bg-[#1a1a1a] disabled:opacity-50"
              >
                {submitting ? 'Applying...' : 'Confirm'}
              </button>
            </div>
          </>
        )}

        {/* ── Warnings step ─────────────────────────────────────────────────── */}
        {step === 'warnings' && (
          <>
            <h2
              className="text-lg font-semibold text-[#2A2A2A] mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Confirm warnings
            </h2>
            <p className="text-sm text-[#4F4F4F] mb-3">
              The server returned soft-validation warnings for some rows. Review and confirm to proceed.
            </p>
            <ul className="mb-4 space-y-2 max-h-64 overflow-y-auto">
              {warnings.map((w, i) => (
                <li key={i} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <span className="font-medium text-amber-800">Row {w.id.slice(0, 8)}… {w.field}: </span>
                  <span className="text-amber-700">{w.message}</span>
                </li>
              ))}
            </ul>

            {serverError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setStep('confirm'); setServerError(null); }}
                disabled={submitting}
                className="px-4 py-2 text-sm border border-gray-200 rounded-md text-[#4F4F4F] hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWarningsConfirm}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-[#2A2A2A] text-white rounded-md hover:bg-[#1a1a1a] disabled:opacity-50"
              >
                {submitting ? 'Applying...' : 'Confirm and proceed'}
              </button>
            </div>
          </>
        )}

        {/* ── Result step ───────────────────────────────────────────────────── */}
        {step === 'result' && result && (
          <>
            <h2
              className="text-lg font-semibold text-[#2A2A2A] mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Bulk edit complete
            </h2>

            {/* Updated */}
            {result.updated.length > 0 && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  Updated {result.updated.length} row{result.updated.length !== 1 ? 's' : ''}
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {result.updated.map((u) => (
                    <li key={u.id} className="text-xs text-green-700 font-mono">
                      {u.id.slice(0, 8)}… — {u.fields_changed.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unchanged */}
            {result.unchanged.length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {result.unchanged.length} row{result.unchanged.length !== 1 ? 's' : ''} already at target values
                </p>
                <p className="text-xs text-amber-700">
                  {result.unchanged.map((id) => id.slice(0, 8) + '…').join(', ')}
                </p>
              </div>
            )}

            {/* Failed */}
            {result.failed.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-800 mb-2">
                  {result.failed.length} row{result.failed.length !== 1 ? 's' : ''} failed
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {result.failed.map((f) => (
                    <li key={f.id} className="text-xs text-red-700">
                      <span className="font-mono">{f.id.slice(0, 8)}…</span> — {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleResultClose}
                className="px-4 py-2 text-sm bg-[#2A2A2A] text-white rounded-md hover:bg-[#1a1a1a]"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClusterListTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sort — initialized from URL ?sort= param
  const initialSort = parseSortParam(searchParams.get('sort'));
  const [sortCol, setSortCol] = useState<SortCol>(initialSort.col);
  const [sortDir, setSortDir] = useState<SortDir>(initialSort.dir);

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

  // Selection — persists across pages, cleared on tab navigation (component unmount)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk edit modal
  const [showBulkModal, setShowBulkModal] = useState(false);

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
      sort: `${sortCol}_${sortDir}`,
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
  }, [q, category, formType, compoundType, createdVia, hasBeenEdited, recentlyEdited, page, sortCol, sortDir]);

  // Fetch on mount and whenever non-text filters, page, or sort changes
  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, formType, compoundType, createdVia, hasBeenEdited, recentlyEdited, page, sortCol, sortDir]);

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

  // ── Sort ──────────────────────────────────────────────────────────────────

  function handleSort(col: SortCol) {
    const newDir: SortDir =
      sortCol === col ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortCol(col);
    setSortDir(newDir);
    setPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('sort', `${col}_${newDir}`);
        return next;
      },
      { replace: true }
    );
  }

  // ── Selection helpers ─────────────────────────────────────────────────────

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const visibleIds = rows.map((r) => r.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someVisibleSelected = rows.some((r) => selectedIds.has(r.id));

  const bulkCapped = selectedIds.size > BULK_CAP;

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

      {/* Action bar — shown when ≥1 row selected */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#7FAEC2] bg-[#f0f7fb] px-4 py-3">
          <span className="text-sm font-medium text-[#2A2A2A]">
            {selectedIds.size} row{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          {bulkCapped && (
            <span className="text-sm text-red-600 font-medium">
              Bulk capped at {BULK_CAP} rows. Deselect some.
            </span>
          )}
          {!bulkCapped && (
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="text-sm px-3 py-1.5 bg-[#2A2A2A] text-white rounded-md hover:bg-[#1a1a1a]"
            >
              Apply correction to selected
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-sm text-[#7FAEC2] underline underline-offset-2 hover:text-[#5a8fa8]"
          >
            Clear selection
          </button>
        </div>
      )}

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
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                    className="rounded border-gray-300 text-[#7FAEC2] focus:ring-[#7FAEC2]"
                    title="Select all visible"
                  />
                </th>
                <SortableTh col="canonical_product" label="Canonical" currentCol={sortCol} currentDir={sortDir} onSort={handleSort} />
                <SortableTh col="category" label="Category" currentCol={sortCol} currentDir={sortDir} onSort={handleSort} />
                <SortableTh col="form_type" label="Form type" currentCol={sortCol} currentDir={sortDir} onSort={handleSort} />
                <SortableTh col="compound_type" label="Compound" currentCol={sortCol} currentDir={sortDir} onSort={handleSort} />
                <SortableTh col="confidence" label="Confidence" currentCol={sortCol} currentDir={sortDir} onSort={handleSort} />
                <SortableTh col="status" label="Status" currentCol={sortCol} currentDir={sortDir} onSort={handleSort} />
                <SortableTh col="created_via" label="Created via" currentCol={sortCol} currentDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2">Flags</th>
                <SortableTh col="last_edited" label="Last edited" currentCol={sortCol} currentDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-sm text-[#4F4F4F] italic">
                    No cluster labels found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-sm text-[#4F4F4F]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 align-middle ${selectedIds.has(row.id) ? 'bg-[#f0f7fb]' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className="rounded border-gray-300 text-[#7FAEC2] focus:ring-[#7FAEC2]"
                    />
                  </td>
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

      {/* Bulk edit modal */}
      {showBulkModal && (
        <BulkEditModal
          selectedIds={selectedIds}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setSelectedIds(new Set());
            fetchData();
          }}
        />
      )}
    </div>
  );
}
