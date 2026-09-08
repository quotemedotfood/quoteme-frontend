// @vitest-environment jsdom
//
// QMAdminRestaurants.iconOnly.test.tsx
//
// Moose's walk of the production Restaurants admin asked for two reductions on
// this list:
//
//   1. Menu coverage renders icon-only, with the menu type on hover. The words
//      Dinner / Lunch / Brunch / Dessert / Drinks / Wine come off the row.
//
//   2. The Address column comes off the table entirely.
//
// (1) is the one with a trap in it. dc0c36b fixed a defect Justin filed: the
// coverage indicators exposed no present/absent state, so a screen reader read
// the bare word "Dinner" whether we held a dinner menu or not. The visible word
// is being deleted here; the accessible name that carries the state must not go
// with it. A title attribute is a hover affordance, not an accessible name, so
// these tests assert the aria-label separately from the tooltip and refuse to
// let either stand in for the other.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { getAdminRestaurants, getAdminDistributors, getAdminUsers } = vi.hoisted(() => {
  const base = {
    city: 'Denver',
    state: 'CO',
    status: 'active',
    contact_count: 2,
    restaurant_group: null,
    created_at: '2026-07-01T00:00:00Z',
    admin_user_id: null,
    admin_user_name: null,
    restaurant_admin_id: null,
    restaurant_admin_name: null,
    address_line_1: '4586 Tennyson Street',
    address_line_2: null,
    zip: '80212',
    website: null,
    google_place_id: null,
    source_state: null,
    data_flags: null,
  };

  const rows = [
    // Dinner and wine present; the other four kinds must still be reachable
    // by name, and must still say they are absent.
    { ...base, id: 'r-1', name: 'Rioja', menu_coverage: ['dinner', 'wine'] },
  ];

  return {
    getAdminRestaurants: vi.fn(async () => ({ data: rows })),
    getAdminDistributors: vi.fn(async () => ({ data: [] })),
    getAdminUsers: vi.fn(async () => ({ data: [] })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminRestaurants, getAdminDistributors, getAdminUsers };
});

import { QMAdminRestaurants } from './QMAdminRestaurants';

// No global cleanup in this harness (vitest runs without `globals`, so
// @testing-library/react never registers its automatic afterEach). Without
// this, the second it() in a describe would query a DOM still holding the
// first one's table.
afterEach(() => cleanup());

async function renderLoaded() {
  const view = render(
    <MemoryRouter>
      <QMAdminRestaurants />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(screen.getByText('Rioja')).toBeInTheDocument();
  });
  return view;
}

const MENU_LABELS = ['Dinner', 'Lunch', 'Brunch', 'Dessert', 'Drinks', 'Wine'];

describe('QMAdminRestaurants - menu coverage is icon-only', () => {
  beforeEach(() => {
    getAdminRestaurants.mockClear();
  });

  it('renders no visible menu-type word in the coverage cell', async () => {
    await renderLoaded();
    for (const label of MENU_LABELS) {
      const indicator = screen.getByRole('img', { name: new RegExp(`^${label} menu:`) });
      expect(indicator).toHaveTextContent('');
    }
  });

  it('does not leave the menu-type words anywhere in the visible table text', async () => {
    await renderLoaded();
    for (const label of MENU_LABELS) {
      // Exact-text match: "Menu Coverage" in the header must not count, and an
      // aria-label is not text content, so this only trips on a rendered word.
      expect(screen.queryByText(label, { exact: true })).toBeNull();
    }
  });

  it('keeps present/absent in the accessible name once the word is gone', async () => {
    await renderLoaded();
    expect(screen.getByRole('img', { name: 'Dinner menu: present' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Wine menu: present' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Lunch menu: not present' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Brunch menu: not present' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dessert menu: not present' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Drinks menu: not present' })).toBeInTheDocument();
  });

  it('exposes the menu type on hover, and the tooltip agrees with the accessible name', async () => {
    await renderLoaded();
    for (const label of MENU_LABELS) {
      const indicator = screen.getByRole('img', { name: new RegExp(`^${label} menu:`) });
      const tooltip = indicator.getAttribute('title');
      expect(tooltip).toBeTruthy();
      // Hover text and accessible name must not drift apart; a sighted operator
      // and a screen-reader operator have to be reading the same fact.
      expect(tooltip).toBe(indicator.getAttribute('aria-label'));
    }
  });

  it('keeps the icon itself out of the accessibility tree, so the name is announced once', async () => {
    await renderLoaded();
    const indicator = screen.getByRole('img', { name: 'Dinner menu: present' });
    const svg = indicator.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('QMAdminRestaurants - address column removed', () => {
  beforeEach(() => {
    getAdminRestaurants.mockClear();
  });

  it('renders no Address column header', async () => {
    await renderLoaded();
    expect(screen.queryByRole('columnheader', { name: 'Address' })).toBeNull();
  });

  it('renders no street address in the body', async () => {
    await renderLoaded();
    expect(screen.queryByText(/4586 Tennyson Street/)).toBeNull();
    expect(screen.queryByText(/80212/)).toBeNull();
  });

  it('keeps City and State, which are separate columns and were not dropped', async () => {
    await renderLoaded();
    expect(screen.getByRole('columnheader', { name: 'State' })).toBeInTheDocument();
    expect(screen.getByText('Denver')).toBeInTheDocument();
  });

  it('leaves the header and body cell counts in step', async () => {
    await renderLoaded();
    const headers = screen.getAllByRole('columnheader');
    const bodyRow = screen.getByText('Rioja').closest('tr');
    expect(bodyRow).not.toBeNull();
    const cells = within(bodyRow as HTMLElement).getAllByRole('cell');
    expect(cells).toHaveLength(headers.length);
  });
});
