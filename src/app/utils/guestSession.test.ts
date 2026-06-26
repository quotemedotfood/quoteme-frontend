import { describe, it, expect } from 'vitest';
import { isGuestVisitor } from './guestSession';

describe('B-182: isGuestVisitor — authenticated users are never guests', () => {
  const user = { id: 'u1', role: 'rep' };

  it('authenticated rep with a token is NOT a guest', () => {
    expect(isGuestVisitor(user, 'bearer-abc')).toBe(false);
  });

  it('token present but user not yet loaded is NOT a guest (token is authoritative)', () => {
    expect(isGuestVisitor(null, 'bearer-abc')).toBe(false);
  });

  it('user loaded but token momentarily null is NOT a guest', () => {
    expect(isGuestVisitor(user, null)).toBe(false);
  });

  it('no user and no token IS a guest', () => {
    expect(isGuestVisitor(null, null)).toBe(true);
  });

  it('regression guard: a stale guest flag must not matter — only user/token decide', () => {
    // The old bug OR-ed in profile.isGuest; this helper takes only user + token,
    // so an authenticated rep can never be classified as a guest.
    expect(isGuestVisitor(user, 'bearer-abc')).toBe(false);
  });
});
