// The open group on the QM admin Restaurant Groups page: the restaurants in
// it, adding and removing them, and one payment link for the whole group
// (Moose, 2026-10-15: "when Seth pays for all 3 that they're covered").
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getAdminRestaurantGroup: vi.fn(),
  getAdminRestaurants: vi.fn(),
  addRestaurantToGroup: vi.fn(),
  removeRestaurantFromGroup: vi.fn(),
  createGroupPaymentLink: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { RestaurantGroupDetail, groupBillingSentence } from './_restaurantGroupDetail';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const r = (id: string, name: string, city: string) => ({ id, name, city, state: 'MA', status: 'active' });
const noPlan = { configured: true, status: null, paid: false, current_period_end: null, has_customer: false };
const group = (restaurants: ReturnType<typeof r>[], billing: any = noPlan) => ({
  data: { id: 'g1', name: "Seth's Restaurants", status: 'active', created_at: '2026-10-15', restaurant_count: restaurants.length, billing, restaurants },
});

const metropolis = r('r1', 'Metropolis', 'Boston');
const aqBoston = r('r2', 'Aquitaine', 'Boston');
const aqChestnut = r('r3', 'Aquitaine', 'Chestnut Hill');

describe('RestaurantGroupDetail', () => {
  it('lists the restaurants, and two with the same name are told apart by city', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group([metropolis, aqBoston, aqChestnut]));
    const onCount = vi.fn();
    render(<RestaurantGroupDetail groupId="g1" onCountChange={onCount} />);
    expect(await screen.findByText('Metropolis')).toBeTruthy();
    expect(screen.getByLabelText('Remove Aquitaine (Boston) from the group')).toBeTruthy();
    expect(screen.getByLabelText('Remove Aquitaine (Chestnut Hill) from the group')).toBeTruthy();
    expect(onCount).toHaveBeenCalledWith(3);
  });

  it('finds a restaurant, adds it by its id, and reloads the group', async () => {
    m.getAdminRestaurantGroup.mockResolvedValueOnce(group([metropolis, aqBoston])).mockResolvedValueOnce(group([metropolis, aqBoston, aqChestnut]));
    m.getAdminRestaurants.mockResolvedValue({ data: { restaurants: [{ ...aqChestnut, restaurant_group: null }], meta: {} } });
    m.addRestaurantToGroup.mockResolvedValue({ data: { id: 'r3', name: 'Aquitaine', restaurant_group_id: 'g1' } });
    render(<RestaurantGroupDetail groupId="g1" />);
    fireEvent.change(await screen.findByLabelText('Find a restaurant to add'), { target: { value: 'Aquitaine' } });
    fireEvent.click(screen.getByText('Search'));
    fireEvent.click(await screen.findByLabelText('Add Aquitaine (Chestnut Hill) to the group'));
    await waitFor(() => expect(m.addRestaurantToGroup).toHaveBeenCalledWith('g1', { restaurant_id: 'r3' }));
    expect(await screen.findByLabelText('Remove Aquitaine (Chestnut Hill) from the group')).toBeTruthy();
  });

  it('removes a restaurant from the group', async () => {
    m.getAdminRestaurantGroup.mockResolvedValueOnce(group([metropolis, aqBoston])).mockResolvedValueOnce(group([metropolis]));
    m.removeRestaurantFromGroup.mockResolvedValue({ data: { id: 'r2', name: 'Aquitaine', restaurant_group_id: null } });
    render(<RestaurantGroupDetail groupId="g1" />);
    fireEvent.click(await screen.findByLabelText('Remove Aquitaine (Boston) from the group'));
    await waitFor(() => expect(m.removeRestaurantFromGroup).toHaveBeenCalledWith('g1', 'r2'));
    await waitFor(() => expect(screen.queryByText('Aquitaine')).toBeNull());
  });

  it('makes one payment link for the group and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    m.getAdminRestaurantGroup.mockResolvedValue(group([metropolis, aqBoston, aqChestnut]));
    m.createGroupPaymentLink.mockResolvedValue({
      data: { checkout_url: 'https://checkout.stripe.com/c/pay_grp', quantity: 3, billing: { ...noPlan, status: 'incomplete', has_customer: true } },
    });
    render(<RestaurantGroupDetail groupId="g1" />);
    expect(await screen.findByText(/One payment for the 3 active restaurants/)).toBeTruthy();
    fireEvent.click(screen.getByText('Create payment link'));
    await waitFor(() => expect(m.createGroupPaymentLink).toHaveBeenCalledWith('g1'));
    expect(((await screen.findByLabelText('Payment link')) as HTMLInputElement).value).toBe('https://checkout.stripe.com/c/pay_grp');
    expect(screen.getByTestId('group-billing-status').textContent).toBe('Payment link made, not paid yet.');
    fireEvent.click(screen.getByText('Copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay_grp'));
    expect(await screen.findByText('Copied')).toBeTruthy();
  });

  it('shows the backend message when billing is not set up', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group([metropolis]));
    m.createGroupPaymentLink.mockResolvedValue({ error: 'Billing is not set up yet', status: 503 });
    render(<RestaurantGroupDetail groupId="g1" />);
    fireEvent.click(await screen.findByText('Create payment link'));
    expect((await screen.findByRole('alert')).textContent).toBe('Billing is not set up yet');
  });

  it('offers no second link to a group that is paying, and says the restaurants are covered', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group([metropolis, aqBoston, aqChestnut], { ...noPlan, status: 'active', paid: true }));
    render(<RestaurantGroupDetail groupId="g1" />);
    expect((await screen.findByTestId('group-billing-status')).textContent).toBe('Paid. Every restaurant in this group is covered.');
    expect(screen.queryByText('Create payment link')).toBeNull();
  });

  it('says when Stripe did not take the new count', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group([metropolis, aqBoston], { ...noPlan, status: 'active', paid: true }));
    m.removeRestaurantFromGroup.mockResolvedValue({ data: { id: 'r2', name: 'Aquitaine', restaurant_group_id: null, billing_sync: { g1: 'failed' } } });
    render(<RestaurantGroupDetail groupId="g1" />);
    fireEvent.click(await screen.findByLabelText('Remove Aquitaine (Boston) from the group'));
    expect((await screen.findByRole('status')).textContent).toMatch(/Fix the quantity in Stripe/);
  });
});

describe('Moose rulings, 2026-10-15', () => {
  it('counts only active restaurants toward the payment', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group([metropolis, aqBoston, { ...aqChestnut, status: 'inactive' }]));
    render(<RestaurantGroupDetail groupId="g1" />);
    expect(await screen.findByText(/One payment for the 2 active restaurants/)).toBeTruthy();
    expect(screen.getByText('inactive (not paid for)')).toBeTruthy();
  });

  it('offers no payment link for an inactive group', async () => {
    const inactive = group([metropolis, aqBoston]);
    inactive.data.status = 'inactive';
    m.getAdminRestaurantGroup.mockResolvedValue(inactive);
    render(<RestaurantGroupDetail groupId="g1" />);
    expect(await screen.findByText(/This group is inactive, so it covers no restaurants/)).toBeTruthy();
    expect((screen.getByText('Create payment link').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it("says a joining restaurant's own plan ends at the end of its paid period", async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group([metropolis], { ...noPlan, status: 'active', paid: true }));
    m.getAdminRestaurants.mockResolvedValue({ data: { restaurants: [{ ...aqChestnut, restaurant_group: null }], meta: {} } });
    m.addRestaurantToGroup.mockResolvedValue({ data: { id: 'r3', name: 'Aquitaine', restaurant_group_id: 'g1', own_plans: { r3: 'cancel_at_period_end' } } });
    render(<RestaurantGroupDetail groupId="g1" />);
    fireEvent.change(await screen.findByLabelText('Find a restaurant to add'), { target: { value: 'Aquitaine' } });
    fireEvent.click(screen.getByText('Search'));
    fireEvent.click(await screen.findByLabelText('Add Aquitaine (Chestnut Hill) to the group'));
    expect((await screen.findByRole('status')).textContent).toMatch(/its own plan ends when the period it paid for ends/);
  });
});

describe('groupBillingSentence', () => {
  it('only an active plan reads as covered', () => {
    for (const status of [null, 'incomplete', 'past_due', 'unpaid', 'canceled', 'paused']) {
      expect(groupBillingSentence({ ...noPlan, status } as any)).not.toMatch(/is covered/);
    }
    expect(groupBillingSentence({ ...noPlan, status: 'active' })).toMatch(/is covered/);
  });
});
