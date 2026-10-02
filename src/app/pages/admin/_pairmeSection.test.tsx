// PairmeSection: the PairMe block on the QM admin restaurant page.
//
// The two wines below both print "Sauvignon Blanc" and are listed in the
// OPPOSITE order to the legs, so a join on position or on label shows the
// wrong producer against the wrong why-line and fails.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';

const { getAdminRestaurantPairme } = vi.hoisted(() => ({ getAdminRestaurantPairme: vi.fn() }));
vi.mock('../../services/adminApi', () => ({ getAdminRestaurantPairme }));

import { PairmeSection } from './_pairmeSection';

const loaded = {
  venue: { id: 'v1', name: 'Metropolis' },
  wines: [
    { wine_id: 'mt-w-017', producer: 'Paddy Borthwick', wine_name: 'Sauvignon Blanc', vintage: null,
      list_source: 'wine_list', glass_cents: null, bottle_cents: 5500,
      say: 'PAD-ee BORTH-wick, SOH-vin-yon BLONK', say_source: 'drafted' },
    { wine_id: 'mt-w-007', producer: 'Fournier', wine_name: 'Sauvignon Blanc', vintage: null,
      list_source: 'wine_list', glass_cents: 1550, bottle_cents: 6200,
      say: 'foor-NYAY, soh-vee-NYOHN BLAHN', say_source: 'drafted' },
  ],
  pairings: [
    { dish_id: 'mt-d-004', name: "'Everything' Wedge Salad", course: 'Starters',
      pairings: [
        { wine_id: 'mt-w-007', why: 'Sharp enough for the buttermilk ranch.' },
        { wine_id: 'mt-w-017', why: 'Loud New Zealand citrus.' },
      ] },
  ],
};

afterEach(() => {
  cleanup();
  getAdminRestaurantPairme.mockReset();
});

describe('PairmeSection', () => {
  it('joins each leg to its wine by id, and names producer, list, unit and price', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: loaded });
    render(<PairmeSection restaurantId="r1" />);
    const legs = await screen.findAllByTestId('pairme-leg');
    expect(legs).toHaveLength(2);
    expect(legs[0].textContent).toContain('Fournier, Sauvignon Blanc');
    expect(legs[0].textContent).toContain('Wine list');
    expect(legs[0].textContent).toContain('$15.50 glass');
    expect(legs[0].textContent).toContain('$62 bottle');
    expect(legs[0].textContent).toContain('Sharp enough for the buttermilk ranch.');
    expect(legs[1].textContent).toContain('Paddy Borthwick, Sauvignon Blanc');
    expect(legs[1].textContent).toContain('$55 bottle');
    expect(legs[1].textContent).not.toContain('glass');
    expect(legs[1].textContent).toContain('Loud New Zealand citrus.');
  });

  it('crowns nothing', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: loaded });
    render(<PairmeSection restaurantId="r1" />);
    const dish = await screen.findByTestId('pairme-dish');
    for (const crown of ['#1', 'Top', 'Best', 'Recommended', 'rank']) {
      expect(dish.textContent).not.toContain(crown);
    }
  });

  it('shows each pronunciation with the wine and says when it is drafted', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: loaded });
    render(<PairmeSection restaurantId="r1" />);
    // The wines moved to their own tab (Moose, 2026-10-02: "Both, as two tabs").
    fireEvent.click(await screen.findByRole('tab', { name: 'By wine' }));
    const rows = await screen.findAllByTestId('pairme-wine');
    const fournier = rows.find((r) => r.textContent?.includes('Fournier'))!;
    expect(within(fournier).getByText(/foor-NYAY/).textContent).toContain('drafted, not yet reviewed');
  });

  it('says in words when nothing is loaded', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: { venue: null } });
    render(<PairmeSection restaurantId="r1" />);
    expect(await screen.findByText(/No PairMe wine list or pairings loaded/)).toBeTruthy();
  });

  it('flags a leg whose wine is not on the list instead of guessing', async () => {
    const broken = structuredClone(loaded);
    broken.pairings[0].pairings.push({ wine_id: 'mt-w-999', why: 'Not on her card.' });
    getAdminRestaurantPairme.mockResolvedValue({ data: broken });
    render(<PairmeSection restaurantId="r1" />);
    expect(await screen.findByText(/mt-w-999 is not on this restaurant's list/)).toBeTruthy();
    expect(screen.queryByText('Not on her card.')).toBeNull();
  });

  // ---- the two tabs (Moose, 2026-10-02: "Both, as two tabs") ----------------
  const fuller = {
    venue: { id: 'v1', name: 'Metropolis' },
    wines: [
      ...loaded.wines,
      { wine_id: 'mt-w-030', producer: 'Tempier', wine_name: 'Bandol Rouge', vintage: '2020',
        list_source: 'wine_list', glass_cents: null, bottle_cents: 14000, say: null, say_source: null },
    ],
    pairings: [
      ...loaded.pairings,
      { dish_id: 'mt-d-020', name: 'Steak Frites', course: 'Mains',
        pairings: [{ wine_id: 'mt-w-017', why: 'Cuts the bearnaise.' }] },
    ],
  };

  it('opens on By dish, one row per dish, and names the dishes short of three wines', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: fuller });
    render(<PairmeSection restaurantId="r1" />);
    const rows = await screen.findAllByTestId('pairme-dish');
    expect(rows.map((r) => r.textContent?.includes('Steak Frites'))).toEqual([false, true]);
    expect(rows[0].textContent).toContain('Two wines, not three');
    expect(rows[1].textContent).toContain('One wine, not three');
    expect(screen.getByTestId('pairme-summary').textContent).toContain('2 with fewer than three wines');
    expect(screen.queryByTestId('pairme-wine')).toBeNull();
  });

  it('course tabs show only that course', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: fuller });
    render(<PairmeSection restaurantId="r1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mains' }));
    const rows = screen.getAllByTestId('pairme-dish');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Steak Frites');
  });

  it('search finds a dish by the producer of a wine it is paired with', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: fuller });
    render(<PairmeSection restaurantId="r1" />);
    await screen.findAllByTestId('pairme-dish');
    fireEvent.change(screen.getByLabelText('Search pairings'), { target: { value: 'fournier' } });
    const rows = screen.getAllByTestId('pairme-dish');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Wedge Salad');
  });

  it('By wine lists every dish each wine pairs with, joined by id, not by the shared label', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: fuller });
    render(<PairmeSection restaurantId="r1" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'By wine' }));
    const rows = screen.getAllByTestId('pairme-wine');
    const dishesOf = (producer: string) =>
      within(rows.find((r) => r.textContent?.includes(producer))!).getByTestId('pairme-wine-dishes').textContent;
    // Both print "Sauvignon Blanc"; only Paddy Borthwick is on the steak.
    expect(dishesOf('Paddy Borthwick')).toContain('Steak Frites');
    expect(dishesOf('Fournier')).not.toContain('Steak Frites');
    expect(dishesOf('Fournier')).toContain('Wedge Salad');
    expect(dishesOf('Tempier')).toContain('Never paired');
  });

  it('the Never paired filter shows only wines no dish uses', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: fuller });
    render(<PairmeSection restaurantId="r1" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'By wine' }));
    fireEvent.click(screen.getByRole('button', { name: 'Never paired' }));
    const rows = screen.getAllByTestId('pairme-wine');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Tempier, Bandol Rouge');
    expect(rows[0].textContent).toContain('$140 bottle');
    expect(rows[0].textContent).toContain('No pronunciation yet');
    fireEvent.click(screen.getByRole('button', { name: 'Paired' }));
    expect(screen.getAllByTestId('pairme-wine').map((r) => r.textContent?.includes('Tempier'))).toEqual([false, false]);
  });
});
