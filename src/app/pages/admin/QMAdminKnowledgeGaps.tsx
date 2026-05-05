import { useState, useEffect } from 'react';
import {
  KnowledgeGapSubmission,
  KnowledgeGapEditedData,
  listKnowledgeGapSubmissions,
  approveKnowledgeGapSubmission,
  rejectKnowledgeGapSubmission,
} from '../../services/adminApi';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  'produce',
  'meat',
  'poultry',
  'seafood',
  'dairy',
  'cheese',
  'dry_goods',
  'frozen',
  'bakery',
  'beverage',
  'prepared',
  'condiment',
  'non_food',
  'other',
  'tobacco',
] as const;

const FORM_TYPE_OPTIONS = [
  'fresh_raw',
  'fresh_raw_protein',
  'minimally_processed',
  'frozen_raw',
  'frozen_prepared',
  'prepared',
  'preserved',
  'dried',
  'powdered',
  'liquid',
  'baked_good',
  'condiment',
  'other',
] as const;

const COMPOUND_TYPE_OPTIONS = [
  { value: '', label: '(none)' },
  { value: 'identity', label: 'identity' },
  { value: 'modified', label: 'modified' },
  { value: 'true', label: 'true' },
] as const;

type StatusFilter = 'pending' | 'approved' | 'rejected';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'unknown';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Sample quote IDs section ──────────────────────────────────────────────────

function SampleQuoteIds({ ids }: { ids?: string[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!ids || ids.length === 0) return null;

  function copyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-[#7FAEC2] underline underline-offset-2 hover:text-[#5a8fa8]"
      >
        {open ? 'Hide sample quote IDs' : `Show ${ids.length} sample quote ID${ids.length === 1 ? '' : 's'}`}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5">
          {ids.map((id) => (
            <li key={id} className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#2A2A2A]">{id}</span>
              <button
                type="button"
                onClick={() => copyId(id)}
                className="text-xs text-[#7FAEC2] hover:text-[#5a8fa8]"
              >
                {copied === id ? 'Copied' : 'Copy'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── LLM suggestion display ────────────────────────────────────────────────────

function LlmSuggestionDisplay({ sd }: { sd: KnowledgeGapSubmission['source_data'] }) {
  const hasAny =
    sd.suggested_canonical != null ||
    sd.suggested_category != null ||
    sd.suggested_form_type != null ||
    sd.suggested_compound_type != null;

  if (!hasAny) {
    return (
      <p className="text-sm italic text-[#4F4F4F]">
        (no LLM suggestion yet -- Haiku live call disabled)
      </p>
    );
  }

  const rows: [string, string | null | undefined][] = [
    ['Canonical', sd.suggested_canonical],
    ['Category', sd.suggested_category],
    ['Form type', sd.suggested_form_type],
    ['Compound type', sd.suggested_compound_type],
  ];

  const llm = sd.llm_suggestion as Record<string, unknown> | null | undefined;
  const confidence = llm?.['confidence'];
  const reasoning = llm?.['reasoning'];

  return (
    <div className="space-y-1">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <>
            <dt key={`k-${k}`} className="text-[#4F4F4F] font-medium">{k}</dt>
            <dd key={`v-${k}`} className="text-[#2A2A2A] font-mono break-all">
              {v != null ? String(v) : <span className="italic text-[#4F4F4F]">null</span>}
            </dd>
          </>
        ))}
      </dl>
      {confidence != null && (
        <p className="text-xs text-[#4F4F4F]">Confidence: {Math.round(Number(confidence) * 100)}%</p>
      )}
      {reasoning != null && (
        <p className="text-xs text-[#4F4F4F]">Reasoning: {String(reasoning)}</p>
      )}
    </div>
  );
}

// ── Per-submission card ───────────────────────────────────────────────────────

interface SubmissionCardProps {
  sub: KnowledgeGapSubmission;
  onActionComplete: (updated: KnowledgeGapSubmission) => void;
}

function SubmissionCard({ sub, onActionComplete }: SubmissionCardProps) {
  const sd = sub.source_data;
  const isPending = sub.status === 'pending';

  const [canonical, setCanonical] = useState(sd.suggested_canonical ?? '');
  const [category, setCategory] = useState(sd.suggested_category ?? '');
  const [formType, setFormType] = useState(sd.suggested_form_type ?? '');
  const [compoundType, setCompoundType] = useState(sd.suggested_compound_type ?? '');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const editedData: KnowledgeGapEditedData = {};
    if (canonical.trim()) editedData.suggested_canonical = canonical.trim();
    if (category) editedData.suggested_category = category;
    if (formType) editedData.suggested_form_type = formType;
    if (compoundType) {
      editedData.suggested_compound_type = compoundType as KnowledgeGapEditedData['suggested_compound_type'];
    } else {
      editedData.suggested_compound_type = null;
    }

    const res = await approveKnowledgeGapSubmission(
      sub.id,
      editedData,
      reviewNotes.trim() || undefined
    );
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }
    setSuccessMsg('Approved.');
    if (res.data) onActionComplete(res.data);
  }

  async function handleReject() {
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const res = await rejectKnowledgeGapSubmission(
      sub.id,
      reviewNotes.trim() || undefined
    );
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }
    setSuccessMsg('Rejected.');
    if (res.data) onActionComplete(res.data);
  }

  const sampleIds: string[] = Array.isArray(sd.sample_quote_ids) ? sd.sample_quote_ids : [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-lg font-bold text-[#2A2A2A] break-all"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {sd.component_text}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <span className="inline-flex items-center rounded-full bg-[#EAF3F8] px-2.5 py-0.5 text-xs font-semibold text-[#2A5F7A]">
              seen {sd.frequency_count ?? 0} times
            </span>
            <span className="text-xs text-[#4F4F4F]">
              First seen {formatDate(sd.first_seen)} | Last seen {formatDate(sd.last_seen)}
              {sampleIds.length > 0 && ` | ${sampleIds.length} sample quote${sampleIds.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <SampleQuoteIds ids={sampleIds} />
        </div>
        <span
          className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
            sub.status === 'pending'
              ? 'bg-amber-100 text-amber-700'
              : sub.status === 'approved'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {sub.status}
        </span>
      </div>

      {/* LLM suggestion */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4F4F4F] mb-1">
          LLM suggestion
        </p>
        <LlmSuggestionDisplay sd={sd} />
      </div>

      {/* Edit / Approve form */}
      <div className={isPending ? '' : 'opacity-50 pointer-events-none'}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4F4F4F] mb-2">
          {isPending ? 'Review and approve' : 'Review decision (read only)'}
        </p>

        <div className="space-y-3">
          {/* Canonical */}
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
              Canonical name
            </label>
            <input
              type="text"
              value={canonical}
              onChange={(e) => setCanonical(e.target.value)}
              disabled={!isPending || submitting}
              placeholder="e.g. Rondele Cheese"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] disabled:bg-gray-50"
              spellCheck={false}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!isPending || submitting}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] disabled:bg-gray-50"
            >
              <option value="">(select category)</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Form type */}
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
              Form type
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              disabled={!isPending || submitting}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] disabled:bg-gray-50"
            >
              <option value="">(select form type)</option>
              {FORM_TYPE_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Compound type */}
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
              Compound type
            </label>
            <select
              value={compoundType ?? ''}
              onChange={(e) => setCompoundType(e.target.value)}
              disabled={!isPending || submitting}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] disabled:bg-gray-50"
            >
              {COMPOUND_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Review notes */}
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
              Review notes (optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              disabled={!isPending || submitting}
              placeholder="Optional note for audit trail"
              rows={2}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] resize-y disabled:bg-gray-50"
            />
          </div>

          {/* Error / success */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
              {successMsg}
            </div>
          )}

          {/* Action buttons */}
          {isPending && (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-[#A5CFDD] text-[#2A2A2A] hover:bg-[#7FAEC2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Approve'}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resolved state info */}
      {!isPending && (
        <div className="text-xs text-[#4F4F4F] space-y-0.5 border-t border-gray-100 pt-3">
          {sub.reviewed_at && (
            <p>Reviewed at: {new Date(sub.reviewed_at).toLocaleString()}</p>
          )}
          {sub.review_notes && (
            <p>Notes: {sub.review_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function QMAdminKnowledgeGaps() {
  const [activeTab, setActiveTab] = useState<StatusFilter>('pending');
  const [submissions, setSubmissions] = useState<KnowledgeGapSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tab counts: track after each load
  const [tabCounts, setTabCounts] = useState<Record<StatusFilter, number | null>>({
    pending: null,
    approved: null,
    rejected: null,
  });

  async function loadTab(status: StatusFilter) {
    setLoading(true);
    setLoadError(null);
    const res = await listKnowledgeGapSubmissions(status);
    setLoading(false);
    if (res.error) {
      setLoadError(res.error);
      return;
    }
    const list = res.data ?? [];
    setSubmissions(list);
    setTabCounts((prev) => ({ ...prev, [status]: list.length }));
  }

  useEffect(() => {
    loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function handleTabChange(tab: StatusFilter) {
    setActiveTab(tab);
    setSubmissions([]);
  }

  function handleActionComplete(updated: KnowledgeGapSubmission) {
    // Remove from current list (it has moved to a different status)
    setSubmissions((prev) => prev.filter((s) => s.id !== updated.id));
    // Decrement current tab count, reset target tab count (stale)
    setTabCounts((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab] != null ? Math.max(0, (prev[activeTab] as number) - 1) : null,
      [updated.status]: null,
    }));
  }

  const TABS: { key: StatusFilter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-[#2A2A2A] mb-1"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Knowledge Gap Review Queue
        </h1>
        <p className="text-sm text-[#4F4F4F]">
          Component terms the matching engine could not resolve. Review LLM suggestions,
          edit if needed, and approve to add to the corpus.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                active
                  ? 'border-[#7FAEC2] text-[#2A2A2A]'
                  : 'border-transparent text-[#4F4F4F] hover:text-[#2A2A2A]'
              }`}
            >
              {tab.label}
              {count != null && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? 'bg-[#A5CFDD] text-[#2A2A2A]' : 'bg-gray-100 text-[#4F4F4F]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Load error */}
      {loadError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <p className="text-sm text-[#4F4F4F]">Loading...</p>
      )}

      {/* Empty state */}
      {!loading && !loadError && submissions.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-[#4F4F4F]">
            No {activeTab} submissions.
          </p>
        </div>
      )}

      {/* Submission list */}
      {!loading && submissions.length > 0 && (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              onActionComplete={handleActionComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
