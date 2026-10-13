// WHAT GUESTS WERE SHOWN, for the restaurant admin. Read only.
//
// Moose, 2026-10-13: the restaurant admin sees "the timestamped pairings that
// we're offering to the guest". Reads GET /api/v1/restaurant_admin/
// restaurants/:id/pairme_presentations; WRITER: V1::PresentationsController
// #create, when a guest holds the phone up to their server. Newest first.
//
// NEVER A BARE PRICE: every wine line names producer, wine, list, unit and
// price (wineLine). The time is the restaurant's local time where the server
// knows the zone, else the viewer's.
import { useEffect, useState } from 'react';
import { getRestaurantAdminPresentations } from '../../services/api';
import type { RestaurantAdminPresentation } from '../../services/adminApi';
import { wineLine } from '../chef/ChefPairingsPage';

function when(row: RestaurantAdminPresentation) {
  if (row.local_date && row.local_time) return `${row.local_date} ${row.local_time}`;
  return new Date(row.presented_at).toLocaleString();
}

export function GuestPresentations({ restaurantId }: { restaurantId: string }) {
  const [rows, setRows] = useState<RestaurantAdminPresentation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getRestaurantAdminPresentations(restaurantId).then((res) => {
      if (!live) return;
      if (res.data) setRows(res.data.presentations);
      else setError(res.error || 'Could not load what guests were shown');
    });
    return () => {
      live = false;
    };
  }, [restaurantId]);

  return (
    <section className="mb-8" data-testid="ra-presentations">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        What your guests were shown
      </h2>
      <p className="text-sm text-gray-500 mb-3">Each time a guest showed their pairings to a server, newest first.</p>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {!rows && !error ? <p className="text-sm text-gray-400">Loading…</p> : null}
      {rows && rows.length === 0 ? (
        <p className="text-sm text-gray-400" data-testid="ra-presentations-empty">No guest has shown their pairings yet.</p>
      ) : null}
      {rows && rows.length > 0 ? (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3" data-testid="ra-presentation">
              <p className="text-xs text-gray-500 mb-1" data-testid="ra-presentation-time">{when(r)}</p>
              <ul className="space-y-1">
                {r.wines.map((w, i) => (
                  <li key={`${w.wine_id}-${w.dish_id ?? i}`} className="text-sm text-[#2A2A2A]">
                    {w.dish ? <span className="font-medium">{w.dish}: </span> : null}
                    {wineLine(w)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
