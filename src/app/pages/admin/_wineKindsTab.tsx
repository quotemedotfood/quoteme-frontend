/**
 * Wine kinds: private to QMAdminMatchingEngine.
 *
 * Moose Q85 2026-11-19: "make sure I can add to each in the qm admin". PairIt
 * splits a store's kinds into traditional (the big names) and adventurous
 * (lesser known but good, Cabernet Franc level). Each list here shows its
 * kinds; Add puts any kind into that list, Move sends it to the other one,
 * Clear takes its flag off. Every call names the term by id; a move is live
 * at once and the server keeps the old value in the term's log.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getWineFamiliarities,
  setWineFamiliarity,
  type WineFamiliarity,
  type WineKindTerm,
} from '../../services/adminApi';

const LISTS: Array<{ flag: WineFamiliarity; title: string; blurb: string }> = [
  { flag: 'traditional', title: 'Traditional', blurb: 'The big names a shopper already knows.' },
  { flag: 'adventurous', title: 'Adventurous', blurb: 'Lesser known but good, Cabernet Franc level.' },
];

const other = (f: WineFamiliarity): WineFamiliarity => (f === 'traditional' ? 'adventurous' : 'traditional');

function byStock(a: WineKindTerm, b: WineKindTerm) {
  return b.wines - a.wines || a.name.localeCompare(b.name);
}

function AddBox({ flag, terms, busy, onAdd }: {
  flag: WineFamiliarity; terms: WineKindTerm[]; busy: boolean; onAdd: (t: WineKindTerm) => void;
}) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return terms.filter((t) => t.familiarity !== flag && t.name.toLowerCase().includes(s)).sort(byStock).slice(0, 8);
  }, [q, terms, flag]);

  return (
    <div className="mb-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Add a kind to ${flag}`}
        aria-label={`Add a kind to ${flag}`}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
      />
      {hits.length > 0 && (
        <ul className="mt-1 border border-gray-200 rounded-md divide-y divide-gray-100 bg-white">
          {hits.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
              <span>
                {t.name}
                <span className="text-gray-500"> · {t.wines} wines · now {t.familiarity ?? 'not set'}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => { onAdd(t); setQ(''); }}
                className="text-xs px-2 py-1 rounded bg-[#F2993D] text-white disabled:opacity-50"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WineKindsTab() {
  const [terms, setTerms] = useState<WineKindTerm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await getWineFamiliarities();
    if (res.error || !res.data) setError(res.error || 'Could not load the wine kinds');
    else { setTerms(res.data.terms); setError(null); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = useCallback(async (t: WineKindTerm, flag: WineFamiliarity | null) => {
    setBusy(t.id);
    const res = await setWineFamiliarity(t.id, flag);
    setBusy(null);
    if (res.error || !res.data) { setError(res.error || `Could not change ${t.name}`); return; }
    const saved = res.data.term;
    setError(null);
    setTerms((all) => (all ? all.map((x) => (x.id === saved.id ? saved : x)) : all));
  }, []);

  if (!terms) return <div className="p-4 text-sm text-gray-500">{error ?? 'Loading wine kinds...'}</div>;

  const unset = terms.filter((t) => !t.familiarity).sort(byStock);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Which list each kind of wine sits in on PairIt. A change is live as soon as you click.
      </p>
      {error && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LISTS.map(({ flag, title, blurb }) => {
          const rows = terms.filter((t) => t.familiarity === flag).sort(byStock);
          return (
            <section key={flag} aria-label={title} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900">{title} <span className="text-gray-500 font-normal">({rows.length})</span></h3>
              <p className="text-xs text-gray-500 mb-3">{blurb}</p>
              <AddBox flag={flag} terms={terms} busy={busy !== null} onAdd={(t) => set(t, flag)} />
              <ul className="divide-y divide-gray-100">
                {rows.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span>{t.name} <span className="text-gray-500">· {t.wines} wines</span></span>
                    <span className="flex gap-2">
                      <button type="button" disabled={busy !== null} onClick={() => set(t, other(flag))}
                        className="text-xs px-2 py-1 rounded border border-gray-300 disabled:opacity-50">
                        Move to {other(flag)}
                      </button>
                      <button type="button" disabled={busy !== null} onClick={() => set(t, null)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-50">
                        Clear
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {unset.length > 0 && (
        <section aria-label="Not set" className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900">Not set <span className="text-gray-500 font-normal">({unset.length})</span></h3>
          <p className="text-xs text-gray-500 mb-3">PairIt shows these as traditional until you pick.</p>
          <ul className="divide-y divide-gray-100">
            {unset.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                <span>{t.name} <span className="text-gray-500">· {t.wines} wines</span></span>
                <span className="flex gap-2">
                  {LISTS.map(({ flag, title }) => (
                    <button key={flag} type="button" disabled={busy !== null} onClick={() => set(t, flag)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 disabled:opacity-50">
                      {title}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
