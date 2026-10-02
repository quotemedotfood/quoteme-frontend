// PAIRME on the QM admin restaurant page.
//
// Moose, 2026-09-24: the pairings are "saved in the metropolis restaurant page
// in QuoteMe admin", and the pronunciation is "stored with the wines".
// Moose, 2026-10-02: "we need a better view of the pairings": two tabs.
//   BY DISH: one row per dish, course tabs, search, the wines side by side.
//   BY WINE: one row per wine on the list, what it is paired with, and the
//            wines that are never paired.
// Reads GET /api/v1/admin/restaurants/:id/pairme (QM admin only).
//
// Rules this section keeps:
//  - JOIN ON ID. A pairing leg names a wine_id; the wine is looked up by that
//    id. Two of Metropolis's wines print "Sauvignon Blanc".
//  - NOTHING CROWNED. No rank, number, badge or "top" label on any leg; the
//    wines sit side by side in authored order, unnumbered.
//  - NEVER A BARE PRICE. Every priced line names the wine, the producer, the
//    printed list, the unit and the price.
//  - A drafted pronunciation says it is drafted.
import { useEffect, useMemo, useState } from 'react';
import {
  getAdminRestaurantPairme,
  AdminRestaurantPairme,
  AdminPairmeWine,
  AdminPairmeDish,
} from '../../services/adminApi';

const LIST_LABEL: Record<string, string> = {
  wine_list: 'Wine list',
  dessert_wine: 'Dessert wines',
  port_cognac: 'Port & cognac',
};

const SAY_LABEL: Record<string, string> = {
  authored: 'written by the wine team',
  drafted: 'drafted, not yet reviewed',
  grape_fallback: 'grape only, no wine name yet',
};

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function priceLine(w: AdminPairmeWine) {
  const parts: string[] = [];
  if (w.glass_cents != null) parts.push(`${dollars(w.glass_cents)} glass`);
  if (w.bottle_cents != null) parts.push(`${dollars(w.bottle_cents)} bottle`);
  return parts.length ? parts.join(' · ') : 'No price printed';
}

function wineName(w: AdminPairmeWine) {
  return [w.producer, w.wine_name].filter(Boolean).join(', ');
}

const norm = (s: string | null | undefined) => (s || '').toLowerCase();

type Tab = 'dish' | 'wine';
type WineFilter = 'all' | 'paired' | 'never';

const tabBtn = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-sm border ${on ? 'bg-[#2A2A2A] text-white border-[#2A2A2A]' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`;

export function PairmeSection({ restaurantId }: { restaurantId: string }) {
  const [data, setData] = useState<AdminRestaurantPairme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('dish');
  const [course, setCourse] = useState<string>('all');
  const [wineFilter, setWineFilter] = useState<WineFilter>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    let live = true;
    getAdminRestaurantPairme(restaurantId).then((res) => {
      if (!live) return;
      if (res.data) setData(res.data);
      else setError(res.error || 'Could not load PairMe data');
    });
    return () => {
      live = false;
    };
  }, [restaurantId]);

  const wines = data?.wines ?? [];
  const dishes = data?.pairings ?? [];
  const byId = useMemo(() => new Map(wines.map((w) => [w.wine_id, w])), [wines]);
  const courses = useMemo(() => {
    const seen: string[] = [];
    for (const d of dishes) if (d.course && !seen.includes(d.course)) seen.push(d.course);
    return seen;
  }, [dishes]);
  // Every dish each wine is paired with, BY wine_id, never by its label.
  const dishesByWine = useMemo(() => {
    const m = new Map<string, AdminPairmeDish[]>();
    for (const d of dishes) for (const leg of d.pairings) {
      if (!m.has(leg.wine_id)) m.set(leg.wine_id, []);
      if (!m.get(leg.wine_id)!.includes(d)) m.get(leg.wine_id)!.push(d);
    }
    return m;
  }, [dishes]);

  const heading = (
    <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
      PairMe
    </h2>
  );

  if (error) {
    return (
      <section className="mb-8" data-testid="pairme-section">
        {heading}
        <p className="text-sm text-red-500">{error}</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="mb-8" data-testid="pairme-section">
        {heading}
        <p className="text-sm text-gray-400">Loading…</p>
      </section>
    );
  }
  if (!data.venue) {
    return (
      <section className="mb-8" data-testid="pairme-section">
        {heading}
        <p className="text-sm text-gray-400">No PairMe wine list or pairings loaded for this restaurant.</p>
      </section>
    );
  }

  const query = norm(q.trim());
  const wineMatches = (w: AdminPairmeWine | undefined) =>
    !!w && (norm(w.producer).includes(query) || norm(w.wine_name).includes(query));
  const shownDishes = dishes.filter((d) =>
    (course === 'all' || d.course === course) &&
    (!query || norm(d.name).includes(query) || d.pairings.some((l) => wineMatches(byId.get(l.wine_id)))));
  const fewer = dishes.filter((d) => d.pairings.length > 0 && d.pairings.length < 3).length;
  const none = dishes.filter((d) => d.pairings.length === 0).length;
  const neverPaired = wines.filter((w) => !dishesByWine.has(w.wine_id)).length;
  const shownWines = wines.filter((w) => {
    const paired = dishesByWine.has(w.wine_id);
    if (wineFilter === 'paired' && !paired) return false;
    if (wineFilter === 'never' && paired) return false;
    return !query || wineMatches(w) || (dishesByWine.get(w.wine_id) || []).some((d) => norm(d.name).includes(query));
  });

  return (
    <section className="mb-8" data-testid="pairme-section">
      {heading}
      <p className="text-sm text-gray-500 mb-4" data-testid="pairme-summary">
        {wines.length} wines · {dishes.length} dishes paired
        {fewer ? ` · ${fewer} with fewer than three wines` : ''}
        {none ? ` · ${none} with none` : ''}
        {` · ${neverPaired} ${neverPaired === 1 ? 'wine' : 'wines'} never paired`}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div role="tablist" aria-label="Pairings view" className="flex gap-2">
          <button type="button" role="tab" aria-selected={tab === 'dish'} className={tabBtn(tab === 'dish')} onClick={() => setTab('dish')}>By dish</button>
          <button type="button" role="tab" aria-selected={tab === 'wine'} className={tabBtn(tab === 'wine')} onClick={() => setTab('wine')}>By wine</button>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === 'dish' ? 'Search dishes or wines' : 'Search wines or dishes'}
          aria-label="Search pairings"
          className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64 max-w-full"
        />
      </div>

      {tab === 'dish' ? (
        <>
          {courses.length > 1 ? (
            <div className="flex flex-wrap gap-2 mb-3" aria-label="Courses">
              {['all', ...courses].map((c) => (
                <button key={c} type="button" className={tabBtn(course === c)} onClick={() => setCourse(c)}>
                  {c === 'all' ? 'All courses' : c}
                </button>
              ))}
            </div>
          ) : null}
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm" data-testid="pairme-dish-table">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium w-56">Dish</th>
                  <th className="px-4 py-2 font-medium" colSpan={3}>Wines</th>
                </tr>
              </thead>
              <tbody>
                {shownDishes.map((d) => (
                  <tr key={d.dish_id} className="align-top border-b border-gray-100 last:border-0" data-testid="pairme-dish">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#2A2A2A]">{d.name}</p>
                      {d.course ? <p className="text-xs text-gray-400">{d.course}</p> : null}
                      {d.pairings.length < 3 ? (
                        <p className="text-xs text-amber-700 mt-1">
                          {d.pairings.length === 0 ? 'No wine paired' : `${d.pairings.length === 1 ? 'One wine' : 'Two wines'}, not three`}
                        </p>
                      ) : null}
                    </td>
                    {d.pairings.map((leg) => {
                      const w = byId.get(leg.wine_id);
                      if (!w) {
                        return (
                          <td key={leg.wine_id} className="px-4 py-3 text-xs text-red-500 min-w-[12rem]">
                            {leg.wine_id} is not on this restaurant's list
                          </td>
                        );
                      }
                      return (
                        <td key={leg.wine_id} className="px-4 py-3 min-w-[12rem]" data-testid="pairme-leg">
                          <p className="text-[#2A2A2A]">{wineName(w)}</p>
                          <p className="text-xs text-gray-500">
                            {LIST_LABEL[w.list_source ?? ''] ?? 'Wine list'} · {priceLine(w)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{leg.why}</p>
                        </td>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 3 - d.pairings.length) }).map((_, i) => (
                      <td key={`empty-${i}`} className="px-4 py-3 min-w-[12rem]" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {shownDishes.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No dish matches.</p> : null}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3" aria-label="Which wines">
            {([['all', 'All wines'], ['paired', 'Paired'], ['never', 'Never paired']] as [WineFilter, string][]).map(([k, label]) => (
              <button key={k} type="button" className={tabBtn(wineFilter === k)} onClick={() => setWineFilter(k)}>{label}</button>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm" data-testid="pairme-wine-table">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Wine</th>
                  <th className="px-4 py-2 font-medium">List and price</th>
                  <th className="px-4 py-2 font-medium">How to say it</th>
                  <th className="px-4 py-2 font-medium">Paired with</th>
                </tr>
              </thead>
              <tbody>
                {shownWines.map((w) => {
                  const paired = dishesByWine.get(w.wine_id) || [];
                  return (
                    <tr key={w.wine_id} className="align-top border-b border-gray-100 last:border-0" data-testid="pairme-wine">
                      <td className="px-4 py-3 text-[#2A2A2A]">
                        {wineName(w)}
                        {w.vintage ? <span className="text-gray-400"> {w.vintage}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {LIST_LABEL[w.list_source ?? ''] ?? 'Wine list'} · {priceLine(w)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {w.say ? (
                          <span>
                            {w.say}
                            {w.say_source ? <span className="text-gray-400"> ({SAY_LABEL[w.say_source]})</span> : null}
                          </span>
                        ) : (
                          <span className="text-gray-400">No pronunciation yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" data-testid="pairme-wine-dishes">
                        {paired.length ? (
                          <span className="text-gray-700">{paired.map((d) => d.name).join(', ')} ({paired.length})</span>
                        ) : (
                          <span className="text-amber-700">Never paired</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shownWines.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No wine matches.</p> : null}
          </div>
        </>
      )}
    </section>
  );
}
