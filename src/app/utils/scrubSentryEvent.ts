// scrubSentryEvent - strip credential material out of a Sentry event before
// it leaves the browser.
//
// Sentry's beforeSend used to be a pure no-op gate on the DSN, so anything
// that happened to be attached to an event (an Authorization header on a
// captured request, a magic-link URL in a navigation breadcrumb, a token in
// an `extra`) shipped verbatim to the Sentry project. Console logging was the
// loud version of that leak; telemetry is the quiet one.
//
// Three things get redacted:
//   1. Sensitive request headers, by name (Authorization, Cookie,
//      X-Guest-Token, X-CSRF-Token).
//   2. Sensitive query parameters in any URL-bearing field (request URL and
//      query string, plus breadcrumb url/to/from). This is what catches the
//      chef and rep magic links and the invite-accept links, all of which
//      carry the credential in `?token=`.
//   3. Any key in `extra` / `contexts` whose NAME looks like a credential.
//
// Values are replaced with a fixed marker, never truncated: a prefix of a
// token is still credential material and still identifies the holder.

export const REDACTED = '[redacted]';

/** Header names whose value is a credential. Compared case-insensitively. */
export const SENSITIVE_HEADER_NAMES = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-guest-token',
  'x-csrf-token',
];

/** Query parameter names whose value is a credential. */
export const SENSITIVE_QUERY_PARAMS = [
  'token',
  'jwt',
  'access_token',
  'refresh_token',
  'id_token',
  'invite_token',
  'invitation_token',
  'guest_token',
  'reset_password_token',
  'confirmation_token',
  'password',
  'api_key',
  'apikey',
  'secret',
];

/** Matches object keys that hold a credential value. */
const SENSITIVE_KEY_RE =
  /(authorization|bearer|^cookie$|token|jwt|password|passwd|secret|api[-_]?key|credential)/i;

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

/**
 * redactUrl - replace the value of every sensitive query parameter in `url`
 * with the redaction marker, leaving the path and the harmless params intact
 * so the event is still diagnosable. Works on absolute URLs and on bare
 * paths ("/chef/welcome?token=abc"), and leaves a string it cannot parse
 * alone apart from a regex fallback pass.
 */
export function redactUrl(url: string): string {
  if (!url || !/[?&#]/.test(url)) return url;

  const applyToSearch = (search: string): string => {
    const params = new URLSearchParams(search);
    let touched = false;
    for (const name of Array.from(params.keys())) {
      if (SENSITIVE_QUERY_PARAMS.includes(name.toLowerCase())) {
        params.set(name, REDACTED);
        touched = true;
      }
    }
    return touched ? params.toString() : search;
  };

  // Split off the fragment, then the query, without needing a base URL.
  const hashAt = url.indexOf('#');
  const fragment = hashAt >= 0 ? url.slice(hashAt) : '';
  const withoutFragment = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = withoutFragment.indexOf('?');

  let result = withoutFragment;
  if (queryAt >= 0) {
    const head = withoutFragment.slice(0, queryAt);
    const search = withoutFragment.slice(queryAt + 1);
    result = `${head}?${applyToSearch(search)}`;
  }

  // Fragment-carried tokens (hash routing) get the same treatment.
  let redactedFragment = fragment;
  if (fragment.includes('=')) {
    const fragmentQueryAt = fragment.indexOf('?');
    if (fragmentQueryAt >= 0) {
      redactedFragment = `${fragment.slice(0, fragmentQueryAt)}?${applyToSearch(
        fragment.slice(fragmentQueryAt + 1),
      )}`;
    } else {
      redactedFragment = `#${applyToSearch(fragment.slice(1))}`;
    }
  }

  return `${result}${redactedFragment}`;
}

function redactKeyedValues(source: Dict): Dict {
  const out: Dict = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = SENSITIVE_KEY_RE.test(key) ? REDACTED : value;
  }
  return out;
}

/**
 * scrubSentryEvent - returns the event with credential material redacted.
 * Safe to call on a partial or unexpected event shape: anything it does not
 * recognise is passed through untouched.
 */
export function scrubSentryEvent<T>(event: T): T {
  if (!event || typeof event !== 'object') return event;

  // Generic in T so callers get their own event type back (Sentry's beforeSend
  // must return the exact event type it was handed). The scrub itself works
  // against the structural subset it understands.
  const target = event as unknown as SentryEventLike;

  if (target.request) {
    const request = target.request;

    if (request.headers && typeof request.headers === 'object') {
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(request.headers)) {
        headers[name] = SENSITIVE_HEADER_NAMES.includes(name.toLowerCase())
          ? REDACTED
          : value;
      }
      request.headers = headers;
    }

    if (typeof request.url === 'string') {
      request.url = redactUrl(request.url);
    }

    if (typeof request.query_string === 'string') {
      request.query_string = redactUrl(`?${request.query_string}`).replace(/^\?/, '');
    } else if (request.query_string && typeof request.query_string === 'object') {
      request.query_string = redactKeyedValues(request.query_string as Dict);
    }

    if (request.data && typeof request.data === 'object' && !Array.isArray(request.data)) {
      request.data = redactKeyedValues(request.data as Dict);
    }
  }

  if (Array.isArray(target.breadcrumbs)) {
    for (const crumb of target.breadcrumbs) {
      if (!crumb || typeof crumb !== 'object') continue;
      if (typeof crumb.message === 'string') {
        crumb.message = redactUrl(crumb.message);
      }
      if (crumb.data && typeof crumb.data === 'object') {
        const data = crumb.data as Dict;
        for (const field of ['url', 'to', 'from']) {
          if (typeof data[field] === 'string') {
            data[field] = redactUrl(data[field] as string);
          }
        }
        crumb.data = redactKeyedValues(data);
      }
    }
  }

  if (target.extra && typeof target.extra === 'object') {
    target.extra = redactKeyedValues(target.extra);
  }

  if (target.contexts && typeof target.contexts === 'object') {
    for (const [name, ctx] of Object.entries(target.contexts)) {
      if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
        target.contexts[name] = redactKeyedValues(ctx as Dict);
      }
    }
  }

  return event;
}
