// THE MEP ACCOUNT LIST (MEP platform, part A, Moose 2026-11-13): every hotel,
// restaurant group and restaurant we have, with search, a type filter and a
// city filter. The star on each row means "I have a connection here"; it is
// this MEP's own, seen by them and by QM admin.
// READER of GET /api/v1/mep/accounts; WRITER of the star (setMepStar).
import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import {
  getMepAccounts,
  setMepStar,
  MepAccount,
  MepAccountPage,
  MepAccountType,
} from '../../services/mepApi';

export const TYPE_LABEL: Record<MepAccountType, string> = {
  hotel: 'Hotel',
  restaurant_group: 'Restaurant group',
  restaurant: 'Restaurant',
};

/** The second line of a row: where it is, and what it belongs to or holds. */
export function accountDetail(a: MepAccount): string {
  const parts: string[] = [TYPE_LABEL[a.account_type]];
  const place = [a.city, a.state].filter(Boolean).join(', ');
  if (place) parts.push(place);
  if (a.group) parts.push(`Group: ${a.group.name}`);
  if (a.hotel) parts.push(`In ${a.hotel.name}`);
  if (a.restaurant_count != null) parts.push(a.restaurant_count === 1 ? '1 restaurant' : `${a.restaurant_count} restaurants`);
  return parts.join(' · ');
}

export function MepAccountList() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<MepAccountType | ''>('');
  const [city, setCity] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<MepAccountPage | null>(null);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typing waits a moment before it searches.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    getMepAccounts({ q: query, type, city, starred: starredOnly, page }).then((res) => {
      if (!live) return;
      setLoading(false);
      if (res.data) {
        setResult(res.data);
        setError(null);
        if (res.data.cities) setCities(res.data.cities);
      } else {
        setError(res.error || 'Could not load the accounts.');
      }
    });
    return () => {
      live = false;
    };
  }, [query, type, city, starredOnly, page]);

  async function toggle(a: MepAccount) {
    const key = `${a.account_type}:${a.id}`;
    if (busy) return;
    setBusy(key);
    const res = await setMepStar(a.account_type, a.id, !a.starred);
    setBusy(null);
    if (res.data) {
      setResult((r) =>
        r && {
          ...r,
          accounts: r.accounts.map((x) =>
            x.account_type === a.account_type && x.id === a.id ? { ...x, starred: res.data!.starred } : x,
          ),
        },
      );
    } else {
      setError(res.error || 'The star did not save.');
    }
  }

  const pages = result ? Math.max(1, Math.ceil(result.total / result.per_page)) : 1;

  return (
    <section aria-label="Accounts">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-1">Accounts</h2>
      <p className="text-sm text-gray-500 mb-4">Star the places where you have a connection.</p>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name"
          aria-label="Search by name"
          className="flex-1 min-w-0 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as MepAccountType | '');
            setPage(1);
          }}
          aria-label="Type"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="hotel">Hotels</option>
          <option value="restaurant_group">Restaurant groups</option>
          <option value="restaurant">Restaurants</option>
        </select>
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
          aria-label="City"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.city} value={c.city}>
              {c.city}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700 px-1">
          <input
            type="checkbox"
            checked={starredOnly}
            onChange={(e) => {
              setStarredOnly(e.target.checked);
              setPage(1);
            }}
          />
          My stars
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-red-600 mb-2">{error}</p>}
      {loading && !result && <p className="text-sm text-gray-500">Loading…</p>}
      {result && result.accounts.length === 0 && !loading && (
        <p className="text-sm text-gray-500 py-6">{starredOnly ? 'No stars yet.' : 'No accounts match.'}</p>
      )}

      {result && result.accounts.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {result.accounts.map((a) => {
            const key = `${a.account_type}:${a.id}`;
            return (
              <li key={key} className="flex items-center gap-3 px-3 py-2.5" data-testid="mep-account-row">
                <button
                  type="button"
                  onClick={() => toggle(a)}
                  disabled={busy === key}
                  aria-pressed={a.starred}
                  aria-label={a.starred ? `Remove star from ${a.name}` : `Star ${a.name}`}
                  className="shrink-0 p-1 rounded hover:bg-gray-100"
                >
                  <Star size={20} className={a.starred ? 'fill-[#E8B04B] text-[#E8B04B]' : 'text-gray-400'} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2A2A2A] truncate">{a.name}</p>
                  <p className="text-xs text-gray-500 truncate">{accountDetail(a)}</p>
                  {a.people && a.people.length > 0 && (
                    <p className="text-xs text-[#2A2A2A] truncate" data-testid="mep-account-people">
                      You can introduce: {a.people.map((p) => (p.position ? `${p.name} (${p.position})` : p.name)).join(', ')}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {result && pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="text-[#7FAEC2] disabled:text-gray-300"
          >
            Previous
          </button>
          <span className="text-gray-500">
            Page {page} of {pages} · {result.total} accounts
          </span>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="text-[#7FAEC2] disabled:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
