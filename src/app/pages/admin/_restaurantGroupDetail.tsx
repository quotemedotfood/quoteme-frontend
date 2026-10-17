// The open group on the QM admin Restaurant Groups page. Moose, 2026-10-15:
// "Seth wants to pay for all of his restaurants at once": make the group,
// bundle the restaurants into it, and send one payment link that covers them
// all. Reads GET /api/v1/restaurant_groups/:id; writes add_restaurant,
// remove_restaurant and payment_link (QM admin only on the backend).
import { useEffect, useState } from 'react';
import { Plus, Copy, Link2 } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  getAdminRestaurantGroup,
  getAdminRestaurants,
  addRestaurantToGroup,
  removeRestaurantFromGroup,
  createGroupPaymentLink,
  getGroupPaymentOffers,
  GroupPaymentOffer,
  GroupPaymentCoupon,
  AdminRestaurantGroupDetail,
  AdminRestaurantGroupBilling,
  AdminRestaurant,
} from '../../services/adminApi';

/** What the plan's status means for the restaurants in the group. */
export function groupBillingSentence(billing: AdminRestaurantGroupBilling | null | undefined): string {
  switch (billing?.status ?? null) {
    case null:
      return 'No plan yet.';
    case 'incomplete':
    case 'incomplete_expired':
      return 'Payment link made, not paid yet.';
    case 'active':
      return 'Paid. Every restaurant in this group is covered.';
    case 'past_due':
    case 'unpaid':
      return 'Payment failed. The restaurants are not covered until it is paid.';
    case 'canceled':
      return 'Canceled. The restaurants are not covered.';
    default:
      return `Plan status: ${billing?.status}. The restaurants are not covered.`;
  }
}

/** Integer cents as dollars, e.g. 10000 -> "$100.00". */
export function formatCents(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function everyLabel(offer: GroupPaymentOffer): string {
  return offer.interval_count === 1 ? offer.interval : `${offer.interval_count} ${offer.interval}s`;
}

/** "Monthly per restaurant: $100.00 per restaurant per month. 2 active restaurants: $200.00 per month." */
export function offerLabel(offer: GroupPaymentOffer, activeCount: number): string {
  const every = everyLabel(offer);
  const name = offer.nickname || offer.lookup_key;
  const each = formatCents(offer.unit_amount, offer.currency);
  const total = formatCents(offer.unit_amount * activeCount, offer.currency);
  return `${name}: ${each} per restaurant per ${every}. ${activeCount} active restaurant${activeCount === 1 ? '' : 's'}: ${total} per ${every}.`;
}

/** "First 3 months: $100.00 off each bill for 3 months" */
export function couponLabel(c: GroupPaymentCoupon): string {
  const off = c.percent_off != null ? `${c.percent_off}% off` : `${formatCents(c.amount_off ?? 0, c.currency ?? 'usd')} off`;
  const when =
    c.duration === 'once' ? 'the first bill'
    : c.duration === 'forever' ? 'every bill'
    : `each bill for ${c.duration_in_months} month${c.duration_in_months === 1 ? '' : 's'}`;
  return `${c.name || c.id}: ${off} ${when}`;
}

export function RestaurantGroupDetail({
  groupId,
  onCountChange,
}: {
  groupId: string;
  onCountChange?: (count: number) => void;
}) {
  const [detail, setDetail] = useState<AdminRestaurantGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminRestaurant[]>([]);
  const [searching, setSearching] = useState(false);

  const [link, setLink] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [offersBusy, setOffersBusy] = useState(false);
  const [menu, setMenu] = useState<{ offers: GroupPaymentOffer[]; coupons: GroupPaymentCoupon[]; active_restaurant_count: number } | null>(null);
  const [offerKey, setOfferKey] = useState('');
  const [couponId, setCouponId] = useState('');
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await getAdminRestaurantGroup(groupId);
    if (res.data) {
      setDetail(res.data);
      onCountChange?.(res.data.restaurants.length);
    } else {
      setError(res.error || 'Failed to load group');
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    setLink(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // A Stripe quantity that could not be updated is a person's job in Stripe.
  // own: what happened to a joining restaurant's own plan (it ends at the end
  // of its paid period once the group covers it).
  function syncNotice(sync?: Record<string, string>, own?: Record<string, string>): string | null {
    if (own && Object.values(own).includes('failed')) {
      return "Added, but Stripe did not take the change to the restaurant's own plan. End it at period end in Stripe.";
    }
    if (own && Object.values(own).includes('cancel_at_period_end')) {
      return "Added. The group covers it now, and its own plan ends when the period it paid for ends.";
    }
    if (!sync) return null;
    if (Object.values(sync).includes('failed')) {
      return 'Moved, but Stripe did not take the new restaurant count. Fix the quantity in Stripe.';
    }
    if (Object.values(sync).includes('updated')) return 'Stripe now bills for the new restaurant count.';
    return null;
  }

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    const res = await getAdminRestaurants({ page: 1, per_page: 8, q });
    setResults(res.data?.restaurants ?? []);
    setSearching(false);
  }

  async function add(restaurantId: string) {
    setBusyId(restaurantId);
    setActionError(null);
    const res = await addRestaurantToGroup(groupId, { restaurant_id: restaurantId });
    if (res.error) setActionError(res.error);
    else {
      setNotice(syncNotice(res.data?.billing_sync, res.data?.own_plans));
      setResults((prev) => prev.filter((r) => r.id !== restaurantId));
      await load();
    }
    setBusyId(null);
  }

  async function remove(restaurantId: string) {
    setBusyId(restaurantId);
    setActionError(null);
    const res = await removeRestaurantFromGroup(groupId, restaurantId);
    if (res.error) setActionError(res.error);
    else {
      setNotice(syncNotice(res.data?.billing_sync));
      await load();
    }
    setBusyId(null);
  }

  // "Create payment link" opens the offer form (Moose, 2026-10-16): pick an
  // offer, optionally a coupon, then make the link.
  async function openOffers() {
    setOffersBusy(true);
    setActionError(null);
    setLink(null);
    const res = await getGroupPaymentOffers(groupId);
    if (res.data) {
      setMenu(res.data);
      setOfferKey(res.data.offers[0]?.lookup_key ?? '');
      setCouponId('');
    } else {
      setActionError(res.error || 'Could not load the offers');
    }
    setOffersBusy(false);
  }

  async function makeLink() {
    if (!offerKey) return;
    setLinkBusy(true);
    setActionError(null);
    setCopied(false);
    const res = await createGroupPaymentLink(groupId, couponId ? { lookup_key: offerKey, coupon: couponId } : { lookup_key: offerKey });
    if (res.data) {
      setLink(res.data.checkout_url);
      setMenu(null);
      setDetail((prev) => (prev ? { ...prev, billing: res.data!.billing } : prev));
    } else {
      setActionError(res.error || 'Could not make the payment link');
    }
    setLinkBusy(false);
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setActionError('Could not copy. Select the link and copy it by hand.');
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Loading restaurants…</p>;
  if (error || !detail) return <p className="text-sm text-red-500">{error}</p>;

  const memberIds = new Set(detail.restaurants.map((r) => r.id));
  // Only active restaurants are paid for, and an inactive group covers nobody
  // (Moose, 2026-10-15).
  const activeCount = detail.restaurants.filter((r) => r.status === 'active').length;
  const groupActive = detail.status === 'active';
  const billing = detail.billing;
  const live = ['active', 'trialing', 'past_due', 'unpaid', 'paused'].includes(billing?.status ?? '');

  return (
    <div className="space-y-4" data-testid="restaurant-group-detail">
      {detail.restaurants.length === 0 ? (
        <p className="text-sm text-gray-400">No restaurants in this group yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Name</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">City</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">State</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Status</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">In group</th>
              </tr>
            </thead>
            <tbody>
              {detail.restaurants.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-[#2A2A2A]">{r.name}</td>
                  <td className="px-4 py-2 text-gray-500">{r.city || '-'}</td>
                  <td className="px-4 py-2 text-gray-500">{r.state || '-'}</td>
                  <td className="px-4 py-2 text-gray-500">{r.status === 'active' ? 'active' : `${r.status} (not paid for)`}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-600 hover:text-red-700 h-7"
                      disabled={busyId === r.id}
                      onClick={() => remove(r.id)}
                      aria-label={`Remove ${r.name}${r.city ? ` (${r.city})` : ''} from the group`}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add restaurants: search by name or city, then add. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Find a restaurant to add…"
            className="max-w-xs h-8 text-sm"
            aria-label="Find a restaurant to add"
          />
          <Button size="sm" variant="ghost" className="text-xs h-8" disabled={searching || !query.trim()} onClick={search}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-[#2A2A2A]">{r.name}</span>
                  <span className="text-gray-500">{[r.city, r.state].filter(Boolean).join(', ') ? `, ${[r.city, r.state].filter(Boolean).join(', ')}` : ''}</span>
                  {r.restaurant_group && r.restaurant_group.id !== groupId && (
                    <span className="block text-xs text-gray-400">Now in {r.restaurant_group.name}</span>
                  )}
                </span>
                {memberIds.has(r.id) ? (
                  <span className="text-xs text-gray-400">In this group</span>
                ) : (
                  <Button
                    size="sm"
                    className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-7 shrink-0"
                    disabled={busyId === r.id}
                    onClick={() => add(r.id)}
                    aria-label={`Add ${r.name}${r.city ? ` (${r.city})` : ''} to the group`}
                  >
                    <Plus size={13} className="mr-1" />
                    Add
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* One payment for the whole group. */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 space-y-2">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">PairMe plan for the group</p>
        <p className="text-sm text-[#2A2A2A]" data-testid="group-billing-status">{groupBillingSentence(billing)}</p>
        {billing?.current_period_end && billing.paid && (
          <p className="text-xs text-gray-500">Paid through {new Date(billing.current_period_end).toLocaleDateString()}.</p>
        )}
        {!live && !menu && (
          <Button
            size="sm"
            className="bg-[#7FAEC2] hover:bg-[#6a9aae] text-white text-xs h-8"
            disabled={offersBusy || activeCount === 0 || !groupActive}
            onClick={openOffers}
          >
            <Link2 size={13} className="mr-1" />
            {offersBusy ? 'Loading offers…' : 'Create payment link'}
          </Button>
        )}
        {!live && menu && (
          <div className="space-y-2 border border-gray-100 rounded-md p-3" data-testid="payment-offer-form">
            <label className="block text-xs text-gray-600">
              Offer
              <select
                value={offerKey}
                onChange={(e) => setOfferKey(e.target.value)}
                className="mt-1 block w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
                aria-label="Offer"
              >
                {menu.offers.map((o) => (
                  <option key={o.lookup_key} value={o.lookup_key}>{offerLabel(o, menu.active_restaurant_count)}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-gray-600">
              Coupon
              <select
                value={couponId}
                onChange={(e) => setCouponId(e.target.value)}
                className="mt-1 block w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
                aria-label="Coupon"
              >
                <option value="">None</option>
                {menu.coupons.map((c) => (
                  <option key={c.id} value={c.id}>{couponLabel(c)}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-[#7FAEC2] hover:bg-[#6a9aae] text-white text-xs h-8"
                disabled={linkBusy || !offerKey}
                onClick={makeLink}
              >
                {linkBusy ? 'Making link…' : 'Make link'}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setMenu(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {!groupActive && (
          <p className="text-xs text-gray-500">This group is inactive, so it covers no restaurants. Make it active to take payment.</p>
        )}
        {!live && groupActive && activeCount > 0 && (
          <p className="text-xs text-gray-500">
            One payment for the {activeCount} active restaurant{activeCount === 1 ? '' : 's'} in this group. Whoever pays does not need a QuoteMe sign-in.
          </p>
        )}
        {link && (
          <div className="flex flex-wrap items-center gap-2">
            <Input readOnly value={link} aria-label="Payment link" className="h-8 text-xs flex-1 min-w-0" onFocus={(e) => e.target.select()} />
            <Button size="sm" variant="ghost" className="text-xs h-8" onClick={copyLink}>
              <Copy size={13} className="mr-1" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
      </div>

      {notice && <p className="text-xs text-gray-600" role="status">{notice}</p>}
      {actionError && <p className="text-xs text-red-500" role="alert">{actionError}</p>}
    </div>
  );
}
