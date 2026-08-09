/**
 * NEVER a signup wall (AUTH CONTRACT, locked). A diner landing on /t/:code
 * or /t/demo from a table QR code MUST reach a wine recommendation with no
 * account and no login prompt blocking the walk - login is optional, only
 * reachable from the top-right chrome button or a direct /login visit (see
 * screens/Login.jsx's own doc comment and state.js's goLogin).
 *
 * This walks the full /t/demo path (table-code-entry.test.jsx already
 * proves the landing itself is unblocked) all the way through to the wine
 * offerings screen, asserting at every step that the URL never becomes
 * /login, no "create an account"/"sign up" copy ever appears, and
 * POST /v1/auth/* is never called - the "Log in" chrome button present
 * throughout is optional chrome, never a gate.
 */
import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';
import { requestLog } from './msw/handlers.js';

function assertNoAuthCallsYet() {
  expect(requestLog.filter((r) => r.path === '/v1/auth/login')).toHaveLength(0);
  expect(requestLog.filter((r) => r.path === '/v1/auth/signup')).toHaveLength(0);
}

describe('NO SIGNUP WALL: /t/demo reaches offerings with no auth step', () => {
  it(
    'walks table -> menu -> direction -> offerings with no login prompt and no auth calls',
    async () => {
      const user = userEvent.setup();
      const { findByText, getByRole, queryByText, currentPath } = renderPairMeApp('/t/demo');

      // --- Landing: table QR straight to Menu, no venue search, no auth. ---
      await findByText('Aquitaine');
      await findByText(/Their menu tonight/i);
      expect(currentPath()).toBe('/t/demo');
      // The optional top-right entry point is present (reachable, not
      // forced) but nothing resembling a wall ever renders unprompted.
      expect(getByRole('button', { name: 'Log in' })).toBeInTheDocument();
      expect(queryByText(/create an account/i)).not.toBeInTheDocument();
      expect(queryByText(/sign up/i)).not.toBeInTheDocument();
      assertNoAuthCallsYet();

      // --- Menu -> direction, no auth step in between. ---------------------
      await user.click(getByRole('button', { name: 'Pair it' }));
      await findByText('How do you want to drink?');
      expect(currentPath()).toBe('/direction');
      expect(getByRole('button', { name: 'Log in' })).toBeInTheDocument();
      assertNoAuthCallsYet();

      // --- Direction: by the bottle, single, whole dinner. ------------------
      await user.click(getByRole('button', { name: /By the bottle/i }));
      await user.click(getByRole('button', { name: /Single, just the one/i }));
      await user.click(getByRole('button', { name: /The whole dinner/i }));
      await findByText(/One bottle, across the whole dinner\./);
      assertNoAuthCallsYet();

      // --- Show wine: the walk's whole point, real offerings, no wall. ------
      await user.click(getByRole('button', { name: 'Show wine' }));
      await waitFor(() => expect(currentPath()).toBe('/wines'));
      await findByText('One bottle for the table'); // offerTitle, engine-computed
      expect(getByRole('button', { name: 'Log in' })).toBeInTheDocument();
      expect(queryByText(/create an account/i)).not.toBeInTheDocument();
      expect(queryByText(/sign up/i)).not.toBeInTheDocument();

      // The whole walk never called any auth endpoint and never visited
      // /login, even though the entry point sat in the chrome the entire
      // time.
      assertNoAuthCallsYet();
      expect(currentPath()).not.toBe('/login');
    },
    20000
  );
});
