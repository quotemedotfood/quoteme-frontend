// QMAdminDistributorDetail.assignAdminGate.test.tsx
//
// item 1c FE (extends the FE half of the dual-role prevention gate,
// PR #306 RoleConflictGuard on the BE): the "Assign existing" tab of the
// Add Admin modal calls assignDistributorAdmin, one of the three FE
// call-sites that hit the BE's role-conflict gate. The BE now 409s with
// { error_code: "role_conflict_requires_confirm", error: <generic message> }
// unless the request sends confirm:true. This holds the submit behind a
// confirm dialog (reusing the shadcn AlertDialog pattern) instead of
// surfacing the 409 as a dead-end error.
//
// Coverage:
//   1. a 409 role_conflict_requires_confirm holds the submit and shows the
//      confirm dialog, without completing
//   2. confirming re-calls assignDistributorAdmin with confirm:true
//   3. cancelling aborts -- no retry
//   4. a success (2xx) path is unchanged
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const { baseDist, existingUser, getAdminDistributor, getAdminUsers, assignDistributorAdmin } = vi.hoisted(() => {
  const baseDist = {
    id: 'd1',
    name: 'Test Distributor',
    status: 'active',
    unclaimed: false,
    email_domain: 'test.com',
    branding_slug: null,
    region: 'West',
    primary_state: 'CA',
    service_states: [],
    catalog: null,
    admins: [],
    reps: [],
    restaurants: [],
    catalogs: [],
    logo_url: null,
    bonus_free_quotes: 0,
    effective_quota: 5,
  };
  const existingUser = {
    id: 'u-existing',
    email: 'existing@elsewhere.com',
    first_name: 'Existing',
    last_name: 'User',
    phone: null,
    role: 'distributor_admin',
    status: 'active',
    distributor_name: 'Another Distributor',
    claimed_distributor_id: null,
    flagged_for_review: false,
    flag_reason: null,
    last_login_at: null,
    created_at: '2026-01-01T00:00:00Z',
    rep_profile: null,
  };

  // Widened return type so mockImplementationOnce can return either the
  // success shape or the BE 409 role-conflict-gate shape (item 1c) without
  // TS narrowing the mock to only the first literal it saw.
  type AssignAdminResult = {
    data?: { ok: boolean };
    error?: string;
    error_code?: string;
    status?: number;
  };
  return {
    baseDist,
    existingUser,
    getAdminDistributor: vi.fn(async () => ({ data: baseDist })),
    getAdminUsers: vi.fn(async () => ({ data: [existingUser] })),
    assignDistributorAdmin: vi.fn(async (): Promise<AssignAdminResult> => ({ data: { ok: true } })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return {
    ...actual,
    getAdminDistributor,
    getAdminUsers,
    assignDistributorAdmin,
  };
});

import { QMAdminDistributorDetailPage } from './QMAdminDistributorDetail';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/qm-admin/distributors/d1']}>
      <Routes>
        <Route path="/qm-admin/distributors/:id" element={<QMAdminDistributorDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// The submit used to be reachable as a bare 'Assign Admin' regardless of which
// user was selected -- the defect this batch fixes. Its accessible name now
// carries the selection, so the query names the user these cases pick.
const ASSIGN_BUTTON = 'Assign Existing User as distributor admin';

async function openAssignExistingTab() {
  renderPage();
  await waitFor(() => expect(screen.getByText('Test Distributor')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Add Admin' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Assign existing user' }));
  await screen.findByText('Existing User');
  fireEvent.click(screen.getByText('Existing User'));
}

describe('QMAdminDistributorDetail -- assign_admin role-conflict gate (item 1c)', () => {
  beforeEach(() => {
    getAdminDistributor.mockClear();
    getAdminUsers.mockClear();
    assignDistributorAdmin.mockClear();
    getAdminDistributor.mockImplementation(async () => ({ data: baseDist }));
    getAdminUsers.mockImplementation(async () => ({ data: [existingUser] }));
  });

  afterEach(() => {
    cleanup();
  });

  it('names the assign submit after the selected user, not a bare "Assign Admin" (batch 2)', async () => {
    await openAssignExistingTab();

    // The selection lives in state and never reaches handleAssignAdmin, so the
    // control had no entity to name -- the closed-over blind spot batch 1 flagged.
    expect(screen.getByRole('button', { name: ASSIGN_BUTTON })).toBeInTheDocument();
    // Visible caption unchanged.
    expect(screen.getByRole('button', { name: ASSIGN_BUTTON }).textContent).toContain('Assign Admin');
    // And the name it used to answer to is gone.
    expect(screen.queryByRole('button', { name: 'Assign Admin' })).toBeNull();
  });

  it('holds the submit and shows a confirm dialog on a 409 role_conflict_requires_confirm, without completing', async () => {
    assignDistributorAdmin.mockImplementationOnce(async () => ({
      error: 'This user already has a role at another distributor.',
      error_code: 'role_conflict_requires_confirm',
      status: 409,
    }));

    await openAssignExistingTab();
    fireEvent.click(screen.getByRole('button', { name: ASSIGN_BUTTON }));

    await waitFor(() => expect(assignDistributorAdmin).toHaveBeenCalledTimes(1));
    expect(assignDistributorAdmin).toHaveBeenCalledWith('d1', 'u-existing', false);

    await screen.findByText('Assign admin anyway?');
    expect(screen.getByText('This user already has a role at another distributor.')).toBeInTheDocument();
    expect(screen.queryByText('Admin assigned.')).not.toBeInTheDocument();
    expect(assignDistributorAdmin).toHaveBeenCalledTimes(1);
  });

  it('re-calls assignDistributorAdmin with confirm:true when the dialog is confirmed', async () => {
    assignDistributorAdmin.mockImplementationOnce(async () => ({
      error: 'This user already has a role at another distributor.',
      error_code: 'role_conflict_requires_confirm',
      status: 409,
    }));

    await openAssignExistingTab();
    fireEvent.click(screen.getByRole('button', { name: ASSIGN_BUTTON }));
    await screen.findByText('Assign admin anyway?');

    fireEvent.click(screen.getByRole('button', { name: 'Assign anyway' }));

    await waitFor(() => expect(assignDistributorAdmin).toHaveBeenCalledTimes(2));
    expect(assignDistributorAdmin).toHaveBeenNthCalledWith(2, 'd1', 'u-existing', true);
    await screen.findByText('Admin assigned.');
    await waitFor(() => expect(screen.queryByText('Assign admin anyway?')).not.toBeInTheDocument());
    // Drain the component's own 2s auto-close timer before the test ends --
    // otherwise it fires after cleanup() unmounts and throws into whatever
    // test runs next.
    await waitFor(() => expect(screen.queryByText('Admin assigned.')).not.toBeInTheDocument(), { timeout: 3000 });
  }, 8000);

  it('aborts and never retries when the dialog is cancelled', async () => {
    assignDistributorAdmin.mockImplementationOnce(async () => ({
      error: 'This user already has a role at another distributor.',
      error_code: 'role_conflict_requires_confirm',
      status: 409,
    }));

    await openAssignExistingTab();
    fireEvent.click(screen.getByRole('button', { name: ASSIGN_BUTTON }));
    await screen.findByText('Assign admin anyway?');

    // Scoped to the alert dialog -- the Add Admin modal behind it has its
    // own (unrelated) "Cancel" button that closes the whole modal.
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Assign admin anyway?')).not.toBeInTheDocument());
    expect(assignDistributorAdmin).toHaveBeenCalledTimes(1);
  });

  it('assigns directly on a 2xx, with no dialog shown (unchanged success path)', async () => {
    assignDistributorAdmin.mockImplementationOnce(async () => ({ data: { ok: true } }));

    await openAssignExistingTab();
    fireEvent.click(screen.getByRole('button', { name: ASSIGN_BUTTON }));

    await waitFor(() => expect(assignDistributorAdmin).toHaveBeenCalledTimes(1));
    expect(assignDistributorAdmin).toHaveBeenCalledWith('d1', 'u-existing', false);
    await screen.findByText('Admin assigned.');
    expect(screen.queryByText('Assign admin anyway?')).not.toBeInTheDocument();
    // Drain the component's own 2s auto-close timer before the test ends --
    // otherwise it fires after cleanup() unmounts and throws into whatever
    // test runs next.
    await waitFor(() => expect(screen.queryByText('Admin assigned.')).not.toBeInTheDocument(), { timeout: 3000 });
  }, 8000);
});
