// The restaurants toolbar on a phone: the search box takes its own full-width
// line and the filters wrap under it; from sm up it is one row (Moose's walk,
// 2026-10-11, "Let's have the search bar on its own line then the filters
// under it"). jsdom has no layout, so this checks the classes that do it.
//
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../services/adminApi', async (orig) => ({
  ...(await orig<any>()),
  getAdminRestaurants: vi.fn(async () => ({ data: { restaurants: [], meta: { page: 1, per_page: 50, total_count: 0, total_pages: 1 } } })),
}));

import { QMAdminRestaurants as QMAdminRestaurantsPage } from './QMAdminRestaurants';

describe('restaurants toolbar on a phone', () => {
  it('puts search on its own line and lets the filters wrap under it', async () => {
    render(<MemoryRouter><QMAdminRestaurantsPage /></MemoryRouter>);
    const search = await screen.findByTestId('restaurants-search');
    expect(search.className).toContain('basis-full');
    expect(search.className).toContain('sm:basis-auto');
    expect(search.parentElement!.className).toContain('flex-wrap');
  });
});
