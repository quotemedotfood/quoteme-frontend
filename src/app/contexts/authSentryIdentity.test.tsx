// authSentryIdentity.test.tsx
//
// SECURITY: AuthContext used to tag every Sentry event with the signed-in
// user's real email address (Sentry.setUser({ id, email, role })). A PII
// payload in a third-party collector is the same class of leak as a bearer
// token in the console, so the email is gone.
//
// What must survive the fix, and is pinned here:
//   - `role` stays. It is non-identifying and it is what makes grouping useful.
//   - `id` stays, and stays the real account id (a users.id UUID). It is not a
//     credential and carries no personal data on its own, and it is the only
//     field that ties an issue back to the account that hit it. A
//     browser-local random id like the guest one would be wrong here: reps
//     hand a phone to a chef, so a per-browser id merges two people.
//   - logout still clears the Sentry user entirely.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, waitFor } from '@testing-library/react';

const { setUser, getCurrentUser } = vi.hoisted(() => ({
  setUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('@sentry/react', () => ({ setUser }));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getCurrentUser };
});

import { AuthProvider, useAuth } from './AuthContext';

const USER_ID = '3f2a9c1e-7b64-4d2a-9f1b-0c8e5a7d6b21';
const USER_EMAIL = 'carla@bigfish.com';

let capturedLogout: () => void;

function Harness() {
  const { logout } = useAuth();
  capturedLogout = logout;
  return null;
}

function renderApp() {
  return render(
    <AuthProvider>
      <Harness />
    </AuthProvider>
  );
}

describe('Sentry identity carries no PII', () => {
  beforeEach(() => {
    localStorage.clear();
    setUser.mockClear();
    getCurrentUser.mockReset();
    getCurrentUser.mockResolvedValue({
      data: {
        id: USER_ID,
        email: USER_EMAIL,
        first_name: 'Carla',
        last_name: 'Jimenez',
        role: 'rep',
        status: 'active',
        phone: '555-0142',
        distributor: null,
      },
    });
    localStorage.setItem('quoteme_token', 'test-token');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('never sends the signed-in user email to Sentry', async () => {
    renderApp();
    await waitFor(() => expect(setUser).toHaveBeenCalled());

    const payload = setUser.mock.calls.at(-1)![0];
    expect(payload).not.toHaveProperty('email');
    // Belt and braces: the address must not reach Sentry under any key.
    expect(JSON.stringify(setUser.mock.calls)).not.toContain(USER_EMAIL);
  });

  it('still sends the account id and the role, so events stay groupable', async () => {
    renderApp();
    await waitFor(() => expect(setUser).toHaveBeenCalled());

    expect(setUser.mock.calls.at(-1)![0]).toEqual({ id: USER_ID, role: 'rep' });
  });

  it('clears the Sentry user on logout', async () => {
    renderApp();
    await waitFor(() => expect(setUser).toHaveBeenCalled());

    act(() => capturedLogout());

    expect(setUser).toHaveBeenLastCalledWith(null);
  });
});
