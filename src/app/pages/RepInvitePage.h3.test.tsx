// @vitest-environment jsdom
//
// H3 (QuoteMe #602): the standalone invite page shows the same inline line
// when the invite endpoint refuses with rep_move_requires_quoteme_admin.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const BE_403_TEXT = 'This person works with another distributor. Ask QuoteMe to move them.';
const FE_LINE = 'This person is active at another distributor. Ask QuoteMe to move them.';

const { inviteRep } = vi.hoisted(() => ({
  inviteRep: vi.fn(async (): Promise<{ data?: { message: string }; error?: string; error_code?: string; status?: number }> => ({
    error: 'This person works with another distributor. Ask QuoteMe to move them.',
    error_code: 'rep_move_requires_quoteme_admin',
    status: 403,
  })),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, inviteRep };
});

import { RepInvitePage } from './RepInvitePage';

describe('RepInvitePage -- H3 refusal', () => {
  afterEach(() => {
    cleanup();
    inviteRep.mockClear();
  });

  it('shows the inline line on a 403 rep_move_requires_quoteme_admin', async () => {
    render(<RepInvitePage />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Taken Rep' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@elsewhere.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));

    await waitFor(() => expect(inviteRep).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(FE_LINE)).not.toBeNull());
    expect(screen.queryByText(BE_403_TEXT)).not.toBeInTheDocument();
  });
});
