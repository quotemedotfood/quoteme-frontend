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
import { isConsumeRoute } from './useSessionOnUse';

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
