/**
 * NO-SIGNAL step (LANE E requirement): with all network blocked, pairing
 * must still return three offerings via the client packages/pairing engine.
 *
 * Two things are proven here, deliberately kept separate:
 *
 *   1. api.js's real network path (POST /v1/pair via fetch) fails the way
 *      the contract says it should when there is truly no connection:
 *      ApiError('NETWORK_ERROR', ...), never an unhandled rejection or a
 *      silent hang. This is EXISTING, already-correct behaviour in
 *      src/lib/api.js - proven here, not written here.
 *
 *   2. packages/pairing (scoring.js/directions.js/roles.js) never touches
 *      fetch/XHR at all - grep confirms zero network references in that
 *      package - so calling it directly with the local demo wine list still
 *      produces a full three-offering result while `global.fetch` is
 *      poisoned to always reject. That is the "still returns three
 *      offerings" guarantee the no-signal step is asking for.
 *
 * TODO(A)/TODO(C): today TheWine.jsx does NOT call into packages/pairing at
 * all when POST /v1/pair fails or 404s (state.js's s===10 cta handler just
 * falls through to go(11) and TheWine.jsx renders Desi's hardcoded
 * `offerSet`, not a real offline computation - see the TODO comment right
 * above `offerTitle` in state.js). Once Lane A/C wires TheWine's no-signal
 * fallback to actually call packages/pairing (rather than a hardcoded
 * demo array), promote the skipped UI-level test at the bottom of this file
 * from `it.skip` to `it`.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { buildTables } from '../../../../packages/pairing/src/tables.js';
import { loadLocalBundle } from '../../../../packages/pairing/src/loadLocalTables.js';
import { DEMO, SELFTEST } from '../../../../packages/pairing/src/demoFixtures.js';
import { pair, courseItOut, oneBottle } from '../../../../packages/pairing/src/index.js';
import { labelPicks } from '../../../../packages/pairing/src/roles.js';
import { ApiError, pair as apiPair, ensureSession } from '../../src/lib/api.js';

let T;
let originalFetch;

beforeAll(() => {
  T = buildTables(loadLocalBundle());
});

beforeEach(() => {
  originalFetch = global.fetch;
  // Simulate a total network outage: every fetch rejects the way a real
  // offline device does (TypeError: Failed to fetch / NetworkError), not a
  // 4xx/5xx response. This is what api.js's own catch(networkErr) branch is
  // written for.
  global.fetch = () => Promise.reject(new TypeError('simulated network outage: no signal'));
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('no-signal: api.js surfaces a clean NETWORK_ERROR (does not hang or throw raw)', () => {
  it('ensureSession() rejects with ApiError NETWORK_ERROR when fetch is unreachable', async () => {
    await expect(ensureSession()).rejects.toBeInstanceOf(ApiError);
    await expect(ensureSession()).rejects.toMatchObject({ errorCode: 'NETWORK_ERROR' });
  });

  it('pair() (POST /v1/pair) rejects with ApiError NETWORK_ERROR, not a raw fetch TypeError', async () => {
    let caught;
    try {
      await apiPair({ dish_ids: ['e6'], wine_list_id: null, profile_id: null, direction: 'course_it_out' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.errorCode).toBe('NETWORK_ERROR');
  });
});

describe('no-signal: the client pairing engine (packages/pairing) still returns three offerings', () => {
  it('pair() for a single dish returns 3 labeled picks with fetch fully poisoned', () => {
    const [name, components] = SELFTEST.find(([n]) => n === 'Chicken roti');
    const res = pair(name, components, DEMO, T);
    const labeled = labelPicks(res.picks);

    expect(labeled).toHaveLength(3);
    for (const pick of labeled) {
      expect(['house', 'suited', 'crowd']).toContain(pick.slot);
      expect(pick.label).toBeTruthy();
      expect(pick.wine.label).toBeTruthy();
    }
    // Deterministic: re-running with the exact same inputs (still no
    // network) gives the exact same three wines in the exact same order -
    // "the same dish + wine list always produces the same ranked picks"
    // (scoring.js's own module docstring).
    const res2 = pair(name, components, DEMO, T);
    expect(labelPicks(res2.picks).map((p) => p.wine.label)).toEqual(labeled.map((p) => p.wine.label));
  });

  it('courseItOut() (the direction the app defaults to) returns 3 labeled offerings per dish across a multi-dish table', () => {
    const dishes = SELFTEST.slice(0, 2).map(([name, components]) => ({ name, components }));
    const results = courseItOut(dishes, DEMO, T);
    expect(results).toHaveLength(2);
    for (const dishResult of results) {
      expect(dishResult.picks).toHaveLength(3);
      expect(dishResult.picks.map((p) => p.slot)).toEqual(['house', 'suited', 'crowd']);
    }
  });

  it('oneBottle() direction produces a `compromise` field naming the weakest-fitting dish, entirely offline', () => {
    const dishes = SELFTEST.filter(([n]) => n === 'Chicken roti' || n === 'Steak frites Aquitaine').map(
      ([name, components]) => ({ name, components })
    );
    const res = oneBottle(dishes, DEMO, T);

    expect(res.wine).not.toBeNull();
    expect(res.compromise).not.toBeNull();
    expect(res.compromise).toHaveProperty('dish');
    expect(res.compromise).toHaveProperty('reason');
    expect([dishes[0].name, dishes[1].name]).toContain(res.compromise.dish);
    // reason is either a fired rule's why-text (a string) or the plain
    // fallback note object - directions.js's own contract for this field -
    // never empty either way.
    const reasonIsRuleText = typeof res.compromise.reason === 'string' && res.compromise.reason.length > 0;
    const reasonIsFallbackNote = res.compromise.reason && typeof res.compromise.reason.note === 'string';
    expect(reasonIsRuleText || reasonIsFallbackNote).toBe(true);
  });
});

describe('TODO(A)/TODO(C): UI-level no-signal fallback (not wired yet)', () => {
  // Pending Lane A/C wiring TheWine.jsx's no-signal path to packages/pairing
  // instead of Desi's hardcoded offerSet (state.js, search "TODO: st.pairOfferings").
  // Once wired, this should render <PairMeApp/> with global.fetch poisoned the
  // same way as above, drive to the TheWine screen, and assert 3 offer cards
  // still render sourced from packages/pairing rather than the hardcoded array.
  it.skip('TheWine screen still shows 3 offerings when the network is down, sourced from packages/pairing', () => {
    // TODO(A): flip this on once TheWine.jsx/state.js call packages/pairing's
    // pair()/courseItOut()/oneBottle() as the no-signal fallback.
  });
});
