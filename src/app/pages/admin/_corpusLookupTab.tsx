/**
 * Corpus lookup: private to QMAdminMatchingEngine (Moose 2026-11-18).
 *
 * Type a food ("baked beans") and see every matching cluster label, its
 * tasting profile links (cluster_label_tasting_profiles -> pairme_dish_axes),
 * whether it is not_for_pairing, and, with a store picked (Total Bev first),
 * the kinds of wine and the four bottles a kind's lane holds, as PairIt
 * would offer them.
 *
 * Reads only. Ids are the join. The server answers what the corpus and the
 * store hold (GET /api/v1/admin/corpus_lookup, Pairme::CorpusLookup). The
 * picks are made in the browser by a pinned copy of PairIt's own engine
 * (ruling Q265; corpusLookup/pairitLookup.ts), on the store's kinds and the
 * rules bundle PairIt was last served.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Loader2, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  TASTING_AXES,
  getCorpusLookup,
  getCorpusLookupBottles,
  getStoredRulesBundle,
  type CorpusLookupLabel,
  type CorpusLookupResponse,
  type PairItBands,
  type PairItKind,
  type StoredRulesBundle,
  type TastingAxis,
} from '../../services/adminApi';
import { ENGINE_PIN, fitBottles, formatPrice, pickKinds, tablesFor } from './corpusLookup/pairitLookup';

export const DEFAULT_STORE = 'total-bev-westminster';

const AXIS_SHORT: Record<TastingAxis, string> = {
  weight: 'Wt', fat: 'Fat', acid: 'Acid', sweetness: 'Sweet', heat: 'Heat', salt: 'Salt', umami: 'Umami', bitter: 'Bitter',
};

function Scores({ scores }: { scores: Partial<Record<TastingAxis, number | null>> }) {
  return (
    <span className="text-xs text-gray-600">
      {TASTING_AXES.map((a) => `${AXIS_SHORT[a]} ${scores[a] ?? '-'}`).join(' · ')}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
      <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">{title}</h3>
      {children}
    </section>
  );
}

function LabelRow({ label }: { label: CorpusLookupLabel }) {
  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="py-2 pr-3">
        <div className="font-medium text-[#2A2A2A]">{label.canonical_product}</div>
        <div className="text-[11px] text-gray-400 font-mono">{label.id}</div>
      </td>
      <td className="py-2 pr-3 text-xs text-gray-600">
        {label.category || '-'}
        <div className="text-gray-400">{label.status}{label.merged_into_id ? ' (merged)' : ''}</div>
      </td>
      <td className="py-2 pr-3 text-xs">
        {label.corpus === 'matched' && <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700">corpus reads it</span>}
        {label.corpus === 'suggested' && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">suggested</span>}
      </td>
      <td className="py-2 pr-3 text-xs">
        {label.not_for_pairing
          ? <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700">not for pairing</span>
          : <span className="text-gray-400">pairs</span>}
      </td>
      <td className="py-2 pr-3">
        {label.tasting_profiles.length === 0 && <span className="text-xs text-gray-400">none</span>}
        {label.tasting_profiles.map((p) => (
          <div key={p.id} className="mb-1">
            <span className="text-sm text-[#2A2A2A]">{p.key}</span>
            <span className="text-[11px] text-gray-400"> ({p.kind}{p.rule ? `, ${p.rule}` : ''}, {p.link_source})</span>
            <div><Scores scores={p.scores} /></div>
          </div>
        ))}
      </td>
      <td className="py-2">
        {label.combined
          ? (
            <div>
              <Scores scores={label.combined.scores} />
              {label.combined.rules.length > 0 && <div className="text-[11px] text-gray-500">rules: {label.combined.rules.join(', ')}</div>}
            </div>
          )
          : <span className="text-xs text-gray-400">{label.not_for_pairing ? 'no scores (not for pairing)' : 'no profile'}</span>}
      </td>
    </tr>
  );
}

function KindLane({ kind, food, T, store, flagLine }: { kind: PairItKind; food: string; T: any; store: string; flagLine: string }) {
  const [bands, setBands] = useState<PairItBands | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setBands(null);
    setError(null);
    getCorpusLookupBottles(store, kind.id).then((res) => {
      if (!live) return;
      if (res.data) setBands(res.data);
      else setError(res.error || 'Could not load bottles.');
    });
    return () => { live = false; };
  }, [store, kind.id]);

  const lane = useMemo(() => (bands ? fitBottles(bands.bands, food, T) : []), [bands, food, T]);

  return (
    <div className="border border-gray-200 rounded p-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{flagLine}</div>
      <div className="font-medium text-[#2A2A2A]">
        {kind.name}
        {kind.push && <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{kind.push === 'big_push' ? 'big push' : 'push'}</span>}
      </div>
      <div className="text-xs text-gray-500 mb-2">
        {kind.profile.colour || '-'} · grape {kind.profile.grape_head || '-'} · region {kind.profile.region_head || '-'} · {kind.bottle_count} bottles
      </div>
      {!bands && !error && <div className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> bottles</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
      {bands && lane.length === 0 && <div className="text-xs text-gray-500">No bottle of this kind fits this food.</div>}
      {lane.map((b) => (
        <div key={b.id} className="text-sm py-1 border-t border-gray-100">
          <span className="text-[#2A2A2A]">{b.producer}</span>
          {b.wine ? <span className="text-gray-600"> {b.wine}</span> : null}
          {b.vintage ? <span className="text-gray-500"> {b.vintage}</span> : null}
          <span className="text-gray-500"> · {b.region || 'no region'} · bottle · {formatPrice(b.shown_price_cents)}</span>
          {b.push && <span className="ml-1 text-[11px] text-blue-700">({b.push === 'big_push' ? 'big push' : 'push'})</span>}
          <div className="text-[11px] text-gray-400 font-mono">product {b.id}</div>
        </div>
      ))}
    </div>
  );
}

export function CorpusLookupTab() {
  const [params, setParams] = useSearchParams();
  const [food, setFood] = useState(params.get('food') || '');
  const [store, setStore] = useState(params.get('store') || DEFAULT_STORE);
  const [answer, setAnswer] = useState<CorpusLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<StoredRulesBundle | null>(null);
  const [bundleLoaded, setBundleLoaded] = useState(false);

  useEffect(() => {
    getStoredRulesBundle().then((res) => {
      setBundle(res.data || null);
      setBundleLoaded(true);
    });
  }, []);

  const run = useCallback(async (text: string, slug: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    const res = await getCorpusLookup(text.trim(), slug);
    setLoading(false);
    if (res.data) {
      setAnswer(res.data);
      const next = new URLSearchParams(params);
      next.set('food', text.trim());
      next.set('store', slug);
      setParams(next, { replace: true });
    } else {
      setError(res.error || 'Could not look that up.');
    }
  }, [params, setParams]);

  useEffect(() => {
    if (food.trim()) run(food, store);
    // On arrival only: a shared link opens on its own answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tables = useMemo(() => tablesFor(bundle), [bundle]);
  const picks = useMemo(
    () => (answer && answer.store ? pickKinds(answer.q, answer.kinds, tables.T) : null),
    [answer, tables],
  );

  return (
    <div>
      <p className="text-sm text-[#4F4F4F] mb-4">
        Type a food to see its cluster labels, their tasting profiles, and what PairIt would offer for it at a store.
        Reads only; nothing here changes the corpus.
      </p>

      <form
        className="flex flex-wrap gap-2 items-center mb-6"
        onSubmit={(e) => { e.preventDefault(); run(food, store); }}
      >
        <Input value={food} onChange={(e) => setFood(e.target.value)} placeholder="baked beans" className="max-w-xs" />
        <select
          value={store}
          onChange={(e) => { setStore(e.target.value); if (food.trim()) run(food, e.target.value); }}
          className="border border-gray-300 rounded px-2 py-2 text-sm bg-white"
        >
          {(answer?.stores?.length ? answer.stores : [{ slug: DEFAULT_STORE, name: 'Total Beverage Westminster', live: true }]).map((s) => (
            <option key={s.slug} value={s.slug}>{s.name}{s.live ? '' : ' (not live)'}{s.has_catalog === false ? ' (no catalog)' : ''}</option>
          ))}
        </select>
        <Button type="submit" disabled={loading || !food.trim()}>
          {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Search size={14} className="mr-1" />}
          Look up
        </Button>
      </form>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {answer && (
        <>
          <Card title="How the food corpus reads it">
            {answer.corpus_match?.corpus_match === 'matched' && (
              <div className="text-sm">Matched: <strong>{answer.corpus_match.corpus_name}</strong> <span className="text-[11px] text-gray-400 font-mono">{answer.corpus_match.corpus_id}</span></div>
            )}
            {answer.corpus_match?.corpus_match === 'suggest' && (
              <div className="text-sm">Not matched. Did you mean <strong>{answer.corpus_match.suggestion}</strong>? <span className="text-[11px] text-gray-400 font-mono">{answer.corpus_match.suggestion_id}</span></div>
            )}
            {answer.corpus_match?.corpus_match === 'none' && <div className="text-sm text-gray-600">Nothing in the corpus reads as this food.</div>}
          </Card>

          <Card title={`Cluster labels (${answer.labels.length} shown, ${answer.name_matches} with the words in their name)`}>
            {answer.labels.length === 0
              ? <div className="text-sm text-gray-500">No cluster label holds these words.</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-gray-400">
                        <th className="pb-1 pr-3">Label</th><th className="pb-1 pr-3">Category</th><th className="pb-1 pr-3">Corpus</th>
                        <th className="pb-1 pr-3">Pairing</th><th className="pb-1 pr-3">Tasting profiles</th><th className="pb-1">Added up</th>
                      </tr>
                    </thead>
                    <tbody>{answer.labels.map((l) => <LabelRow key={l.id} label={l} />)}</tbody>
                  </table>
                </div>
              )}
          </Card>

          <Card title="What PairIt would offer">
            {!answer.store && <div className="text-sm text-gray-500">Pick a store to see its kinds and bottles.</div>}
            {answer.store && (
              <>
                <div className="text-xs text-gray-600 mb-3">
                  {answer.store.name} · {answer.store.live ? 'live' : 'not live: shoppers cannot open it yet'} ·{' '}
                  {answer.store.catalog_id ? `catalog ${answer.store.catalog_id}` : 'no catalog'} · price rule {answer.store.price_rule}
                  {answer.store.price_rule_stored ? '' : ' (none set, read as list x 1.5)'} · {answer.store.bottles} bottles ·{' '}
                  {answer.kinds.length} kinds from {answer.kinds_source === 'kind_terms' ? "the store's own kind terms" : 'the kinds file'}
                </div>
                <div className="text-[11px] text-gray-400 mb-3">
                  Engine: pairme {ENGINE_PIN.commit.slice(0, 7)} (copied {ENGINE_PIN.copied_at}) on {bundleLoaded ? tables.source : 'loading the rules bundle'}.
                  PairIt scores the food from these tables; the tasting profiles above do not feed it yet.
                </div>
                {picks && !picks.readable && (
                  <div className="text-sm text-amber-700">
                    PairIt cannot read this food (it knows none of: {picks.components.join(', ') || 'no words'}), so it pairs nothing for it.
                  </div>
                )}
                {picks && picks.readable && (
                  <>
                    <div className="text-sm text-[#2A2A2A] mb-1">Read as: {picks.known.join(', ')}</div>
                    {picks.ask && <div className="text-sm text-gray-600 mb-3">{picks.ask}</div>}
                    {picks.traditional.length === 0 && !picks.adventurous && (
                      <div className="text-sm text-gray-500">No kind at this store clears this food.</div>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      {picks.traditional.map((k) => (
                        <KindLane key={k.id} kind={k} food={answer.q} T={tables.T} store={answer.store.slug} flagLine="Traditional" />
                      ))}
                      {picks.adventurous && (
                        <KindLane kind={picks.adventurous} food={answer.q} T={tables.T} store={answer.store.slug} flagLine="Something you may not have tried" />
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
