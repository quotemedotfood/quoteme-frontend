// PAID PLACEMENT on a store's QM admin page (Moose 2026-11-20, Q119 to
// Q124). A brand pays us to promote one of its wines at the stores we
// choose. The store never sets one. PairIt shows the badge on that bottle's
// card and lists it first in Store picks while its days run.
//
// Find a wine on this store's shown list, then tick the stores that show the
// same wine (the server matches them on the wine's beverage id; a person
// ticks), pick the days, and add. Every wine is sent by its id; nothing is
// matched on a name here.
//
// Reads GET /api/v1/admin/retail_promotions (this store's), .../wines (the
// search), .../stores (the same wine elsewhere). Writes POST (add, all or
// none) and DELETE .../:id (end now).
import { useEffect, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  getAdminStorePromotions,
  searchAdminPromotionWines,
  getAdminPromotionStores,
  createAdminStorePromotions,
  endAdminStorePromotion,
  AdminStorePromotion,
  AdminPromotionWine,
  AdminPromotionStore,
} from '../../services/adminApi';

export const BADGE_LABELS: Record<string, string> = { paid_placement: 'Paid placement' };
const STATE_LABELS: Record<AdminStorePromotion['state'], string> = { upcoming: 'Upcoming', live: 'Live', ended: 'Ended' };

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

/** "Nov 23, 2026" from YYYY-MM-DD, read as a calendar day (no time zone shift). */
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

const pairKey = (storeId: string, wineId: string) => `${storeId}|${wineId}`;

export function StorePromotionsCard({ storeId, card, heading }: { storeId: string; card: string; heading: string }) {
  const [rows, setRows] = useState<AdminStorePromotion[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<AdminPromotionWine[] | null>(null);
  const [chosen, setChosen] = useState<AdminPromotionWine | null>(null);
  const [stores, setStores] = useState<AdminPromotionStore[]>([]);
  const [badge, setBadge] = useState('');
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await getAdminStorePromotions(storeId);
    if (res.data) {
      setRows(res.data.promotions);
      setLoadError(null);
    } else {
      setLoadError(res.error || 'Could not load the paid placements.');
    }
  }

  useEffect(() => { load(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function search() {
    if (q.trim().length < 2) return;
    setError(null);
    const res = await searchAdminPromotionWines(storeId, q.trim());
    if (res.data) setFound(res.data.wines);
    else setError(res.error || 'Could not search the wines.');
  }

  async function choose(wine: AdminPromotionWine) {
    setChosen(wine);
    setError(null);
    const res = await getAdminPromotionStores(wine.id);
    if (res.data) {
      setStores(res.data.stores);
      setBadge(res.data.badges[0] || '');
      setTicked(new Set([pairKey(storeId, wine.id)]));
    } else {
      setError(res.error || 'Could not find the stores that show this wine.');
    }
  }

  function toggle(key: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function reset() {
    setChosen(null);
    setFound(null);
    setStores([]);
    setTicked(new Set());
    setQ('');
    setStartsOn('');
    setEndsOn('');
  }

  async function add() {
    if (busy || !badge || ticked.size === 0 || !startsOn || !endsOn) return;
    setBusy(true);
    setError(null);
    const wines = stores.flatMap((st) => st.wines.map((w) => pairKey(st.store_id, w.id))).map((k) => {
      const [store_id, wine_id] = k.split('|');
      return { store_id, wine_id };
    });
    const res = await createAdminStorePromotions({ badge, starts_on: startsOn, ends_on: endsOn, wines });
    setBusy(false);
    if (res.data) {
      reset();
      load();
    } else {
      setError(res.error || 'Could not add the paid placement.');
    }
  }

  async function end(row: AdminStorePromotion) {
    setError(null);
    const res = await endAdminStorePromotion(row.id);
    if (res.data) load();
    else setError(res.error || 'Could not end the paid placement.');
  }

  return (
    <div className={card} data-testid="store-promotions">
      <p className={heading}>Paid placement</p>
      <p className="text-xs text-gray-500">
        A brand pays to promote one wine. PairIt shows the badge on its card and lists it first in Store picks while it runs. The store cannot change it.
      </p>

      {loadError ? (
        <p className="mt-2 text-xs text-red-500" role="alert">{loadError}</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No paid placements at this store.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm" data-testid="store-promotion">
              <span className="text-gray-800">{[r.producer, r.wine].filter(Boolean).join(', ')}</span>
              <span className="text-gray-500">
                · {BADGE_LABELS[r.badge] || r.badge} · {dayLabel(r.starts_on)} to {dayLabel(r.ends_on)} · {STATE_LABELS[r.state]}
              </span>
              {r.state !== 'ended' && (
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => end(r)}>
                  End
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
        {!chosen ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Input
                aria-label="Find a wine at this store"
                placeholder="Producer or wine"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                className="max-w-xs text-sm"
              />
              <Button size="sm" variant="outline" className="text-xs h-9" disabled={q.trim().length < 2} onClick={search}>
                Find
              </Button>
            </div>
            {found && found.length === 0 && <p className="text-sm text-gray-500">No shown wine here matches.</p>}
            {found && found.length > 0 && (
              <ul className="space-y-1">
                {found.map((w) => (
                  <li key={w.id}>
                    <button type="button" className="text-left text-sm text-[#2A6F8A] hover:underline" onClick={() => choose(w)}>
                      {[w.producer, w.wine].filter(Boolean).join(', ')}
                      <span className="text-gray-500"> · {w.product_name} · bottle, shelf price {money(w.shown_price_cents)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-gray-800">
              {[chosen.producer, chosen.wine].filter(Boolean).join(', ')}
              <span className="text-gray-500"> · {BADGE_LABELS[badge] || badge}</span>
            </p>
            <p className="text-xs text-gray-600">Stores that show this wine:</p>
            <ul className="space-y-1">
              {stores.flatMap((s) =>
                s.wines.map((w) => {
                  const key = pairKey(s.store_id, w.id);
                  return (
                    <li key={key}>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={ticked.has(key)} onChange={() => toggle(key)} aria-label={`${s.name}: ${w.product_name}`} />
                        <span>{s.name}</span>
                        <span className="text-gray-500">· {w.product_name} · bottle, shelf price {money(w.shown_price_cents)}</span>
                      </label>
                    </li>
                  );
                }),
              )}
            </ul>
            <div className="flex flex-wrap gap-2">
              <label className="text-xs text-gray-600">
                Starts
                <input type="date" aria-label="Starts" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className="ml-1 text-sm border border-gray-200 rounded px-2 py-1 bg-white" />
              </label>
              <label className="text-xs text-gray-600">
                Ends
                <input type="date" aria-label="Ends" value={endsOn} min={startsOn || undefined} onChange={(e) => setEndsOn(e.target.value)} className="ml-1 text-sm border border-gray-200 rounded px-2 py-1 bg-white" />
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-[#7FAEC2] hover:bg-[#6a9aae] text-white text-xs h-8"
                disabled={busy || !badge || ticked.size === 0 || !startsOn || !endsOn}
                onClick={add}
              >
                {busy ? 'Adding…' : 'Add paid placement'}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={reset}>
                Cancel
              </Button>
            </div>
          </>
        )}
        {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      </div>
    </div>
  );
}
