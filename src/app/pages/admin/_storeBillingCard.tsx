// A RETAIL STORE'S STRIPE PLAN on its QM admin page (QuoteMe #971). Moose
// makes the customer and the plan by hand in Stripe; here a QM admin pastes
// the customer id to link it, and the page shows the plan and its status.
// Nothing here writes to Stripe.
import { useState } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  linkAdminRetailLocationStripe,
  unlinkAdminRetailLocationStripe,
  AdminRetailBilling,
  AdminRetailLocationDetail,
} from '../../services/adminApi';

/** "$200.00 a month" from integer cents. */
export function planPrice(plan: AdminRetailBilling['plan']): string {
  if (!plan || plan.amount_cents == null) return '-';
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: (plan.currency || 'usd').toUpperCase() }).format(plan.amount_cents / 100);
  return plan.interval ? `${money} a ${plan.interval}` : money;
}

/** "$100.00 off, forever" or "20% off, once". */
export function discountText(d: AdminRetailBilling['discount']): string | null {
  if (!d) return null;
  const off = d.amount_off_cents != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(d.amount_off_cents / 100)
    : d.percent_off != null ? `${d.percent_off}%` : null;
  const parts = [off ? `${off} off` : null, d.duration].filter(Boolean).join(', ');
  return [d.name || d.coupon_id, parts ? `(${parts})` : null].filter(Boolean).join(' ');
}

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

export function StoreBillingCard({
  store,
  onChange,
  card,
  heading,
}: {
  store: AdminRetailLocationDetail;
  onChange: (next: AdminRetailLocationDetail) => void;
  card: string;
  heading: string;
}) {
  const [customerId, setCustomerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const billing = store.billing;

  async function link() {
    const id = customerId.trim();
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    const res = await linkAdminRetailLocationStripe(store.id, id);
    setBusy(false);
    if (res.data) {
      setCustomerId('');
      onChange(res.data);
    } else {
      setError(res.error || 'Failed to link');
    }
  }

  async function unlink() {
    setBusy(true);
    setError(null);
    const res = await unlinkAdminRetailLocationStripe(store.id);
    setBusy(false);
    if (res.data) onChange(res.data);
    else setError(res.error || 'Failed to unlink');
  }

  return (
    <div className={card} data-testid="store-billing">
      <p className={heading}>Stripe plan</p>
      {billing ? (
        <>
          <dl className="grid grid-cols-[10rem_1fr] gap-y-1 text-sm" data-testid="store-billing-facts">
            <dt className="text-gray-500">Plan</dt><dd>{billing.plan?.product_name || '-'}</dd>
            <dt className="text-gray-500">Price</dt><dd>{planPrice(billing.plan)}</dd>
            {billing.discount && (<><dt className="text-gray-500">Discount</dt><dd>{discountText(billing.discount)}</dd></>)}
            <dt className="text-gray-500">Status</dt><dd>{billing.starts_at && !billing.stripe_subscription_id ? `Starts ${day(billing.starts_at)}` : billing.status}</dd>
            {billing.current_period_end && (<><dt className="text-gray-500">Paid through</dt><dd>{day(billing.current_period_end)}</dd></>)}
            <dt className="text-gray-500">Stripe customer</dt><dd className="font-mono text-xs break-all">{billing.stripe_customer_id}</dd>
          </dl>
          {billing.stripe_read === 'failed' && (
            <p className="text-xs text-amber-700" role="status">Stripe could not be read just now, so the plan and price are missing. The status is the last one Stripe sent.</p>
          )}
          <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-700 h-7 px-0" disabled={busy} onClick={unlink}>
            Unlink (nothing in Stripe changes)
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500">Not linked. Make the customer and plan in Stripe, then paste the customer id here.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && link()}
              placeholder="cus_..."
              aria-label="Stripe customer id"
              className="max-w-xs h-8 text-sm font-mono"
            />
            <Button size="sm" className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8" disabled={busy || !customerId.trim()} onClick={link}>
              {busy ? 'Linking…' : 'Link'}
            </Button>
          </div>
        </>
      )}
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}
