// @vitest-environment node
//
// Forced to node (the app-wide vitest.config.js default is jsdom, for the
// RTL/jest-dom E2E walk): jsdom defines a non-configurable global
// XMLHttpRequest, so `global.XMLHttpRequest = ...` below throws
// "Cannot assign to read only property" under jsdom. This file needs no
// DOM at all - it is pure state (offlinePairing.js) - so node is both
// correct and the only environment this specific network-blocking trick
// works in.
/**
 * State (e), the actual proof: with every network primitive this test
 * process could plausibly reach for made to throw, pairing a dish against
 * an already-loaded wine list still returns 3 offerings.
 *
 * Two scenarios, both with the network blocked for the whole file:
 *   1. The tab had signal once (GET /v1/rules/bundle already succeeded,
 *      packages/pairing's cache is warm) - the realistic NO SIGNAL case.
 *   2. The tab never had signal at all (a cold offline install) - proves
 *      the fallback baked into offlinePairing.js at build time also holds.
 *
 * `loadRulesBundle(fn)` in scenario 1 is primed with a plain function that
 * hands back local data directly; it never itself calls fetch, so warming
 * the cache this way does not smuggle a network call past the block below.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadRulesBundle,
  clearRulesBundleCache,
} from '../../../../packages/pairing/src/index.js';
import { loadLocalBundle } from '../../../../packages/pairing/src/loadLocalTables.js';
import { pairOffline, hasServerRulesBundle } from './offlinePairing.js';
import { STUB_ALREADY_LOADED_WINE_ROWS, STUB_DISH_ALREADY_CHOSEN } from '../states/stubs.js';

let originalFetch;
let originalXHR;

beforeAll(async () => {
  clearRulesBundleCache();
  await loadRulesBundle(() => Promise.resolve({ version: 1, ...loadLocalBundle() }));

  // Kill the network for the rest of this file. Any code path that reaches
  // for fetch or XMLHttpRequest from here on fails the test loudly instead
  // of silently succeeding because a test runner happens to have real
  // network access.
  originalFetch = global.fetch;
  originalXHR = global.XMLHttpRequest;
  global.fetch = () => {
    throw new Error('NO SIGNAL test: fetch() was called - this must not happen offline');
  };
  global.XMLHttpRequest = function XMLHttpRequestBlockedForNoSignalTest() {
    throw new Error('NO SIGNAL test: XMLHttpRequest was constructed - this must not happen offline');
  };
});

afterAll(() => {
  global.fetch = originalFetch;
  global.XMLHttpRequest = originalXHR;
  clearRulesBundleCache();
});

describe('NO SIGNAL: pairing works with fetch/XHR fully blocked', () => {
  it('returns 3 offerings using the already-cached rules bundle', () => {
    expect(hasServerRulesBundle()).toBe(true);

    const result = pairOffline(
      STUB_DISH_ALREADY_CHOSEN.name,
      STUB_DISH_ALREADY_CHOSEN.components,
      STUB_ALREADY_LOADED_WINE_ROWS,
      { n: 3 }
    );

    expect(result.usedFallbackTables).toBe(false);
    expect(result.picks).toHaveLength(3);
    for (const pick of result.picks) {
      expect(typeof pick.wine.label).toBe('string');
      expect(pick.wine.label.length).toBeGreaterThan(0);
      expect(['house', 'suited', 'crowd']).toContain(pick.slot);
    }
    // Distinct grapes (pair()'s discovery mechanic), so this is 3 genuinely
    // different offerings, not the same bottle three times.
    const grapes = new Set(result.picks.map((p) => p.wine.grape_head));
    expect(grapes.size).toBe(3);
  });

  it('still returns 3 offerings on a cold install that never had signal', () => {
    clearRulesBundleCache();
    expect(hasServerRulesBundle()).toBe(false);

    const result = pairOffline(
      STUB_DISH_ALREADY_CHOSEN.name,
      STUB_DISH_ALREADY_CHOSEN.components,
      STUB_ALREADY_LOADED_WINE_ROWS,
      { n: 3 }
    );

    expect(result.usedFallbackTables).toBe(true);
    expect(result.picks).toHaveLength(3);
  });
});
