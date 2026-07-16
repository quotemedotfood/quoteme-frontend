// @vitest-environment jsdom
//
// QMAdminUsers.inlineEdit.test.tsx — coverage for the row-level edit pencil
// added for the QM-admin launch-day inline-edit feature. Every user row
// (reps, admins, chefs, brands) gets a pencil icon at the end of the Actions
// cell; clicking it swaps the Name cell to editable first_name/last_name/
// phone inputs and swaps Actions to Save/Cancel. Save calls updateAdminUser
// (PATCH /api/v1/admin/users/:id) and merges the response back into local
// state without a full reload.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { mockUser, getAdminUsers, updateAdminUser, getAdminDistributors } = vi.hoisted(() => {
  const mockUser = {
    id: 'user-1',
    email: 'jamie@testdistributor.com',
    first_name: 'Jamie',
    last_name: 'Rivera',
    phone: '555-0100',
    role: 'rep',
    status: 'active',
    distributor_name: 'Test Distributor',
    claimed_distributor_id: 'dist-1',
    flagged_for_review: false,
    flag_reason: null,
    last_login_at: null,
    created_at: '2026-07-01T00:00:00Z',
    rep_profile: null,
  };

  return {
    mockUser,
    getAdminUsers: vi.fn(async () => ({ data: [mockUser] })),
    updateAdminUser: vi.fn(async (_id: string, data: Record<string, unknown>) => ({
      data: { ...mockUser, ...data },
    })),
    getAdminDistributors: vi.fn(async () => ({ data: [] })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return {
    ...actual,
    getAdminUsers,
    updateAdminUser,
    getAdminDistributors,
  };
});

import { QMAdminUsers } from './QMAdminUsers';

function renderPage() {
  return render(
    <MemoryRouter>
      <QMAdminUsers />
    </MemoryRouter>,
  );
}

describe('QMAdminUsers - inline edit pencil', () => {
  beforeEach(() => {
    getAdminUsers.mockClear();
    updateAdminUser.mockClear();
    getAdminDistributors.mockClear();
  });

  it('opens inline edit prefilled with the row data, then saves phone/name via updateAdminUser', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('jamie@testdistributor.com')).toBeInTheDocument();
    });

    // Pencil is the only icon-only ghost button left once no status actions
    // apply for an active rep with a last_login_at set to null... an active
    // rep with no last_login_at also renders "Resend Invite", so scope the
    // pencil lookup to a button with no accessible name text (icon-only).
    const buttons = screen.getAllByRole('button');
    const pencilButton = buttons.find((btn) => btn.textContent === '');
    expect(pencilButton).toBeTruthy();
    fireEvent.click(pencilButton!);

    // Inline inputs appear, prefilled.
    const firstNameInput = await screen.findByPlaceholderText('First name');
    const lastNameInput = screen.getByPlaceholderText('Last name');
    const phoneInput = screen.getByPlaceholderText('Phone');
    expect((firstNameInput as HTMLInputElement).value).toBe('Jamie');
    expect((lastNameInput as HTMLInputElement).value).toBe('Rivera');
    expect((phoneInput as HTMLInputElement).value).toBe('555-0100');

    fireEvent.change(phoneInput, { target: { value: '555-0199' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(updateAdminUser).toHaveBeenCalledWith('user-1', {
        first_name: 'Jamie',
        last_name: 'Rivera',
        phone: '555-0199',
      });
    });

    // Edit mode closes and the row reflects the saved value on next edit open.
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Phone')).not.toBeInTheDocument();
    });
  });

  it('discards changes on Cancel without calling updateAdminUser', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('jamie@testdistributor.com')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const pencilButton = buttons.find((btn) => btn.textContent === '');
    fireEvent.click(pencilButton!);

    const phoneInput = await screen.findByPlaceholderText('Phone');
    fireEvent.change(phoneInput, { target: { value: '000-0000' } });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Phone')).not.toBeInTheDocument();
    });
    expect(updateAdminUser).not.toHaveBeenCalled();
  });
});
