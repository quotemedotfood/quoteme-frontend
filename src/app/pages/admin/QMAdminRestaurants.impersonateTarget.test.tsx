// @vitest-environment jsdom
//
// QMAdminRestaurants.impersonateTarget.test.tsx
//
// The Impersonate control on a restaurant row does NOT sign you in as that
// restaurant's admin. restaurants_controller.rb:457 serializes admin_user_id
// as `created_by_user || first rep of the first attached distributor`, so the
// target is whoever happened to create the row. The row also carries a
// separate restaurant_admin_name, which is a different person in the common
// case.
//
// Before this change the button read a bare "Impersonate" and named nobody at
// all, leaving the operator to assume it meant the restaurant's own admin.
// This is the same shape as the Team page control that caught the founder: an
// action whose target is not stated.
//
// These cases pin the honest half only. They deliberately do NOT assert that
// the target is correct, because changing WHO it acts as is a behaviour change
// that belongs to Moose.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach auto cleanup never registers.
// afterEach(cleanup) is declared explicitly: without it renders accumulate and
// a later query can pass against an earlier case's DOM.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { getAdminRestaurants } = vi.hoisted(() => {
  const restaurant = {
    id: 'rest-1',
    name: 'The Gull',
    city: 'Denver',
    state: 'CO',
    status: 'active',
    contact_count: 2,
    restaurant_group: null,
    created_at: '2026-03-01T00:00:00Z',
    // The impersonation target: whoever created the row.
    admin_user_id: 'user-creator',
    admin_user_name: 'Dana Creator',
    // A DIFFERENT person, carried on the same row.
    restaurant_admin_id: 'user-admin',
    restaurant_admin_name: 'Rae Admin',
    address_line_1: null,
    address_line_2: null,
    zip: null,
    website: null,
    google_place_id: null,
    source_state: null,
    data_flags: null,
    menu_coverage: [],
  };
  return {
    getAdminRestaurants: vi.fn(async () => ({ data: [restaurant] })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminRestaurants };
});

import { QMAdminRestaurants } from './QMAdminRestaurants';

async function renderRestaurants() {
  render(
    <MemoryRouter>
      <QMAdminRestaurants />
    </MemoryRouter>,
  );
  await waitFor(() => expect(getAdminRestaurants).toHaveBeenCalled());
  await screen.findByText('The Gull');
}

describe('QMAdminRestaurants -- the impersonate control names who it acts as', () => {
  afterEach(() => {
    cleanup();
    getAdminRestaurants.mockClear();
  });

  it('names the actual target, the user who created the row, in the accessible name', async () => {
    await renderRestaurants();

    expect(screen.getByRole('button', { name: 'Sign in as Dana Creator' })).toBeInTheDocument();
  });

  it('does not name the restaurant admin, who is a different person and not the target', async () => {
    await renderRestaurants();

    expect(screen.queryByRole('button', { name: /Rae Admin/ })).not.toBeInTheDocument();
  });

  it('shows the target name in the row, not only in a tooltip an operator has to hover for', async () => {
    await renderRestaurants();

    expect(screen.getByText('Dana Creator')).toBeInTheDocument();
  });

  it('never leaves the control anonymous when the target has no name on file', async () => {
    getAdminRestaurants.mockImplementationOnce(async () => ({
      data: [{
          id: 'rest-2',
          name: 'No Name Cafe',
          city: null,
          state: null,
          status: 'active',
          contact_count: 0,
          restaurant_group: null,
          created_at: '2026-03-01T00:00:00Z',
          admin_user_id: 'user-x',
          admin_user_name: null,
          restaurant_admin_id: null,
          restaurant_admin_name: null,
          address_line_1: null,
          address_line_2: null,
          zip: null,
          website: null,
          google_place_id: null,
          source_state: null,
          data_flags: null,
          menu_coverage: [],
      }],
    }));

    render(
      <MemoryRouter>
        <QMAdminRestaurants />
      </MemoryRouter>,
    );
    await screen.findByText('No Name Cafe');

    // Falls back to describing the target rather than reading a bare verb.
    expect(
      screen.getByRole('button', { name: 'Sign in as the user who created this restaurant' }),
    ).toBeInTheDocument();
  });
});
