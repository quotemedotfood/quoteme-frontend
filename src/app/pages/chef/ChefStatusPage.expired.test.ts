// B01: expired-session handling in ChefStatusPage.
// Tests the pure helper that detects a 401 / expired-session API response,
// ensuring polling stops and the expired UI is shown instead of spinning forever.

import { describe, it, expect } from 'vitest';
import { isSessionExpiredResponse } from './ChefStatusPage';

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
