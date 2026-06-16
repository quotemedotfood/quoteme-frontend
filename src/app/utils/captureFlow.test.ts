// P0: guest "Looks good" must capture the user (sign up) before accept, then claim
// the quote and auto-fire accept. Pure helpers for the redirect contract.
import { describe, it, expect } from 'vitest';
import { acceptCaptureAuthUrl, postAuthTarget } from './captureFlow';

describe('acceptCaptureAuthUrl — guest accept → auth capture', () => {
  it('routes to /auth with intent=accept and an encoded return path', () => {
    expect(acceptCaptureAuthUrl('abc-123')).toBe(
      '/auth?intent=accept&redirect=' + encodeURIComponent('/chef/quotes/abc-123'),
    );
  });
});

describe('postAuthTarget — where AuthPage sends the user after auth', () => {
  it('returns the role home when there is no redirect', () => {
    expect(postAuthTarget({ redirect: null, intent: null, roleHome: '/start-new-quote' })).toBe('/start-new-quote');
  });

  it('returns the redirect, carrying intent so the receipt auto-accepts', () => {
    expect(postAuthTarget({ redirect: '/chef/quotes/abc-123', intent: 'accept', roleHome: '/dashboard' }))
      .toBe('/chef/quotes/abc-123?intent=accept');
  });

  it('returns a bare redirect when there is no intent', () => {
    expect(postAuthTarget({ redirect: '/chef/quotes/abc-123', intent: null, roleHome: '/dashboard' }))
      .toBe('/chef/quotes/abc-123');
  });
});
