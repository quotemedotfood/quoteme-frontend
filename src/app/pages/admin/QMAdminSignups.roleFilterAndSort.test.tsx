// @vitest-environment jsdom
//
// Two defects on the same page, both of them a control disagreeing with what
// the operator can see.
//
// 1. The role filter hard-coded four of the eight roles User accepts
//    (app/models/user.rb:17). group_admin, brand, buyer and restaurant_admin
//    rows existed and were unreachable through it. On Test that is 12 of 49.
//
// 2. The Status header sorted on the raw `status` column while the cell
//    renders userStatusPill(u), which reads the derived display_status.
//    `status` is set to "active" at creation, so every never-signed-in
//    account sorted as Active while displaying "Invite sent".

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

function user(over: Record<string, unknown>) {
  return {
    id: 'u-1', email: 'a@example.com', first_name: 'Ann', last_name: 'Adams',
    phone: null, role: 'rep', status: 'active', display_status: 'active',
    distributor_name: null, claimed_distributor_id: null,
    flagged_for_review: false, flag_reason: null,
    last_login_at: '2026-08-01T00:00:00Z', created_at: '2026-07-01T00:00:00Z',
    rep_profile: null, ...over,
  };
}

const { getAdminUsers } = vi.hoisted(() => ({ getAdminUsers: vi.fn(async () => ({ data: [] })) }));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminUsers };
});

import { QMAdminSignups } from './QMAdminSignups';

afterEach(() => cleanup());

function renderPage() {
  render(<MemoryRouter><QMAdminSignups /></MemoryRouter>);
}

describe('QMAdminSignups - role filter', () => {
  it('offers every role the backend accepts, not just the first four', async () => {
    getAdminUsers.mockResolvedValueOnce({ data: [] });
    renderPage();

    const select = await screen.findByRole('combobox');
    const values = within(select).getAllByRole('option').map((o) => (o as HTMLOptionElement).value);

    expect(values).toEqual([
      '', 'rep', 'chef', 'distributor_admin', 'quoteme_admin',
      'group_admin', 'restaurant_admin', 'buyer', 'brand',
    ]);
  });

  it('sends the selected role to the backend', async () => {
    getAdminUsers.mockResolvedValue({ data: [] });
    renderPage();

    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: 'group_admin' } });

    await waitFor(() => {
      expect(getAdminUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: 'group_admin' }),
      );
    });
  });
});

describe('QMAdminSignups - Status column sorts by what it shows', () => {
  it('groups an invited account with Invite sent, not with Active', async () => {
    getAdminUsers.mockResolvedValueOnce({
      data: [
        // Raw status "active" on both. Only display_status separates them,
        // and only display_status is rendered.
        user({ id: 'u-active', email: 'signedin@example.com', display_status: 'active' }),
        user({
          id: 'u-invited', email: 'invited@example.com',
          display_status: 'invite_sent', last_login_at: null,
        }),
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('invited@example.com')).toBeInTheDocument();
    });

    // Both rows carry raw status "active"; the visible pills differ.
    expect(screen.getByText('Invite sent')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Ascending by the visible label puts "Active" before "Invite sent".
    fireEvent.click(screen.getByText('Status'));

    await waitFor(() => {
      const emails = screen.getAllByText(/@example\.com$/).map((n) => n.textContent);
      expect(emails).toEqual(['signedin@example.com', 'invited@example.com']);
    });
  });
});
