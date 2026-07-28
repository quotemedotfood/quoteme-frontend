// QMAdminUnassociatedReps.assignGate.test.tsx
//
// item 1c FE (extends the FE half of the dual-role prevention gate,
// PR #306 RoleConflictGuard on the BE): the "Assign" drawer on the
// Unassociated Reps page calls assignDistributor, one of the three FE
// call-sites that hit the BE's role-conflict gate. The BE now 409s with
// { error_code: "role_conflict_requires_confirm", error: <generic message> }
// unless the request sends confirm:true. This holds the submit behind a
// confirm dialog (reusing the shadcn AlertDialog pattern) instead of
// surfacing the 409 as a dead-end error.
//
// Coverage:
//   1. a 409 role_conflict_requires_confirm holds the submit and shows the
//      confirm dialog, without completing
//   2. confirming re-calls assignDistributor with confirm:true
//   3. cancelling aborts -- no retry
//   4. a success (2xx) path is unchanged
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

const { unassociatedUser, distributorMatch, getAdminUsers, searchDistributors, assignDistributor } = vi.hoisted(() => {
  const unassociatedUser = {
    id: 'u-1',
    email: 'floating@nowhere.com',
    first_name: 'Floating',
    last_name: 'Rep',
    phone: null,
    role: 'rep',
    status: 'active',
    distributor_name: null,
    claimed_distributor_id: null,
    flagged_for_review: false,
    flag_reason: null,
    last_login_at: null,
    created_at: '2026-01-01T00:00:00Z',
    rep_profile: { id: 'rp-1', distributor_id: null, phone: null, territory: null, is_active: true },
  };
  const distributorMatch = { id: 'd-1', name: 'Acme Foods' };

  // Widened return type so mockImplementationOnce can return either the
  // success shape or the BE 409 role-conflict-gate shape (item 1c) without
  // TS narrowing the mock to only the first literal it saw.
  type AssignDistributorResult = {
    data?: typeof unassociatedUser & { distributor_name: string | null };
    error?: string;
    error_code?: string;
    status?: number;
  };

  return {
    unassociatedUser,
    distributorMatch,
    getAdminUsers: vi.fn(async () => ({ data: [unassociatedUser] })),
    searchDistributors: vi.fn(async () => ({ data: [distributorMatch] })),
    assignDistributor: vi.fn(async (): Promise<AssignDistributorResult> => ({ data: { ...unassociatedUser, distributor_name: 'Acme Foods' } })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return {
    ...actual,
    getAdminUsers,
    searchDistributors,
    assignDistributor,
  };
});

import { QMAdminUnassociatedReps } from './QMAdminUnassociatedReps';

async function openAssignDrawerWithDistributorSelected() {
  render(<QMAdminUnassociatedReps />);
  await screen.findByText('Floating Rep');

  fireEvent.click(screen.getByRole('button', { name: /assign/i }));
  await screen.findByText('Assign to Distributor');

  fireEvent.change(screen.getByPlaceholderText('Search distributors...'), { target: { value: 'Acme' } });
  await waitFor(() => expect(searchDistributors).toHaveBeenCalledWith('Acme'));
  fireEvent.click(await screen.findByText('Acme Foods'));
}

describe('QMAdminUnassociatedReps -- assign_distributor role-conflict gate (item 1c)', () => {
  beforeEach(() => {
    getAdminUsers.mockClear();
    searchDistributors.mockClear();
    assignDistributor.mockClear();
    getAdminUsers.mockImplementation(async () => ({ data: [unassociatedUser] }));
    searchDistributors.mockImplementation(async () => ({ data: [distributorMatch] }));
  });

  afterEach(() => {
    cleanup();
  });

  it('holds the submit and shows a confirm dialog on a 409 role_conflict_requires_confirm, without completing', async () => {
    assignDistributor.mockImplementationOnce(async () => ({
      error: 'This user already has a role at another distributor.',
      error_code: 'role_conflict_requires_confirm',
      status: 409,
    }));

    await openAssignDrawerWithDistributorSelected();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(assignDistributor).toHaveBeenCalledTimes(1));
    expect(assignDistributor).toHaveBeenCalledWith('u-1', 'd-1', false);

    await screen.findByText('Assign distributor anyway?');
    expect(screen.getByText('This user already has a role at another distributor.')).toBeInTheDocument();
    expect(assignDistributor).toHaveBeenCalledTimes(1);
  });

  it('re-calls assignDistributor with confirm:true when the dialog is confirmed', async () => {
    assignDistributor.mockImplementationOnce(async () => ({
      error: 'This user already has a role at another distributor.',
      error_code: 'role_conflict_requires_confirm',
      status: 409,
    }));

    await openAssignDrawerWithDistributorSelected();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await screen.findByText('Assign distributor anyway?');

    fireEvent.click(screen.getByRole('button', { name: 'Assign anyway' }));

    await waitFor(() => expect(assignDistributor).toHaveBeenCalledTimes(2));
    expect(assignDistributor).toHaveBeenNthCalledWith(2, 'u-1', 'd-1', true);
    await waitFor(() => expect(screen.queryByText('Assign distributor anyway?')).not.toBeInTheDocument());
  });

  it('aborts and never retries when the dialog is cancelled', async () => {
    assignDistributor.mockImplementationOnce(async () => ({
      error: 'This user already has a role at another distributor.',
      error_code: 'role_conflict_requires_confirm',
      status: 409,
    }));

    await openAssignDrawerWithDistributorSelected();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await screen.findByText('Assign distributor anyway?');

    // Scoped to the alert dialog -- the "Assign to Distributor" drawer
    // behind it has its own (unrelated) "Cancel" button.
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Assign distributor anyway?')).not.toBeInTheDocument());
    expect(assignDistributor).toHaveBeenCalledTimes(1);
  });

  it('assigns directly on a 2xx, with no dialog shown (unchanged success path)', async () => {
    assignDistributor.mockImplementationOnce(async () => ({ data: { ...unassociatedUser, distributor_name: 'Acme Foods' } }));

    await openAssignDrawerWithDistributorSelected();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(assignDistributor).toHaveBeenCalledTimes(1));
    expect(assignDistributor).toHaveBeenCalledWith('u-1', 'd-1', false);
    expect(screen.queryByText('Assign distributor anyway?')).not.toBeInTheDocument();
  });
});
