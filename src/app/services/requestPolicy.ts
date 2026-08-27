// One request policy for both API clients.
//
// WHY THIS EXISTS. Neither client had a timeout. `fetch()` has no default one,
// so a request that never settles never settles: the promise stays pending, the
// caller's `finally` never runs, and the spinner spins forever with nothing left
// to clear it. That is the mechanism behind "Ingestion Rules stuck loading", and
// it was never an admin-page defect. It was the data layer, on every surface.
//
// The two clients had drifted apart:
//   api.ts       (rep + chef)  retry: yes, network-class, safe methods only
//                              timeout: NO
//   adminApi.ts  (admin)       retry: no
//                              timeout: NO
// api.ts's retry rule is careful and correct and is preserved verbatim here.
// adminApi.ts had nothing and now inherits the same policy. One implementation.
//
// ─── THE RULE THAT MATTERS ───────────────────────────────────────────────────
//
// A TIMED-OUT MUTATION IS **UNKNOWN**, NOT FAILED.
//
// When a POST/PATCH/PUT/DELETE times out client-side, the request may already
// have reached the server and been processed; we simply stopped waiting for the
// answer. Telling the user it failed invites them to do it again, and "failed"
// on a send that actually succeeded is how a chef gets two quotes.
//
// So a mutation timeout is NEVER retried, and its copy never claims failure. It
// says the outcome is unknown and tells the user to check before retrying. This
// is the same reasoning as the BUG #28 no-retry-on-mutation rule below, applied
// to the timeout path instead of the network-failure path.
//
// ─────────────────────────────────────────────────────────────────────────────

// Default ceiling for an ordinary request.
export const DEFAULT_TIMEOUT_MS = 30_000;

// Ceiling for the model-backed endpoints. These call Claude server-side and are
// legitimately slow; 30s would abort work that was going to succeed.
export const SLOW_TIMEOUT_MS = 120_000;

// ENUMERATED, NOT PATTERN-MATCHED. A substring match like /matching-engine/
// would silently grant a 2-minute budget to every future endpoint under that
// prefix, including cheap ones, and nobody would notice. Adding a slow endpoint
// should be a visible edit to this list.
export const SLOW_ENDPOINTS: readonly string[] = [
  '/api/v1/admin/matching-engine/chat',
  '/api/v1/admin/matching-engine/teach',
  '/api/v1/admin/matching-engine/teach-preview',
  '/api/v1/admin/matching-engine/teach-apply',
  '/api/v1/admin/matching-engine/teach-undo',
  '/api/v1/admin/matching-engine/catalog-reclassify',
  '/api/v1/admin/matching-engine/catalog-bulk-update',
  '/api/v1/admin/conference-leads/ocr',
];

export function timeoutForEndpoint(url: string): number {
  return SLOW_ENDPOINTS.some((e) => url.includes(e)) ? SLOW_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

const NETWORK_RETRY_DELAY_MS = 600;

export const NETWORK_FAILURE_MESSAGE =
  "That didn't go through, give it a second and try again.";

// Safe methods only. The request was read-only, so nothing happened server-side
// and "try again" is honest advice.
export const TIMEOUT_READ_MESSAGE =
  'That took too long to load. Try again.';

// Mutations. Deliberately does NOT say failed. See the rule above.
export const TIMEOUT_MUTATION_MESSAGE =
  'We lost the connection before we heard back, so this may or may not have gone through. Check before trying again.';

export class NetworkFetchFailedError extends Error {}
export class RequestTimedOutError extends Error {}

// The Fetch API only rejects for network-level failures (connection refused,
// DNS, CORS block, offline). Those surface as a TypeError. HTTP error responses
// resolve normally and never reach here.
function isNetworkFetchFailure(error: unknown): boolean {
  return error instanceof TypeError;
}

// An abort is NOT a TypeError. `AbortSignal.timeout()` rejects with a
// DOMException named 'TimeoutError'; a manual controller aborts with
// 'AbortError'. Without this branch an abort falls through the network-failure
// check and the raw DOMException message reaches the user, which reads as
// "signal is aborted without reason".
function isAbortLike(error: unknown): boolean {
  return (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

// BUG #28: a network-level failure tells the client nothing about whether the
// request reached the server. For a mutating verb that is a real risk: if the
// connection drops AFTER the server processed the request (a Railway instance
// swap cutting the response mid-flight), the action already took effect. Retrying
// silently re-fires a non-idempotent action, which is the "chef gets the quote
// twice" class of bug, and it lives below every call site's own in-flight guard.
function isSafeRetryableMethod(method?: string): boolean {
  const normalized = (method || 'GET').toUpperCase();
  return normalized === 'GET' || normalized === 'HEAD' || normalized === 'OPTIONS';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Combines our timeout with any signal the caller already supplied, so passing
// one keeps working rather than being silently overridden. No caller does today;
// this is here so the first one does not have to rediscover the interaction.
function signalFor(init: RequestInit | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  const caller = init?.signal;
  if (!caller) return timeout;
  return typeof AbortSignal.any === 'function'
    ? AbortSignal.any([caller, timeout])
    : timeout;
}

/**
 * Single entry point for both clients. Applies the timeout, then the
 * retry-once-on-network-failure rule for safe methods only.
 *
 * Throws NetworkFetchFailedError or RequestTimedOutError, both carrying
 * plain-language copy in `.message`. Callers whose catch blocks already do
 * `error instanceof Error ? error.message : 'Network error'` pick that up with
 * no change.
 */
export async function fetchWithPolicy(input: string, init?: RequestInit): Promise<Response> {
  const timeoutMs = timeoutForEndpoint(input);
  const retryable = isSafeRetryableMethod(init?.method);

  const attempt = () => fetch(input, { ...init, signal: signalFor(init, timeoutMs) });

  try {
    return await attempt();
  } catch (firstError) {
    if (isAbortLike(firstError)) {
      // A read that timed out is safe to repeat, so give it exactly one more
      // chance before surfacing. A mutation gets none, and gets the
      // outcome-unknown copy rather than a failure claim.
      if (!retryable) throw new RequestTimedOutError(TIMEOUT_MUTATION_MESSAGE);
      try {
        return await attempt();
      } catch (secondError) {
        if (isAbortLike(secondError)) throw new RequestTimedOutError(TIMEOUT_READ_MESSAGE);
        if (isNetworkFetchFailure(secondError)) throw new NetworkFetchFailedError(NETWORK_FAILURE_MESSAGE);
        throw secondError;
      }
    }

    if (!isNetworkFetchFailure(firstError)) throw firstError;
    if (!retryable) throw new NetworkFetchFailedError(NETWORK_FAILURE_MESSAGE);

    await delay(NETWORK_RETRY_DELAY_MS);
    try {
      return await attempt();
    } catch (secondError) {
      if (isAbortLike(secondError)) throw new RequestTimedOutError(TIMEOUT_READ_MESSAGE);
      if (!isNetworkFetchFailure(secondError)) throw secondError;
      throw new NetworkFetchFailedError(NETWORK_FAILURE_MESSAGE);
    }
  }
}
