/**
 * DRAFT TASTE PROFILES (Moose Q95 to Q98). A food the corpus does not know
 * comes back from PairIt with a draft: the corpus heads found in its words
 * (tags) and their existing tasting profiles added up. Moose's click is the
 * write:
 *   Confirm  makes the head and links its profiles (source agent_draft)
 *   Edit     picks other profiles (from the tags, or any head's); the server
 *            adds them up again, no score is ever typed here
 *   Reject   archives the row; that food is not drafted again
 * Plus "What we're growing" (every draft and agent_draft head, newest first)
 * and "Suggested attributes" (approve or dismiss; a suggestion never feeds a
 * score).
 *
 * Server: QuoteMe Api::V1::Admin::AgentDraftsController and
 * CorpusAttributesController. Shown on the Gap Filler page (everything) and
 * on Matching Engine > Corpus Lookup (only the drafts for the typed food).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  TASTING_AXES,
  approveCorpusAttribute,
  confirmAgentDraft,
  dismissCorpusAttribute,
  getAgentDrafts,
  getCorpusAttributes,
  getCorpusLookup,
  getStoredRulesBundle,
  previewDraftProfiles,
  rejectAgentDraft,
  searchDraftProfiles,
  type AgentDraftEntry,
  type CorpusAttribute,
  type DraftPreview,
  type DraftProfileOption,
  type PairItKind,
  type StoredRulesBundle,
  type TastingAxis,
} from '../../services/adminApi';
import { pickKindsForScores, tablesFor } from './corpusLookup/pairitLookup';

export const SAMPLE_STORE = 'total-bev-westminster';
const MAX_PROFILES = 3;

const AXIS_SHORT: Record<TastingAxis, string> = {
  weight: 'Wt', fat: 'Fat', acid: 'Acid', sweetness: 'Sweet', heat: 'Heat', salt: 'Salt', umami: 'Umami', bitter: 'Bitter',
};

function ScoreLine({ scores }: { scores: Partial<Record<TastingAxis, number | null>> | null | undefined }) {
  if (!scores) return <span className="text-xs text-gray-500">no scores</span>;
  return <span className="text-xs text-gray-600">{TASTING_AXES.map((a) => `${AXIS_SHORT[a]} ${scores[a] ?? '-'}`).join(' · ')}</span>;
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-600',
};

function StatusPill({ status }: { status: string }) {
  return <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

const norm = (s: string | null | undefined) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** The store's kinds and the rules tables, loaded once for every sample. */
function useSampleContext(store: string) {
  const [bundle, setBundle] = useState<StoredRulesBundle | null>(null);
  const [kinds, setKinds] = useState<PairItKind[] | null>(null);
  const [storeName, setStoreName] = useState<string>(store);
  useEffect(() => {
    let live = true;
    getStoredRulesBundle().then((res) => { if (live && res.data) setBundle(res.data); });
    getCorpusLookup('', store).then((res) => {
      if (!live) return;
      setKinds(res.data?.kinds || []);
      if (res.data?.store?.name) setStoreName(res.data.store.name);
    });
    return () => { live = false; };
  }, [store]);
  const tables = useMemo(() => tablesFor(bundle), [bundle]);
  return { kinds, T: tables.T, storeName };
}

function SamplePairing({ food, scores, ctx }: {
  food: string;
  scores: Partial<Record<TastingAxis, number | null>> | null;
  ctx: ReturnType<typeof useSampleContext>;
}) {
  if (!scores) return null;
  if (!ctx.kinds) return <div className="text-xs text-gray-500">Loading the sample pairing...</div>;
  const picks = pickKindsForScores(food, scores as Record<string, number | null>, ctx.kinds, ctx.T);
  const names = [...picks.traditional.map((k) => k.name), ...(picks.adventurous ? [`${picks.adventurous.name} (something you may not have tried)`] : [])];
  return (
    <div className="text-xs text-[#2A2A2A]" data-testid="draft-sample">
      Sample pairing at {ctx.storeName}: {names.length ? names.join(', ') : 'no kind at this store clears it'}
    </div>
  );
}

function DraftCard({ entry, categories, ctx, onDone }: {
  entry: AgentDraftEntry;
  categories: string[];
  ctx: ReturnType<typeof useSampleContext>;
  onDone: (updated: AgentDraftEntry) => void;
}) {
  const [name, setName] = useState(entry.food || '');
  const [category, setCategory] = useState(entry.default_category || '');
  const [chosen, setChosen] = useState<string[]>(entry.pairme_dish_axis_ids || []);
  const [preview, setPreview] = useState<DraftPreview | null>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<DraftProfileOption[]>([]);
  const [extraKeys, setExtraKeys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which tag brought each profile, for the label beside its box.
  const labelFor = useMemo(() => {
    const out: Record<string, string> = { ...extraKeys };
    for (const t of entry.tags) for (const id of t.pairme_dish_axis_ids || []) out[id] = out[id] || `from ${t.name}`;
    for (const id of entry.left_out_profile_ids) out[id] = out[id] || 'left out by the 3 cap';
    preview?.profile_ids.forEach((id, i) => { if (preview.keys[i]) out[id] = `${preview.keys[i]}${out[id] && !out[id].startsWith(preview.keys[i]) ? ` (${out[id]})` : ''}`; });
    return out;
  }, [entry, extraKeys, preview]);

  const candidates = useMemo(() => {
    const ids = [...entry.pairme_dish_axis_ids, ...entry.tags.flatMap((t) => t.pairme_dish_axis_ids || []), ...entry.left_out_profile_ids, ...Object.keys(extraKeys)];
    return ids.filter((id, i) => id && ids.indexOf(id) === i);
  }, [entry, extraKeys]);

  const edited = chosen.slice().sort().join() !== entry.pairme_dish_axis_ids.slice().sort().join();
  const shownScores = edited ? preview?.scores || null : entry.scores;

  useEffect(() => {
    if (!edited || chosen.length === 0) { setPreview(null); return; }
    let live = true;
    previewDraftProfiles(chosen).then((res) => {
      if (!live) return;
      if (res.error) setError(res.error); else { setError(null); setPreview(res.data || null); }
    });
    return () => { live = false; };
  }, [chosen, edited]);

  const toggle = (id: string) => {
    setChosen((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_PROFILES ? cur : [...cur, id]));
  };

  const runSearch = async () => {
    const res = await searchDraftProfiles(search.trim());
    setFound(res.data?.profiles || []);
  };

  const confirm = async () => {
    if (!entry.id) return;
    setBusy(true);
    const res = await confirmAgentDraft(entry.id, { name: name.trim(), category, profile_ids: chosen });
    setBusy(false);
    if (res.error || !res.data) { setError(res.error || 'Confirm failed'); return; }
    onDone(res.data.entry);
  };

  const reject = async () => {
    if (!entry.id) return;
    setBusy(true);
    const res = await rejectAgentDraft(entry.id);
    setBusy(false);
    if (res.error || !res.data) { setError(res.error || 'Reject failed'); return; }
    onDone(res.data.entry);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white" data-testid="draft-card">
      <div className="flex flex-wrap items-baseline gap-2 mb-1">
        <strong className="text-sm text-[#2A2A2A]">{entry.food}</strong>
        <StatusPill status={entry.status} />
        <span className="text-[11px] text-gray-400">
          heard {entry.occurrence_count ?? 1}x{entry.store_slugs.length ? ` at ${entry.store_slugs.join(', ')}` : ''}
        </span>
      </div>
      <div className="text-xs text-gray-600 mb-1">
        Tags: {entry.tags.length ? entry.tags.map((t) => `${t.name}${t.from === 'agent' ? ' (agent)' : ''}`).join(' + ') : 'none'}
      </div>
      <div className="mb-1"><ScoreLine scores={shownScores} />{edited && <span className="text-[11px] text-amber-700 ml-2">edited</span>}</div>
      {entry.rules.length > 0 && <div className="text-[11px] text-gray-500 mb-1">Rules: {entry.rules.join(', ')}</div>}
      <div className="mb-2"><SamplePairing food={entry.component_text || entry.food || ''} scores={shownScores} ctx={ctx} /></div>

      {editing && (
        <div className="border-t border-gray-100 pt-2 mb-2">
          <div className="text-[11px] text-gray-500 mb-1">Tasting profiles (up to {MAX_PROFILES}). Scores are added up by the server.</div>
          {candidates.map((id) => (
            <label key={id} className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={chosen.includes(id)} onChange={() => toggle(id)} />
              <span>{labelFor[id] || 'profile'}</span>
              <span className="text-[10px] text-gray-400 font-mono">{id.slice(0, 8)}</span>
            </label>
          ))}
          <div className="flex gap-2 mt-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="find another profile, e.g. pork" className="h-8 text-xs max-w-xs" />
            <Button size="sm" variant="outline" onClick={runSearch} disabled={search.trim().length < 2}>Find</Button>
          </div>
          {found.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {found.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="text-[11px] px-2 py-0.5 rounded border border-gray-200 hover:border-[#7FAEC2]"
                  onClick={() => { setExtraKeys((cur) => ({ ...cur, [p.id]: p.key })); if (!chosen.includes(p.id)) toggle(p.id); }}
                >
                  + {p.key}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {entry.status === 'draft' && (
        <div className="flex flex-wrap items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs max-w-[12rem]" aria-label="Head name" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 text-xs border border-gray-300 rounded px-1 bg-white" aria-label="Category">
            <option value="">category...</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button size="sm" onClick={confirm} disabled={busy || !name.trim() || !category || chosen.length === 0}>
            {busy ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)} disabled={busy}>
            <Pencil size={12} className="mr-1" />{editing ? 'Done editing' : 'Edit'}
          </Button>
          <Button size="sm" variant="outline" onClick={reject} disabled={busy}>
            <X size={12} className="mr-1" />Reject
          </Button>
        </div>
      )}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}

/**
 * match: only the drafts for this food (Corpus Lookup). Without it, every
 * draft waiting on a click plus "What we're growing" (Gap Filler page).
 */
export function AgentDraftsSection({ match, store = SAMPLE_STORE }: { match?: string; store?: string }) {
  const [entries, setEntries] = useState<AgentDraftEntry[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ctx = useSampleContext(store);

  const load = useCallback(async () => {
    const res = await getAgentDrafts();
    if (res.error || !res.data) { setError(res.error || 'Could not load the drafts'); return; }
    setError(null);
    setEntries(res.data.entries);
    setCategories(res.data.categories);
  }, []);
  useEffect(() => { load(); }, [load]);

  const replace = (updated: AgentDraftEntry) => {
    setEntries((cur) => (cur || []).map((e) => (e.id && e.id === updated.id ? updated : e)));
  };

  if (error) return <div className="text-sm text-red-600 mb-4">{error}</div>;
  if (!entries) return <div className="text-sm text-gray-500 mb-4">Loading the drafts...</div>;

  const wanted = norm(match);
  const forFood = wanted ? entries.filter((e) => norm(e.component_text) === wanted || norm(e.food) === wanted) : entries;
  const waiting = forFood.filter((e) => e.status === 'draft');

  if (wanted) {
    if (!forFood.length) return null;
    return (
      <section className="border border-gray-200 rounded-lg p-4 mb-4 bg-white" data-testid="agent-drafts-for-food">
        <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">Draft for this food</h3>
        <div className="grid gap-3">
          {forFood.map((e) => (e.status === 'draft'
            ? <DraftCard key={e.id || e.cluster_label_id || ''} entry={e} categories={categories} ctx={ctx} onDone={replace} />
            : <div key={e.id || e.cluster_label_id || ''} className="text-sm">{e.food} <StatusPill status={e.status} /> {e.name && `as ${e.name}`}</div>))}
        </div>
      </section>
    );
  }

  return (
    <div data-testid="agent-drafts">
      <section className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
        <h3 className="text-sm font-semibold text-[#2A2A2A] mb-1">Drafts waiting on you ({waiting.length})</h3>
        <p className="text-xs text-gray-500 mb-3">
          Foods PairIt did not know, paired for now from the corpus foods in their words. Confirm adds the food to the corpus with these profiles.
        </p>
        {waiting.length === 0
          ? <div className="text-sm text-gray-500">No drafts waiting.</div>
          : <div className="grid gap-3 md:grid-cols-2">{waiting.map((e) => <DraftCard key={e.id || ''} entry={e} categories={categories} ctx={ctx} onDone={replace} />)}</div>}
      </section>

      <section className="border border-gray-200 rounded-lg p-4 mb-4 bg-white" data-testid="growing">
        <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">What we're growing ({entries.length})</h3>
        {entries.length === 0 ? <div className="text-sm text-gray-500">Nothing yet.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="pb-1 pr-3">Food</th><th className="pb-1 pr-3">Status</th><th className="pb-1 pr-3">Head</th>
                  <th className="pb-1 pr-3">Tags</th><th className="pb-1 pr-3">Scores</th><th className="pb-1">When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id || e.cluster_label_id || ''} className="border-t border-gray-100 align-top">
                    <td className="py-1 pr-3">{e.food}</td>
                    <td className="py-1 pr-3"><StatusPill status={e.status} /></td>
                    <td className="py-1 pr-3">{e.name || '-'}{e.category ? ` (${e.category})` : ''}</td>
                    <td className="py-1 pr-3">{e.tags.map((t) => t.name).join(' + ') || '-'}</td>
                    <td className="py-1 pr-3"><ScoreLine scores={e.scores} /></td>
                    <td className="py-1 text-gray-500">{e.when ? new Date(e.when).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SuggestedAttributes />
    </div>
  );
}

export function SuggestedAttributes() {
  const [rows, setRows] = useState<CorpusAttribute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getCorpusAttributes('pending').then((res) => {
      if (res.error) setError(res.error); else setRows(res.data?.attributes || []);
    });
  }, []);

  const act = async (row: CorpusAttribute, approve: boolean) => {
    setBusy(row.id);
    const res = approve ? await approveCorpusAttribute(row.id) : await dismissCorpusAttribute(row.id);
    setBusy(null);
    if (res.error) { setError(res.error); return; }
    setRows((cur) => (cur || []).filter((r) => r.id !== row.id));
  };

  return (
    <section className="border border-gray-200 rounded-lg p-4 mb-4 bg-white" data-testid="suggested-attributes">
      <h3 className="text-sm font-semibold text-[#2A2A2A] mb-1">Suggested attributes ({rows?.length ?? 0})</h3>
      <p className="text-xs text-gray-500 mb-3">Words the corpus does not have yet, suggested while drafting. They never change a score.</p>
      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
      {!rows ? <div className="text-sm text-gray-500">Loading...</div> : rows.length === 0 ? <div className="text-sm text-gray-500">None waiting.</div> : (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400">
              <th className="pb-1 pr-3">Attribute</th><th className="pb-1 pr-3">For</th><th className="pb-1 pr-3">Why</th><th className="pb-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="py-1 pr-3 font-medium">{r.attribute}</td>
                <td className="py-1 pr-3">{r.for_component_text || '-'}</td>
                <td className="py-1 pr-3 text-gray-600">{r.reason || '-'}</td>
                <td className="py-1 whitespace-nowrap">
                  <Button size="sm" variant="outline" className="h-7 mr-1" disabled={busy === r.id} onClick={() => act(r, true)}>Approve</Button>
                  <Button size="sm" variant="outline" className="h-7" disabled={busy === r.id} onClick={() => act(r, false)}>Dismiss</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
