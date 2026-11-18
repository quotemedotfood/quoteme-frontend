// A store's Stripe plan card: link by customer id, show the plan, price,
// discount, status and period, a plan that starts later, a Stripe read that
// failed, and unlink.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({ linkAdminRetailLocationStripe: vi.fn(), unlinkAdminRetailLocationStripe: vi.fn() }));
vi.mock('../../services/adminApi', () => m);

import { StoreBillingCard, planPrice, discountText } from './_storeBillingCard';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const billing = (extra: Record<string, unknown> = {}) => ({
  stripe_customer_id: 'cus_TOTALBEV1', stripe_subscription_id: 'sub_1', status: 'active',
  current_period_start: '2026-11-23T07:00:00Z', current_period_end: '2026-12-23T07:00:00Z', starts_at: null,
  plan: { price_id: 'price_1', amount_cents: 20000, currency: 'usd', interval: 'month', product_name: 'PairIt Total Bev' },
  discount: null, stripe_read: 'ok', ...extra,
});
const store = (b: unknown) => ({ id: 's1', name: 'Total Bev', billing: b } as never);

function show(b: unknown, onChange = vi.fn()) {
  render(<StoreBillingCard store={store(b)} onChange={onChange} card="" heading="" />);
  return onChange;
}

describe('StoreBillingCard', () => {
  it('links a store by its customer id and hands the new store back', async () => {
    const onChange = show(null);
    const linkBtn = screen.getByRole('button', { name: 'Link' }) as HTMLButtonElement;
    expect(linkBtn.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Stripe customer id'), { target: { value: ' cus_TOTALBEV1 ' } });
    m.linkAdminRetailLocationStripe.mockResolvedValueOnce({ error: 'That customer has no subscription on a retail price yet. Create it in Stripe first.' });
    fireEvent.click(linkBtn);
    expect((await screen.findByRole('alert')).textContent).toContain('no subscription on a retail price');

    m.linkAdminRetailLocationStripe.mockResolvedValueOnce({ data: store(billing()) });
    fireEvent.click(linkBtn);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(m.linkAdminRetailLocationStripe).toHaveBeenLastCalledWith('s1', 'cus_TOTALBEV1');
  });

  it('shows the plan, price, discount, status and period', () => {
    show(billing({ discount: { coupon_id: 'biURPvaT', name: 'Retail', amount_off_cents: 10000, percent_off: null, duration: 'forever' } }));
    const facts = within(screen.getByTestId('store-billing-facts'));
    expect(facts.getByText('PairIt Total Bev')).toBeTruthy();
    expect(facts.getByText('$200.00 a month')).toBeTruthy();
    expect(facts.getByText('Retail ($100.00 off, forever)')).toBeTruthy();
    expect(facts.getByText('active')).toBeTruthy();
    expect(facts.getByText('cus_TOTALBEV1')).toBeTruthy();
  });

  it('shows a plan that starts later, and says when Stripe could not be read', () => {
    show(billing({ stripe_subscription_id: null, status: 'incomplete', starts_at: '2026-11-23T19:00:00Z', current_period_end: null, stripe_read: 'failed', plan: null }));
    expect(screen.getByText(/^Starts Nov 23, 2026$/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('could not be read');
    // No plan read: the plan and the price both show a dash.
    expect(within(screen.getByTestId('store-billing-facts')).getAllByText('-', { selector: 'dd' })).toHaveLength(2);
  });

  it('unlinks, saying nothing in Stripe changes', async () => {
    const onChange = show(billing());
    m.unlinkAdminRetailLocationStripe.mockResolvedValue({ data: store(null) });
    fireEvent.click(screen.getByRole('button', { name: /Unlink \(nothing in Stripe changes\)/ }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(m.unlinkAdminRetailLocationStripe).toHaveBeenCalledWith('s1');
  });

  it('formats prices and discounts', () => {
    expect(planPrice(null)).toBe('-');
    expect(planPrice({ price_id: 'p', amount_cents: 10000, currency: 'usd', interval: 'month', product_name: null })).toBe('$100.00 a month');
    expect(discountText({ coupon_id: 'c', name: null, amount_off_cents: null, percent_off: 20, duration: 'once' })).toBe('c (20% off, once)');
  });
});
