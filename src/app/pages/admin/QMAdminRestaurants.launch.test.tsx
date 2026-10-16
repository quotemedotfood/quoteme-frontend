// QMAdminRestaurants.launch.test.tsx
//
// The launch checklist on the restaurants list (Moose, 2026-10-15: "% of the
// SOP done for each restaurant so we know where they're at. plus a $ symbol
// when they're paying"). Reads onboarding_percent and paying from the list
// payload (QuoteMe Admin::RestaurantsController#serialize_index).
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { getAdminRestaurants } = vi.hoisted(() => {
  const base = {
    city: 'Boston', state: 'MA', status: 'active', contact_count: 0, restaurant_group: null,
    created_at: '2026-09-01T00:00:00Z', admin_user_id: null, admin_user_name: null, restaurant_admin_id: null,
    restaurant_admin_name: null, address_line_1: null, address_line_2: null, zip: null, website: null,
    google_place_id: null, source_state: null, data_flags: null, menu_coverage: [], pairme_review: null,
  };
  const rows = [
    { ...base, id: 'r-paying', name: 'Paying Bistro', onboarding_percent: 62, paying: true },
    { ...base, id: 'r-free', name: 'Free Bistro', onboarding_percent: 100, paying: false },
    { ...base, id: 'r-old', name: 'Old Payload Bistro' },
  ];
  return {
    getAdminRestaurants: vi.fn(async () => ({ data: { restaurants: rows, meta: { page: 1, per_page: 50, total_count: 3, total_pages: 1 } } })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminRestaurants };
});

import { QMAdminRestaurants } from './QMAdminRestaurants';

afterEach(() => { cleanup(); getAdminRestaurants.mockClear(); });

describe('QMAdminRestaurants: launch percent and paying', () => {
  it('shows each restaurant\'s percent, and $ only on the paying one', async () => {
    render(<MemoryRouter><QMAdminRestaurants /></MemoryRouter>);
    await screen.findByText('Paying Bistro');
    expect(screen.getByRole('columnheader', { name: 'Launch' })).toBeInTheDocument();

    expect(screen.getByTestId('restaurants-launch-r-paying')).toHaveTextContent('62%');
    expect(within(screen.getByTestId('restaurants-launch-r-paying')).getByLabelText('Paying')).toHaveTextContent('$');

    expect(screen.getByTestId('restaurants-launch-r-free')).toHaveTextContent('100%');
    expect(screen.queryByTestId('restaurants-paying-r-free')).toBeNull();

    // No key (the backend withholds it from anyone but a QM admin): a dash, never a made-up 0%.
    expect(screen.getByTestId('restaurants-launch-r-old')).toHaveTextContent('-');
    expect(screen.getByTestId('restaurants-launch-r-old')).not.toHaveTextContent('%');
    expect(screen.queryByTestId('restaurants-paying-r-old')).toBeNull();
  });
});
