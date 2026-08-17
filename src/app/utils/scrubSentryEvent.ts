// scrubSentryEvent / scrubSentrySpan - strip credential material out of a
// Sentry payload before it leaves the browser.
//
// Sentry's beforeSend used to be a pure no-op gate on the DSN, so anything
// attached to an event (an Authorization header, a magic-link URL in a
// navigation breadcrumb, a token in an `extra`) shipped verbatim. Console
// logging was the loud version of that leak; telemetry is the quiet one.
//
// DESIGN NOTES, all four of them learned from a verification pass that broke
// the first version of this file:
//
//  1. WHOLE-PAYLOAD WALK, NOT A FIELD LIST. The first version enumerated
//     request.headers, request.url, breadcrumbs, extra and contexts. Everything
//     it did not enumerate shipped raw: event.message, event.transaction,
//     exception.values[].value, spans[].description, event.user.id,
//     crumb.data.href. A recursive walk over the entire payload is the only
//     shape that does not lose that race.
//
//  2. VALUES, NOT JUST KEY NAMES. Matching key names alone missed the `Referer`
//     header, which httpContextIntegration sets on EVERY event and which holds
//     the full previous URL. Navigate away from /chef/welcome?token=... and the
//     next error shipped the magic link. Every string is now pattern-matched:
//     token-ish query params, `Bearer x`, and bare JWTs.
//
//  3. NON-MUTATING. The first version assigned into the event it was handed and
//     threw "Cannot assign to read only property" on a frozen event. This one
//     builds a new structure, so a frozen payload is fine.
//
//  4. IT CAN NEVER THROW. A throwing beforeSend silently kills error reporting
//     for the whole app. Everything is wrapped, and the catch returns the
//     ORIGINAL payload. That is a deliberate trade: a scrubber bug degrades to
//     "unscrubbed telemetry", never to "no telemetry". Returning null here
//     would drop the event entirely and hide the outage.
//
// KNOWN GAPS, stated plainly rather than papered over:
//  - Opaque path-segment tokens (/c/:token, /q/:id) are indistinguishable from
//    ordinary path segments and are NOT redacted unless they are JWT-shaped.
//  - Values on class instances (not plain objects or arrays) are returned
//    as-is; Sentry payloads are JSON-shaped, so this is theoretical.
//  - Beyond MAX_DEPTH the value is replaced wholesale rather than inspected.

export const REDACTED = '[redacted]';

/** Deepest nesting inspected. Anything deeper is replaced, not inspected. */
const MAX_DEPTH = 8;

/**
 * Header names whose value is a credential outright. Compared
 * case-insensitively. `Referer` is deliberately NOT here: its value is a URL,
 * and it is handled by the string pass, which keeps the useful path and drops
 * only the token.
 */
export const SENSITIVE_HEADER_NAMES = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-guest-token',
  'x-csrf-token',
  'x-auth-token',
  'x-api-key',
];

/** Query parameter names whose value is a credential. Substring matched, so
 * access_token / invite_token / guest_token are all covered by "token". */
export const SENSITIVE_QUERY_PARAMS = [
  'token',
  'jwt',
  'passwd',
  'password',
  'secret',
  'credential',
  'api_key',
  'apikey',
  'auth',
  'session',
  'signature',
];

/** Object keys that hold a credential value. */
const SENSITIVE_KEY_RE =
  /(authorization|bearer|^cookie$|token|jwt|passwd|password|secret|api[-_]?key|apikey|credential|signature)/i;

/**
 * A `name=value` pair whose NAME contains a credential word, anywhere in a
 * string: a real URL, a bare query string, or free text such as a breadcrumb
 * message or an exception message ("401 for token=abc"). Only the value is
 * replaced, so the surrounding text and the harmless params survive and the
 * event stays diagnosable.
 *
 * The leading separator class includes whitespace deliberately. Restricting it
 * to [?&#] missed `token=abc` sitting in an exception's `value` string, which
 * is exactly where a failed-auth message puts it.
 */
const SENSITIVE_PARAM_RE = new RegExp(
  `(^|[?&#\\s;,(\\[])([^?&#=\\s]*(?:${SENSITIVE_QUERY_PARAMS.join('|')})[^?&#=\\s]*)=([^&#\\s"'<>)\\]]*)`,
  'gi',
);

/** `Bearer <credential>` anywhere in a string (header values, log lines). */
const BEARER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;

/**
 * A bare JWT: three dot-separated base64url segments starting with the `eyJ`
 * that a base64-encoded `{"` always produces. This is the value-shape check
 * that catches a token sitting under a key nobody thought to name, and it also
 * catches a JWT sitting in a path segment.
 */
const JWT_RE = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/g;

type Dict = Record<string, unknown>;

interface BreadcrumbLike {
  data?: Dict;
  [key: string]: unknown;
}

export interface SentryEventLike {
  request?: {
    headers?: Record<string, string>;
    url?: string;
    query_string?: unknown;
    data?: unknown;
    [key: string]: unknown;
  };
  breadcrumbs?: BreadcrumbLike[];
  extra?: Dict;
  contexts?: Record<string, Dict | undefined>;
  [key: string]: unknown;
}

function isPlainObject(value: unknown): value is Dict {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_RE.test(key) || SENSITIVE_HEADER_NAMES.includes(key.toLowerCase());
}

/**
 * redactString - the value-shape pass. Replaces credential-valued query
 * params, `Bearer x`, and bare JWTs wherever they appear in a string, leaving
 * everything else intact.
 */
export function redactString(value: string): string {
  if (!value) return value;
  let out = value;
  if (JWT_RE.test(out)) {
    JWT_RE.lastIndex = 0;
    out = out.replace(JWT_RE, REDACTED);
  }
  JWT_RE.lastIndex = 0;
  out = out.replace(BEARER_RE, (_match, scheme: string) => `${scheme} ${REDACTED}`);
  out = out.replace(
    SENSITIVE_PARAM_RE,
    (_match, separator: string, name: string) => `${separator}${name}=${REDACTED}`,
  );
  return out;
}

/**
 * redactUrl - redactString under the name the URL-bearing call sites use.
 * Works on absolute URLs, bare paths, bare query strings, and URLs embedded in
 * free text. Preserves the path and any harmless params.
 */
export function redactUrl(url: string): string {
  return redactString(url);
}

function scrubValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;

  // A cycle would otherwise recurse forever. Sentry payloads are acyclic in
  // practice, but a user-attached `extra` is arbitrary application data.
  if (seen.has(value)) return '[circular]';

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return REDACTED;
    seen.add(value);
    const out = value.map((item) => scrubValue(item, depth + 1, seen));
    seen.delete(value);
    return out;
  }

  if (isPlainObject(value)) {
    if (depth >= MAX_DEPTH) return REDACTED;
    seen.add(value);
    const out: Dict = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = isSensitiveKey(key) ? REDACTED : scrubValue(child, depth + 1, seen);
    }
    seen.delete(value);
    return out;
  }

  // Dates, Errors, class instances: not JSON-shaped, left alone.
  return value;
}

/**
 * scrubSentryEvent - returns a scrubbed COPY of the payload. Never throws, and
 * on any internal failure returns the original payload rather than null, so a
 * bug here can never take error reporting offline.
 *
 * Generic in T so callers get their own payload type back: Sentry's
 * beforeSend / beforeSendTransaction / beforeSendSpan each require the exact
 * type they were handed.
 */
export function scrubSentryEvent<T>(event: T): T {
  try {
    if (!event || typeof event !== 'object') return event;
    return scrubValue(event, 0, new WeakSet()) as T;
  } catch {
    return event;
  }
}

/**
 * scrubSentrySpan - same walk, named for the beforeSendSpan hook. Spans carry
 * the URL in `description` and in `data['url.full']` / `data['http.url']`,
 * which the string pass handles like any other string.
 */
export function scrubSentrySpan<T>(span: T): T {
  return scrubSentryEvent(span);
}
