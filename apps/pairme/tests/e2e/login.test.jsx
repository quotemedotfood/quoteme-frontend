/**
 * /login: the real, bookmarkable route implementing the AUTH CONTRACT
 * (locked, from the accounts BE's feat/pairme-accounts-be) - POST
 * /v1/auth/signup, POST /v1/auth/login, both mocked in tests/e2e/msw/
 * handlers.js since that backend may not be deployed yet. Covers:
 *   - the top-right chrome "Log in" entry point actually reaches /login,
 *   - login and signup both call their mocked endpoints and persist the
 *     returned token + anon_id (overwriting whatever anon_id this tab
 *     already had - the account's history key going forward),
 *   - a server error (INVALID_CREDENTIALS) renders its message verbatim,
 *     never a raw code.
 */
import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';
import { requestLog, TEST_ANON_ID } from './msw/handlers.js';

describe('AUTH CONTRACT: /login (login + signup toggle)', () => {
  it('the top-right chrome "Log in" button reaches /login', async () => {
    const { findByText, getByRole, currentPath } = renderPairMeApp('/');
    // Confirms Welcome rendered (the PairMe wordmark there is now the logo
    // image, not a text node - see the item-2 brand-mark conversion).
    await findByText('Know what to order. Every time.');

    await userEvent.click(getByRole('button', { name: 'Log in' }));
    await findByText('Welcome back. Your taste and history pick up right where you left them.');
    expect(currentPath()).toBe('/login');
  });

  it('logs in, persists the returned token + anon_id (overwriting the prior anon_id), and returns to where "Log in" was tapped from', async () => {
    const user = userEvent.setup();
    const { findByText, getByRole, getByLabelText, queryByRole, currentPath } = renderPairMeApp('/venue');

    // Bootstrap seeds the tab's own anon_id before any auth happens.
    await waitFor(() => expect(localStorage.getItem('pairme:anon_id')).toBe(TEST_ANON_ID));

    await user.click(getByRole('button', { name: 'Log in' }));
    await findByText('Welcome back. Your taste and history pick up right where you left them.');

    await user.type(getByLabelText('Email'), 'diner@example.com');
    await user.type(getByLabelText('Password'), 'correct-password');
    await user.click(getByRole('button', { name: 'Log in' })); // the form's submit button

    await waitFor(() => {
      expect(requestLog.filter((r) => r.method === 'POST' && r.path === '/v1/auth/login')).toHaveLength(1);
    });
    const loginCall = requestLog.find((r) => r.path === '/v1/auth/login');
    expect(loginCall.body).toEqual({ email: 'diner@example.com', password: 'correct-password' });
    // Login is sent with the anon_id this tab already had (X-PairMe-Anon).
    expect(loginCall.anon).toBe(TEST_ANON_ID);

    // Contract: store BOTH the token and the RETURNED anon_id. The returned
    // anon_id ('anon_after_auth_e2e_test', see msw/handlers.js) is
    // deliberately different from TEST_ANON_ID above, proving the app
    // adopted the server's value rather than keeping the pre-login one.
    await waitFor(() => expect(localStorage.getItem('pairme:auth_token')).toBe('auth_token_e2e_test'));
    expect(localStorage.getItem('pairme:anon_id')).toBe('anon_after_auth_e2e_test');

    // Returned to /venue (where "Log in" was tapped from), and the chrome
    // button is gone now that the diner is signed in.
    await waitFor(() => expect(currentPath()).toBe('/venue'));
    expect(queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('signup toggles from the login screen, calls POST /v1/auth/signup, and also persists token + anon_id', async () => {
    const user = userEvent.setup();
    const { findByText, getByRole, getByLabelText } = renderPairMeApp('/login');
    await findByText('Welcome back. Your taste and history pick up right where you left them.');

    await user.click(getByRole('button', { name: "New here. Create an account" }));
    await findByText('So it follows you to the next restaurant. Email and a password, nothing else.');

    await user.type(getByLabelText('Email'), 'new-diner@example.com');
    await user.type(getByLabelText('Password'), 'whatever-diner-picks');
    await user.click(getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(requestLog.filter((r) => r.method === 'POST' && r.path === '/v1/auth/signup')).toHaveLength(1);
    });
    const signupCall = requestLog.find((r) => r.path === '/v1/auth/signup');
    expect(signupCall.body).toEqual({ email: 'new-diner@example.com', password: 'whatever-diner-picks' });
    // Signup carries the diner's existing anon history along (X-PairMe-Anon).
    expect(signupCall.anon).toBe(TEST_ANON_ID);

    await waitFor(() => expect(localStorage.getItem('pairme:auth_token')).toBe('auth_token_e2e_test'));
    expect(localStorage.getItem('pairme:anon_id')).toBe('anon_after_auth_e2e_test');
  });

  it('renders a server error message verbatim, never a raw error_code', async () => {
    const user = userEvent.setup();
    const { findByText, getByRole, getByLabelText, queryByText } = renderPairMeApp('/login');
    await findByText('Welcome back. Your taste and history pick up right where you left them.');

    await user.type(getByLabelText('Email'), 'diner@example.com');
    await user.type(getByLabelText('Password'), 'the-wrong-password');
    await user.click(getByRole('button', { name: 'Log in' }));

    await findByText('That email and password do not match. Please try again.');
    expect(queryByText(/INVALID_CREDENTIALS/)).not.toBeInTheDocument();
    expect(queryByText(/401/)).not.toBeInTheDocument();
    // A failed login never persists a token.
    expect(localStorage.getItem('pairme:auth_token')).toBeNull();
  });

  it('"Not now" leaves without logging in, and login never runs unless a diner opts in', async () => {
    const user = userEvent.setup();
    const { findByText, getByRole, currentPath } = renderPairMeApp('/');
    await findByText('Know what to order. Every time.');

    await user.click(getByRole('button', { name: 'Log in' }));
    await findByText('Welcome back. Your taste and history pick up right where you left them.');

    await user.click(getByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(requestLog.filter((r) => r.path === '/v1/auth/login')).toHaveLength(0);
    expect(requestLog.filter((r) => r.path === '/v1/auth/signup')).toHaveLength(0);
  });
});
