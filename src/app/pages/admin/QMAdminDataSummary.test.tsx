// DATA SUMMARY page (Moose, 2026-10-30): reader of QuoteMe
// GET /api/v1/admin/data_summary (pinned there by
// spec/requests/api/v1/admin/data_summary_spec.rb). Guards: market filter by
// state then city, wines linked by beverage id (never by name), no price
// amounts, no "best" wording, an empty market says so (never blank).
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import type { AdminDataSummary } from '../../services/adminApi';

const DEN = { restaurants: 40, list_rows: 900 };

function list<T>(items: T[], denominator = DEN, basis = 'restaurants with a wine row linked to the corpus') {
  return { items, distinct_total: items.length, denominator, basis };
}

function payload(overrides: Partial<AdminDataSummary> = {}): AdminDataSummary {
  return {
    market: { state: null, city: null, limit: 25 },
    markets: {
      states: [{ state: 'CO', restaurants: 120 }, { state: 'MA', restaurants: 30 }],
      cities: [],
    },
    coverage: {
      restaurants: 150, with_food_menu: 110, with_wine_list: 60, with_linked_wine_rows: 40,
      list_rows: 1200, linked_rows: 900, unlinked_rows: 300, linked_share: 0.75,
    },
    wines: {
      // Two corpus wines with the same printed name: two ids, two links.
      carried: list([
        { beverage_id: 'bev-1', name: 'Chablis', color: 'white', producer_id: 'br-1', producer: 'Domaine A',
          restaurants: 12, list_rows: 14, share_of_restaurants: 0.3 },
        { beverage_id: 'bev-2', name: 'Chablis', color: 'white', producer_id: 'br-2', producer: 'Domaine B',
          restaurants: 5, list_rows: 5, share_of_restaurants: 0.125 },
      ]),
      grapes: list([{ grape: 'pinot noir', restaurants: 20, list_rows: 80, share_of_restaurants: 0.5 }]),
      colors: list([{ color: 'red', restaurants: 55, list_rows: 600, share_of_restaurants: 0.917 }],
        { restaurants: 60, list_rows: 1200 }, 'restaurants with a wine list'),
      countries: list([{ country: 'France', restaurants: 30, list_rows: 300, share_of_restaurants: 0.75 }]),
      regions: list([]),
      producers: list([{ producer_id: 'br-1', producer: 'Domaine A', restaurants: 12, list_rows: 14, share_of_restaurants: 0.3 }]),
      glass_bottle: {
        glass_only: 100, bottle_only: 700, both: 300, neither: 100,
        restaurants_by_the_glass: 50, restaurants_by_the_bottle: 58,
        glass_share: 0.333, bottle_share: 0.833,
        denominator: { restaurants: 60, list_rows: 1200 }, basis: 'rows on restaurant wine lists',
      },
    },
    generated_at: '2026-10-30T12:00:00Z',
    ...overrides,
  };
}

const { getAdminDataSummary } = vi.hoisted(() => ({
  getAdminDataSummary: vi.fn(async (_p: { state?: string; city?: string; limit?: number }) =>
    ({ data: undefined as AdminDataSummary | undefined, error: undefined as string | undefined })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminDataSummary };
});

import { QMAdminDataSummary } from './QMAdminDataSummary';

afterEach(() => {
  cleanup();
  getAdminDataSummary.mockReset();
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/qm-admin/data-summary']}>
      <Routes>
        <Route path="/qm-admin/data-summary" element={<QMAdminDataSummary />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QMAdminDataSummary', () => {
  it('says what it is loading instead of rendering blank', async () => {
    getAdminDataSummary.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('ds-loading').textContent).toMatch(/Counting restaurants .* for all markets/);
  });

  it('filters the market by state, then by city', async () => {
    getAdminDataSummary.mockImplementation(async (p) => ({
      data: payload({
        market: { state: p.state ?? null, city: p.city ?? null, limit: 25 },
        markets: {
          states: [{ state: 'CO', restaurants: 120 }, { state: 'MA', restaurants: 30 }],
          cities: p.state === 'CO' ? [{ city: 'Denver', restaurants: 80 }, { city: 'Boulder', restaurants: 20 }] : [],
        },
      }),
      error: undefined,
    }));
    renderPage();
    await screen.findByTestId('ds-coverage');
    expect((screen.getByTestId('ds-city') as HTMLSelectElement).disabled).toBe(true);

    fireEvent.change(screen.getByTestId('ds-state'), { target: { value: 'CO' } });
    await waitFor(() => expect(getAdminDataSummary).toHaveBeenLastCalledWith({ state: 'CO', city: undefined, limit: 25 }));
    await screen.findByRole('option', { name: 'Denver (80)' });

    fireEvent.change(screen.getByTestId('ds-city'), { target: { value: 'Denver' } });
    await waitFor(() => expect(getAdminDataSummary).toHaveBeenLastCalledWith({ state: 'CO', city: 'Denver', limit: 25 }));

    // Back to all states clears the city.
    fireEvent.change(screen.getByTestId('ds-state'), { target: { value: '' } });
    await waitFor(() => expect(getAdminDataSummary).toHaveBeenLastCalledWith({ state: undefined, city: undefined, limit: 25 }));
  });

  it('shows the coverage strip first and each list with its denominator', async () => {
    getAdminDataSummary.mockResolvedValue({ data: payload(), error: undefined });
    renderPage();
    const strip = await screen.findByTestId('ds-coverage');
    expect(strip.textContent).toContain('150');
    expect(screen.getByTestId('ds-tile-linked-rows').textContent).toContain('75% of rows');
    expect(screen.getByTestId('ds-carried-basis').textContent)
      .toBe('Counted against 40 restaurants (restaurants with a wine row linked to the corpus) and 900 list rows.');
    expect(screen.getByTestId('ds-carried').textContent).toContain('Carried by 12 of 40 restaurants (30%)');
    // A list with nothing in it says so.
    expect(screen.getByTestId('ds-regions-empty').textContent).toMatch(/No region/);
  });

  it('links each wine by its beverage id, so two wines with one name stay apart', async () => {
    getAdminDataSummary.mockResolvedValue({ data: payload(), error: undefined });
    renderPage();
    await screen.findByTestId('ds-carried');
    const links = screen.getAllByRole('link', { name: 'Chablis' }).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/qm-admin/beverages/wines/bev-1', '/qm-admin/beverages/wines/bev-2']);
  });

  it('never shows a price amount, only counts of printed prices', async () => {
    // Even if a stray amount reached the payload, the page has no place for it.
    const data = payload();
    (data.wines.carried.items[0] as Record<string, unknown>).glass_cents = 1650;
    (data.wines.carried.items[0] as Record<string, unknown>).price = 72.5;
    getAdminDataSummary.mockResolvedValue({ data, error: undefined });
    renderPage();
    await screen.findByTestId('ds-glass-bottle');
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/\$\s?\d/);
    expect(text).not.toContain('1650');
    expect(text).not.toContain('16.50');
    expect(text).not.toContain('72.5');
    expect(screen.getByTestId('ds-tile-glass-only').textContent).toContain('100');
  });

  it('never ranks with words like best or top-rated', async () => {
    getAdminDataSummary.mockResolvedValue({ data: payload(), error: undefined });
    renderPage();
    await screen.findByTestId('ds-carried');
    expect(document.body.textContent || '').not.toMatch(/\bbest\b|top[- ]rated|recommend/i);
  });

  it('says an empty market is empty, not a blank page', async () => {
    getAdminDataSummary.mockImplementation(async (p) => ({
      data: payload({
        market: { state: p.state ?? null, city: p.city ?? null, limit: 25 },
        coverage: {
          restaurants: 0, with_food_menu: 0, with_wine_list: 0, with_linked_wine_rows: 0,
          list_rows: 0, linked_rows: 0, unlinked_rows: 0, linked_share: null,
        },
        markets: {
          states: [{ state: 'CO', restaurants: 120 }],
          cities: p.state ? [{ city: 'Nowhere', restaurants: 0 }] : [],
        },
      }),
      error: undefined,
    }));
    renderPage();
    await screen.findByTestId('ds-coverage');
    fireEvent.change(screen.getByTestId('ds-state'), { target: { value: 'CO' } });
    await screen.findByRole('option', { name: 'Nowhere (0)' });
    fireEvent.change(screen.getByTestId('ds-city'), { target: { value: 'Nowhere' } });
    const msg = await screen.findByTestId('ds-empty-market');
    await waitFor(() => expect(msg.textContent).toContain('No restaurants on file for Nowhere, CO'));
    expect(screen.queryByTestId('ds-carried')).toBeNull();
  });

  it('shows the error with a way to try again', async () => {
    getAdminDataSummary.mockResolvedValueOnce({ data: undefined, error: 'Server error' });
    getAdminDataSummary.mockResolvedValueOnce({ data: payload(), error: undefined });
    renderPage();
    const err = await screen.findByTestId('ds-error');
    expect(err.textContent).toContain('Server error');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByTestId('ds-coverage');
  });
});
