// scrubSentryEvent / scrubSentrySpan - strip credential material, plus email
// addresses, out of a Sentry payload before it leaves the browser.
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
//  4. IT CAN NEVER THROW, AND IT FAILS AT FIELD GRANULARITY. A throwing
//     beforeSend silently kills error reporting for the whole app, so this
//     never throws. The FIRST version wrapped the whole walk in one try, which
//     meant a single enumerable throwing getter anywhere in the payload
//     returned the entire original event unscrubbed, un-redacting fields that
//     had nothing to do with the failure. Each top-level field is now scrubbed
//     inside its own try:
//       - per FIELD, fail CLOSED: an unreadable or un-scrubbable field is
//         replaced with the marker, never passed through raw. Shipping a raw
//         value is the one outcome this file exists to prevent.
//       - per EVENT, fail OPEN: every other field is still scrubbed and the
//         event still ships. Returning null would drop it and hide the bug.
//     A fail-open is also made VISIBLE rather than silent: the returned event
//     carries a `scrub_failed` tag and the first occurrence logs one warning.
//
// KNOWN GAPS, stated plainly rather than papered over:
//  - Opaque path-segment tokens (/c/:token, /q/:id) are indistinguishable from
//    ordinary path segments and are NOT redacted unless they are JWT-shaped.
//  - Values on class instances (not plain objects or arrays) are returned
//    as-is; Sentry payloads are JSON-shaped, so this is theoretical.
//  - Beyond MAX_DEPTH the value is replaced wholesale rather than inspected.
//  - Email is the only PII shape handled (see EMAIL_RE). Names, phone numbers
//    and addresses have no reliable value shape and are not redacted here, so
//    the call site still has to not attach them.
//  - EMAIL_RE is ASCII-only on both sides of the `@`, so these ship
//    UNREDACTED, measured rather than assumed:
//      jos\u00E9@example.com  (unicode local part, either normalisation - the
//                             realistic one for a kitchen-staff user base, so
//                             treat it as a live gap, not a curiosity)
//      carla@bigfish.k\u00F6ln (unicode domain, PRECOMPOSED and not punycoded)
//      "quoted local"@x.com  (RFC 5321 quoted local part)
//      user@[192.168.0.1]    (bracketed IP domain)
//    A DECOMPOSED unicode domain (`ko` + U+0308 + `ln`) behaves differently
//    from the precomposed one: the combining mark ends the ASCII label, so
//    `carla@bigfish.ko` matches and the tail survives as an orphan mark. The
//    address is destroyed rather than shipped, so that is a mangling, not a
//    leak. All of this is pinned in the tests.
//    Widening the classes is not a free win: it re-opens the backtracking
//    question above, so measure before changing them.
//  - The one OVER-redaction class, owned deliberately: EMAIL_RE cannot tell an
//    address from `name@<digits><letter>.<ext>`, so a retina asset reference
//    such as `logo@2x.png` is replaced whole. This repo ships no such asset
//    today, so it is theoretical, but the next person should not have to
//    rediscover it from a confusing event.
//  - Also over-redacted: `https://admin@host/x`, a bare username with no
//    password, loses its HOST as well as the username, because the match runs
//    through the domain. USERINFO_RE does not fire on it (it requires
//    `user:pass@`), so before EMAIL_RE existed that URL kept its host.

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

/** Object keys that hold a credential value. `cookies?` rather than `^cookie$`
 * so a `cookies` field is blanked too; `Set-Cookie` is covered by the header
 * list above. */
const SENSITIVE_KEY_RE =
  /(authorization|bearer|^cookies?$|token|jwt|passwd|password|secret|api[-_]?key|apikey|credential|signature)/i;

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

/**
 * The same credential-named key, but in a JSON object rather than a query
 * string: `{"token":"abc"}` uses `:` not `=`, so SENSITIVE_PARAM_RE never saw
 * it. A captured POST body arrives at `request.data` exactly like this, either
 * as a real object (handled by the key walk) or already serialized to a string
 * (handled here).
 */
const SENSITIVE_JSON_RE = new RegExp(
  `(["']([^"']*(?:${SENSITIVE_QUERY_PARAMS.join('|')})[^"']*)["']\\s*:\\s*)["'][^"']*["']`,
  'gi',
);

/**
 * Userinfo credentials in a URL: `https://admin:hunter2@host/x`. None of the
 * other patterns touch the `user:pass@host` position, and this shape reaches
 * telemetry through the Referer header. The whole userinfo section goes, not
 * just the password half: a username is the other half of the same credential.
 */
const USERINFO_RE = /(\/\/)[^/\s:@]+:[^/\s@]+@/g;

/** `Bearer <credential>` anywhere in a string (header values, log lines). */
const BEARER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;

/**
 * A bare JWT: three dot-separated base64url segments starting with the `eyJ`
 * that a base64-encoded `{"` always produces. This is the value-shape check
 * that catches a token sitting under a key nobody thought to name, and it also
 * catches a JWT sitting in a path segment.
 */
const JWT_RE = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/g;

/**
 * An email address. Not a credential, so it is the one PII shape this file
 * handles, and it is here for a specific reason: AuthContext used to call
 * Sentry.setUser({ id, email, role }), which put a real user's address into
 * every event this app sent. That call site was fixed, but a field list is a
 * thing people re-add, and event.user.email is not the only route in: a
 * recipient address lands in an exception message ("send failed for
 * chef@place.com"), in a captured POST body, and in a form breadcrumb.
 *
 * Value-shape rather than a key named `email`, for the reason in design note 2,
 * and because a key list would also blank harmless keys such as `emails_sent`.
 * Requires a dotted TLD, so a `user@host` style string with no domain is left
 * alone. Runs AFTER USERINFO_RE, whose replacement leaves `[redacted]@host`
 * with a bracket immediately before the `@`, which this deliberately does not
 * match.
 *
 * THE LOOKBEHIND IS LOAD-BEARING, DO NOT DROP IT. The local-part class
 * contains `.`, so without it the engine restarts the match at every offset of
 * a long unbroken word/dot run and backtracks the whole run each time: no `@`
 * anywhere in the string is needed to trigger it. Measured end to end through
 * redactString on this machine: 'a'.repeat(20000) took 401 ms and
 * 'a.'.repeat(20000) took 1438 ms, against 0.2 ms and 0.4 ms with the
 * lookbehind. That is a synchronous main-thread freeze inside
 * beforeSend, i.e. on the error path, and beforeSendSpan runs per span on 10%
 * of transactions. Prose and stack traces are safe because whitespace breaks
 * the runs, but `extra`, `contexts`, `tags` and `breadcrumbs.data` are NOT
 * length-truncated by Sentry before beforeSend (only `message`, exception
 * values and `request.url` are, at maxValueLength), so an app-attached blob
 * reaches this unbounded. The lookbehind makes a restart inside a run
 * impossible, and the redaction it produces is byte-identical to the naive
 * form. See the timing test in scrubSentryEvent.test.ts.
 */
const EMAIL_RE =
  /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

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
  out = out.replace(USERINFO_RE, (_match, slashes: string) => `${slashes}${REDACTED}@`);
  out = out.replace(EMAIL_RE, REDACTED);
  out = out.replace(BEARER_RE, (_match, scheme: string) => `${scheme} ${REDACTED}`);
  out = out.replace(
    SENSITIVE_PARAM_RE,
    (_match, separator: string, name: string) => `${separator}${name}=${REDACTED}`,
  );
  out = out.replace(SENSITIVE_JSON_RE, (_match, keyPart: string) => `${keyPart}"${REDACTED}"`);
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

/** Tag set on any payload where at least one field could not be scrubbed, so a
 * fail-open is visible in Sentry instead of silent. */
export const SCRUB_FAILED_TAG = 'scrub_failed';

let warnedOnce = false;

/** One warning per page load. A per-event warning would itself become noise (or
 * a console breadcrumb loop) on a payload that fails repeatedly. */
function warnScrubFailureOnce(): void {
  if (warnedOnce) return;
  warnedOnce = true;
  console.warn(
    `[scrubSentryEvent] at least one field could not be scrubbed and was replaced with ${REDACTED}. The event was still sent, tagged ${SCRUB_FAILED_TAG}.`,
  );
}

/** Exported for tests: the warn-once latch is module state. */
export function resetScrubFailureWarning(): void {
  warnedOnce = false;
}

function markFailed(out: Dict): void {
  try {
    const existing = isPlainObject(out.tags) ? out.tags : {};
    out.tags = { ...existing, [SCRUB_FAILED_TAG]: 'true' };
  } catch {
    // Nothing more to do: the warning below is the remaining signal.
  }
}

/**
 * Walks a payload's top-level fields, each inside its own try. See design note
 * 4: per field this fails CLOSED (replaced with the marker), per payload it
 * fails OPEN (the payload still ships).
 *
 * `tagOnFailure` is false for spans, for two reasons, neither of which is
 * "it would be merged into the transaction event". It would not:
 * convertSpanJsonToTransactionEvent (@sentry/core utils/transactionEvent.js
 * :32-55) returns a hard whitelist of type, timestamp, start_timestamp,
 * transaction, contexts.trace and measurements, and never reads span.tags,
 * so an invented tag on the ROOT span is silently discarded. The real
 * reasons are: on the root span the tag is dead weight, and on a CHILD span
 * client.js pushes the whole returned object into processedSpans, so an
 * invented `tags` key would be serialized into a span envelope item whose
 * schema has no such field. Spans get the warning only.
 */
function scrubPayload<T>(payload: T, tagOnFailure: boolean): T {
  try {
    if (!payload || typeof payload !== 'object') return payload;

    const source = payload as unknown as Dict;
    const out: Dict = {};
    let failed = false;

    for (const key of Object.keys(source)) {
      try {
        // Reading the property can itself throw: an enumerable getter that
        // throws is exactly the case that used to un-scrub the whole event.
        const value = source[key];
        out[key] = isSensitiveKey(key) ? REDACTED : scrubValue(value, 1, new WeakSet());
      } catch {
        out[key] = REDACTED;
        failed = true;
      }
    }

    if (failed) {
      if (tagOnFailure) markFailed(out);
      warnScrubFailureOnce();
    }
    return out as T;
  } catch {
    // Even Object.keys failed (an exotic proxy). Last resort only: this is the
    // one path that can still return an unscrubbed payload, so it is loud.
    warnScrubFailureOnce();
    return payload;
  }
}

/**
 * scrubSentryEvent - returns a scrubbed COPY of the payload. Never throws, and
 * a failure inside one field cannot un-redact any other field.
 *
 * Generic in T so callers get their own payload type back: Sentry's
 * beforeSend / beforeSendTransaction / beforeSendSpan each require the exact
 * type they were handed.
 */
export function scrubSentryEvent<T>(event: T): T {
  return scrubPayload(event, true);
}

/**
 * scrubSentrySpan - same walk, named for the beforeSendSpan hook. Spans carry
 * the URL in `description` and in `data['url.full']` / `data['http.url']`,
 * which the string pass handles like any other string.
 */
export function scrubSentrySpan<T>(span: T): T {
  return scrubPayload(span, false);
}
