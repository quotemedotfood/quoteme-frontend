// @vitest-environment jsdom
//
// QMAdminRestaurants.a11y.test.tsx
//
// Two defects on the QM-admin restaurants list, both invisible to a build and
// to a typecheck:
//
//   1. Menu coverage. Each row carries six indicators (Dinner, Lunch, Brunch,
//      Dessert, Drinks, Wine). Presence was carried by opacity and colour
//      alone, so the text a screen reader reached was the bare word "Dinner"
//      whether we held a dinner menu or not. Present and absent were
//      indistinguishable without sight.
//
//   2. Identity column. The table is roughly 1,991px wide at a 639px viewport.
//      Scrolling right to reach Coverage / Data Flags / Actions took the
//      restaurant name offscreen with it, leaving anonymous rows. The Name
//      column is now pinned to the left edge of the scrollport.
//
// The empty-state assertion covers the third change on this page: the filtered
// empty copy no longer claims "No restaurants yet" while a search filter is
// what actually hid them.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { rows, getAdminRestaurants, getAdminDistributors, getAdminUsers } = vi.hoisted(() => {
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
    address_line_1: '1000 Main St',
    address_line_2: null,
    zip: '80202',
    website: null,
    google_place_id: null,
    source_state: null,
    data_flags: null,
  };

  const rows = [
    // Carries dinner + wine only. The other four kinds must read as absent.
    { ...base, id: 'r-1', name: 'Rioja', menu_coverage: ['dinner', 'wine'] },
    // Carries "main", which is the same thing as a dinner menu in the trade,
    // so the Dinner indicator has to light for this row too.
    { ...base, id: 'r-2', name: 'Tavernetta', menu_coverage: ['main'] },
  ];

  return {
    rows,
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

function renderPage() {
  return render(
    <MemoryRouter>
      <QMAdminRestaurants />
    </MemoryRouter>,
  );
}

// This repo runs vitest without `globals`, so @testing-library/react never
// registers its automatic cleanup (no global afterEach for it to hook). Every
// describe below therefore unmounts explicitly, or the second it() in a block
// would find two copies of the table in document.body.
afterEach(() => cleanup());

async function renderLoaded() {
  const view = renderPage();
  await waitFor(() => {
    expect(screen.getByText('Rioja')).toBeInTheDocument();
  });
  return view;
}

describe('QMAdminRestaurants - menu coverage accessible names', () => {
  beforeEach(() => {
    getAdminRestaurants.mockClear();
  });

  it('names a present menu kind as present', async () => {
    await renderLoaded();

    // Both rows report a dinner menu (r-1 via "dinner", r-2 via "main"); only
    // r-1 carries wine.
    expect(screen.getAllByRole('img', { name: 'Dinner menu: present' })).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Wine menu: present' })).toBeInTheDocument();
  });

  it('names an absent menu kind as not present, rather than reusing the bare label', async () => {
    await renderLoaded();

    // Rioja holds dinner + wine, so these four are absent on that row. Both
    // rows are absent for them, hence getAllByRole.
    for (const label of ['Lunch', 'Brunch', 'Dessert', 'Drinks']) {
      const absent = screen.getAllByRole('img', { name: `${label} menu: not present` });
      expect(absent.length).toBeGreaterThan(0);
    }
  });

  it('gives present and absent distinguishable names for the same kind across rows', async () => {
    await renderLoaded();

    // Row 1 has wine, row 2 does not. If state were missing from the name,
    // these two queries would collide on the same "Wine" text.
    expect(screen.getByRole('img', { name: 'Wine menu: present' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Wine menu: not present' })).toBeInTheDocument();
  });

  it('treats a "main" menu as a dinner menu for the Dinner indicator', async () => {
    await renderLoaded();

    // Both rows must report Dinner present: r-1 via "dinner", r-2 via "main".
    expect(screen.getAllByRole('img', { name: 'Dinner menu: present' })).toHaveLength(2);
    expect(screen.queryByRole('img', { name: 'Dinner menu: not present' })).not.toBeInTheDocument();
  });
});

describe('QMAdminRestaurants - sticky identity column', () => {
  beforeEach(() => {
    getAdminRestaurants.mockClear();
  });

  it('pins the Name header cell to the left of the scrollport with a z-index and an opaque background', async () => {
    await renderLoaded();

    const head = screen.getByTestId('restaurants-identity-head');
    expect(head.className).toContain('sticky');
    expect(head.className).toContain('left-0');
    // Opaque background and stacking order are what stop the scrolled-under
    // cells showing through the pinned column.
    expect(head.className).toMatch(/\bbg-gray-50\b/);
    expect(head.className).toMatch(/\bz-20\b/);
  });

  it('pins every body identity cell with the same offset as the header', async () => {
    await renderLoaded();

    const head = screen.getByTestId('restaurants-identity-head');

    for (const row of rows) {
      const cell = screen.getByTestId(`restaurants-identity-cell-${row.id}`);
      expect(cell.className).toContain('sticky');
      // Same left offset as the header, or the column drifts out of alignment
      // the moment the table is scrolled.
      expect(cell.className).toContain('left-0');
      expect(head.className).toContain('left-0');
      expect(cell.className).toMatch(/\bbg-white\b/);
      expect(cell.className).toMatch(/\bz-10\b/);
    }
  });

  it('keeps the restaurant name inside the pinned cell, so identity survives scrolling right', async () => {
    await renderLoaded();

    const cell = screen.getByTestId('restaurants-identity-cell-r-1');
    expect(cell.textContent).toContain('Rioja');
  });

  it('stacks the header above the body cells', async () => {
    await renderLoaded();

    const head = screen.getByTestId('restaurants-identity-head');
    const cell = screen.getByTestId('restaurants-identity-cell-r-1');
    const zOf = (el: Element) => Number((el.className.match(/z-(\d+)/) || [])[1]);
    expect(zOf(head)).toBeGreaterThan(zOf(cell));
  });
});

describe('QMAdminRestaurants - filtered empty state', () => {
  beforeEach(() => {
    getAdminRestaurants.mockClear();
  });

  it('says the search found nothing, not that no restaurants exist yet', async () => {
    await renderLoaded();

    fireEvent.change(screen.getByPlaceholderText('Search restaurants, groups...'), {
      target: { value: 'zzzz-no-such-restaurant' },
    });

    await waitFor(() => {
      expect(screen.getByText('No restaurants found')).toBeInTheDocument();
    });
    // The old copy promised the operator that records would show up later,
    // which is false when the records already exist and a filter hid them.
    expect(screen.queryByText('No restaurants yet')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Restaurants will appear here when reps create them.'),
    ).not.toBeInTheDocument();
  });
});
