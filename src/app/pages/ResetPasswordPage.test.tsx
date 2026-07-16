// @vitest-environment jsdom
//
// ResetPasswordPage.test.tsx — three-flows-one-door regression test.
//
// Before this fix: a successful password reset always bounced to /auth after
// a 3s countdown, no matter who the user was - a distributor_admin who just
// set their password via the invite-triggered reset link had to sign in
// again immediately after. The BE now returns a jwt on success (same
// session-establish pattern as the invite/magic-link consume endpoints);
// this test asserts the FE stores it, refreshes AuthContext (via the
// getCurrentUser /me call), and lands the user on their role-appropriate
// page instead of /auth.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { mockJwt, resetPassword, getCurrentUser } = vi.hoisted(() => {
  const mockJwt = 'mock.reset.jwt';
  return {
    mockJwt,
    resetPassword: vi.fn(async () => ({
      data: {
        message: 'Password has been reset successfully',
        jwt: mockJwt,
        user: { id: 'admin-1', email: 'admin@distributor.com', role: 'distributor_admin' },
      },
    })),
    getCurrentUser: vi.fn(async () => ({
      data: { id: 'admin-1', email: 'admin@distributor.com', role: 'distributor_admin' },
    })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    resetPassword,
    getCurrentUser,
  };
});

import { ResetPasswordPage } from './ResetPasswordPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reset-password?reset_password_token=tok-abc']}>
      <AuthProvider>
        <UserProvider>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/distributor-admin/command-center" element={<div>DISTRIBUTOR_ADMIN_VIEW</div>} />
            <Route path="/auth" element={<div>AUTH_SIGNIN_VIEW</div>} />
          </Routes>
        </UserProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage — three-flows-one-door auto-login', () => {
  beforeEach(() => {
    localStorage.clear();
    resetPassword.mockClear();
    getCurrentUser.mockClear();
  });

  it('stores the jwt, refreshes AuthContext, and routes a distributor_admin to their view (not /auth)', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPass123!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'NewPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(screen.getByText('Password reset successfully')).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.getByText('DISTRIBUTOR_ADMIN_VIEW')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(localStorage.getItem('quoteme_token')).toBe(mockJwt);
    expect(getCurrentUser).toHaveBeenCalled();
    expect(screen.queryByText('AUTH_SIGNIN_VIEW')).not.toBeInTheDocument();
  });

  it('falls back to /auth when the BE response has no jwt (older BE)', async () => {
    resetPassword.mockResolvedValueOnce({
      data: { message: 'Password has been reset successfully' },
    } as any);

    renderPage();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPass123!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'NewPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(screen.getByText('Password reset successfully')).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.getByText('AUTH_SIGNIN_VIEW')).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    expect(localStorage.getItem('quoteme_token')).toBeNull();
  });
});
