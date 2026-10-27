// ONE BEVERAGE: what the QM admin sees for a single corpus row (Moose,
// 2026-10-27). Identity, pronunciation, the tasting note (read only), the
// restaurants that pour it, the distributors that sell it, source references
// and the needs review badge. Reader of QuoteMe
// Api::V1::Admin::BeveragesController#show.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

function show(over: Record<string, unknown> = {}) {
  return {
    beverage: {
      id: 'bev-1', name: 'Cuvee A', kind: 'wine', color: 'red', style: null, grapes: ['syrah'],
      country: 'France', region: 'Rhone', appellation: 'Cornas', aliases: [], identity_key: 'wine|brand-1|cuvee a|red',
      pronunciation: 'koo-VAY', tasting_note: { text: 'Dark fruit, pepper.', source: 'producer_sheet', author_user_id: null, written_at: null },
      details: {}, source_refs: [{ table: 'pairme_capture_rows', id: 'row-1', owner: 'venue' }], needs_review: true,
      created_via: 'pairme_capture_rows', created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z',
      brand: { id: 'brand-1', name: 'Domaine X', kind: null, country: null, region: null, source: null, source_refs: null },
    },
    restaurants: [{
      restaurant_id: 'r-1', name: 'Bistro Uno', city: 'Boston', state: 'MA', venue_id: 'v-1',
      rows: [{ capture_row_id: 'row-1', producer: 'Domaine X', wine_name: 'Cuvee A', vintage: '2021', list_source: null, list_section: 'Reds', glass_cents: 1600, bottle_cents: 6400 }],
    }],
    diner_photo_row_count: 0,
    distributors: [{
      distributor_id: 'd-1', name: 'Estate Brands',
      products: [{ product_id: 'p-1', item_number: 'EB-12', product_name: 'Domaine X Cuvee A', unit_size: '750ml', upc: null, status: 'active' }],
    }],
    pending_wine_matches: [],
    ...over,
  };
}

const { getAdminBeverage } = vi.hoisted(() => ({
  getAdminBeverage: vi.fn(async (_id: string) => ({ data: show() as unknown })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminBeverage };
});

import { QMAdminBeverageDetail } from './QMAdminBeverageDetail';

afterEach(() => { cleanup(); getAdminBeverage.mockClear(); });

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/qm-admin/beverages/wines/bev-1']}>
      <Routes>
        <Route path="/qm-admin/beverages/wines/:id" element={<QMAdminBeverageDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QMAdminBeverageDetail', () => {
  it('asks for the beverage in the URL and shows its identity', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Cuvee A' })).toBeTruthy();
    expect(getAdminBeverage).toHaveBeenCalledWith('bev-1');
    expect(screen.getByTestId('beverage-producer').getAttribute('href')).toBe('/qm-admin/brands/brand-1');
    expect(screen.getByTestId('beverage-pronunciation').textContent).toBe('koo-VAY');
    expect(screen.getByText('Cornas')).toBeTruthy();
    expect(screen.getByTestId('needs-review-badge')).toBeTruthy();
  });

  it('shows the tasting note read only', async () => {
    renderPage();
    const note = await screen.findByTestId('beverage-tasting-note');
    expect(note.textContent).toContain('Dark fruit, pepper.');
    expect(note.textContent).toContain('Producer sheet');
    expect(note.querySelector('textarea, input')).toBeNull();
  });

  it('lists the restaurants that pour it and the distributors that sell it', async () => {
    renderPage();
    const restaurants = await screen.findByTestId('beverage-restaurants');
    expect(within(restaurants).getByRole('link', { name: 'Bistro Uno' }).getAttribute('href')).toBe('/qm-admin/restaurants/r-1');
    expect(within(restaurants).getByText('$16')).toBeTruthy();
    const distributors = screen.getByTestId('beverage-distributors');
    expect(within(distributors).getByRole('link', { name: 'Estate Brands' }).getAttribute('href')).toBe('/qm-admin/distributors/d-1');
    expect(within(distributors).getByText('EB-12')).toBeTruthy();
  });

  it('shows the source references', async () => {
    renderPage();
    const refs = await screen.findByTestId('beverage-source-refs');
    expect(refs.textContent).toContain('pairme_capture_rows');
    expect(refs.textContent).toContain('row-1');
  });

  it('shows no badge when the beverage does not need review', async () => {
    const base = show();
    getAdminBeverage.mockResolvedValueOnce({ data: { ...base, beverage: { ...base.beverage, needs_review: false } } });
    renderPage();
    await screen.findByRole('heading', { name: 'Cuvee A' });
    expect(screen.queryByTestId('needs-review-badge')).toBeNull();
  });
});
