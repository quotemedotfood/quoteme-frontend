// The state and crawled filters on the restaurants list, so an operator can
// see a finished crawler load (for example every crawled CO row). Both go to
// the server as query params and reset to page 1. The backend half is pinned
// by QuoteMe's restaurants_index_state_crawled_filter_spec.rb.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { getAdminRestaurants } = vi.hoisted(() => ({
  getAdminRestaurants: vi.fn(async (_query: unknown) => ({
    data: { restaurants: [], meta: { page: 1, per_page: 50, total_count: 0, total_pages: 1 } },
  })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminRestaurants };
});

import { QMAdminRestaurants } from './QMAdminRestaurants';

afterEach(() => { cleanup(); getAdminRestaurants.mockClear(); });

async function renderPage() {
  render(<MemoryRouter><QMAdminRestaurants /></MemoryRouter>);
  await waitFor(() => expect(getAdminRestaurants).toHaveBeenCalled());
}

describe('QMAdminRestaurants: state and crawled filters', () => {
  it('sends neither filter by default', async () => {
    await renderPage();
    const query = getAdminRestaurants.mock.lastCall![0] as Record<string, unknown>;
    expect(query.state).toBeUndefined();
    expect(query.crawled).toBeUndefined();
  });

  it('asks the server for one state, from page 1', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('state-filter'), { target: { value: 'CO' } });
    await waitFor(() => expect(getAdminRestaurants).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'CO', page: 1 })));
  });

  it('asks the server for crawled rows only, from page 1', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('crawled-filter'));
    await waitFor(() => expect(getAdminRestaurants).toHaveBeenLastCalledWith(expect.objectContaining({ crawled: true, page: 1 })));
  });
});
