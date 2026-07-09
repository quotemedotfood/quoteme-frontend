// B01: expired-session handling in ChefStatusPage.
// Tests the pure helper that detects a 401 / expired-session API response,
// ensuring polling stops and the expired UI is shown instead of spinning forever.
//
// B-127: expired-state action helpers — Sign in href, resend button enable/label.

import { describe, it, expect } from 'vitest';
import {
  isSessionExpiredResponse,
  isQuoteNotFoundResponse,
  isResendEnabled,
  resendButtonLabel,
  SIGN_IN_HREF,
  getStatusCompleteTarget,
  completionTargetStorageKey,
} from './ChefStatusPage';

describe('isSessionExpiredResponse', () => {
  it('returns true for a 401 status code', () => {
    expect(isSessionExpiredResponse({ status: 401 })).toBe(true);
  });

  it('returns true for the canonical "Session not found or expired" error text', () => {
    expect(isSessionExpiredResponse({ error: 'Session not found or expired' })).toBe(true);
  });

  it('returns true for a 401 with any error text', () => {
    expect(isSessionExpiredResponse({ status: 401, error: 'Unauthorized' })).toBe(true);
  });

  it('returns false for a non-401 HTTP error', () => {
    expect(isSessionExpiredResponse({ status: 500, error: 'Internal Server Error' })).toBe(false);
  });

  it('returns false when there is no error at all (successful response)', () => {
    expect(isSessionExpiredResponse({})).toBe(false);
  });

  it('returns false for a 404 (quote not found — different error, not session expired)', () => {
    expect(isSessionExpiredResponse({ status: 404, error: 'Not found' })).toBe(false);
  });

  it('returns false when status is undefined but no expired error string', () => {
    expect(isSessionExpiredResponse({ error: 'Network error' })).toBe(false);
  });
});

describe('isQuoteNotFoundResponse', () => {
  it('returns true for 404 (quote not found)', () => {
    expect(isQuoteNotFoundResponse({ status: 404 })).toBe(true);
  });

  it('returns true for 400 (malformed id)', () => {
    expect(isQuoteNotFoundResponse({ status: 400 })).toBe(true);
  });

  it('returns true for 500 (invalid UUID can surface as server error)', () => {
    expect(isQuoteNotFoundResponse({ status: 500 })).toBe(true);
  });

  it('returns false for 401 (session expired — different handler)', () => {
    expect(isQuoteNotFoundResponse({ status: 401 })).toBe(false);
  });

  it('returns false when status is absent (in-progress poll)', () => {
    expect(isQuoteNotFoundResponse({})).toBe(false);
  });
});

// ─── B-127: Sign in link ──────────────────────────────────────────────────────

describe('B-127 SIGN_IN_HREF — Sign in link destination', () => {
  it('points to /auth', () => {
    expect(SIGN_IN_HREF).toBe('/auth');
  });

  it('is a string constant (not undefined)', () => {
    expect(typeof SIGN_IN_HREF).toBe('string');
  });
});

// ─── B-127: isResendEnabled — button enable logic ─────────────────────────────

describe('B-127 isResendEnabled', () => {
  it('is enabled when email is present and state is idle', () => {
    expect(isResendEnabled('chef@example.com', 'idle')).toBe(true);
  });

  it('is disabled when email is empty', () => {
    expect(isResendEnabled('', 'idle')).toBe(false);
  });

  it('is disabled when email is whitespace only', () => {
    expect(isResendEnabled('   ', 'idle')).toBe(false);
  });

  it('is disabled when state is loading (prevent double-submit)', () => {
    expect(isResendEnabled('chef@example.com', 'loading')).toBe(false);
  });

  it('is enabled after an error so the user can retry', () => {
    expect(isResendEnabled('chef@example.com', 'error')).toBe(true);
  });

  it('is enabled after success (state reachable but button hidden in UI)', () => {
    expect(isResendEnabled('chef@example.com', 'success')).toBe(true);
  });
});

// ─── B-127: resendButtonLabel ─────────────────────────────────────────────────

describe('B-127 resendButtonLabel', () => {
  it('shows "Resend status email" in idle state', () => {
    expect(resendButtonLabel('idle')).toBe('Resend status email');
  });

  it('shows "Sending…" while loading', () => {
    expect(resendButtonLabel('loading')).toBe('Sending…');
  });

  it('shows "Resend status email" in error state (retry)', () => {
    expect(resendButtonLabel('error')).toBe('Resend status email');
  });

  it('shows "Resend status email" in success state', () => {
    expect(resendButtonLabel('success')).toBe('Resend status email');
  });
});

// ─── P1 fix: guest step-through regression — completion-target routing ──────
// Track 22 diverted the guest "Match to Catalog" and "Skip to Export" buttons
// straight to the receipt page, skipping the review step-through authed reps
// get. getStatusCompleteTarget is the pure decision point: default (no flag)
// must be byte-for-byte identical to the pre-existing /chef/quotes/:id
// behavior so the canonical /chef entry flow (which never had a review step)
// is completely unaffected.
describe('P1 getStatusCompleteTarget — completion routing', () => {
  it('defaults to the read-only receipt page when no completionTarget is set (canonical /chef flow — must not change)', () => {
    expect(getStatusCompleteTarget('quote-1', undefined)).toEqual({ path: '/chef/quotes/quote-1' });
  });

  it('routes to /map-ingredients with quoteId in state when completionTarget is "map-ingredients" ("Match to Catalog")', () => {
    expect(getStatusCompleteTarget('quote-2', 'map-ingredients')).toEqual({
      path: '/map-ingredients',
      state: { quoteId: 'quote-2' },
    });
  });

  it('routes to /export-finalize with quoteId in state when completionTarget is "export-finalize" ("Skip to Export")', () => {
    expect(getStatusCompleteTarget('quote-3', 'export-finalize')).toEqual({
      path: '/export-finalize',
      state: { quoteId: 'quote-3' },
    });
  });

  it('falls back to the receipt page for an unrecognized completionTarget value', () => {
    expect(getStatusCompleteTarget('quote-4', 'bogus' as any)).toEqual({ path: '/chef/quotes/quote-4' });
  });
});

describe('P1 completionTargetStorageKey — sessionStorage fallback key', () => {
  it('is namespaced per quote id so different quotes never collide', () => {
    expect(completionTargetStorageKey('abc')).toBe('chef_status_completion_target_abc');
    expect(completionTargetStorageKey('xyz')).toBe('chef_status_completion_target_xyz');
    expect(completionTargetStorageKey('abc')).not.toBe(completionTargetStorageKey('xyz'));
  });
});
