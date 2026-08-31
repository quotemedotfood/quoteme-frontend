// @vitest-environment jsdom
//
// DistributorRepsPage.destructiveConfirm.test.tsx
//
// A distributor admin clicked what he took to be the impersonate control and
// deactivated a rep on production. Both row actions were ghost buttons, 8px
// apart, and the destructive one was the LIGHTER of the two (text-gray-400
// against text-gray-500), showing danger colour only on hover. It called the
// API straight off the click with no confirm at all.
//
// What the endpoint actually does is PATCH .../reps/:id/disable ->
// is_active: false. Nothing is destroyed. But no surface in this product sets
// is_active back to true, so the confirm states what happens and stops there:
// it must never tell the operator they can re-enable the rep later.
//
// The invited rows carried the identical defect with a different label:
// "Cancel" expires a single-use invite token, also with no confirm.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach-based auto cleanup never registers.
// afterEach(cleanup) is declared here explicitly: without it renders
// accumulate across cases and a later query can pass against an earlier
// case's DOM.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const { getDistributorAdminReps, disableRep, cancelRepInvite, impersonateRep } = vi.hoisted(() => {
  const activeRep = {
    id: 'rep-1',
    user_id: 'u-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@fishguys.com',
    phone: null,
    territory: 'North',
    is_active: true,
    is_admin: false,
    status: 'active' as const,
    created_at: '2026-01-01T00:00:00Z',
    last_activity_at: null,
  };
  const invitedRep = {
    id: 'invite-9',
    user_id: null,
    first_name: 'Sam',
    last_name: null,
    email: 'sam@fishguys.com',
    phone: null,
    territory: null,
    is_active: false,
    is_admin: false,
    status: 'invited' as const,
    created_at: '2026-02-01T00:00:00Z',
    last_activity_at: null,
  };
  return {
    getDistributorAdminReps: vi.fn(async () => ({ data: [activeRep, invitedRep] })),
    disableRep: vi.fn(async () => ({ data: { ...activeRep, is_active: false, status: 'deactivated' } })),
    cancelRepInvite: vi.fn(async () => ({ data: {} })),
    impersonateRep: vi.fn(async () => ({ data: { token: 't', rep: activeRep } })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getDistributorAdminReps,
    disableRep,
    cancelRepInvite,
    impersonateRep,
  };
});

import { DistributorRepsPage } from './DistributorRepsPage';

async function renderTeamPage() {
  render(<DistributorRepsPage />);
  await waitFor(() => expect(getDistributorAdminReps).toHaveBeenCalled());
  await screen.findByRole('button', { name: 'Deactivate Jane Doe' });
}

describe('DistributorRepsPage -- destructive row actions name their target and confirm first', () => {
  afterEach(() => {
    cleanup();
    getDistributorAdminReps.mockClear();
    disableRep.mockClear();
    cancelRepInvite.mockClear();
    impersonateRep.mockClear();
  });

  it('names both active-row actions with the verb and the rep, so they cannot be confused', async () => {
    await renderTeamPage();

    // The pair that caught the founder. Each name says what it does and to whom.
    expect(screen.getByRole('button', { name: 'Sign in as Jane Doe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate Jane Doe' })).toBeInTheDocument();
  });

  it('does not call the API on the click, and names the rep in the confirm', async () => {
    await renderTeamPage();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Jane Doe' }));

    await screen.findByText('Deactivate Jane Doe?');
    // The whole point: the click opens a question, it does not act.
    expect(disableRep).not.toHaveBeenCalled();
  });

  it('states what happens without promising the rep can be re-enabled', async () => {
    await renderTeamPage();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Jane Doe' }));
    const body = await screen.findByText(/lose access to QuoteMe immediately/i);

    expect(body).toHaveTextContent(/move to Inactive/i);
    expect(body).toHaveTextContent(/Nothing is deleted/i);
    // There is no re-enable anywhere in the product: reps_controller#update
    // permits only phone and territory, and the Inactive rows render an empty
    // actions cell. Any reassurance here would be a lie to the operator.
    expect(body.textContent ?? '').not.toMatch(/re-enable|reactivate|restore|undo|later/i);
  });

  it('calls disableRep once, with that rep id, only after explicit confirmation', async () => {
    await renderTeamPage();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Jane Doe' }));
    await screen.findByText('Deactivate Jane Doe?');

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(disableRep).toHaveBeenCalledTimes(1));
    expect(disableRep).toHaveBeenCalledWith('rep-1');
  });

  it('backs out without touching the API when the admin keeps the rep active', async () => {
    await renderTeamPage();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Jane Doe' }));
    await screen.findByText('Deactivate Jane Doe?');

    fireEvent.click(screen.getByRole('button', { name: 'Keep active' }));

    await waitFor(() => expect(screen.queryByText('Deactivate Jane Doe?')).not.toBeInTheDocument());
    expect(disableRep).not.toHaveBeenCalled();
  });

  it('gates the invited row the same way, since cancelling burns a single-use token', async () => {
    await renderTeamPage();

    const cancelButton = screen.getByRole('button', { name: 'Cancel invite for Sam' });
    fireEvent.click(cancelButton);

    await screen.findByText('Cancel the invite for Sam?');
    expect(cancelRepInvite).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel invite' }));

    await waitFor(() => expect(cancelRepInvite).toHaveBeenCalledTimes(1));
    expect(cancelRepInvite).toHaveBeenCalledWith('invite-9');
  });
});
