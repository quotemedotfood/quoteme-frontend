// @vitest-environment jsdom
//
// H3 (BE review 2026-10-21, QuoteMe #602): a distributor admin cannot take a
// rep or admin who is active at ANOTHER distributor. The invite endpoint
// refuses with error_code "rep_move_requires_quoteme_admin" (403), confirm or
// not. The page must show one plain inline line and no "Add anyway" for it.
//
// Mocks carry the BE's own error text so a test only passes when the page
// shows its own copy for the code, not whatever string the BE sent.
//
// afterEach(cleanup) is explicit: vitest globals are off in this project.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const BE_403_TEXT = 'This person works with another distributor. Ask QuoteMe to move them.';
const FE_LINE = 'This person is active at another distributor. Ask QuoteMe to move them.';

const { getDistributorAdminReps, inviteRep } = vi.hoisted(() => {
  const existingAdmin = {
    id: 'adm-1',
    user_id: 'u-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@existing.com',
    phone: null,
    territory: null,
    is_active: true,
    is_admin: true,
    status: 'active' as const,
    created_at: '2026-01-01T00:00:00Z',
    last_activity_at: null,
  };
  type InviteRepResult = {
    data?: { message: string };
    error?: string;
    error_code?: string;
    status?: number;
  };
  return {
    getDistributorAdminReps: vi.fn(async () => ({ data: [existingAdmin] })),
    inviteRep: vi.fn(async (): Promise<InviteRepResult> => ({ data: { message: 'Invite sent' } })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getDistributorAdminReps, inviteRep };
});

import { DistributorRepsPage } from './DistributorRepsPage';

const refused403 = async () => ({
  error: BE_403_TEXT,
  error_code: 'rep_move_requires_quoteme_admin',
  status: 403,
});

const conflict409 = async () => ({
  error: 'This person already has an active rep role with another distributor on QuoteMe.',
  error_code: 'role_conflict_requires_confirm',
  status: 409,
});

async function openInviteForm() {
  render(<DistributorRepsPage />);
  await waitFor(() => expect(getDistributorAdminReps).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /invite rep/i }));
  await screen.findByText('Send an Invite');
}

function fillAndSubmit(name: string, email: string) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
}

describe('DistributorRepsPage -- H3 refusal: active at another distributor', () => {
  afterEach(() => {
    cleanup();
    getDistributorAdminReps.mockClear();
    inviteRep.mockReset();
    inviteRep.mockImplementation(async () => ({ data: { message: 'Invite sent' } }));
  });

  it('shows the inline line and no confirm dialog on a 403 rep_move_requires_quoteme_admin', async () => {
    inviteRep.mockImplementationOnce(refused403);

    await openInviteForm();
    fillAndSubmit('Taken Rep', 'taken@elsewhere.com');

    await waitFor(() => expect(screen.queryByText(FE_LINE)).not.toBeNull());
    expect(screen.queryByText('Add a rep role anyway?')).not.toBeInTheDocument();
    expect(screen.queryByText(BE_403_TEXT)).not.toBeInTheDocument();
    expect(inviteRep).toHaveBeenCalledTimes(1);
  });

  it('shows the inline line and no confirm dialog when a conflict response carries rep_move_requires_quoteme_admin', async () => {
    inviteRep.mockImplementationOnce(async () => ({
      error: BE_403_TEXT,
      error_code: 'rep_move_requires_quoteme_admin',
      status: 409,
    }));

    await openInviteForm();
    fillAndSubmit('Taken Rep', 'taken@elsewhere.com');

    await waitFor(() => expect(screen.queryByText(FE_LINE)).not.toBeNull());
    expect(screen.queryByText('Add a rep role anyway?')).not.toBeInTheDocument();
    expect(inviteRep).toHaveBeenCalledTimes(1);
  });

  it('closes the 409 confirm and shows the inline line when the confirmed retry is refused with 403', async () => {
    inviteRep.mockImplementationOnce(conflict409).mockImplementationOnce(refused403);

    await openInviteForm();
    fillAndSubmit('Taken Rep', 'taken@elsewhere.com');
    await screen.findByText('Add a rep role anyway?');

    fireEvent.click(screen.getByRole('button', { name: 'Add anyway' }));

    await waitFor(() => expect(inviteRep).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(FE_LINE)).not.toBeNull());
    await waitFor(() => expect(screen.queryByText('Add a rep role anyway?')).not.toBeInTheDocument());
    expect(screen.queryByText(BE_403_TEXT)).not.toBeInTheDocument();
  });

  it('shows the inline line when the same-distributor confirm path is refused with 403', async () => {
    inviteRep.mockImplementationOnce(refused403);

    await openInviteForm();
    fillAndSubmit('Jane Doe', 'jane@existing.com');
    await screen.findByText('Add a rep role anyway?');
    fireEvent.click(screen.getByRole('button', { name: 'Add anyway' }));

    await waitFor(() => expect(screen.queryByText(FE_LINE)).not.toBeNull());
    await waitFor(() => expect(screen.queryByText('Add a rep role anyway?')).not.toBeInTheDocument());
    expect(inviteRep).toHaveBeenCalledTimes(1);
  });

  it('still shows the confirm dialog for a plain 409 role conflict (a case the BE can still allow)', async () => {
    inviteRep.mockImplementationOnce(conflict409);

    await openInviteForm();
    fillAndSubmit('Former Rep', 'former@elsewhere.com');

    await screen.findByText('Add a rep role anyway?');
    expect(screen.queryByText(FE_LINE)).not.toBeInTheDocument();
  });
});
