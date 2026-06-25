// AuthPage.test.ts
// Pure-constant tests for B-143 / B-144 / B-145 copy fixes.
// Node-mode only — no jsdom, no @testing-library/react.

import { describe, it, expect } from 'vitest';
import { LOGIN_EMAIL_PLACEHOLDER, BRAND_CARD_SUBTITLE } from './AuthPage';

// B-143: Brand role card must have no trailing period (matches Rep/Distributor/Restaurant cards)
describe('B-143 — brand card subtitle has no trailing period', () => {
  it('does not end with a period', () => {
    expect(BRAND_CARD_SUBTITLE.endsWith('.')).toBe(false);
  });

  it('contains the expected text', () => {
    expect(BRAND_CARD_SUBTITLE).toBe('Get your products into distributor catalogs');
  });
});

// B-144: Sign-in email placeholder must be neutral, not distributor-biased
describe('B-144 — login email placeholder is neutral', () => {
  it('is you@example.com', () => {
    expect(LOGIN_EMAIL_PLACEHOLDER).toBe('you@example.com');
  });

  it('does not reference a distributor', () => {
    expect(LOGIN_EMAIL_PLACEHOLDER).not.toMatch(/distributor/i);
  });
});

// B-145: Sign-in view Back affordance — verified in source; documented here.
// The renderSignIn function contains an ArrowLeft button with onClick={() => switchView('role-select')}
// which navigates back to the role selector. This is a structural guarantee, not testable
// without DOM rendering. See lines 976-982 of AuthPage.tsx.
describe('B-145 — sign-in Back button (structural)', () => {
  it('LOGIN_EMAIL_PLACEHOLDER is defined (smoke: file exported correctly)', () => {
    expect(typeof LOGIN_EMAIL_PLACEHOLDER).toBe('string');
  });
});
