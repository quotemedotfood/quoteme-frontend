// BEVERAGES > WINES: the filters live on the column headers (Moose,
// 2026-10-27). Each control sits in the header row under its column, goes to
// the server as a query param, and resets to page 1. A header click sorts the
// table server-side. The backend half is pinned by QuoteMe's
// spec/requests/api/v1/admin/beverages_spec.rb.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

function row(over: Record<string, unknown> = {}) {
  return {
    id: 'bev-1', name: 'Cuvee A', brand: { id: 'brand-1', name: 'Domaine X' }, kind: 'wine', color: 'red',
    style: null, grapes: ['syrah'], country: 'France', region: 'Rhone', appellation: 'Cornas',
    needs_review: true, restaurant_count: 2, distributor_count: 1,
    created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z', ...over,
  };
}

const { getAdminBeverages, getAdminBrands, getAdminDistributors } = vi.hoisted(() => ({
  getAdminBeverages: vi.fn(async (_query: unknown) => ({
    data: { rows: [row()], page: 1, per_page: 50, total_count: 1, total_pages: 1 },
  })),
  getAdminBrands: vi.fn(async () => ({ data: [{ id: 'brand-1', name: 'Domaine X', status: 'active', created_at: '' }] })),
  getAdminDistributors: vi.fn(async () => ({ data: [{ id: 'dist-1', name: 'Estate Brands' }] })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminBeverages, getAdminBrands, getAdminDistributors };
});

import { QMAdminBeverages } from './QMAdminBeverages';

afterEach(() => { cleanup(); getAdminBeverages.mockClear(); });

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/qm-admin/beverages/wines']}>
      <Routes>
        <Route path="/qm-admin/beverages/wines" element={<QMAdminBeverages />} />
        <Route path="/qm-admin/beverages/wines/:id" element={<div data-testid="detail-page" />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(getAdminBeverages).toHaveBeenCalled());
  await screen.findByTestId('beverage-row-bev-1');
}

const lastQuery = () => getAdminBeverages.mock.lastCall![0] as Record<string, unknown>;

describe('QMAdminBeverages: filters on the column headers', () => {
  it('puts every filter control in the table header', async () => {
    await renderPage();
    const filterRow = screen.getByTestId('beverages-filter-row');
    expect(filterRow.closest('thead')).not.toBeNull();
    for (const id of ['filter-producer', 'filter-kind', 'filter-color', 'filter-grape', 'filter-country',
      'filter-region', 'filter-distributor', 'filter-min-restaurants', 'filter-max-restaurants', 'filter-needs-review']) {
      expect(within(filterRow).getByTestId(id)).toBeTruthy();
    }
  });

  it('offers the six kinds', async () => {
    await renderPage();
    const options = within(screen.getByTestId('filter-kind')).getAllByRole('option').map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(['', 'wine', 'beer', 'sake', 'spirit', 'cider', 'other']);
  });

  it('sends no filter by default, sorted by name', async () => {
    await renderPage();
    const q = lastQuery();
    expect(q).toMatchObject({ page: 1, sort: 'name', dir: 'asc' });
    for (const key of ['kind', 'color', 'grape', 'country', 'region', 'brand_id', 'brand_q', 'distributor_id', 'min_restaurants', 'max_restaurants', 'needs_review']) {
      expect(q[key]).toBeUndefined();
    }
  });

  it('asks the server for one kind and one colour, from page 1', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('filter-kind'), { target: { value: 'sake' } });
    fireEvent.change(screen.getByTestId('filter-color'), { target: { value: 'white' } });
    await waitFor(() => expect(getAdminBeverages).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'sake', color: 'white', page: 1 })));
  });

  it('sends needs_review as a boolean', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('filter-needs-review'), { target: { value: 'true' } });
    await waitFor(() => expect(getAdminBeverages).toHaveBeenLastCalledWith(expect.objectContaining({ needs_review: true })));
  });

  it('sends the picked distributor id', async () => {
    await renderPage();
    await waitFor(() => expect(within(screen.getByTestId('filter-distributor')).getAllByRole('option')).toHaveLength(2));
    fireEvent.change(screen.getByTestId('filter-distributor'), { target: { value: 'dist-1' } });
    await waitFor(() => expect(getAdminBeverages).toHaveBeenLastCalledWith(expect.objectContaining({ distributor_id: 'dist-1' })));
  });

  it('sends typed grape, country and restaurant bounds after the debounce', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('filter-grape'), { target: { value: 'Syrah' } });
    fireEvent.change(screen.getByTestId('filter-country'), { target: { value: 'France' } });
    fireEvent.change(screen.getByTestId('filter-min-restaurants'), { target: { value: '2' } });
    await waitFor(() => expect(getAdminBeverages).toHaveBeenLastCalledWith(
      expect.objectContaining({ grape: 'Syrah', country: 'France', min_restaurants: 2, page: 1 }),
    ));
  });

  // GET /admin/brands lists companies only (QuoteMe #613), so the producer
  // box is a search the server runs (brand_q), not a lookup in that list.
  it('sends the typed producer text as brand_q, partial, from page 1', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('filter-producer'), { target: { value: 'domaine' } });
    await waitFor(() => expect(getAdminBeverages).toHaveBeenLastCalledWith(expect.objectContaining({ brand_q: 'domaine', page: 1 })));
    expect(lastQuery().brand_id).toBeUndefined();
  });

  it('never loads the brands list', async () => {
    await renderPage();
    expect(getAdminBrands).not.toHaveBeenCalled();
  });

  it('a header click sorts server-side', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('sort-restaurant_count'));
    await waitFor(() => expect(getAdminBeverages).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'restaurant_count', dir: 'asc' })));
    fireEvent.click(screen.getByTestId('sort-restaurant_count'));
    await waitFor(() => expect(getAdminBeverages).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'restaurant_count', dir: 'desc' })));
  });

  it('shows the needs review badge and opens the detail page on a row click', async () => {
    await renderPage();
    expect(within(screen.getByTestId('beverage-row-bev-1')).getByTestId('needs-review-badge')).toBeTruthy();
    fireEvent.click(screen.getByTestId('beverage-row-bev-1'));
    expect(await screen.findByTestId('detail-page')).toBeTruthy();
  });
});
