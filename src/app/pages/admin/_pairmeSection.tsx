// PAIRME on the QM admin restaurant page.
//
// Moose, 2026-09-24: the pairings are "saved in the metropolis restaurant page
// in QuoteMe admin", and the pronunciation is "stored with the wines".
// Reads GET /api/v1/admin/restaurants/:id/pairme (QM admin only).
//
// Rules this section keeps:
//  - JOIN ON ID. A pairing leg names a wine_id; the wine is looked up by that
//    id. Two of Metropolis's wines print "Sauvignon Blanc".
//  - NOTHING CROWNED. No rank, number, badge or "top" label on any leg.
//  - NEVER A BARE PRICE. Every priced line names the wine, the producer, the
//    printed list, the unit and the price.
//  - A drafted pronunciation says it is drafted.
import { useEffect, useState } from 'react';
import {
  getAdminRestaurantPairme,
  AdminRestaurantPairme,
  AdminPairmeWine,
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

export function PairmeSection({ restaurantId }: { restaurantId: string }) {
  const [data, setData] = useState<AdminRestaurantPairme | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const wines = data.wines ?? [];
  const dishes = data.pairings ?? [];
  const byId = new Map(wines.map((w) => [w.wine_id, w]));

  return (
    <section className="mb-8" data-testid="pairme-section">
      {heading}
      <p className="text-sm text-gray-500 mb-4">
        {wines.length} wines · {dishes.length} dishes paired
      </p>

      <h3 className="text-sm font-semibold text-[#2A2A2A] mb-2">Pairings</h3>
      <div className="space-y-3 mb-6">
        {dishes.map((d) => (
          <div key={d.dish_id} className="bg-white border border-gray-200 rounded-xl px-5 py-4" data-testid="pairme-dish">
            <p className="text-sm font-medium text-[#2A2A2A]">
              {d.name}
              {d.course ? <span className="text-gray-400 font-normal"> · {d.course}</span> : null}
            </p>
            <ul className="mt-2 space-y-2">
              {d.pairings.map((leg) => {
                const w = byId.get(leg.wine_id);
                if (!w) {
                  return (
                    <li key={leg.wine_id} className="text-xs text-red-500">
                      {leg.wine_id} is not on this restaurant's list
                    </li>
                  );
                }
                return (
                  <li key={leg.wine_id} className="text-sm" data-testid="pairme-leg">
                    <span className="text-[#2A2A2A]">{wineName(w)}</span>
                    <span className="text-gray-500">
                      {' '}
                      · {LIST_LABEL[w.list_source ?? ''] ?? 'Wine list'} · {priceLine(w)}
                    </span>
                    <p className="text-xs text-gray-600">{leg.why}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-[#2A2A2A] mb-2">Wines and how to say them</h3>
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {wines.map((w) => (
          <div key={w.wine_id} className="px-5 py-2 text-sm" data-testid="pairme-wine">
            <span className="text-[#2A2A2A]">{wineName(w)}</span>
            {w.vintage ? <span className="text-gray-400"> {w.vintage}</span> : null}
            <span className="text-gray-500"> · {priceLine(w)}</span>
            {w.say ? (
              <p className="text-xs text-gray-600">
                {w.say}
                {w.say_source ? <span className="text-gray-400"> ({SAY_LABEL[w.say_source]})</span> : null}
              </p>
            ) : (
              <p className="text-xs text-gray-400">No pronunciation yet</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
