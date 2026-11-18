/**
 * Tasting profiles: private to QMAdminMatchingEngine.
 *
 * Moose 2026-11-17: see every tasting profile, create, edit and delete them
 * (TastingProfilesTab), and add or remove them on the corpus heads ticked in
 * the Cluster List (AssignTastingProfilesModal). A head carries one to three.
 * Heads and profiles are named by id in every call.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  TASTING_AXES,
  assignTastingProfiles,
  createTastingProfile,
  deleteTastingProfile,
  listTastingProfiles,
  setNotForPairing,
  updateTastingProfile,
  type TastingAxis,
  type TastingProfile,
  type TastingProfileInput,
} from '../../services/adminApi';

const AXIS_LABEL: Record<TastingAxis, string> = {
  weight: 'Weight', fat: 'Fat', acid: 'Acid', sweetness: 'Sweet', heat: 'Heat', salt: 'Salt', umami: 'Umami', bitter: 'Bitter',
};

type Draft = { key: string; kind: string; rule: string; notes: string } & Record<TastingAxis, number>;

function blankDraft(kind: string): Draft {
  return { key: '', kind, rule: '', notes: '', weight: 3, fat: 3, acid: 3, sweetness: 1, heat: 1, salt: 3, umami: 3, bitter: 1 };
}

function draftOf(p: TastingProfile): Draft {
  const d = blankDraft(p.kind);
  TASTING_AXES.forEach((a) => { d[a] = p.scores[a] ?? 1; });
  return { ...d, key: p.key, rule: p.rule, notes: p.notes };
}

function ScoreInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="border border-gray-300 rounded px-1 py-0.5 text-sm bg-white"
    >
      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

export function TastingProfilesTab() {
  const [profiles, setProfiles] = useState<TastingProfile[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [rules, setRules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listTastingProfiles();
    setLoading(false);
    if (res.data) {
      setProfiles(res.data.profiles);
      setKinds(res.data.kinds);
      setRules(res.data.rules);
      setError(null);
    } else {
      setError(res.error || 'Could not load tasting profiles.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? profiles.filter((p) => p.key.includes(needle) || p.kind.includes(needle)) : profiles;
  }, [profiles, q]);

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    setDraft(blankDraft(kinds.includes('cuisine') ? 'cuisine' : kinds[0] || 'component'));
    setError(null);
  }

  function startEdit(p: TastingProfile) {
    setCreating(false);
    setEditingId(p.id);
    setDraft(draftOf(p));
    setError(null);
  }

  function cancel() {
    setCreating(false);
    setEditingId(null);
    setDraft(null);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    const input: TastingProfileInput = { rule: draft.rule, notes: draft.notes };
    TASTING_AXES.forEach((a) => { input[a] = draft[a]; });
    if (kinds.includes(draft.kind)) input.kind = draft.kind;
    const res = creating
      ? await createTastingProfile({ ...input, key: draft.key, kind: draft.kind })
      : await updateTastingProfile(editingId as string, input);
    setSaving(false);
    if (res.data) {
      cancel();
      load();
    } else {
      setError(res.error || 'Could not save.');
    }
  }

  async function remove(p: TastingProfile) {
    if (!window.confirm(`Delete the tasting profile "${p.key}"?`)) return;
    const res = await deleteTastingProfile(p.id);
    if (res.data) load();
    else setError(res.error || 'Could not delete.');
  }

  const editor = (isNew: boolean) => draft && (
    <tr className="border-b border-gray-100 bg-[#f0f7fb] align-middle">
      <td className="px-3 py-2">
        {isNew ? (
          <input
            autoFocus
            value={draft.key}
            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
            placeholder="name, e.g. italian"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-40"
          />
        ) : (
          <span className="font-medium text-[#2A2A2A]">#{draft.key}</span>
        )}
      </td>
      <td className="px-3 py-2">
        <select
          value={draft.kind}
          onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
          className="border border-gray-300 rounded px-1 py-0.5 text-sm bg-white"
        >
          {(kinds.includes(draft.kind) ? kinds : [draft.kind, ...kinds]).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </td>
      {TASTING_AXES.map((a) => (
        <td key={a} className="px-2 py-2 text-center">
          <ScoreInput value={draft[a]} onChange={(n) => setDraft({ ...draft, [a]: n })} />
        </td>
      ))}
      <td className="px-3 py-2">
        <select
          value={draft.rule}
          onChange={(e) => setDraft({ ...draft, rule: e.target.value })}
          className="border border-gray-300 rounded px-1 py-0.5 text-sm bg-white max-w-[150px]"
        >
          <option value="">no rule</option>
          {rules.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="what it covers"
          className="border border-gray-300 rounded px-2 py-1 text-sm w-full min-w-[160px]"
        />
      </td>
      <td className="px-3 py-2 text-[#4F4F4F]" />
      <td className="px-3 py-2 whitespace-nowrap">
        <button
          type="button"
          onClick={save}
          disabled={saving || (isNew && !draft.key.trim())}
          className="text-xs px-2 py-1 bg-[#2A2A2A] text-white rounded mr-2 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={cancel} className="text-xs text-[#7FAEC2] underline underline-offset-2">Cancel</button>
      </td>
    </tr>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tasting profiles…"
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-64"
        />
        <p className="text-sm text-[#4F4F4F]">
          {loading ? 'Loading…' : `${shown.length} of ${profiles.length} tasting profiles`}
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="ml-auto text-sm px-3 py-1.5 bg-[#2A2A2A] text-white rounded-md hover:bg-[#1a1a1a]"
        >
          New tasting profile
        </button>
      </div>
      <p className="text-sm text-[#4F4F4F] mb-3">
        Each score runs 1 (low) to 5 (high). A corpus head carries one to three tasting profiles; its scores are the
        average of theirs, and a rule on any one of them stays in force. Add them to heads from the Cluster List tab.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-[#4F4F4F]">
                <th className="px-3 py-2">Tasting profile</th>
                <th className="px-3 py-2">Kind</th>
                {TASTING_AXES.map((a) => <th key={a} className="px-2 py-2 text-center">{AXIS_LABEL[a]}</th>)}
                <th className="px-3 py-2">Rule</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2 text-right">Heads</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {creating && editor(true)}
              {!loading && shown.length === 0 && !creating && (
                <tr><td colSpan={14} className="px-3 py-8 text-center text-sm text-[#4F4F4F] italic">No tasting profiles found.</td></tr>
              )}
              {shown.map((p) => (editingId === p.id ? (
                <Fragment key={p.id}>{editor(false)}</Fragment>
              ) : (
                <tr key={p.id} className="border-b border-gray-100 align-middle hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-[#2A2A2A] whitespace-nowrap">#{p.key}</td>
                  <td className="px-3 py-2 text-[#4F4F4F]">{p.kind}</td>
                  {TASTING_AXES.map((a) => (
                    <td key={a} className="px-2 py-2 text-center tabular-nums text-[#2A2A2A]">{p.scores[a] ?? '-'}</td>
                  ))}
                  <td className="px-3 py-2 text-[#4F4F4F] text-xs">{p.rule || <span className="text-gray-300">-</span>}</td>
                  <td className="px-3 py-2 text-[#4F4F4F] text-xs max-w-[240px] truncate" title={p.notes}>{p.notes}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#4F4F4F]">{p.heads_count.toLocaleString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button type="button" onClick={() => startEdit(p)} className="text-xs text-[#7FAEC2] underline underline-offset-2 mr-3">Edit</button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      disabled={p.heads_count > 0}
                      title={p.heads_count > 0 ? `${p.heads_count} heads carry this. Take it off them first.` : 'Delete'}
                      className="text-xs text-red-600 underline underline-offset-2 disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Add or remove tasting profiles on the corpus heads ticked in the Cluster
 * List. A head that would end up with more than three is refused by the
 * server and left as it was; the rest go through, and both are reported.
 */
export function AssignTastingProfilesModal({
  headIds,
  onClose,
  onDone,
}: {
  headIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [profiles, setProfiles] = useState<TastingProfile[]>([]);
  const [q, setQ] = useState('');
  const [add, setAdd] = useState<Set<string>>(new Set());
  const [remove, setRemove] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; refused: Array<{ cluster_label_id: string; reason: string }> } | null>(null);

  useEffect(() => {
    listTastingProfiles().then((res) => {
      if (res.data) setProfiles(res.data.profiles);
      else setError(res.error || 'Could not load tasting profiles.');
    });
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? profiles.filter((p) => p.key.includes(needle) || p.kind.includes(needle)) : profiles;
  }, [profiles, q]);

  function cycle(id: string) {
    const nextAdd = new Set(add);
    const nextRemove = new Set(remove);
    if (add.has(id)) { nextAdd.delete(id); nextRemove.add(id); }
    else if (remove.has(id)) { nextRemove.delete(id); }
    else { nextAdd.add(id); }
    setAdd(nextAdd);
    setRemove(nextRemove);
  }

  async function mark(value: boolean) {
    setBusy(true);
    setError(null);
    const res = await setNotForPairing(headIds, value);
    setBusy(false);
    if (res.data) {
      setResult({ updated: res.data.updated.length, refused: res.data.refused });
      onDone();
    } else {
      setError(res.error || 'Could not save.');
    }
  }

  async function apply() {
    setBusy(true);
    setError(null);
    const res = await assignTastingProfiles({ cluster_label_ids: headIds, add: [...add], remove: [...remove] });
    setBusy(false);
    if (res.data) {
      setResult({ updated: res.data.updated.length, refused: res.data.refused });
      onDone();
    } else {
      setError(res.error || 'Could not save.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#2A2A2A]">Tasting profiles for {headIds.length} head{headIds.length !== 1 ? 's' : ''}</h2>
          <p className="text-sm text-[#4F4F4F] mt-1">
            Click once to add (green), again to remove (red), again to leave alone. A head carries at most three.
          </p>
        </div>

        {result ? (
          <div className="px-5 py-4 overflow-y-auto text-sm">
            <p className="text-[#2A2A2A] font-medium">{result.updated} head{result.updated !== 1 ? 's' : ''} updated.</p>
            {result.refused.length > 0 && (
              <>
                <p className="text-red-600 font-medium mt-3">{result.refused.length} refused and left as they were:</p>
                <ul className="mt-1 text-[#4F4F4F] text-xs space-y-0.5">
                  {result.refused.slice(0, 50).map((r) => <li key={r.cluster_label_id}>{r.cluster_label_id}: {r.reason}</li>)}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div className="px-5 py-4 overflow-y-auto">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tasting profiles…"
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full mb-3"
            />
            <div className="flex flex-wrap gap-1.5">
              {shown.map((p) => {
                const state = add.has(p.id) ? 'add' : remove.has(p.id) ? 'remove' : 'none';
                const tone = state === 'add'
                  ? 'bg-green-100 border-green-500 text-green-800'
                  : state === 'remove'
                    ? 'bg-red-100 border-red-500 text-red-800 line-through'
                    : 'bg-white border-gray-300 text-[#2A2A2A] hover:bg-gray-50';
                return (
                  <button key={p.id} type="button" onClick={() => cycle(p.id)} className={`text-xs px-2 py-1 rounded-full border ${tone}`}>
                    #{p.key}
                  </button>
                );
              })}
              {shown.length === 0 && <p className="text-sm italic text-[#4F4F4F]">No tasting profiles match.</p>}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-[#4F4F4F] mb-2">
                No taste to pair at all (a thickener, a brand name)? Mark the head instead of giving it a profile.
              </p>
              <button type="button" onClick={() => mark(true)} disabled={busy} className="text-xs px-2 py-1 border border-gray-300 rounded mr-2 hover:bg-gray-50 disabled:opacity-40">
                Mark not for pairing
              </button>
              <button type="button" onClick={() => mark(false)} disabled={busy} className="text-xs text-[#7FAEC2] underline underline-offset-2 disabled:opacity-40">
                Take the mark off
              </button>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-200 flex items-center gap-3">
          {!result && (
            <span className="text-xs text-[#4F4F4F]">Add {add.size}, remove {remove.size}</span>
          )}
          <button type="button" onClick={onClose} className="ml-auto text-sm text-[#7FAEC2] underline underline-offset-2">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={apply}
              disabled={busy || (add.size === 0 && remove.size === 0)}
              className="text-sm px-3 py-1.5 bg-[#2A2A2A] text-white rounded-md hover:bg-[#1a1a1a] disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Apply'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
