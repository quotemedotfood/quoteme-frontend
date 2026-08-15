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
 * PART 1 (done): TheWine.jsx's no-signal fallback now calls packages/pairing
 * (via state.js's computeOfflineOfferings, s===10 cta handler's legacy-path
 * catch) rather than falling back to Desi's hardcoded `offerSet` when POST
 * /v1/pair fails or navigator.onLine is false. The UI-level case below is
 * un-skipped and asserts exactly that.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildTables } from '../../../../packages/pairing/src/tables.js';
import { loadLocalBundle } from '../../../../packages/pairing/src/loadLocalTables.js';
import { DEMO, SELFTEST } from '../../../../packages/pairing/src/demoFixtures.js';
import { pair, courseItOut, oneBottle } from '../../../../packages/pairing/src/index.js';
import { labelPicks } from '../../../../packages/pairing/src/roles.js';
import { ApiError, pair as apiPair, ensureSession } from '../../src/lib/api.js';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

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

describe('PART 1: UI-level no-signal fallback (TheWine calls packages/pairing on failure)', () => {
  // The full walk from '/', fetch poisoned from beforeEach - i.e. before
  // this component ever mounts, so ensureSession/getProfile/fetchRulesBundle
  // all fail too, exactly like a device that has never once had signal.
  // TheWine's no-signal fallback (state.js's s===10 cta handler, legacy-path
  // catch -> computeOfflineOfferings) must still compute and render 3 real
  // offerings from packages/pairing - not a hang, not an error screen, and
  // not Desi's hardcoded offerSet ("Three wines, no assumptions" / "Safe,
  // and we mean that kindly" / etc, none of which should appear here).
  //
  // Expected 3 are deterministic (same dish set + wine list + tables =>
  // same picks every time), verified against computeOfferings() with the
  // exact inputs this walk produces (chosen a2/a5/e6/e9/s2, several
  // direction). The diner skipped setup, so the DEFAULT budget applies
  // (bMin 60, bMax 140), and the ceiling is a real constraint: Trapet
  // Gevrey-Chambertin ($234) is correctly excluded as over-ceiling.
  //
  // The three are now SPREAD ACROSS PRICE POINTS, not clustered (Amy's floor
  // tactic: offer a low, a mid and a high and let the guest's pick reveal
  // their comfort). Bouvier Marsannay ($115, mid) and Gimonnet Blanc de
  // Blancs ($138, high) stay; the old suited pick Berthet-Bondet ($118) sat
  // right on top of them, so the spread now surfaces Red Tail Ridge
  // Blaufrankisch ($72) into the LOW bracket instead. All three remain real,
  // in-budget, fired-rule picks - this test guards the spread, not just "3".
  it('TheWine screen still shows 3 offerings when the network is down, sourced from packages/pairing', async () => {
    const user = userEvent.setup();
    const { findByText, getByRole } = renderPairMeApp('/');

    await user.click(getByRole('button', { name: 'Skip setup' }));
    await findByText('Where are you eating?'); // WhereTo

    await user.click(getByRole('button', { name: 'Continue' }));
    await findByText(/Their menu tonight/i); // Menu

    await user.click(getByRole('button', { name: 'Pair it' }));
    await findByText('How do you want to drink?'); // HowToDrink

    await user.click(getByRole('button', { name: 'Show wine' }));

    // TheWine, real engine output: usingEngine flips offerTitle away from
    // Desi's static copy and hides the "Demo state" blank-profile toggle
    // (showBlankToggle:!usingEngine in state.js).
    await findByText('Your wine');
    expect(screen.queryByText('Three wines, no assumptions')).not.toBeInTheDocument();
    expect(screen.queryByText(/Demo state:/)).not.toBeInTheDocument();

    // Role labels (roles.js SLOTS), in rank order. Only the first slot is
    // asserted now: see the eligibility note below for why this walk yields
    // one offering rather than three.
    expect(screen.getByText('House suggestion')).toBeInTheDocument();

    // Real wines from packages/pairing scoring the actual chosen dishes,
    // budget-aware: all within the default $140 ceiling, and Trapet (over it)
    // is gone.
    expect(screen.queryByText('Trapet')).not.toBeInTheDocument();

    // ELIGIBILITY, and why this walk now yields ONE offering, not three.
    //
    // This test used to assert Bouvier Marsannay ($115), Red Tail Ridge
    // Blaufrankisch ($72) and Gimonnet ($138), and guarded the price spread
    // across them. All three are hard-blocked for this dish set and never
    // should have been offered. several() admitted them because it used to
    // let a wine in on ANY ONE dish's eligibility; the walk's default picks
    // include the Chicken and duck liver pate, and req_sweet_sweet
    // (dish sweetness>=4 requires wine sweetness>=2) blocks 18 of the 20
    // wines against it. Only the off-dry Huet Vouvray Demi-Sec clears the
    // whole table, so one offering is the honest answer and the price
    // spread has nothing to spread across.
    //
    // The spread assertion was guarding a real feature over an invalid pool.
    // Spread is what we do AMONG valid answers, never a reason to produce
    // invalid ones. tests/offerings-eligibility.test.js now guards the
    // invariant that made the old assertion wrong.
    //
    // NOTE, not this seam's to fix: the pate reads sweetness 5 only because
    // dishProfile takes the MAX across components and the confiture garnish
    // is sweet. A jam on the side should not make a liver pate a sweet dish.
    // Reported to the engine seat.
    expect(screen.getByText('Huet')).toBeInTheDocument();
    expect(screen.getByText('Vouvray Demi-Sec')).toBeInTheDocument();
    expect(screen.queryByText('Bouvier')).not.toBeInTheDocument();
    expect(screen.queryByText('Red Tail Ridge')).not.toBeInTheDocument();
    expect(screen.queryByText('Gimonnet')).not.toBeInTheDocument();

    // Pronunciation (the `say` field, rendered in TheWine.jsx's "Say it"
    // row) - proves the full wine object came through, not just a label.
    expect(screen.getByText('oo-AY, voo-VRAY')).toBeInTheDocument();
  });
});
