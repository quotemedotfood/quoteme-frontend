// @vitest-environment jsdom
//
// The Users list renders an Archive button in two mutually exclusive status
// branches, active and inactive. No single row shows both, but a page shows
// many, and every one of them announced as the bare word "Archive".
//
// Both buttons call handleStatusChange(u.id, 'archived'), which is one
// updateAdminUser PATCH on the user record. They are the SAME action, so the
// name carries the target and nothing else: no status token, no invitation
// wording. There is no invitation entity and no invitation endpoint, and a
// name that implied one would announce a distinction the code does not make.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

function user(over: Record<string, unknown>) {
  return {
    id: 'u-1', email: 'jamie@example.com', first_name: 'Jamie', last_name: 'Rivera',
    phone: null, role: 'rep', status: 'active', distributor_name: null,
    claimed_distributor_id: null, flagged_for_review: false, flag_reason: null,
    last_login_at: '2026-08-01T00:00:00Z', created_at: '2026-07-01T00:00:00Z',
    rep_profile: null, ...over,
  };
}

const { getAdminUsers, getAdminDistributors } = vi.hoisted(() => ({
  getAdminUsers: vi.fn(),
  getAdminDistributors: vi.fn(async () => ({ data: [] })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminUsers, getAdminDistributors };
});

import { QMAdminUsers } from './QMAdminUsers';

// No global afterEach in this vitest config, so RTL's auto-cleanup never
// registers and renders accumulate across cases. Unmount explicitly, the same
// way _adminEmptyState.test.tsx does.
afterEach(() => cleanup());

describe('QMAdminUsers - Archive button accessible name', () => {
  it('names the target and nothing else, from the active branch', async () => {
    getAdminUsers.mockResolvedValueOnce({ data: [user({ status: 'active' })] });
    render(<MemoryRouter><QMAdminUsers /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Archive Jamie Rivera' })).toBeInTheDocument();
    });
    // The visible label is untouched; only the accessible name gained the target.
    expect(screen.getByRole('button', { name: 'Archive Jamie Rivera' })).toHaveTextContent('Archive');
  });

  it('gives the inactive branch the identical name, because it is the identical action', async () => {
    getAdminUsers.mockResolvedValueOnce({ data: [user({ status: 'inactive' })] });
    render(<MemoryRouter><QMAdminUsers /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Archive Jamie Rivera' })).toBeInTheDocument();
    });
  });

  it('falls back to the email when the row has no name', async () => {
    getAdminUsers.mockResolvedValueOnce({
      data: [user({ first_name: '', last_name: '', email: 'noname@example.com' })],
    });
    render(<MemoryRouter><QMAdminUsers /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Archive noname@example.com' })).toBeInTheDocument();
    });
  });
});
