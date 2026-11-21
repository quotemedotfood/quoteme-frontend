// A store's paid placement card: the list with its state and End, finding a
// wine, ticking the stores that show it (this store ticked first), sending
// ids only, and a refused add.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getAdminStorePromotions: vi.fn(),
  searchAdminPromotionWines: vi.fn(),
  getAdminPromotionStores: vi.fn(),
  createAdminStorePromotions: vi.fn(),
  endAdminStorePromotion: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { StorePromotionsCard, dayLabel } from './_storePromotionsCard';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const promo = (extra: Record<string, unknown> = {}) => ({
  id: 'p1', store_id: 's1', wine_id: 'w1', producer: 'Domaine Test', wine: 'Willamette Pinot Noir', badge: 'paid_placement',
  starts_on: '2026-11-23', ends_on: '2026-11-29', state: 'live', ...extra,
});
const wine = { id: 'w1', producer: 'Domaine Test', wine: 'Willamette Pinot Noir', product_name: 'Pinot A', shown_price_cents: 1299 };

describe('StorePromotionsCard', () => {
  it('lists the store’s placements with their days and state, and ends one', async () => {
    m.getAdminStorePromotions.mockResolvedValueOnce({ data: { promotions: [promo(), promo({ id: 'p2', state: 'ended' })] } });
    render(<StorePromotionsCard storeId="s1" card="" heading="" />);

    const rows = await screen.findAllByTestId('store-promotion');
    expect(rows[0].textContent).toContain('Domaine Test, Willamette Pinot Noir');
    expect(rows[0].textContent).toContain('Paid placement · Nov 23, 2026 to Nov 29, 2026 · Live');
    expect(screen.getAllByRole('button', { name: 'End' })).toHaveLength(1);

    m.endAdminStorePromotion.mockResolvedValueOnce({ data: { ended: true } });
    m.getAdminStorePromotions.mockResolvedValueOnce({ data: { promotions: [promo({ state: 'ended' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    await waitFor(() => expect(m.endAdminStorePromotion).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'End' })).toHaveLength(0));
  });

  it('finds a wine, ticks this store first, and sends ids only', async () => {
    m.getAdminStorePromotions.mockResolvedValue({ data: { promotions: [] } });
    render(<StorePromotionsCard storeId="s1" card="" heading="" />);
    expect(await screen.findByText('No paid placements at this store.')).toBeTruthy();

    m.searchAdminPromotionWines.mockResolvedValueOnce({ data: { wines: [wine] } });
    fireEvent.change(screen.getByLabelText('Find a wine at this store'), { target: { value: 'pinot' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(m.searchAdminPromotionWines).toHaveBeenCalledWith('s1', 'pinot');

    m.getAdminPromotionStores.mockResolvedValueOnce({
      data: {
        badges: ['paid_placement'],
        stores: [
          { store_id: 's1', name: 'Total Beverage', wines: [{ id: 'w1', product_name: 'Pinot A', shown_price_cents: 1299 }] },
          { store_id: 's2', name: 'Winter Wine', wines: [{ id: 'w9', product_name: 'Pinot A', shown_price_cents: 1399 }] },
        ],
      },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Domaine Test, Willamette Pinot Noir/ }));
    await waitFor(() => expect(m.getAdminPromotionStores).toHaveBeenCalledWith('w1'));

    const here = (await screen.findByLabelText('Total Beverage: Pinot A')) as HTMLInputElement;
    const there = screen.getByLabelText('Winter Wine: Pinot A') as HTMLInputElement;
    expect(here.checked).toBe(true);
    expect(there.checked).toBe(false);
    const addBtn = screen.getByRole('button', { name: 'Add paid placement' }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);

    fireEvent.click(there);
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-11-23' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-11-29' } });
    m.createAdminStorePromotions.mockResolvedValueOnce({ data: { promotions: [promo()] } });
    fireEvent.click(addBtn);

    await waitFor(() => expect(m.createAdminStorePromotions).toHaveBeenCalledWith({
      badge: 'paid_placement', starts_on: '2026-11-23', ends_on: '2026-11-29',
      wines: [{ store_id: 's1', wine_id: 'w1' }, { store_id: 's2', wine_id: 'w9' }],
    }));
  });

  it('shows the server’s refusal and keeps the form', async () => {
    m.getAdminStorePromotions.mockResolvedValue({ data: { promotions: [] } });
    m.searchAdminPromotionWines.mockResolvedValueOnce({ data: { wines: [wine] } });
    m.getAdminPromotionStores.mockResolvedValueOnce({
      data: { badges: ['paid_placement'], stores: [{ store_id: 's1', name: 'Total Beverage', wines: [{ id: 'w1', product_name: 'Pinot A', shown_price_cents: 1299 }] }] },
    });
    render(<StorePromotionsCard storeId="s1" card="" heading="" />);
    fireEvent.change(screen.getByLabelText('Find a wine at this store'), { target: { value: 'pinot' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));
    fireEvent.click(await screen.findByRole('button', { name: /Domaine Test, Willamette Pinot Noir/ }));
    await screen.findByLabelText('Total Beverage: Pinot A');
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-11-23' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-11-29' } });

    m.createAdminStorePromotions.mockResolvedValueOnce({ error: 'Total Beverage already has a promotion on that wine for some of those days.' });
    fireEvent.click(screen.getByRole('button', { name: 'Add paid placement' }));
    expect((await screen.findByRole('alert')).textContent).toContain('already has a promotion');
    expect(screen.getByLabelText('Total Beverage: Pinot A')).toBeTruthy();
  });

  it('reads a day as a calendar day', () => {
    expect(dayLabel('2026-11-23')).toBe('Nov 23, 2026');
  });
});
