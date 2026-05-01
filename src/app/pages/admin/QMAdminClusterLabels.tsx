import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  ClusterLabel,
  ClusterLabelUpdate,
  updateClusterLabel,
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

const UUID_REGEX = /^[0-9a-f-]{36}$/i;

// ─── Component ─────────────────────────────────────────────────────────────────

export function QMAdminClusterLabels() {
  const [labelId, setLabelId] = useState('');
  const [category, setCategory] = useState('');
  const [formType, setFormType] = useState('');
  const [compoundType, setCompoundType] = useState('');
  const [identityFlagsRaw, setIdentityFlagsRaw] = useState('');
  const [reason, setReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<ClusterLabel | null>(null);

  function validate(): ClusterLabelUpdate | null {
    setValidationError(null);
    setApiError(null);
    setSuccessResult(null);

    if (!labelId.trim()) {
      setValidationError('Cluster label ID is required.');
      return null;
    }
    if (!UUID_REGEX.test(labelId.trim())) {
      setValidationError('Cluster label ID does not look like a valid UUID (expected 36-char hex string).');
      return null;
    }

    const fields: ClusterLabelUpdate = {};

    if (category !== '') {
      fields.category = category || null;
    }
    if (formType !== '') {
      fields.form_type = formType || null;
    }
    if (compoundType !== '') {
      if (compoundType === '__clear__') {
        fields.compound_type = null;
      } else {
        fields.compound_type = compoundType as ClusterLabelUpdate['compound_type'];
      }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fields = validate();
    if (!fields) return;

    setSaving(true);
    const res = await updateClusterLabel(
      labelId.trim(),
      fields,
      reason.trim() || undefined
    );
    setSaving(false);

    if (res.data) {
      setSuccessResult(res.data);
    } else {
      setApiError(res.error || 'Unknown error from API.');
    }
  }

  function handleReset() {
    setLabelId('');
    setCategory('');
    setFormType('');
    setCompoundType('');
    setIdentityFlagsRaw('');
    setReason('');
    setValidationError(null);
    setApiError(null);
    setSuccessResult(null);
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-[#2A2A2A] mb-1"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Cluster Labels
        </h1>
        <p className="text-sm text-[#4F4F4F]">
          Edit category, form_type, compound_type, and identity_flags by cluster label ID.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Cluster label ID */}
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
              Cluster label ID <span className="text-red-500">*</span>
            </label>
            <Input
              value={labelId}
              onChange={(e) => setLabelId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              spellCheck={false}
            />
            <p className="text-xs text-[#4F4F4F] mt-1">UUID of the cluster_label record to patch.</p>
          </div>

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
              <option value="">(no change)</option>
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
              <option value="">(no change)</option>
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
              rows={4}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] resize-y"
              spellCheck={false}
            />
            <p className="text-xs text-[#4F4F4F] mt-1">
              Leave empty to skip. Existing keys are preserved unless explicitly overwritten.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief note for the audit log"
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

          {/* Success */}
          {successResult && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm font-medium text-green-700 mb-2">Updated. Audit log written.</p>
              <pre className="text-xs text-green-900 bg-green-100 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(successResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
