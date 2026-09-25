// PairmeSection: the PairMe block on the QM admin restaurant page.
//
// The two wines below both print "Sauvignon Blanc" and are listed in the
// OPPOSITE order to the legs, so a join on position or on label shows the
// wrong producer against the wrong why-line and fails.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

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
});
