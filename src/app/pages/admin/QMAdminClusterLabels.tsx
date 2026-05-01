import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  ClusterLabel,
  ClusterLabelAuditLogEntry,
  ClusterLabelDetail,
  ClusterLabelReasonCode,
  ClusterLabelUpdate,
  ClusterLabelWarning,
  getClusterLabel,
  rollbackClusterLabel,
  updateClusterLabelV2,
} from '../../services/adminApi';

// ─── Valid option sets ─────────────────────────────────────────────────────────

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

interface ReasonOption {
  code: ClusterLabelReasonCode;
  label: string;
}

// admin_rollback is BE-only — not exposed to the user
const REASON_OPTIONS: ReasonOption[] = [
  { code: 'misclassified_category',   label: 'Misclassified category' },
  { code: 'wrong_form_type',          label: 'Wrong form type' },
  { code: 'identity_lock_fix',        label: 'Identity lock fix' },
  { code: 'compound_type_correction', label: 'Compound type correction' },
  { code: 'admin_seeded_truth',       label: 'Admin-seeded truth' },
  { code: 'merge_consolidation',      label: 'Merge consolidation' },
  { code: 'other',                    label: 'Other (specify reason)' },
];

const UUID_REGEX = /^[0-9a-f-]{36}$/i;

// ─── High-impact banner ────────────────────────────────────────────────────────

function HighImpactBanner({ hi }: { hi: ClusterLabelDetail['high_impact'] }) {
  if (!hi.is_high_impact) return null;

  const parts: string[] = [
    `Changes affect ${hi.member_count} members and ${hi.product_count} products.`,
  ];
  if (hi.is_umbrella) parts.push('Umbrella term flagged.');

  return (
    <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
      <p className="text-sm font-semibold text-red-700 mb-1">High-impact cluster label</p>
      <p className="text-sm text-red-700">{parts.join(' ')}</p>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label }: { label: ClusterLabel }) {
  const [flagsOpen, setFlagsOpen] = useState(false);

  const rows: [string, string][] = [
    ['Canonical',     label.canonical_product ?? '—'],
    ['Category',      label.category ?? '—'],
    ['Form type',     label.form_type ?? '—'],
    ['Compound type', label.compound_type ?? '—'],
    ['Confidence',    label.confidence !== null ? `${Math.round(label.confidence * 100)}%` : '—'],
    ['Status',        label.status],
    ['Created via',   (label as unknown as { created_via?: string }).created_via ?? '—'],
  ];

  const flagKeys = Object.keys(label.identity_flags ?? {});

  return (
    <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#4F4F4F] mb-2">
        Current values
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <>
            <dt key={`k-${k}`} className="text-[#4F4F4F] font-medium">{k}</dt>
            <dd key={`v-${k}`} className="text-[#2A2A2A] font-mono break-all">{v}</dd>
          </>
        ))}
      </dl>
      {flagKeys.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setFlagsOpen((o) => !o)}
            className="text-xs font-medium text-[#7FAEC2] underline underline-offset-2 hover:text-[#5a8fa8]"
          >
            {flagsOpen ? 'Hide identity flags' : `Show identity flags (${flagKeys.length})`}
          </button>
          {flagsOpen && (
            <pre className="mt-2 max-h-48 overflow-y-auto text-xs font-mono text-[#2A2A2A] bg-white border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(label.identity_flags, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Soft-validation dialog ────────────────────────────────────────────────────

interface WarningsDialogProps {
  warnings: ClusterLabelWarning[];
  onCancel: () => void;
  onConfirm: () => void;
}

function WarningsDialog({ warnings, onCancel, onConfirm }: WarningsDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-lg font-semibold text-[#2A2A2A] mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Confirm warnings
        </h2>
        <p className="text-sm text-[#4F4F4F] mb-3">
          The server returned soft-validation warnings. Review and confirm to proceed.
        </p>
        <ul className="mb-4 space-y-2">
          {warnings.map((w, i) => (
            <li key={i} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
              <span className="font-medium text-amber-800">{w.field}: </span>
              <span className="text-amber-700">{w.message}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm and proceed</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Revert confirm dialog ────────────────────────────────────────────────────

interface RevertDialogProps {
  log: ClusterLabelAuditLogEntry;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  reverting: boolean;
}

function RevertDialog({ log, onCancel, onConfirm, reverting }: RevertDialogProps) {
  const [note, setNote] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-lg font-semibold text-[#2A2A2A] mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Revert to this state?
        </h2>
        <p className="text-sm text-[#4F4F4F] mb-1">
          This will roll back the cluster label to the state before the change recorded at:
        </p>
        <p className="text-sm font-mono text-[#2A2A2A] mb-4">
          {new Date(log.changed_at).toLocaleString()} — field: {log.field_name}
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
            Reason note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional override reason for audit log"
            rows={2}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] resize-y"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={reverting}>Cancel</Button>
          <Button onClick={() => onConfirm(note)} disabled={reverting}>
            {reverting ? 'Reverting...' : 'Confirm revert'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Audit log table ──────────────────────────────────────────────────────────

interface AuditLogTableProps {
  logs: ClusterLabelAuditLogEntry[];
  onRevert: (log: ClusterLabelAuditLogEntry) => void;
}

function AuditLogTable({ logs, onRevert }: AuditLogTableProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-[#4F4F4F] italic">No recent audit log entries.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-[#4F4F4F]">
            <th className="py-2 pr-3">Changed at</th>
            <th className="py-2 pr-3">Field</th>
            <th className="py-2 pr-3">Old value</th>
            <th className="py-2 pr-3">New value</th>
            <th className="py-2 pr-3">Reason code</th>
            <th className="py-2 pr-3">Reason</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-gray-100 align-top">
              <td className="py-2 pr-3 font-mono text-xs text-[#2A2A2A] whitespace-nowrap">
                {new Date(log.changed_at).toLocaleString()}
              </td>
              <td className="py-2 pr-3 font-mono text-xs text-[#2A2A2A]">{log.field_name}</td>
              <td className="py-2 pr-3 text-xs text-[#4F4F4F] max-w-[120px] break-all">
                {log.old_value ?? <span className="italic">null</span>}
              </td>
              <td className="py-2 pr-3 text-xs text-[#2A2A2A] max-w-[120px] break-all">
                {log.new_value ?? <span className="italic">null</span>}
              </td>
              <td className="py-2 pr-3 text-xs text-[#4F4F4F]">{log.reason_code ?? '—'}</td>
              <td className="py-2 pr-3 text-xs text-[#4F4F4F] max-w-[160px] break-words">
                {log.reason ?? '—'}
              </td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => onRevert(log)}
                  className="text-xs text-[#7FAEC2] underline underline-offset-2 hover:text-[#5a8fa8] whitespace-nowrap"
                >
                  Revert to this state
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QMAdminClusterLabels() {
  const [searchParams] = useSearchParams();

  // Load state
  const [labelId, setLabelId]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [detail, setDetail]           = useState<ClusterLabelDetail | null>(null);

  // Edit form
  const [category, setCategory]               = useState('');
  const [formType, setFormType]               = useState('');
  const [compoundType, setCompoundType]       = useState('');
  const [identityFlagsRaw, setIdentityFlagsRaw] = useState('');
  const [reasonCode, setReasonCode]           = useState<ClusterLabelReasonCode | ''>('');
  const [reason, setReason]                   = useState('');

  // Submit state
  const [saving, setSaving]               = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg]       = useState<string | null>(null);

  // Soft-validation dialog
  const [pendingWarnings, setPendingWarnings] = useState<ClusterLabelWarning[] | null>(null);
  const [pendingPayloadRef, setPendingPayloadRef] = useState<{
    fields: ClusterLabelUpdate;
    reasonCode: ClusterLabelReasonCode;
    reason: string;
  } | null>(null);

  // Rollback state
  const [revertTarget, setRevertTarget] = useState<ClusterLabelAuditLogEntry | null>(null);
  const [reverting, setReverting]       = useState(false);
  const [revertError, setRevertError]   = useState<string | null>(null);

  // ── Auto-load from URL ?id= param ─────────────────────────────────────────

  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId && UUID_REGEX.test(urlId.trim())) {
      setLabelId(urlId.trim());
      // Trigger load directly using the URL id, bypassing the stale labelId state
      (async () => {
        setLoadError(null);
        setDetail(null);
        setLoading(true);
        const res = await getClusterLabel(urlId.trim());
        setLoading(false);
        if (res.data) {
          setDetail(res.data);
        } else {
          setLoadError(res.error || 'Unknown error loading cluster label.');
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Load ──────────────────────────────────────────────────────────────────

  async function handleLoad() {
    setLoadError(null);
    setDetail(null);
    setApiError(null);
    setSuccessMsg(null);
    setValidationError(null);
    resetEditForm();

    const id = labelId.trim();
    if (!id) { setLoadError('Cluster label ID is required.'); return; }
    if (!UUID_REGEX.test(id)) {
      setLoadError('Cluster label ID does not look like a valid UUID (expected 36-char hex string).');
      return;
    }

    setLoading(true);
    const res = await getClusterLabel(id);
    setLoading(false);

    if (res.data) {
      setDetail(res.data);
    } else {
      setLoadError(res.error || 'Unknown error loading cluster label.');
    }
  }

  function resetEditForm() {
    setCategory('');
    setFormType('');
    setCompoundType('');
    setIdentityFlagsRaw('');
    setReasonCode('');
    setReason('');
    setValidationError(null);
    setApiError(null);
    setSuccessMsg(null);
  }

  // ── Validate ──────────────────────────────────────────────────────────────

  function buildFields(): ClusterLabelUpdate | null {
    const fields: ClusterLabelUpdate = {};

    if (category !== '') fields.category = category || null;
    if (formType !== '')  fields.form_type = formType || null;
    if (compoundType !== '') {
      fields.compound_type = compoundType === '__clear__'
        ? null
        : (compoundType as ClusterLabelUpdate['compound_type']);
    }

    if (identityFlagsRaw.trim() !== '') {
      try {
        const parsed = JSON.parse(identityFlagsRaw.trim());
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
          setValidationError('Identity flags must be a JSON object (e.g. {"key": "value"}).');
          return null;
        }
        fields.identity_flags = parsed as Record<string, unknown>;
      } catch {
        setValidationError('Identity flags is not valid JSON.');
        return null;
      }
    }

    if (Object.keys(fields).length === 0) {
      setValidationError('No fields selected to update. Choose at least one field to change.');
      return null;
    }

    return fields;
  }

  function validateForm(): { fields: ClusterLabelUpdate; code: ClusterLabelReasonCode; reason: string } | null {
    setValidationError(null);
    setApiError(null);
    setSuccessMsg(null);

    if (!reasonCode) {
      setValidationError('Reason code is required.');
      return null;
    }
    if (reasonCode === 'other' && !reason.trim()) {
      setValidationError('Free-text reason is required when reason code is "Other (specify reason)".');
      return null;
    }

    const fields = buildFields();
    if (!fields) return null;

    return { fields, code: reasonCode as ClusterLabelReasonCode, reason: reason.trim() };
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validated = validateForm();
    if (!validated) return;
    await doSubmit(validated.fields, validated.code, validated.reason, false);
  }

  async function doSubmit(
    fields: ClusterLabelUpdate,
    code: ClusterLabelReasonCode,
    reasonText: string,
    confirmWarnings: boolean
  ) {
    setSaving(true);
    const res = await updateClusterLabelV2(labelId.trim(), {
      fields,
      reason_code: code,
      reason: reasonText || undefined,
      confirm_warnings: confirmWarnings,
    });
    setSaving(false);

    if (res.data) {
      setDetail(res.data);
      setSuccessMsg('Cluster label updated. Audit log written.');
      resetEditForm();
      setPendingWarnings(null);
      setPendingPayloadRef(null);
    } else if (res.warnings && res.warnings.length > 0) {
      // Soft-validation: show dialog
      setPendingWarnings(res.warnings);
      setPendingPayloadRef({ fields, reasonCode: code, reason: reasonText });
    } else {
      setApiError(res.error || 'Unknown error from API.');
    }
  }

  function handleWarningsCancel() {
    setPendingWarnings(null);
    setPendingPayloadRef(null);
  }

  async function handleWarningsConfirm() {
    if (!pendingPayloadRef) return;
    const { fields, reasonCode: code, reason: reasonText } = pendingPayloadRef;
    setPendingWarnings(null);
    setPendingPayloadRef(null);
    await doSubmit(fields, code, reasonText, true);
  }

  // ── Rollback ─────────────────────────────────────────────────────────────

  async function handleRevertConfirm(note: string) {
    if (!revertTarget) return;
    setReverting(true);
    setRevertError(null);
    const res = await rollbackClusterLabel(labelId.trim(), revertTarget.id, note || undefined);
    setReverting(false);
    setRevertTarget(null);

    if (res.data) {
      setDetail(res.data);
      setSuccessMsg('Rollback applied.');
    } else {
      setRevertError(res.error || 'Rollback failed.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-[#2A2A2A] mb-1"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Cluster Labels
        </h1>
        <p className="text-sm text-[#4F4F4F]">
          Load a cluster label by ID, edit its classification, and review audit history.
        </p>
      </div>

      {/* ── Step 1: ID input ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-5">
        <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
          Cluster label ID <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <Input
            value={labelId}
            onChange={(e) => setLabelId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (UUID_REGEX.test(labelId.trim())) handleLoad(); } }}
            onBlur={() => { if (UUID_REGEX.test(labelId.trim())) handleLoad(); }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            spellCheck={false}
            className="flex-1"
          />
          <Button type="button" onClick={handleLoad} disabled={loading}>
            {loading ? 'Loading...' : 'Load'}
          </Button>
        </div>
        <p className="text-xs text-[#4F4F4F] mt-1">UUID of the cluster_label record to load and edit.</p>
        {loadError && (
          <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
      </div>

      {/* ── Step 2: loaded state ─────────────────────────────────────────────── */}
      {detail && (
        <>
          <HighImpactBanner hi={detail.high_impact} />
          <SummaryCard label={detail.cluster_label} />

          {/* Success / revert error */}
          {successMsg && (
            <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
              {successMsg}
            </div>
          )}
          {revertError && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {revertError}
            </div>
          )}

          {/* ── Edit form ───────────────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
            <h2
              className="text-base font-semibold text-[#2A2A2A] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Edit fields
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
                >
                  <option value="">
                    {detail?.cluster_label.category
                      ? `(no change — currently ${detail.cluster_label.category})`
                      : '(no change)'}
                  </option>
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
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
                >
                  <option value="">
                    {detail?.cluster_label.form_type
                      ? `(no change — currently ${detail.cluster_label.form_type})`
                      : '(no change)'}
                  </option>
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
                  value={compoundType}
                  onChange={(e) => setCompoundType(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
                >
                  <option value="">
                    {detail?.cluster_label.compound_type
                      ? `(no change — currently ${detail.cluster_label.compound_type})`
                      : '(no change)'}
                  </option>
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
                  rows={4}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] resize-y"
                  spellCheck={false}
                />
                <p className="text-xs text-[#4F4F4F] mt-1">
                  Leave empty to skip. Existing keys are preserved unless explicitly overwritten.
                </p>
              </div>

              {/* Reason code (required) */}
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

              {/* Reason text — required iff reason_code === 'other' */}
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
                  Reason{reasonCode === 'other' ? <span className="text-red-500"> *</span> : ' (optional)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    reasonCode === 'other'
                      ? 'Required: describe the specific reason for this change'
                      : 'Brief note for the audit log'
                  }
                  rows={2}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] resize-y"
                />
              </div>

              {/* Validation error */}
              {validationError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {validationError}
                </div>
              )}

              {/* API error */}
              {apiError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {apiError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" onClick={resetEditForm}>
                  Reset form
                </Button>
              </div>

            </form>
          </div>

          {/* ── Audit log ───────────────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2
              className="text-base font-semibold text-[#2A2A2A] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Recent audit log
            </h2>
            <AuditLogTable
              logs={detail.recent_audit_logs}
              onRevert={(log) => { setRevertError(null); setRevertTarget(log); }}
            />
          </div>
        </>
      )}

      {/* ── Soft-validation dialog ──────────────────────────────────────────── */}
      {pendingWarnings && (
        <WarningsDialog
          warnings={pendingWarnings}
          onCancel={handleWarningsCancel}
          onConfirm={handleWarningsConfirm}
        />
      )}

      {/* ── Rollback confirm dialog ─────────────────────────────────────────── */}
      {revertTarget && (
        <RevertDialog
          log={revertTarget}
          onCancel={() => setRevertTarget(null)}
          onConfirm={handleRevertConfirm}
          reverting={reverting}
        />
      )}
    </div>
  );
}
