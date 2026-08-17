import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  scrubSentryEvent,
  scrubSentrySpan,
  redactUrl,
  redactString,
  resetScrubFailureWarning,
  REDACTED,
  SCRUB_FAILED_TAG,
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

  // A JSON body uses ':' not '=', so the query-param pattern never saw it.
  it('redacts a credential in a JSON string body', () => {
    expectNoSecret(redactString(`{"token":"${MAGIC}","quote_id":"q-1"}`));
    expectNoSecret(redactString(`{"refresh_token": "${MAGIC}"}`));
    expect(redactString(`{"token":"${MAGIC}","quote_id":"q-1"}`)).toContain('q-1');
  });

  // Userinfo credentials reach telemetry through the Referer header, and none
  // of the other patterns touch the user:pass@host position.
  it('redacts userinfo credentials in a URL', () => {
    const out = redactString(`https://admin:${MAGIC}@app.quoteme.food/rep/welcome`);
    expectNoSecret(out);
    expect(out).not.toContain('admin:');
    expect(out).toContain('/rep/welcome');
  });
});

// Email is PII, not a credential, and it is scrubbed for a specific reason:
// AuthContext used to call Sentry.setUser({ id, email, role }), which put a
// real address on every event. That call site is fixed; this is the backstop
// that stops it (or any other call site) reintroducing the leak.
describe('email addresses are scrubbed as a backstop', () => {
  const EMAIL = 'carla@bigfish.com';

  it('redacts an email in event.user, the setUser shape', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      user: { id: 'e7b0d3a2-1c44-4f6b-9a2e-88f0d1c2b3a4', email: EMAIL, role: 'rep' },
    });
    expectNoSecret(event, EMAIL);
    // The non-identifying fields survive: the point is grouping without PII.
    expect((event.user as Record<string, unknown>).id).toBe('e7b0d3a2-1c44-4f6b-9a2e-88f0d1c2b3a4');
    expect((event.user as Record<string, unknown>).role).toBe('rep');
  });

  it('redacts an email sitting in an exception message', () => {
    const out = redactString(`Send failed for ${EMAIL} (422)`);
    expectNoSecret(out, EMAIL);
    expect(out).toContain('(422)');
  });

  it('redacts an email in a captured request body and in a breadcrumb', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      request: { data: { recipient_email: EMAIL, quote_id: 'q-1' } },
      breadcrumbs: [{ category: 'ui.input', message: `typed ${EMAIL}` }],
    });
    expectNoSecret(event, EMAIL);
    expect((event.request!.data as Record<string, unknown>).quote_id).toBe('q-1');
  });

  it('redacts an email carried as a query param value', () => {
    const out = redactUrl(`/rep/customers?email=${EMAIL}&page=2`);
    expectNoSecret(out, EMAIL);
    expect(out).toContain('page=2');
  });

  // REGRESSION, and the reason EMAIL_RE carries a lookbehind. The local-part
  // class contains `.`, so the naive form restarts at every offset of a long
  // unbroken word/dot run and backtracks the whole run: 'a.'.repeat(20000)
  // took 1438 ms through redactString, and no `@` anywhere in the string is
  // needed to trigger it.
  // beforeSend runs synchronously on the main thread on the error path, and
  // `extra` / `contexts` / `tags` / `breadcrumbs.data` are not length-truncated
  // by Sentry before it, so an app-attached blob reaches this unbounded.
  //
  // A correctness test cannot see this class of defect, hence a clock. The
  // ceiling is deliberately enormous: the lookbehind form takes under 1 ms here
  // and the quadratic form measured 985 ms in this very test, so anything in
  // between is noise, not a verdict.
  // Timed as the BEST of three runs, which is the statistic that survives a
  // saturated CI box: scheduling can inflate a run but cannot deflate one.
  it('does not backtrack on a long unbroken run (quadratic-blowup guard)', () => {
    const haystack = 'a.'.repeat(20000);

    let best = Infinity;
    for (let i = 0; i < 3; i += 1) {
      const started = performance.now();
      const out = redactString(haystack);
      best = Math.min(best, performance.now() - started);
      // Guards against measuring nothing: there is no address in here, so the
      // string must come back untouched.
      expect(out).toBe(haystack);
    }

    expect(best).toBeLessThan(250);
  });

  // The guard must not have bought speed by missing addresses that appear late
  // in a big payload.
  it('still finds an address after a long run of harmless characters', () => {
    const prefix = 'a.'.repeat(5000);
    const out = redactString(`${prefix} carla@bigfish.com`);
    expectNoSecret(out, 'carla@bigfish.com');
    expect(out).toContain(prefix);
  });

  it('leaves non-email at-strings and email-ish counters alone', () => {
    // No dotted TLD: a package spec or a bare user@host is not an address.
    expect(redactString('@sentry/react@10.1.0')).toContain('@sentry/react');
    // Key-name matching would have blanked this; value-shape matching does not.
    const event = scrubSentryEvent<SentryEventLike>({ extra: { emails_sent: 3 } });
    expect(event.extra!.emails_sent).toBe(3);
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

// These tests ASSERT THE LEAK. They exist so the gaps live in executable form
// rather than in a header comment that decays, and so that anyone who closes
// one of them gets a failing test telling them to update the documented limits
// instead of silently believing the scrubber is total. An OPAQUE token has no
// pattern to match: it is indistinguishable from a quote id or a slug. Closing
// these requires route-pattern awareness or not putting tokens there, not a
// better regex.
describe('scrubSentryEvent: KNOWN GAPS, pinned deliberately', () => {
  const OPAQUE = 'abc123opaquetoken';

  it('does NOT catch an opaque token under an innocuous key', () => {
    const event = scrubSentryEvent<SentryEventLike>({ extra: { blob: OPAQUE } });
    expect(event.extra!.blob).toBe(OPAQUE);
  });

  it('does NOT catch an opaque token in a path segment (/c/:token)', () => {
    const event = scrubSentryEvent<SentryEventLike>({
      request: { url: `https://app.quoteme.food/c/${OPAQUE}` },
      transaction: `/c/${OPAQUE}`,
    });
    expect(event.request!.url).toContain(OPAQUE);
    expect(event.transaction).toContain(OPAQUE);
  });

  it('does NOT catch an opaque value in event.user.id', () => {
    const event = scrubSentryEvent<SentryEventLike>({ user: { id: OPAQUE, role: 'chef' } });
    expect((event.user as Record<string, unknown>).id).toBe(OPAQUE);
  });

  it('does NOT walk values on a class instance', () => {
    class Holder {
      constructor(public token: string) {}
    }
    const event = scrubSentryEvent<SentryEventLike>({ extra: { held: new Holder(MAGIC) } });
    expect((event.extra!.held as Holder).token).toBe(MAGIC);
  });

  // EMAIL_RE is ASCII on both sides of the @. The unicode local part is the
  // realistic miss for a kitchen-staff user base, so it is pinned rather than
  // left to be discovered from a shipped address.
  //
  // Written with explicit \u escapes because the behaviour depends on unicode
  // NORMALISATION and an editor can silently rewrite one form into the other.
  // Both forms of the local part are missed. The domain is missed only when
  // PRECOMPOSED; the decomposed case below behaves differently.
  it.each([
    ['unicode local part, precomposed', 'jos\u00E9@example.com'],
    ['unicode local part, decomposed', 'jose\u0301@example.com'],
    ['unicode domain, precomposed', 'carla@bigfish.k\u00F6ln'],
    ['quoted local part', '"quoted local"@example.com'],
    ['bracketed IP domain', 'user@[192.168.0.1]'],
  ])('does NOT redact an email with a %s', (_label, address) => {
    expect(redactString(address)).toBe(address);
  });

  // A DECOMPOSED unicode domain is not a clean miss like the others: the
  // combining mark ends the ASCII label early, so `carla@bigfish.ko` matches
  // and the tail survives as an orphan mark. Not a privacy hole (the address is
  // destroyed rather than shipped), but the output is mangled, and this is the
  // shape a reader would otherwise assume behaves like the precomposed case.
  it('PARTIALLY redacts a decomposed unicode domain, leaving a mangled tail', () => {
    expect(redactString('carla@bigfish.ko\u0308ln')).toBe(`${REDACTED}\u0308ln`);
  });

  // The only OVER-redaction class, owned deliberately: a retina asset
  // reference is shaped exactly like an address. No such asset exists in this
  // repo today.
  it('DOES over-redact a logo@2x.png style asset reference', () => {
    expect(redactString('logo@2x.png')).toBe(REDACTED);
  });

  // A bare username with no password: USERINFO_RE requires `user:pass@` and so
  // never fires, and EMAIL_RE runs on through the domain, so the host is lost
  // too. Before EMAIL_RE existed this URL kept its host.
  it('DOES lose the host of a bare-username URL', () => {
    expect(redactString('https://admin@host.example.com/x')).toBe(`https://${REDACTED}/x`);
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

  // The granularity bug: one throwing getter used to return the WHOLE original
  // event unscrubbed, un-redacting fields unrelated to the failure.
  describe('a throwing getter cannot un-scrub the rest of the event', () => {
    beforeEach(() => {
      resetScrubFailureWarning();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function eventWithThrowingField(): Record<string, unknown> {
      const event: Record<string, unknown> = {
        message: `failed on /chef/welcome?token=${MAGIC}`,
        request: { headers: { Authorization: `Bearer ${JWT}` } },
      };
      Object.defineProperty(event, 'extra', {
        enumerable: true,
        get() {
          throw new Error('exploding getter');
        },
      });
      return event;
    }

    it('still redacts every other field', () => {
      const scrubbed = scrubSentryEvent(eventWithThrowingField());
      expectNoSecret(scrubbed);
      expectNoSecret(scrubbed, JWT);
      expect(scrubbed.message).toBe(`failed on /chef/welcome?token=${REDACTED}`);
    });

    it('replaces the unreadable field rather than passing it through', () => {
      const scrubbed = scrubSentryEvent(eventWithThrowingField());
      expect(scrubbed.extra).toBe(REDACTED);
    });

    it('makes the fail-open visible with a tag and one warning', () => {
      const scrubbed = scrubSentryEvent(eventWithThrowingField()) as {
        tags?: Record<string, string>;
      };
      expect(scrubbed.tags?.[SCRUB_FAILED_TAG]).toBe('true');
      expect(console.warn).toHaveBeenCalledTimes(1);

      // Warn-once: a repeatedly failing payload must not become console noise.
      scrubSentryEvent(eventWithThrowingField());
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('does not tag a span, which has no tags field', () => {
      const span: Record<string, unknown> = { description: 'GET /x' };
      Object.defineProperty(span, 'data', {
        enumerable: true,
        get() {
          throw new Error('exploding getter');
        },
      });
      const scrubbed = scrubSentrySpan(span);
      expect(scrubbed.tags).toBeUndefined();
      expect(scrubbed.data).toBe(REDACTED);
    });

    it('never throws, whatever the payload does', () => {
      expect(() => scrubSentryEvent(eventWithThrowingField())).not.toThrow();
    });
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
