// useSessionOnUse.test.ts — unit coverage for the consume-route guard.
//
// The whole point of useSessionOnUse's guard is to make it impossible to
// navigate back onto a one-shot token-consume page (/rep/welcome,
// /chef/welcome, or anything still carrying a raw `?token=`) once a session
// has already been established from that same token. This is a pure-logic
// test of the guard predicate; the full hook (which also touches
// AuthContext/UserContext/react-router) is exercised indirectly by
// RepInviteAcceptPage.test.tsx.
//
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isConsumeRoute, routePathOnly } from './useSessionOnUse';

describe('isConsumeRoute', () => {
  it('flags the rep magic-link consume route', () => {
    expect(isConsumeRoute('/rep/welcome')).toBe(true);
  });

  it('flags the chef magic-link consume route', () => {
    expect(isConsumeRoute('/chef/welcome')).toBe(true);
  });

  it('flags any target still carrying a raw token query param', () => {
    expect(isConsumeRoute('/rep/welcome?token=abc123')).toBe(true);
    expect(isConsumeRoute('/some/other/path?token=xyz')).toBe(true);
  });

  it('does not flag real authenticated views', () => {
    expect(isConsumeRoute('/rep/quotes/inbound')).toBe(false);
    expect(isConsumeRoute('/chef/quotes/quote-123')).toBe(false);
    expect(isConsumeRoute('/rep/quotes/quote-123')).toBe(false);
  });
});

// The guard's own diagnostic used to interpolate the whole rejected target
// into a console.error, and a rejected target is precisely the case that
// carries a raw magic-link or invite token in `?token=`. The log now names the
// path only.
describe('routePathOnly', () => {
  it('drops the token query from a consume target', () => {
    expect(routePathOnly('/chef/welcome?token=magic-secret-value')).toBe('/chef/welcome');
    expect(routePathOnly('/rep/welcome?token=abc123&ref=email')).toBe('/rep/welcome');
  });

  it('drops a fragment as well', () => {
    expect(routePathOnly('/chef/welcome#token=hash-secret')).toBe('/chef/welcome');
  });

  it('leaves a plain path unchanged', () => {
    expect(routePathOnly('/rep/quotes/inbound')).toBe('/rep/quotes/inbound');
  });

  // The three shapes a naive split on '?' leaked, all found by verification.
  it('drops userinfo credentials rather than passing them through', () => {
    const out = routePathOnly('//admin:hunter2@evil.example.com/rep/welcome');
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('admin:');
  });

  it('redacts a percent-encoded query that is not a literal question mark', () => {
    const out = routePathOnly('/chef/welcome%3Ftoken=MAGICSECRETVALUE');
    expect(out).not.toContain('MAGICSECRETVALUE');
  });

  it('redacts a JWT-shaped path segment', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sIg2Nz4dAqPmB92K27uhbUJU1p1r_wW1gFWFOEjXkx';
    expect(routePathOnly(`/c/${jwt}`)).not.toContain(jwt);
  });

  // Stated as a test so the limit is not rediscovered the hard way: an OPAQUE
  // path-segment token cannot be told from an ordinary path segment. This is
  // documented on the function and is why it must not be reused for /c/:token.
  it('does NOT remove an opaque path-segment token (known limit)', () => {
    expect(routePathOnly('/c/abc123opaque')).toBe('/c/abc123opaque');
  });
});
