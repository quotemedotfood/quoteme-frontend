import { describe, it, expect } from 'vitest';
import { scrubSentryEvent, redactUrl, REDACTED } from './scrubSentryEvent';
import type { SentryEventLike } from './scrubSentryEvent';

describe('redactUrl', () => {
  it('redacts a magic-link token in a bare path', () => {
    expect(redactUrl('/chef/welcome?token=abc123secret')).toBe(
      `/chef/welcome?token=${encodeURIComponent(REDACTED)}`,
    );
  });

  it('keeps harmless params and the path', () => {
    const out = redactUrl('https://app.example.com/rep/welcome?token=xyz&quote_id=42');
    expect(out).toContain('/rep/welcome');
    expect(out).toContain('quote_id=42');
    expect(out).not.toContain('xyz');
  });

  it('leaves a url with no query string untouched', () => {
    expect(redactUrl('/rep/quotes/inbound')).toBe('/rep/quotes/inbound');
  });

  it('redacts a token carried in the fragment', () => {
    expect(redactUrl('/chef#token=hashsecret')).not.toContain('hashsecret');
  });
});

describe('scrubSentryEvent', () => {
  it('redacts the Authorization header without keeping a prefix', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      request: {
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature',
          'X-Guest-Token': 'guest-tok-1234',
          'Content-Type': 'application/json',
        },
      },
    });
    expect(event.request!.headers!.Authorization).toBe(REDACTED);
    expect(event.request!.headers!['X-Guest-Token']).toBe(REDACTED);
    expect(event.request!.headers!['Content-Type']).toBe('application/json');
    expect(JSON.stringify(event)).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('redacts a token in the request url and query_string', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      request: {
        url: 'https://app.example.com/chef/welcome?token=magic-secret',
        query_string: 'token=magic-secret&ref=email',
      },
    });
    expect(JSON.stringify(event)).not.toContain('magic-secret');
    expect(event.request!.query_string).toContain('ref=email');
  });

  it('redacts a token in a navigation breadcrumb', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      breadcrumbs: [
        { category: 'navigation', data: { from: '/', to: '/rep/welcome?token=crumb-secret' } },
        { category: 'fetch', data: { url: '/api/v1/me', method: 'GET' } },
      ],
    });
    expect(JSON.stringify(event)).not.toContain('crumb-secret');
    expect(event.breadcrumbs![1].data!.url).toBe('/api/v1/me');
  });

  it('redacts credential-named keys in extra and contexts', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      extra: { jwt: 'jwt-secret', quoteId: 'q-1', password: 'hunter2' },
      contexts: { auth: { refresh_token: 'refresh-secret', role: 'rep' } },
    });
    expect(event.extra!.jwt).toBe(REDACTED);
    expect(event.extra!.password).toBe(REDACTED);
    expect(event.extra!.quoteId).toBe('q-1');
    expect(event.contexts!.auth!.refresh_token).toBe(REDACTED);
    expect(event.contexts!.auth!.role).toBe('rep');
  });

  it('passes an unrecognised event shape through untouched', () => {
    const event = scrubSentryEvent<SentryEventLike>({ message: 'boom' });
    expect(event.message).toBe('boom');
  });
});
