/**
 * Rules bundle cache loader. See PairMe API Contract v1, section on
 * GET /v1/rules/bundle?since_version=<int>:
 *   - since_version matches the current server version -> 304, no body,
 *     keep using the cached bundle.
 *   - otherwise -> 200 with { version, tables, checksum }, replace the cache.
 *
 * Deliberately decoupled from any HTTP client: pass a `fetchBundle(sinceVersion)`
 * function that performs the request and resolves to either `{ status: 304 }`
 * or the fresh bundle object. That keeps this package free of fetch/base-url
 * concerns, which live in apps/pairme/src/lib/api.js.
 *
 * The cache lives in memory only, for the lifetime of the tab. It is never
 * written to localStorage: the anon_id is the one thing this app persists
 * across sessions, per the PairMe identity rule.
 */
let cached = null;

export async function loadRulesBundle(fetchBundle) {
  const sinceVersion = cached ? cached.version : undefined;
  const result = await fetchBundle(sinceVersion);
  if (result && result.status === 304) {
    // Server says nothing changed; keep whatever we already have (which may
    // still be null if this is the very first call and the server somehow
    // returned 304 with no prior version, an edge case that should not
    // happen in practice).
    return cached;
  }
  cached = result;
  return cached;
}

export function getCachedRulesBundle() {
  return cached;
}

export function clearRulesBundleCache() {
  cached = null;
}
