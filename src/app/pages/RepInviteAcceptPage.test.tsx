// @vitest-environment jsdom
//
// RepInviteAcceptPage.test.tsx — regression test for the invite-accept
// "session-on-use" redirect bug.
//
// Before this fix: on a successful consume, the page stored the JWT and
// navigated straight to the BE's `redirect_to` (typically "/rep/welcome"),
// which is the rep magic-link CONSUME page - a page whose only job is to
// spend a token. The invite token is one-shot, so that page could never
// re-consume it and rendered the dead-link error. AuthContext.user was also
// never refreshed, so role-based routing could misfire even if it had
// worked.
//
// This test drives the real component through @testing-library/react and
// asserts the actual fixed behavior: the JWT lands in localStorage,
// AuthContext.refreshUser is invoked (proven via the mocked /me call being
// hit), and the final navigation lands on the authenticated rep view
// (/rep/quotes/inbound) - never on /rep/welcome - even though the mocked BE
// response's redirect_to still says "/rep/welcome" (mirroring real prod
// data, which the fix now deliberately ignores).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { mockJwt, consumeRepInvitation, getCurrentUser } = vi.hoisted(() => {
  const mockJwt = 'mock.jwt.token';
  const mockUser = {
    id: 'user-1',
    email: 'newrep@distributor.com',
    first_name: 'Alice',
    last_name: 'Smith',
    role: 'rep',
    status: 'active',
    distributor: { id: 'dist-1', name: 'Sysco Boston' },
  };

  return {
    mockJwt,
    consumeRepInvitation: vi.fn(async () => ({
      data: {
        jwt: mockJwt,
        user: mockUser,
        // Real BE payload still points at the consume page - the fix must
        // ignore this and hardcode the authenticated view instead.
        redirect_to: '/rep/welcome',
      },
    })),
    getCurrentUser: vi.fn(async () => ({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        role: 'rep',
      },
    })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    consumeRepInvitation,
    getCurrentUser,
  };
});

import { RepInviteAcceptPage } from './RepInviteAcceptPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/rep/invite?token=inv-token-abc']}>
      <AuthProvider>
        <UserProvider>
          <Routes>
            <Route path="/rep/invite" element={<RepInviteAcceptPage />} />
            <Route path="/rep/quotes/inbound" element={<div>REP_TRIAGE_VIEW</div>} />
            <Route path="/rep/welcome" element={<div>REP_WELCOME_CONSUME_PAGE</div>} />
          </Routes>
        </UserProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RepInviteAcceptPage — session-on-use redirect fix', () => {
  beforeEach(() => {
    localStorage.clear();
    consumeRepInvitation.mockClear();
    getCurrentUser.mockClear();
  });

  it('stores the JWT, refreshes AuthContext, and lands on /rep/quotes/inbound (not /rep/welcome)', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accept Invitation' }));

    // Success flash renders first.
    await waitFor(() => {
      expect(screen.getByText(/Account created, welcome to QuoteMe/)).toBeInTheDocument();
    });

    // After the success beat, the helper stores the token, refreshes the
    // authenticated user (/me), and navigates to the real rep view.
    await waitFor(
      () => {
        expect(screen.getByText('REP_TRIAGE_VIEW')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(localStorage.getItem('quoteme_token')).toBe(mockJwt);
    expect(getCurrentUser).toHaveBeenCalled();
    // The dead-link consume page must never be reached.
    expect(screen.queryByText('REP_WELCOME_CONSUME_PAGE')).not.toBeInTheDocument();
  });
});
