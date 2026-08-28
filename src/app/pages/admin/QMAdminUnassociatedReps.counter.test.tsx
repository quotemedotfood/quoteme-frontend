// @vitest-environment jsdom
//
// The page reported 0 unassociated reps while every Distributor cell on the
// Signups list showed a dash. The old filter was
//
//   u.rep_profile && !u.rep_profile.distributor_id
//
// which cannot see a rep-role user with NO rep_profile at all. That is the
// most unassociated a rep can be, so the one row most needing action was the
// one row structurally excluded, and the count agreed with the empty table.
//
// Verified against the live Test backend before writing this: 16 reps, one of
// them (visual-review-rep@quoteme.test) with no rep_profile, page showed 0,
// honest count 1.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

function user(over: Record<string, unknown>) {
  return {
    id: 'u-1', email: 'someone@example.com', first_name: 'Sam', last_name: 'Reyes',
    phone: null, role: 'rep', status: 'active', distributor_name: null,
    claimed_distributor_id: null, flagged_for_review: false, flag_reason: null,
    last_login_at: null, created_at: '2026-07-01T00:00:00Z', rep_profile: null,
    ...over,
  };
}
const profile = (distributor_id: string | null) => ({
  id: 'rp-1', distributor_id, phone: null, territory: null, is_active: true,
});

const { getAdminUsers } = vi.hoisted(() => ({ getAdminUsers: vi.fn() }));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminUsers };
});

import { QMAdminUnassociatedReps } from './QMAdminUnassociatedReps';

// No global afterEach in this vitest config, so unmount explicitly.
afterEach(() => cleanup());

function renderPage() {
  render(<MemoryRouter><QMAdminUnassociatedReps /></MemoryRouter>);
}

describe('QMAdminUnassociatedReps - who counts as unassociated', () => {
  it('shows a rep-role user that has no rep_profile at all', async () => {
    getAdminUsers.mockResolvedValueOnce({
      data: [user({ id: 'u-no-profile', email: 'noprofile@example.com', rep_profile: null })],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('noprofile@example.com')).toBeInTheDocument();
    });
  });

  it('shows a rep whose profile points at no distributor', async () => {
    getAdminUsers.mockResolvedValueOnce({
      data: [user({ id: 'u-null-dist', email: 'nulldist@example.com', rep_profile: profile(null) })],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('nulldist@example.com')).toBeInTheDocument();
    });
  });

  it('excludes a rep that does have a distributor', async () => {
    getAdminUsers.mockResolvedValueOnce({
      data: [
        user({ id: 'u-ok', email: 'associated@example.com', rep_profile: profile('dist-1') }),
        user({ id: 'u-no-profile', email: 'noprofile@example.com', rep_profile: null }),
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('noprofile@example.com')).toBeInTheDocument();
    });
    expect(screen.queryByText('associated@example.com')).not.toBeInTheDocument();
  });

  it('excludes non-rep roles even when they carry a profile-shaped hole', async () => {
    getAdminUsers.mockResolvedValueOnce({
      data: [
        user({ id: 'u-chef', email: 'chef@example.com', role: 'chef', rep_profile: null }),
        user({ id: 'u-ga', email: 'ga@example.com', role: 'group_admin', rep_profile: null }),
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(getAdminUsers).toHaveBeenCalled();
    });
    expect(screen.queryByText('chef@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('ga@example.com')).not.toBeInTheDocument();
  });
});
