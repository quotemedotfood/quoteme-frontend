// @vitest-environment jsdom
//
// DistributorRepsPage.test.tsx -- FE-safe half of prevention item 1c.
//
// The BE currently attaches a rep role to any existing user with no
// confirm, which is the root cause of the CJ dual-role bug (a person
// silently ends up with both an admin and a rep role at the same
// distributor). This page already loads the distributor's existing
// people into `reps`, so the FE can catch the SAME-distributor case for
// free: if the typed invite email matches an email already in that list,
// hold the submit behind an explicit confirm dialog instead of posting
// straight through.
//
// This test does not, and cannot, cover the cross-distributor case (an
// email that holds a role at ANOTHER distributor). That needs a BE
// lookup this page has no route for and is tracked separately.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach-based auto cleanup never registers --
// afterEach(cleanup) is required explicitly.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const { getDistributorAdminReps, inviteRep } = vi.hoisted(() => {
  const existingRep = {
    id: 'rep-1',
    user_id: 'u-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@existing.com',
    phone: null,
    territory: null,
    is_active: true,
    is_admin: false,
    status: 'active' as const,
    created_at: '2026-01-01T00:00:00Z',
    last_activity_at: null,
  };
  return {
    getDistributorAdminReps: vi.fn(async () => ({ data: [existingRep] })),
    inviteRep: vi.fn(async () => ({ data: { message: 'Invite sent' } })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getDistributorAdminReps,
    inviteRep,
  };
});

import { DistributorRepsPage } from './DistributorRepsPage';

async function openInviteForm() {
  render(<DistributorRepsPage />);
  // Wait for the initial reps load so `reps` is populated before we submit.
  await waitFor(() => expect(getDistributorAdminReps).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /invite rep/i }));
  await screen.findByText('Send an Invite');
}

function fillAndSubmit(name: string, email: string) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
}

describe('DistributorRepsPage -- existing-email confirm before adding a rep', () => {
  afterEach(() => {
    cleanup();
    getDistributorAdminReps.mockClear();
    inviteRep.mockClear();
  });

  it('holds the submit and shows a confirm when the typed email matches an existing rep (case-insensitive, trimmed)', async () => {
    await openInviteForm();

    fillAndSubmit('Someone New', '  JANE@Existing.com  ');

    await screen.findByText('Add a rep role anyway?');
    expect(screen.getByText(/This email already belongs to Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText(/a rep\) at this distributor/)).toBeInTheDocument();

    // The confirm is blocking -- no request goes out until the user acts.
    expect(inviteRep).not.toHaveBeenCalled();
  });

  it('calls inviteRep only after explicit confirmation ("Add anyway")', async () => {
    await openInviteForm();

    fillAndSubmit('Someone New', 'jane@existing.com');
    await screen.findByText('Add a rep role anyway?');
    expect(inviteRep).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Add anyway' }));

    await waitFor(() => expect(inviteRep).toHaveBeenCalledTimes(1));
    expect(inviteRep).toHaveBeenCalledWith({
      name: 'Someone New',
      email: 'jane@existing.com',
      territory: undefined,
    });
  });

  it('never calls inviteRep when the confirm is cancelled', async () => {
    await openInviteForm();

    fillAndSubmit('Someone New', 'jane@existing.com');
    await screen.findByText('Add a rep role anyway?');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Add a rep role anyway?')).not.toBeInTheDocument());
    expect(inviteRep).not.toHaveBeenCalled();
  });

  it('submits directly, with no confirm, for a genuinely new email', async () => {
    await openInviteForm();

    fillAndSubmit('Brand New Person', 'new-person@nowhere.com');

    await waitFor(() => expect(inviteRep).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Add a rep role anyway?')).not.toBeInTheDocument();
    expect(inviteRep).toHaveBeenCalledWith({
      name: 'Brand New Person',
      email: 'new-person@nowhere.com',
      territory: undefined,
    });
  });
});
