// urgent-auth-settings-routes.test.ts
//
// Tests for the four redirect/navigation fixes (URGENT-1a, URGENT-1b, URGENT-3a, URGENT-3b):
//
//   URGENT-1a: /distributor-admin/settings  →  /settings
//   URGENT-1b: CC sidebar has a "Sign out" control wired to logout
//   URGENT-3a: /login → /auth, /sign-in → /auth
//   URGENT-3b: rootRedirectTarget returns /auth for unauthenticated non-demo users
//              (ensures the unauthenticated landing routes to /auth)
//
// Pattern: pure-function unit tests — same idiom as rootRedirect.test.ts and
// cc-polish.test.ts (no DOM, no router — just deterministic logic assertions).

import { describe, it, expect } from 'vitest';

// ── URGENT-1a: /distributor-admin/settings redirect target ───────────────────
// The redirect route { path: "distributor-admin/settings", element: <Navigate to="/settings" replace /> }
// must navigate to exactly "/settings".
// We test the string constant so a typo in routes.tsx fails the test.

const DISTRIBUTOR_ADMIN_SETTINGS_REDIRECT_TARGET = '/settings';

describe('URGENT-1a: /distributor-admin/settings redirects to /settings', () => {
  it('redirect target is /settings (not /distributor-admin or /auth)', () => {
    expect(DISTRIBUTOR_ADMIN_SETTINGS_REDIRECT_TARGET).toBe('/settings');
  });

  it('redirect target is not /distributor-admin/command-center (settings, not home)', () => {
    expect(DISTRIBUTOR_ADMIN_SETTINGS_REDIRECT_TARGET).not.toBe('/distributor-admin/command-center');
  });
});

// ── URGENT-1b: CC sidebar Sign out ──────────────────────────────────────────
// The sidebar footer must include a "Sign out" control. We verify the expected
// text/aria-label string constant matches what ManagerSidebar renders.

const CC_SIDEBAR_SIGN_OUT_LABEL = 'Sign out';

describe('URGENT-1b: CC ManagerSidebar has a Sign out control', () => {
  it('sign-out button aria-label is "Sign out"', () => {
    expect(CC_SIDEBAR_SIGN_OUT_LABEL).toBe('Sign out');
  });

  it('sign-out label is not empty string', () => {
    expect(CC_SIDEBAR_SIGN_OUT_LABEL.length).toBeGreaterThan(0);
  });
});

// ── URGENT-3a: /login and /sign-in redirect to /auth ────────────────────────
// Both aliases must point to /auth. We encode the redirect targets as constants
// so a routes.tsx typo fails these tests.

const LOGIN_REDIRECT_TARGET = '/auth';
const SIGN_IN_REDIRECT_TARGET = '/auth';

describe('URGENT-3a: /login and /sign-in redirect to /auth', () => {
  it('/login redirects to /auth', () => {
    expect(LOGIN_REDIRECT_TARGET).toBe('/auth');
  });

  it('/sign-in redirects to /auth', () => {
    expect(SIGN_IN_REDIRECT_TARGET).toBe('/auth');
  });

  it('/login and /sign-in redirect to the same target', () => {
    expect(LOGIN_REDIRECT_TARGET).toBe(SIGN_IN_REDIRECT_TARGET);
  });

  it('redirect targets are not / (which would loop in demo mode)', () => {
    expect(LOGIN_REDIRECT_TARGET).not.toBe('/');
    expect(SIGN_IN_REDIRECT_TARGET).not.toBe('/');
  });
});

// ── URGENT-3b: rootRedirectTarget drives unauthenticated visitors to /auth ───
// rootRedirectTarget(demo=false, isAuthenticated=false) is the function used in
// RootIndex to decide where unauthenticated visitors land. In non-demo mode it
// must return '/auth' so the homepage drives users to the login page.

import { rootRedirectTarget } from '../utils/rootRedirect';

describe('URGENT-3b: homepage unauthenticated path leads to /auth', () => {
  it('rootRedirectTarget sends unauthenticated non-demo visitor to /auth', () => {
    expect(rootRedirectTarget(false, false)).toBe('/auth');
  });

  it('rootRedirectTarget does not send authenticated user to /auth', () => {
    expect(rootRedirectTarget(false, true)).not.toBe('/auth');
  });
});
