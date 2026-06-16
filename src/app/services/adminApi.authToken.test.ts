// C-02: admin endpoints require admin scope. While impersonating, quoteme_token is
// the impersonated (non-admin) JWT and quoteme_admin_token holds the real admin JWT
// (set on impersonate, removed on un-impersonate). adminApi must prefer the admin
// token so admin writes (e.g. "Save States" on the distributor detail) still authorize
// instead of 403-ing. Pure-function test for the precedence (mirrors QuotesPage style).
import { describe, it, expect } from 'vitest';
import { selectAdminToken } from './adminApi';

describe('selectAdminToken — C-02 admin-scope token precedence', () => {
  it('uses the stashed admin token while impersonating', () => {
    expect(selectAdminToken('ADMIN_JWT', 'IMPERSONATED_JWT')).toBe('ADMIN_JWT');
  });

  it('falls back to the normal token when not impersonating', () => {
    expect(selectAdminToken(null, 'ADMIN_OWN_JWT')).toBe('ADMIN_OWN_JWT');
  });

  it('returns null when neither token is present', () => {
    expect(selectAdminToken(null, null)).toBeNull();
  });
});
