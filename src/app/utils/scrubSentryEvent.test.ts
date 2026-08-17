import { describe, it, expect } from 'vitest';
import {
  scrubSentryEvent,
  scrubSentrySpan,
  redactUrl,
  redactString,
  REDACTED,
} from './scrubSentryEvent';
import type { SentryEventLike } from './scrubSentryEvent';

const MAGIC = 'MAGICSECRETVALUE';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';

/** The assertion that matters: the credential does not appear anywhere in the
 * serialized payload, whatever field it was hiding in. */
function expectNoSecret(payload: unknown, secret: string = MAGIC) {
  expect(JSON.stringify(payload)).not.toContain(secret);
}

describe('redactString / redactUrl value-shape pass', () => {
  it('redacts a magic-link token in a bare path', () => {
    expect(redactUrl(`/chef/welcome?token=${MAGIC}`)).toBe(`/chef/welcome?token=${REDACTED}`);
  });

  it('keeps the path and the harmless params', () => {
    const out = redactUrl(`https://app.quoteme.food/rep/welcome?token=${MAGIC}&quote_id=42`);
    expect(out).toContain('/rep/welcome');
    expect(out).toContain('quote_id=42');
    expectNoSecret(out);
  });

  it('redacts a token in a bare query string with no leading separator', () => {
    const out = redactUrl(`token=${MAGIC}&ref=email`);
    expect(out).toContain('ref=email');
    expectNoSecret(out);
  });

  it('redacts a token carried in the fragment', () => {
    expectNoSecret(redactUrl(`/chef#token=${MAGIC}`));
  });

  it('redacts a token in a URL embedded in free text, keeping the text', () => {
    const out = redactString(`navigated to /chef/welcome?token=${MAGIC} from email`);
    expect(out).toContain('navigated to /chef/welcome');
    expect(out).toContain('from email');
    expectNoSecret(out);
  });

  it('redacts every token-ish param name, not an exact list', () => {
    for (const name of ['token', 'access_token', 'invite_token', 'guest_token', 'jwt', 'api_key']) {
      expectNoSecret(redactUrl(`/x?${name}=${MAGIC}`));
    }
  });

  it('redacts a bare JWT wherever it appears, including a path segment', () => {
    expectNoSecret(redactString(`user jwt is ${JWT} ok`), JWT);
    expectNoSecret(redactString(`/c/${JWT}`), JWT);
  });

  it('redacts a Bearer credential', () => {
    expectNoSecret(redactString(`Bearer ${MAGIC}xxxxxxxx`), `${MAGIC}xxxxxxxx`);
  });

  it('leaves an ordinary url untouched', () => {
    expect(redactUrl('/rep/quotes/inbound')).toBe('/rep/quotes/inbound');
    expect(redactUrl('/api/v1/me?page=2')).toBe('/api/v1/me?page=2');
  });
});

describe('scrubSentryEvent: headers', () => {
  it('redacts the Authorization header without keeping a prefix', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      request: {
        headers: {
          Authorization: `Bearer ${JWT}`,
          'X-Guest-Token': 'guest-tok-1234',
          'Content-Type': 'application/json',
        },
      },
    });
    expect(event.request!.headers!.Authorization).toBe(REDACTED);
    expect(event.request!.headers!['X-Guest-Token']).toBe(REDACTED);
    expect(event.request!.headers!['Content-Type']).toBe('application/json');
    expectNoSecret(event, JWT);
  });

  // The leak the verifier proved: httpContextIntegration sets Referer on every
  // event, and a name-only scrubber never looked at its value.
  it('redacts a magic-link token inside the Referer header value', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      request: {
        headers: {
          Referer: `https://app.quoteme.food/chef/welcome?token=${MAGIC}`,
          'User-Agent': 'Mozilla/5.0',
        },
      },
    });
    expectNoSecret(event);
    expect(event.request!.headers!.Referer).toContain('/chef/welcome');
    expect(event.request!.headers!['User-Agent']).toBe('Mozilla/5.0');
  });
});

describe('scrubSentryEvent: transaction and span payloads', () => {
  // beforeSend is error-events-only inside @sentry/core, so a transaction
  // recorded on a magic-link route used to bypass the scrubber entirely.
  it('scrubs a transaction-shaped event end to end', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      type: 'transaction',
      transaction: `/chef/welcome?token=${MAGIC}`,
      request: {
        url: `https://app.quoteme.food/chef/welcome?token=${MAGIC}`,
        headers: { Referer: `https://app.quoteme.food/rep/invite?token=${MAGIC}` },
      },
      contexts: {
        trace: {
          op: 'pageload',
          data: { 'url.full': `https://app.quoteme.food/chef/welcome?token=${MAGIC}` },
        },
      },
      spans: [
        {
          description: `GET /chef/welcome?token=${MAGIC}`,
          data: { 'http.url': `https://app.quoteme.food/c/${JWT}` },
        },
      ],
    });
    expectNoSecret(event);
    expectNoSecret(event, JWT);
    expect(event.transaction).toBe(`/chef/welcome?token=${REDACTED}`);
  });

  it('scrubs a standalone span via scrubSentrySpan', () => {
    const span = scrubSentrySpan({
      description: `navigation /rep/welcome?token=${MAGIC}`,
      data: { 'url.full': `https://app.quoteme.food/rep/welcome?token=${MAGIC}` },
    });
    expectNoSecret(span);
    expect(span.description).toContain('/rep/welcome');
  });
});

describe('scrubSentryEvent: depth, arrays and unexpected key names', () => {
  it('recurses past the first level', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      extra: {
        payload: { token: MAGIC },
        a: { b: { c: { token: MAGIC } } },
      },
      contexts: { app: { nested: { token: MAGIC } } },
    });
    expectNoSecret(event);
  });

  it('walks arrays', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      extra: {
        items: [`https://app.quoteme.food/chef/welcome?token=${MAGIC}`],
        list: [{ token: MAGIC }, { safe: 'keep me' }],
      },
    });
    expectNoSecret(event);
    expect(JSON.stringify(event)).toContain('keep me');
  });

  it('catches a credential under a key nobody thought to name, by value shape', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      extra: { blob: JWT, deep: { whatever: `see /c/${JWT}` } },
    });
    expectNoSecret(event, JWT);
  });

  it('scrubs request.data as an object and as a JSON string', () => {
    const asObject = scrubSentryEvent<SentryEventLike>({
      request: { data: { nested: { token: MAGIC } } },
    });
    expectNoSecret(asObject);

    const asString = scrubSentryEvent<SentryEventLike>({
      request: { data: JSON.stringify({ url: `/chef/welcome?token=${MAGIC}` }) },
    });
    expectNoSecret(asString);
  });

  it('scrubs breadcrumb href and arguments, not just url/to/from', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      breadcrumbs: [
        { category: 'navigation', data: { from: '/', to: `/rep/welcome?token=${MAGIC}` } },
        { category: 'ui.click', data: { href: `/chef/welcome?token=${MAGIC}` } },
        { category: 'console', data: { arguments: [`token=${MAGIC}`] } },
        { category: 'fetch', data: { url: '/api/v1/me', method: 'GET' } },
      ],
    });
    expectNoSecret(event);
    expect(event.breadcrumbs![3].data!.url).toBe('/api/v1/me');
  });

  it('scrubs message, transaction, exception values and user id', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      message: `failed on /chef/welcome?token=${MAGIC}`,
      transaction: `/c/${JWT}`,
      exception: { values: [{ type: 'Error', value: `401 for token=${MAGIC}` }] },
      user: { id: JWT, role: 'rep' },
    });
    expectNoSecret(event);
    expectNoSecret(event, JWT);
    expect((event.user as Record<string, unknown>).role).toBe('rep');
  });

  it('redacts credential-named keys while keeping their neighbours', () => {
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
});

describe('scrubSentryEvent: cannot break error reporting', () => {
  it('does not mutate the payload it is given', () => {
    const original: SentryEventLike = { extra: { token: MAGIC } };
    const scrubbed = scrubSentryEvent(original);
    expect(original.extra!.token).toBe(MAGIC);
    expect(scrubbed.extra!.token).toBe(REDACTED);
    expect(scrubbed).not.toBe(original);
  });

  it('handles a frozen payload without throwing', () => {
    const frozen = Object.freeze({
      request: Object.freeze({ headers: Object.freeze({ Authorization: `Bearer ${JWT}` }) }),
    });
    const scrubbed = scrubSentryEvent(frozen);
    expectNoSecret(scrubbed, JWT);
  });

  it('survives a circular payload and still returns an event', () => {
    const circular: Record<string, unknown> = { extra: { token: MAGIC } };
    circular.self = circular;
    const scrubbed = scrubSentryEvent(circular);
    expect(scrubbed).toBeTruthy();
    expect((scrubbed.extra as Record<string, unknown>).token).toBe(REDACTED);
  });

  it('never returns null for a real payload', () => {
    expect(scrubSentryEvent({ message: 'boom' })).toBeTruthy();
    expect(scrubSentryEvent<SentryEventLike>({}).constructor).toBe(Object);
  });

  it('passes non-object input straight through', () => {
    expect(scrubSentryEvent(null)).toBeNull();
    expect(scrubSentryEvent(undefined)).toBeUndefined();
  });

  it('leaves ordinary diagnostic content intact', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      message: 'Failed to load quote q-123',
      transaction: '/rep/quotes/inbound',
      contexts: { trace: { op: 'navigation', trace_id: 'abc123' } },
    });
    expect(event.message).toBe('Failed to load quote q-123');
    expect(event.transaction).toBe('/rep/quotes/inbound');
    expect(event.contexts!.trace!.trace_id).toBe('abc123');
  });
});
