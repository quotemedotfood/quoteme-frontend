// BEVERAGES SUMMARY STRIP: count tiles at the top of Beverages > Wines,
// read from QuoteMe GET /api/v1/admin/beverages/summary (pinned there by
// spec/requests/api/v1/admin/beverages_summary_spec.rb). A tile with a
// matching Wines filter sets it; Waiting for review opens Review matches.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const SUMMARY = {
  by_kind: { wine: 1200, beer: 3, sake: 7, spirit: 41, cider: 0, other: 0 },
  total: 1251,
  producers: 610,
  distributors_with_catalog: 4,
  restaurants_carrying: 88,
  wines_from_restaurant_lists: 900,
  wines_from_distributor_catalogs: 450,
  estate_distributor_id: null as string | null,
  estate_wines: null as number | null,
  waiting_for_review: 17,
  distributor_restaurant_links: { confirmed: 12, inferred: 30 },
  added_this_week: 55,
  added_since: '2026-10-21T00:00:00Z',
  missing: { grape: 200, tasting_note: 1100, vintage_list_rows: 75 },
};

const { getAdminBeverages, getAdminDistributors, getAdminBeverageSummary } = vi.hoisted(() => ({
  getAdminBeverages: vi.fn(async (_query: unknown) => ({
    data: { rows: [], page: 1, per_page: 50, total_count: 0, total_pages: 1 },
  })),
  getAdminDistributors: vi.fn(async () => ({ data: [] })),
  getAdminBeverageSummary: vi.fn(async (_id?: string) => ({ data: SUMMARY as typeof SUMMARY })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminBeverages, getAdminDistributors, getAdminBeverageSummary };
});

import { QMAdminBeverages } from './QMAdminBeverages';
import { BeveragesSummaryStrip } from './_beveragesSummaryStrip';

afterEach(() => {
  cleanup();
  getAdminBeverages.mockClear();
  getAdminBeverageSummary.mockClear();
});

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/qm-admin/beverages/wines']}>
      <Routes>
        <Route path="/qm-admin/beverages/wines" element={<QMAdminBeverages />} />
        <Route path="/qm-admin/beverages/review-matches" element={<div data-testid="review-matches-page" />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByTestId('beverages-summary');
}

const lastQuery = () => getAdminBeverages.mock.lastCall![0] as Record<string, unknown>;

describe('Beverages summary strip', () => {
  it('shows the counts at the top of the Wines list', async () => {
    await renderPage();
    const tile = (id: string) => screen.getByTestId(`summary-tile-${id}`).textContent;
    expect(tile('wine')).toContain('1,200');
    expect(tile('wine')).toContain('Wines');
    expect(tile('sake')).toContain('7');
    expect(tile('spirit')).toContain('41');
    expect(tile('producers')).toContain('610');
    expect(tile('distributors')).toContain('4');
    expect(tile('restaurants')).toContain('88');
    expect(tile('from-lists')).toContain('900');
    expect(tile('from-catalogs')).toContain('450');
    expect(tile('review')).toContain('17');
    expect(tile('confirmed')).toContain('12');
    expect(tile('inferred')).toContain('30');
    expect(tile('added')).toContain('55');
    expect(tile('missing-grape')).toContain('200');
    expect(tile('missing-vintage')).toContain('75');
    expect(tile('missing-note')).toContain('1,100');
  });

  it('with no Estate id configured, sends none and hides the Estate tile', async () => {
    await renderPage();
    expect(getAdminBeverageSummary).toHaveBeenCalledWith(undefined);
    expect(screen.queryByTestId('summary-tile-estate')).toBeNull();
  });

  it('a kind tile filters the Wines list by that kind, clearing other filters', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('filter-color'), { target: { value: 'red' } });
    await waitFor(() => expect(lastQuery()).toMatchObject({ color: 'red' }));

    fireEvent.click(screen.getByTestId('summary-tile-sake'));

    await waitFor(() => expect(lastQuery()).toMatchObject({ kind: 'sake', page: 1 }));
    expect(lastQuery().color).toBeUndefined();
    expect((screen.getByTestId('filter-kind') as HTMLSelectElement).value).toBe('sake');
  });

  it('Wines from restaurant lists filters to wines on at least one restaurant', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('summary-tile-from-lists'));
    await waitFor(() => expect(lastQuery()).toMatchObject({ kind: 'wine', min_restaurants: 1 }));
  });

  it('Waiting for review opens Review matches', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('summary-tile-review'));
    expect(await screen.findByTestId('review-matches-page')).toBeTruthy();
  });

  it('tiles with no matching filter are not buttons', async () => {
    await renderPage();
    for (const id of ['producers', 'distributors', 'restaurants', 'from-catalogs', 'confirmed', 'inferred', 'added',
      'missing-grape', 'missing-vintage', 'missing-note']) {
      expect(screen.getByTestId(`summary-tile-${id}`).tagName).toBe('DIV');
    }
    for (const id of ['wine', 'beer', 'sake', 'spirit', 'from-lists', 'review']) {
      expect(screen.getByTestId(`summary-tile-${id}`).tagName).toBe('BUTTON');
    }
  });

  it('with an Estate id, sends it and the Estate tile filters to its wines', async () => {
    getAdminBeverageSummary.mockResolvedValueOnce({ data: { ...SUMMARY, estate_distributor_id: 'estate-1', estate_wines: 320 } });
    const onFilter = vi.fn();
    render(
      <MemoryRouter>
        <BeveragesSummaryStrip onFilter={onFilter} estateDistributorId="estate-1" />
      </MemoryRouter>,
    );
    const estate = await screen.findByTestId('summary-tile-estate');
    expect(getAdminBeverageSummary).toHaveBeenCalledWith('estate-1');
    expect(estate.textContent).toContain('320');
    expect(estate.textContent).toContain('Estate wines');

    fireEvent.click(estate);

    expect(onFilter).toHaveBeenCalledWith({ kind: 'wine', distributor_id: 'estate-1' });
  });

  it('shows the error and no tiles when the summary fails', async () => {
    getAdminBeverageSummary.mockResolvedValueOnce({ error: 'Forbidden' } as never);
    render(
      <MemoryRouter>
        <BeveragesSummaryStrip onFilter={vi.fn()} />
      </MemoryRouter>,
    );
    expect((await screen.findByTestId('beverages-summary-error')).textContent).toContain('Forbidden');
    expect(screen.queryByTestId('beverages-summary')).toBeNull();
  });
});
