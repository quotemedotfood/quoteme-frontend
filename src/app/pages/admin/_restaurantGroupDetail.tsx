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
  function syncNotice(sync?: Record<string, string>): string | null {
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
      setNotice(syncNotice(res.data?.billing_sync));
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

  async function makeLink() {
    setLinkBusy(true);
    setActionError(null);
    setCopied(false);
    const res = await createGroupPaymentLink(groupId);
    if (res.data) {
      setLink(res.data.checkout_url);
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
                <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">In group</th>
              </tr>
            </thead>
            <tbody>
              {detail.restaurants.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-[#2A2A2A]">{r.name}</td>
                  <td className="px-4 py-2 text-gray-500">{r.city || '-'}</td>
                  <td className="px-4 py-2 text-gray-500">{r.state || '-'}</td>
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
        {!live && (
          <Button
            size="sm"
            className="bg-[#7FAEC2] hover:bg-[#6a9aae] text-white text-xs h-8"
            disabled={linkBusy || detail.restaurants.length === 0}
            onClick={makeLink}
          >
            <Link2 size={13} className="mr-1" />
            {linkBusy ? 'Making link…' : 'Create payment link'}
          </Button>
        )}
        {!live && detail.restaurants.length > 0 && (
          <p className="text-xs text-gray-500">
            One payment for all {detail.restaurants.length} restaurant{detail.restaurants.length === 1 ? '' : 's'} in this group. Whoever pays does not need a QuoteMe sign-in.
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
