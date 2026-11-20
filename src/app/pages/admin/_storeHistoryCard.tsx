// A STORE'S SAVED PAIRINGS on its QM admin page (Moose 2026-11-20). One day
// at a time, picked with a date, the same day the store tablet's History
// screen shows: when, a shopper or staff, the QR spot, the dishes as PairIt
// read them back, and the bottles picked with their shelf price.
//
// Reads GET /api/v1/admin/retail_locations/:id/history
// (Pairme::StoreSessions.day). Read only: nothing here writes.
import { useEffect, useState } from 'react';
import { getAdminRetailLocationHistory, AdminStoreHistoryDay, AdminStoreSession } from '../../services/adminApi';

const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

/** "6:42 PM" in the store's own time zone. */
export function sessionTime(iso: string, timeZone: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
  } catch {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}

function Session({ s, timeZone }: { s: AdminStoreSession; timeZone: string }) {
  return (
    <li className="border-t border-gray-100 pt-2" data-testid="store-session">
      <p className="text-xs text-gray-600">
        <span className="font-medium text-gray-800">{sessionTime(s.time, timeZone)}</span>
        {' · '}
        {s.who === 'staff' ? 'Staff' : 'Shopper'}
        {' · '}
        {s.code ? `QR: ${s.code}` : 'No QR spot'}
      </p>
      {s.dishes.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-sm text-gray-800">
          {s.dishes.map((d, i) => (
            <li key={i}>
              {d.name}
              {d.parts.length > 0 && <span className="text-gray-500">: {d.parts.join(', ')}</span>}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-1 text-sm text-gray-800">
        {s.bottles.map((b) => (
          <li key={b.id}>
            {[b.producer, b.wine].filter(Boolean).join(', ')}
            <span className="text-gray-500"> · bottle, shelf price {money(b.price_cents)}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function StoreHistoryCard({ storeId, card, heading }: { storeId: string; card: string; heading: string }) {
  // The day asked for. Empty asks for the store's own today, which the
  // server picks; the input then shows the date it answered.
  const [asked, setAsked] = useState('');
  const [day, setDay] = useState<AdminStoreHistoryDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    getAdminRetailLocationHistory(storeId, undefined).then((res) => {
      if (!live) return;
      setLoading(false);
      if (res.data) {
        setDay(res.data);
      } else {
        setError(res.error || 'Could not load the saved pairings.');
      }
    });
    return () => { live = false; };
  }, [storeId, asked]);

  return (
    <div className={card} data-testid="store-history">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={heading}>History</p>
        <input
          type="date"
          aria-label="Day"
          value={asked || day?.date || ''}
          max={day?.today}
          onChange={(e) => e.target.value && setAsked(e.target.value)}
          className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
        />
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-xs text-red-500" role="alert">{error}</p>
      ) : day && day.entries.length > 0 ? (
        <>
          <p className="text-xs text-gray-500">{day.entries.length} saved {day.entries.length === 1 ? 'pairing' : 'pairings'}</p>
          <ul className="mt-2 space-y-2">
            {day.entries.map((s) => <Session key={s.id} s={s} timeZone={day.time_zone} />)}
          </ul>
        </>
      ) : (
        <p className="text-sm text-gray-500">No pairings saved on this day.</p>
      )}
    </div>
  );
}
