// Regression for the demo.quoteme.food/auth infinite redirect loop.
// Cause: /auth in demo → "/" (routes.tsx), and RootIndex sent unauthenticated
// "/" → /auth, ping-ponging forever (RootLayout/DemoBanner remounted each cycle →
// logo png re-requested hundreds of times → "Maximum update depth exceeded").
// Fix: demo guests land on the guest builder, never back on /auth.
import { describe, it, expect } from 'vitest';
import { rootRedirectTarget } from './rootRedirect';

describe('rootRedirectTarget — breaks the demo /auth ↔ / loop', () => {
  it('sends a demo guest to the builder, NOT back to /auth', () => {
    expect(rootRedirectTarget(true, false)).toBe('/start-new-quote');
  });

  it('keeps the normal (non-demo) unauthenticated redirect to /auth', () => {
    expect(rootRedirectTarget(false, false)).toBe('/auth');
  });

  it('routes authenticated users to the dashboard regardless of demo', () => {
    expect(rootRedirectTarget(true, true)).toBe('/dashboard');
    expect(rootRedirectTarget(false, true)).toBe('/dashboard');
  });
});
