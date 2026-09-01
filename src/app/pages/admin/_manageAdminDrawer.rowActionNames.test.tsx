// @vitest-environment jsdom
//
// _manageAdminDrawer.rowActionNames.test.tsx — batch 2 of the naming remainder
// of item 8.
//
// Both controls here were invisible to the scan that produced batches 1 and 2,
// and for the reason batch 1 wrote down as a known blind spot: the entity is
// CLOSED OVER rather than passed to the handler. "Replace admin" calls
// setReplacing(true) and "Assign" calls handleAssignSubmit() — neither mentions
// a user or a restaurant, so no amount of reading the onClick finds them. They
// were found by reading the surface instead.
//
// What each announced before:
//   "Replace admin" — on a drawer that can be opened for any restaurant, about
//                     whichever admin that restaurant currently has.
//   "Assign"        — after picking one user out of a filtered list of every
//                     restaurant_admin in the system.
//
// This is a render assertion rather than the source-level check batch 1 used,
// because the drawer is a component with four props and one API call: cheap to
// mount, and the accessible name is the actual thing under test. Batch 1's own
// note says the render is the better tool wherever it is affordable.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const { getAdminUsers } = vi.hoisted(() => ({
  getAdminUsers: vi.fn(async () => ({
    data: [
      {
        id: 'u-1',
        email: 'rosa@lolas.com',
        first_name: 'Rosa',
        last_name: 'Delgado',
        role: 'restaurant_admin',
        status: 'active',
      },
      // An invited-but-never-completed account: no first or last name. userLabel
      // falls back to the email, which is the case it exists for.
      {
        id: 'u-2',
        email: 'pending@lolas.com',
        first_name: '',
        last_name: '',
        role: 'restaurant_admin',
        status: 'invited',
      },
    ],
  })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminUsers };
});

import { ManageAdminDrawer } from './_manageAdminDrawer';

const RESTAURANT_WITH_ADMIN = {
  id: 'r-1',
  name: "Lola's Cantina",
  restaurant_admin_id: 'u-9',
  restaurant_admin_name: 'Marco Ruiz',
};

const RESTAURANT_WITHOUT_ADMIN = {
  id: 'r-2',
  name: 'Blue Door',
  restaurant_admin_id: null,
  restaurant_admin_name: null,
};

function renderDrawer(restaurant: any) {
  return render(
    <ManageAdminDrawer
      open
      restaurant={restaurant}
      onClose={() => {}}
      onAssigned={() => {}}
    />,
  );
}

// This repo runs vitest without `globals`, so @testing-library/react's automatic
// afterEach cleanup never registers. Every case here mounts a drawer, so without
// this each subsequent query would run across every drawer mounted so far.
describe('ManageAdminDrawer row actions name what they act on (batch 2)', () => {
  beforeEach(() => {
    getAdminUsers.mockClear();
  });
  afterEach(() => {
    cleanup();
  });

  it('Replace admin names the admin being replaced and the restaurant', () => {
    renderDrawer(RESTAURANT_WITH_ADMIN);

    expect(
      screen.getByRole('button', { name: "Replace Marco Ruiz as admin for Lola's Cantina" }),
    ).toBeTruthy();

    // The visible caption stays "Replace admin" — this batch adds the target to
    // the accessible name and changes no visible copy.
    expect(screen.getByRole('button', { name: /^Replace Marco Ruiz/ }).textContent).toBe(
      'Replace admin',
    );
  });

  it('Replace admin still names the restaurant when the current admin has no name on record', () => {
    renderDrawer({ ...RESTAURANT_WITH_ADMIN, restaurant_admin_name: null });

    expect(
      screen.getByRole('button', { name: "Replace the current admin as admin for Lola's Cantina" }),
    ).toBeTruthy();
  });

  it('Assign names the selected user once one is picked', async () => {
    renderDrawer(RESTAURANT_WITHOUT_ADMIN);

    fireEvent.click(screen.getByRole('button', { name: 'Assign existing user' }));
    await screen.findByText('Rosa Delgado');

    // Before a selection the control is disabled, and names the restaurant only.
    const before = screen.getByRole('button', { name: 'Assign an admin for Blue Door' });
    expect((before as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByText('Rosa Delgado'));

    expect(
      screen.getByRole('button', { name: 'Assign Rosa Delgado as admin for Blue Door' }),
    ).toBeTruthy();
    // The bare verb is gone, which is the defect this batch closes.
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
  });

  it('Assign falls back to the email when the selected account has no name yet', async () => {
    renderDrawer(RESTAURANT_WITHOUT_ADMIN);

    fireEvent.click(screen.getByRole('button', { name: 'Assign existing user' }));
    await screen.findByText('pending@lolas.com');

    fireEvent.click(screen.getByText('pending@lolas.com'));

    expect(
      screen.getByRole('button', { name: 'Assign pending@lolas.com as admin for Blue Door' }),
    ).toBeTruthy();
  });
});
