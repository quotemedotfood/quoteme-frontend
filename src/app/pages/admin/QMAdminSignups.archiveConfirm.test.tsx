// @vitest-environment jsdom
//
// QMAdminSignups.archiveConfirm.test.tsx
//
// The Archive control fired straight off the click with no confirm, and its
// accessible name was a bare "Archive" that never said whose account.
//
// It is NOT a delete, and the confirm copy turns on that. handleArchive sets
// status 'archived'; handleUnarchive sets it back to 'active'; the two render
// in mutually exclusive branches on the same row, so the way back is visible
// to the operator the moment they archive. That is the opposite of the Team
// page, where the confirm stays silent about recovery because no re-enable
// exists anywhere in the product, and the opposite of the brand-rule delete,
// which is a genuine destroy!. Same doctrine, three different honest answers.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach auto cleanup never registers.
// afterEach(cleanup) is declared explicitly: without it renders accumulate and
// a later query can pass against an earlier case's DOM.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

function user(over: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    first_name: 'Rae',
    last_name: 'Okonjo',
    email: 'rae@thegull.example',
    role: 'rep',
    status: 'active',
    display_status: 'invite_sent',
    created_at: '2026-02-01T00:00:00Z',
    last_login_at: null,
    ...over,
  };
}

const { getAdminUsers, updateAdminUser } = vi.hoisted(() => ({
  getAdminUsers: vi.fn(),
  updateAdminUser: vi.fn(async () => ({ data: { id: 'user-1', status: 'archived' } })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminUsers, updateAdminUser };
});

import { QMAdminSignups } from './QMAdminSignups';

async function renderSignups(users: unknown[]) {
  getAdminUsers.mockResolvedValue({ data: users });
  render(
    <MemoryRouter>
      <QMAdminSignups />
    </MemoryRouter>,
  );
  await waitFor(() => expect(getAdminUsers).toHaveBeenCalled());
  await screen.findByText(/rae@thegull.example/i);
}

describe('QMAdminSignups -- Archive names the account and confirms first', () => {
  afterEach(() => {
    cleanup();
    getAdminUsers.mockReset();
    updateAdminUser.mockReset();
  });

  it('names whose account it archives', async () => {
    await renderSignups([user()]);

    expect(screen.getByRole('button', { name: 'Archive Rae Okonjo' })).toBeInTheDocument();
  });

  it('falls back to the email when the account has no name yet', async () => {
    // 58 of 77 users on this page have never logged in, so blank names are the
    // common case rather than the edge one.
    await renderSignups([user({ first_name: '', last_name: '' })]);

    expect(screen.getByRole('button', { name: 'Archive rae@thegull.example' })).toBeInTheDocument();
  });

  it('does not archive on the click', async () => {
    await renderSignups([user()]);

    fireEvent.click(screen.getByRole('button', { name: 'Archive Rae Okonjo' }));

    await screen.findByText('Archive Rae Okonjo?');
    expect(updateAdminUser).not.toHaveBeenCalled();
  });

  it('tells the operator the way back, because here there genuinely is one', async () => {
    await renderSignups([user()]);

    fireEvent.click(screen.getByRole('button', { name: 'Archive Rae Okonjo' }));
    const body = await screen.findByText(/lose access/i);

    expect(body).toHaveTextContent(/Nothing is deleted/i);
    expect(body).toHaveTextContent(/Unarchive/);
  });

  it('archives only after explicit confirmation, and only that account', async () => {
    await renderSignups([user()]);

    fireEvent.click(screen.getByRole('button', { name: 'Archive Rae Okonjo' }));
    await screen.findByText('Archive Rae Okonjo?');

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() => expect(updateAdminUser).toHaveBeenCalledTimes(1));
    expect(updateAdminUser).toHaveBeenCalledWith('user-1', { status: 'archived' });
  });

  it('names the account on the Unarchive control too', async () => {
    await renderSignups([user({ status: 'archived' })]);

    expect(screen.getByRole('button', { name: 'Unarchive Rae Okonjo' })).toBeInTheDocument();
  });
});
