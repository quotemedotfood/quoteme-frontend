import { describe, it, expect, vi, afterEach } from 'vitest';
import { guestTokenBypassesAuthGuard, CHEF_RECEIPT_PATH } from './routeGuard';

// ---------------------------------------------------------------------------
// localStorage stub
// ---------------------------------------------------------------------------
// guestTokenBypassesAuthGuard() reads localStorage.getItem('quoteme_guest_token')
// synchronously. We stub the global before each relevant test and restore it
// after so tests remain isolated.

const stubLocalStorage = (tokenValue: string | null) => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'quoteme_guest_token' ? tokenValue : null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// CHEF_RECEIPT_PATH regex
// ---------------------------------------------------------------------------

describe('CHEF_RECEIPT_PATH', () => {
  it('matches /chef/quotes/:id', () => {
    expect(CHEF_RECEIPT_PATH.test('/chef/quotes/abc123')).toBe(true);
    expect(CHEF_RECEIPT_PATH.test('/chef/quotes/uuid-goes-here')).toBe(true);
  });

  it('does not match the bare /chef/quotes index', () => {
    expect(CHEF_RECEIPT_PATH.test('/chef/quotes')).toBe(false);
    expect(CHEF_RECEIPT_PATH.test('/chef/quotes/')).toBe(false);
  });

  it('does not match unrelated /chef/* paths', () => {
    expect(CHEF_RECEIPT_PATH.test('/chef/order-guide/123')).toBe(false);
    expect(CHEF_RECEIPT_PATH.test('/chef/menus/123')).toBe(false);
    expect(CHEF_RECEIPT_PATH.test('/dashboard')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// guestTokenBypassesAuthGuard
// ---------------------------------------------------------------------------

describe('guestTokenBypassesAuthGuard', () => {
  it('allows render when quoteme_guest_token is present in localStorage', () => {
    stubLocalStorage('tok_guest_abc123');
    expect(guestTokenBypassesAuthGuard('/chef/quotes/some-quote-id')).toBe(true);
  });

  it('redirects to /auth when no token is present (returns false)', () => {
    stubLocalStorage(null);
    expect(guestTokenBypassesAuthGuard('/chef/quotes/some-quote-id')).toBe(false);
  });

  it('returns false for non-receipt chef paths even with a guest token', () => {
    stubLocalStorage('tok_guest_abc123');
    expect(guestTokenBypassesAuthGuard('/chef/order-guide/123')).toBe(false);
    expect(guestTokenBypassesAuthGuard('/chef/menus/123')).toBe(false);
    expect(guestTokenBypassesAuthGuard('/dashboard')).toBe(false);
  });

  it('returns false when localStorage is unavailable (SSR / non-browser guard)', () => {
    // In the node vitest environment, localStorage is undefined by default.
    // Do NOT stub it here — the absence of a stub means globalThis.localStorage
    // is undefined, which is exactly the non-browser case we want to guard.
    // (Other tests call stubLocalStorage and afterEach calls vi.unstubAllGlobals.)
    expect(guestTokenBypassesAuthGuard('/chef/quotes/abc')).toBe(false);
  });
});
