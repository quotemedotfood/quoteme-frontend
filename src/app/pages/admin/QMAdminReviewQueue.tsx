import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Pencil, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  ReviewSubmission,
  KnowledgeGapSourceData,
  CompoundClassificationSourceData,
  getReviewSubmissions,
  getReviewSubmission,
  approveReviewSubmission,
  rejectReviewSubmission,
  updateReviewSubmission,
} from '../../services/adminApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TYPE_BADGE: Record<string, string> = {
  knowledge_gap: 'bg-blue-100 text-blue-700',
  compound_classification: 'bg-purple-100 text-purple-700',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const COMPOUND_TYPE_BADGE: Record<string, string> = {
  modified: 'bg-sky-100 text-sky-700',
  true_compound: 'bg-violet-100 text-violet-700',
  identity: 'bg-teal-100 text-teal-700',
  non_compound: 'bg-gray-100 text-gray-600',
};

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${className}`}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

function sourcePreview(sub: ReviewSubmission): string {
  if (sub.submission_type === 'knowledge_gap') {
    const d = sub.source_data as Partial<KnowledgeGapSourceData>;
    return d.component_text || '—';
  }
  if (sub.submission_type === 'compound_classification') {
    const d = sub.source_data as Partial<CompoundClassificationSourceData>;
    return [d.canonical_product, d.suggested_type?.replace(/_/g, ' ')].filter(Boolean).join(' · ') || '—';
  }
  return '—';
}

// ─── Type-specific source_data renderers ─────────────────────────────────────

function KnowledgeGapSourceDataView({ data }: { data: KnowledgeGapSourceData }) {
  return (
    <div className="space-y-3">
      <Field label="Component text" value={data.component_text} />
      <Field label="Suggested canonical" value={data.suggested_canonical} />
      <Field label="Suggested category" value={data.suggested_category} />
      {data.suggested_form_type && <Field label="Suggested form type" value={data.suggested_form_type} />}
      {data.rep_notes && <Field label="Rep notes" value={data.rep_notes} multiline />}
    </div>
  );
}

function CompoundClassificationSourceDataView({ data }: { data: CompoundClassificationSourceData }) {
  const pct = Math.round((data.confidence ?? 0) * 100);
  return (
    <div className="space-y-3">
      <Field label="Canonical product" value={data.canonical_product} />
      <div>
        <p className="text-xs font-medium text-[#4F4F4F] mb-1">Suggested type</p>
        <Badge
          text={data.suggested_type}
          className={COMPOUND_TYPE_BADGE[data.suggested_type] || 'bg-gray-100 text-gray-600'}
        />
      </div>
      <div>
        <p className="text-xs font-medium text-[#4F4F4F] mb-1">Confidence — {pct}%</p>
        <div className="h-2 w-full max-w-xs bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-2 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-[#4F4F4F] mb-1">Reasoning</p>
        <p className="text-sm text-[#2A2A2A] bg-gray-50 border border-gray-200 rounded-lg p-3 leading-relaxed">
          {data.reasoning}
        </p>
      </div>
      <Field label="Cluster label ID" value={data.cluster_label_id} />
    </div>
  );
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#4F4F4F] mb-0.5">{label}</p>
      {multiline ? (
        <p className="text-sm text-[#2A2A2A] bg-gray-50 border border-gray-200 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">{value || '—'}</p>
      ) : (
        <p className="text-sm text-[#2A2A2A]">{value || '—'}</p>
      )}
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

export function QMAdminReviewQueueList() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: { type?: string; status?: string } = {};
    if (filterType !== 'all') params.type = filterType;
    if (filterStatus !== 'all') params.status = filterStatus;
    const res = await getReviewSubmissions(params);
    if (res.data) setSubmissions(res.data);
    else setError(res.error || 'Failed to load submissions');
    setLoading(false);
  }, [filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Review Queue
          </h1>
          <p className="text-sm text-[#4F4F4F] mt-1">
            {pendingCount} pending item{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-sm"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div>
          <label className="text-xs font-medium text-[#4F4F4F] mr-2">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
          >
            <option value="all">All</option>
            <option value="knowledge_gap">Knowledge Gap</option>
            <option value="compound_classification">Compound Classification</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[#4F4F4F] mr-2">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Error / loading */}
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      {loading && <p className="text-sm text-gray-400 py-8">Loading submissions…</p>}

      {/* Table */}
      {!loading && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-[#2A2A2A]">Type</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Status</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Submitted by</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Submitted</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Preview</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-gray-400 py-10">
                    No submissions found.
                  </TableCell>
                </TableRow>
              )}
              {submissions.map((sub) => (
                <TableRow
                  key={sub.id}
                  className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                  onClick={() => navigate(`/qm-admin/review-queue/${sub.id}`)}
                >
                  <TableCell>
                    <Badge
                      text={sub.submission_type}
                      className={TYPE_BADGE[sub.submission_type] || 'bg-gray-100 text-gray-600'}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      text={sub.status}
                      className={STATUS_BADGE[sub.status] || 'bg-gray-100 text-gray-600'}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-[#4F4F4F]">{sub.submitted_by}</TableCell>
                  <TableCell className="text-sm text-[#4F4F4F]">{relativeTime(sub.submitted_at)}</TableCell>
                  <TableCell className="text-sm text-[#2A2A2A] max-w-xs truncate">
                    {sourcePreview(sub)}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

export function QMAdminReviewQueueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sub, setSub] = useState<ReviewSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit source_data
  const [editMode, setEditMode] = useState(false);
  const [editJson, setEditJson] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Approve dialog
  const [showApprove, setShowApprove] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [approveFinalType, setApproveFinalType] = useState('');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Reject dialog
  const [showReject, setShowReject] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await getReviewSubmission(id!);
      if (res.data) {
        setSub(res.data);
        setEditJson(JSON.stringify(res.data.source_data, null, 2));
        if (res.data.submission_type === 'compound_classification') {
          const d = res.data.source_data as Partial<CompoundClassificationSourceData>;
          setApproveFinalType(d.suggested_type || '');
        }
      } else {
        setError(res.error || 'Not found');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSaveEdit() {
    if (!sub) return;
    setSaving(true);
    setEditError(null);
    let parsed: object;
    try {
      parsed = JSON.parse(editJson);
    } catch {
      setEditError('Invalid JSON — please fix and try again.');
      setSaving(false);
      return;
    }
    const res = await updateReviewSubmission(sub.id, { source_data: parsed });
    if (res.data) {
      setSub(res.data);
      setEditJson(JSON.stringify(res.data.source_data, null, 2));
      setEditMode(false);
    } else {
      setEditError(res.error || 'Save failed');
    }
    setSaving(false);
  }

  async function handleApprove() {
    if (!sub) return;
    setApproving(true);
    setApproveError(null);
    const body: { edited_data?: object; review_notes?: string } = {};
    if (approveNotes.trim()) body.review_notes = approveNotes.trim();
    if (sub.submission_type === 'compound_classification' && approveFinalType) {
      body.edited_data = { ...sub.source_data, final_type: approveFinalType };
    }
    const res = await approveReviewSubmission(sub.id, body);
    if (res.data) {
      setSub(res.data);
      setShowApprove(false);
    } else {
      setApproveError(res.error || 'Approve failed');
    }
    setApproving(false);
  }

  async function handleReject() {
    if (!sub) return;
    if (!rejectNotes.trim()) {
      setRejectError('Review notes are required to reject a submission.');
      return;
    }
    setRejecting(true);
    setRejectError(null);
    const res = await rejectReviewSubmission(sub.id, { review_notes: rejectNotes.trim() });
    if (res.data) {
      setSub(res.data);
      setShowReject(false);
    } else {
      setRejectError(res.error || 'Reject failed');
    }
    setRejecting(false);
  }

  if (loading) return <div className="p-10 text-gray-400">Loading…</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!sub) return null;

  const isPending = sub.status === 'pending';
  const isCompound = sub.submission_type === 'compound_classification';
  const compoundData = isCompound ? (sub.source_data as CompoundClassificationSourceData) : null;

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      {/* Back */}
      <Link
        to="/qm-admin/review-queue"
        className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-6"
      >
        <ArrowLeft size={14} /> Back to Review Queue
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <Badge
          text={sub.submission_type}
          className={TYPE_BADGE[sub.submission_type] || 'bg-gray-100 text-gray-600'}
        />
        <Badge
          text={sub.status}
          className={STATUS_BADGE[sub.status] || 'bg-gray-100 text-gray-600'}
        />
      </div>
      <h1
        className="text-xl font-bold text-[#2A2A2A] mb-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Submission {sub.id.slice(0, 8)}…
      </h1>
      <div className="flex flex-wrap gap-4 text-xs text-[#4F4F4F] mb-8">
        <span>Submitted by <strong className="text-[#2A2A2A]">{sub.submitted_by}</strong></span>
        <span>{relativeTime(sub.submitted_at)} ({new Date(sub.submitted_at).toLocaleDateString()})</span>
        {sub.reviewed_at && (
          <span>
            Reviewed {relativeTime(sub.reviewed_at)}
            {sub.reviewed_by_user_id && ` by ${sub.reviewed_by_user_id.slice(0, 8)}…`}
          </span>
        )}
      </div>

      {/* Source data */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#2A2A2A]">Source Data</h2>
          {isPending && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1 text-xs text-[#7FAEC2] hover:underline"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {editMode ? (
          <div>
            <textarea
              className="w-full font-mono text-xs border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] min-h-[200px] text-[#2A2A2A]"
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
            />
            {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
            <div className="flex gap-2 mt-3">
              <Button
                className="bg-[#7FAEC2] hover:bg-[#6a9ab5] text-white text-sm"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                className="text-sm"
                onClick={() => {
                  setEditMode(false);
                  setEditJson(JSON.stringify(sub.source_data, null, 2));
                  setEditError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : sub.submission_type === 'knowledge_gap' ? (
          <KnowledgeGapSourceDataView data={sub.source_data as KnowledgeGapSourceData} />
        ) : sub.submission_type === 'compound_classification' ? (
          <CompoundClassificationSourceDataView data={sub.source_data as CompoundClassificationSourceData} />
        ) : (
          <pre className="text-xs font-mono bg-gray-50 rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(sub.source_data, null, 2)}
          </pre>
        )}
      </div>

      {/* Resolved data (non-pending) */}
      {!isPending && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-[#2A2A2A] mb-3">Review Result</h2>
          {sub.review_notes && (
            <div className="mb-3">
              <p className="text-xs font-medium text-[#4F4F4F] mb-0.5">Notes</p>
              <p className="text-sm text-[#2A2A2A]">{sub.review_notes}</p>
            </div>
          )}
          {sub.resolved_data && (
            <div>
              <p className="text-xs font-medium text-[#4F4F4F] mb-1">Resolved Data</p>
              <pre className="text-xs font-mono bg-gray-50 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(sub.resolved_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Actions — only for pending */}
      {isPending && (
        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white gap-2 text-sm"
            onClick={() => setShowApprove(true)}
          >
            <CheckCircle className="w-4 h-4" /> Approve
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 gap-2 text-sm"
            onClick={() => setShowReject(true)}
          >
            <XCircle className="w-4 h-4" /> Reject
          </Button>
        </div>
      )}

      {/* Approve dialog */}
      {showApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowApprove(false)}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-[#2A2A2A] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Approve Submission
            </h2>

            {isCompound && compoundData && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Final type</label>
                <select
                  value={approveFinalType}
                  onChange={(e) => setApproveFinalType(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
                >
                  <option value="modified">Modified</option>
                  <option value="true_compound">True Compound</option>
                  <option value="identity">Identity</option>
                  <option value="non_compound">Non Compound</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Review notes (optional)</label>
              <textarea
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] min-h-[80px]"
                placeholder="Optional notes…"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
              />
            </div>

            {approveError && <p className="text-xs text-red-500 mb-3">{approveError}</p>}

            <div className="flex gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white text-sm"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? 'Approving…' : 'Confirm Approval'}
              </Button>
              <Button variant="outline" className="text-sm" onClick={() => setShowApprove(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject dialog */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReject(false)}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-[#2A2A2A] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Reject Submission
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
                Review notes <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] min-h-[80px]"
                placeholder="Explain why this submission is being rejected…"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>

            {rejectError && <p className="text-xs text-red-500 mb-3">{rejectError}</p>}

            <div className="flex gap-2">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white text-sm"
                onClick={handleReject}
                disabled={rejecting}
              >
                {rejecting ? 'Rejecting…' : 'Confirm Rejection'}
              </Button>
              <Button variant="outline" className="text-sm" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QMAdminReviewQueueList;
