// PROD_SIGNUP_URL regression cover. This constant had ZERO test coverage while
// feeding 12 call sites across DemoBanner, UpgradeDrawer and ExportFinalizePage,
// so a wrong host here would have shipped silently.
//
// Imports the real constant from demoMode.ts rather than re-declaring it. A
// local copy is the defect PR #400 fixed in cc-polish.test.ts: that suite had
// its own COLD_LANDING_HOST (with the wrong, pre-prod-prefix value) and its own
// buildMenuDropUrl, so it exercised nothing and could not catch a regression in
// the module it claimed to test.

import { describe, it, expect } from 'vitest';

import { PROD_SIGNUP_URL } from './demoMode';

// Asserted against a literal, NOT against the module's own constant.
// Interpolating PROD_SIGNUP_URL into its own expectation would be tautological:
// it would pass whatever the constant held.
const EXPECTED_PROD_SIGNUP_URL = 'https://prod.quoteme.food/auth';

describe('PROD_SIGNUP_URL', () => {
  it('falls back to the prod signup URL when VITE_PROD_SIGNUP_URL is unset', () => {
    expect(PROD_SIGNUP_URL).toBe(EXPECTED_PROD_SIGNUP_URL);
  });

  it('is an absolute https URL, so demo visitors leave the demo host', () => {
    // A relative path would keep the visitor on demo.quoteme.food, which is the
    // one thing this link exists to avoid.
    expect(PROD_SIGNUP_URL.startsWith('https://')).toBe(true);
  });

  it('targets the prod host, not the bare apex which does not serve /auth', () => {
    const { hostname, pathname } = new URL(PROD_SIGNUP_URL);
    expect(hostname).toBe('prod.quoteme.food');
    expect(pathname).toBe('/auth');
  });
});
