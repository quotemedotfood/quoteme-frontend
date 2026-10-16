// THE RESTAURANT ADMIN'S SETTINGS.
//
// Moose, 2026-10-14: "We need a settings page, right now just have their
// name, email, contact and restaurant location stuff in there with the stripe
// plug in", and "a little table there for invoice paid or outstanding".
//
// Reads and writes BE RestaurantAdminSettingsController. The email is shown,
// never edited: it is how they sign in. The plan is $200 for the first three
// months, then $100 a month (Pairme::RestaurantBilling). A restaurant that
// does not pay keeps its pairings; paying lets them manage pairings themselves.
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import {
  getRestaurantAdminSettings,
  updateRestaurantAdminSettings,
  startRestaurantAdminCheckout,
  openRestaurantAdminBillingPortal,
  type RestaurantAdminSettings,
} from '../../services/api';

const PROFILE_FIELDS = [
  ['first_name', 'First name'],
  ['last_name', 'Last name'],
  ['phone', 'Phone'],
] as const;

const RESTAURANT_FIELDS = [
  ['name', 'Restaurant name'],
  ['phone', 'Restaurant phone'],
  ['website', 'Website'],
  ['address_line_1', 'Address'],
  ['address_line_2', 'Address line 2'],
  ['city', 'City'],
  ['state', 'State'],
  ['zip', 'ZIP'],
] as const;

type Profile = Record<(typeof PROFILE_FIELDS)[number][0], string>;
type Place = Record<(typeof RESTAURANT_FIELDS)[number][0], string>;

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function fill<K extends string>(fields: readonly (readonly [K, string])[], src: Record<string, unknown>) {
  return Object.fromEntries(fields.map(([k]) => [k, (src[k] as string | null) ?? ''])) as Record<K, string>;
}

export function RestaurantAdminSettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { restaurantId = '' } = useParams();
  const [search] = useSearchParams();
  const [data, setData] = useState<RestaurantAdminSettings | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const isRestaurantAdmin = user?.role === 'restaurant_admin';

  function load(res: { data?: RestaurantAdminSettings; error?: string }) {
    if (!res.data) return setError(res.error || 'Could not load your settings');
    setData(res.data);
    setProfile(fill(PROFILE_FIELDS, res.data.user));
    setPlace(fill(RESTAURANT_FIELDS, res.data.restaurant));
  }

  useEffect(() => {
    if (!isRestaurantAdmin || !restaurantId) return;
    let live = true;
    getRestaurantAdminSettings(restaurantId).then((res) => live && load(res));
    return () => {
      live = false;
    };
  }, [isRestaurantAdmin, restaurantId]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!isRestaurantAdmin) return <Navigate to="/dashboard" replace />;

  async function save() {
    if (!profile || !place) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    const res = await updateRestaurantAdminSettings(restaurantId, { user: profile, restaurant: place });
    setBusy(false);
    if (res.data) {
      load(res);
      setSaved(true);
    } else setError(res.error || 'Could not save');
  }

  async function go(open: typeof startRestaurantAdminCheckout | typeof openRestaurantAdminBillingPortal) {
    setBusy(true);
    setError(null);
    const res = await open(restaurantId);
    const url = res.data && ('checkout_url' in res.data ? res.data.checkout_url : res.data.portal_url);
    if (url) window.location.assign(url);
    else {
      setBusy(false);
      setError(res.error || 'Could not open billing');
    }
  }

  const billing = data?.billing;
  const subscribed = !!billing?.status && billing.status !== 'incomplete' && billing.status !== 'canceled';
  const returned = search.get('billing');

  const input = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-[#2A2A2A] bg-white';
  const card = 'bg-white border border-gray-200 rounded-lg p-5 mb-6';
  const heading = 'text-lg font-semibold text-[#2A2A2A] mb-4';

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/restaurant-admin" className="text-sm text-[#4F4F4F] hover:underline">
          Back to your dashboard
        </Link>
        <h1 className="text-2xl font-bold text-[#2A2A2A] mt-3 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
          Settings{data ? `, ${data.restaurant.name}` : ''}
        </h1>

        {returned === 'success' && (
          <p className="text-sm text-[#2A2A2A] bg-white border border-gray-200 rounded-md p-3 mb-4" data-testid="ra-billing-success">
            Thank you. Your payment went through; it can take a minute to show below.
          </p>
        )}
        {error && <p className="text-sm text-red-500 mb-4" role="alert">{error}</p>}
        {!data && !error && <p className="text-sm text-gray-400">Loading…</p>}

        {data && profile && place && (
          <>
            <section className={card}>
              <h2 className={heading}>You</h2>
              <label className="block text-sm text-[#4F4F4F] mb-3">
                Email (how you sign in)
                <input className={`${input} bg-gray-50`} value={data.user.email} readOnly data-testid="ra-email" />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROFILE_FIELDS.map(([k, label]) => (
                  <label key={k} className="block text-sm text-[#4F4F4F]">
                    {label}
                    <input className={input} value={profile[k]} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} name={`user.${k}`} />
                  </label>
                ))}
              </div>
            </section>

            <section className={card}>
              <h2 className={heading}>Restaurant</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RESTAURANT_FIELDS.map(([k, label]) => (
                  <label key={k} className="block text-sm text-[#4F4F4F]">
                    {label}
                    <input className={input} value={place[k]} onChange={(e) => setPlace({ ...place, [k]: e.target.value })} name={`restaurant.${k}`} />
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button type="button" onClick={save} disabled={busy} className="bg-[#2A2A2A] text-white text-sm rounded-md px-4 py-2 disabled:opacity-50">
                  Save
                </button>
                {saved && <span className="text-sm text-[#4F4F4F]" data-testid="ra-saved">Saved</span>}
              </div>
            </section>

            <section className={card} data-testid="ra-billing">
              <h2 className={heading}>Your PairMe plan</h2>
              {subscribed ? (
                <>
                  <p className="text-sm text-[#4F4F4F] mb-3">
                    {billing!.self_managed ? 'Active. You can manage your own pairings.' : `Status: ${billing!.status?.replace('_', ' ')}.`}
                    {billing!.current_period_end && ` Paid through ${day(billing!.current_period_end)}.`}
                  </p>
                  <button type="button" onClick={() => go(openRestaurantAdminBillingPortal)} disabled={busy} className="border border-gray-300 text-sm rounded-md px-4 py-2 disabled:opacity-50">
                    Update card or cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-[#4F4F4F] mb-3">
                    We keep your pairings up to date for you. Subscribe to manage them yourself: $200 for your first three months, then $100 a month.
                  </p>
                  {billing?.configured ? (
                    <button type="button" onClick={() => go(startRestaurantAdminCheckout)} disabled={busy} className="bg-[#2A2A2A] text-white text-sm rounded-md px-4 py-2 disabled:opacity-50" data-testid="ra-subscribe">
                      Subscribe
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400">Subscriptions open soon.</p>
                  )}
                </>
              )}

              {billing?.invoices === null && <p className="text-sm text-gray-400 mt-4">Invoices could not be loaded right now.</p>}
              {billing?.invoices && billing.invoices.length > 0 && (
                <table className="w-full text-sm mt-5" data-testid="ra-invoices">
                  <thead>
                    <tr className="text-left text-[#4F4F4F] border-b border-gray-200">
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 font-medium">Invoice</th>
                      <th className="py-2 font-medium text-right">Amount</th>
                      <th className="py-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.invoices.map((inv, i) => (
                      <tr key={inv.number ?? i} className="border-b border-gray-100">
                        <td className="py-2">{day(inv.date)}</td>
                        <td className="py-2">
                          {inv.url ? (
                            <a href={inv.url} target="_blank" rel="noreferrer" className="text-[#7FAEC2] hover:underline">{inv.number ?? 'View'}</a>
                          ) : (
                            inv.number
                          )}
                        </td>
                        <td className="py-2 text-right">{dollars(inv.amount_cents)}</td>
                        <td className={`py-2 text-right ${inv.state === 'outstanding' ? 'text-red-600 font-medium' : 'text-[#4F4F4F]'}`}>
                          {inv.state === 'paid' ? 'Paid' : 'Outstanding'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
