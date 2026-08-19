/**
 * A GARNISH MUST NOT BLOCK A LIST.
 *
 * dishProfile takes the MAX across components, so the confiture beside a
 * chicken and duck liver pate pushed the whole dish to sweetness 5. That
 * tripped req_sweet_sweet, which was a `require`, which hard-blocked 18 of
 * the 20 demo wines. Chinon, Beaujolais and Champagne are all standard with
 * that plate and the engine forbade all three because there was jam next to
 * it.
 *
 * req_sweet_sweet is now a boost. req_sweet_roquefort stays a hard_fail,
 * because Roquefort really does demand residual sugar against the salt.
 *
 * MAX aggregation is untouched. The rule is that MAX may propagate an axis
 * but may not slam a door on its own: a hard fail needs the constraint to
 * come from the dish, not from something sitting beside it.
 */
import { describe, it, expect } from 'vitest';
import { DEMO_DISHES, buildDemoRows, DEMO_DEFAULT_PICKED } from '../src/lib/demoSeed.js';
import { getOfflineTables } from '../src/lib/offlinePairing.js';
import { dishProfile, scoreWine } from '../../../packages/pairing/src/scoring.js';
import { DEMO as SEEDED } from '../../../packages/pairing/src/demoFixtures.js';
import { computeOfferings, rowToEngineWine, dishToEngineDish } from '../src/lib/pairingAdapter.js';

const T = getOfflineTables();
const WINES = buildDemoRows(SEEDED).map(rowToEngineWine);
const dish = (frag) => DEMO_DISHES.find((d) => d.n.toLowerCase().includes(frag));

const clearsTable = (wine, dishes) =>
  dishes.map(dishToEngineDish).every((d) =>
    scoreWine(wine, dishProfile(d.components, T).profile, d.components, T).eligible);

describe('the pate no longer blocks the list', () => {
  it('the pate returns three offerings', () => {
    const { offerings } = computeOfferings('several', [dish('pate')], WINES, T);
    expect(offerings).toHaveLength(3);
  });

  it('every pate offering is genuinely eligible', () => {
    const dishes = [dish('pate')];
    const { offerings } = computeOfferings('several', dishes, WINES, T);
    offerings.forEach((o) =>
      expect(clearsTable(o.wine, dishes), `${o.wine.label} is not eligible`).toBe(true));
  });

  it('Huet Vouvray Demi-Sec still ranks first on the pate', () => {
    // The boost still fires, so the off-dry wine is still the best answer for
    // a sweet-garnished plate. It is no longer the ONLY answer.
    const { offerings } = computeOfferings('several', [dish('pate')], WINES, T);
    expect(offerings[0].wine.label).toMatch(/Huet/);
  });

  it('the default walkthrough is back to three offerings', () => {
    const dishes = DEMO_DEFAULT_PICKED.map((id) => DEMO_DISHES.find((d) => d.id === id));
    const { offerings } = computeOfferings('several', dishes, WINES, T, { budget: { min: 60, max: 140 } });
    expect(offerings).toHaveLength(3);
    offerings.forEach((o) => expect(clearsTable(o.wine, dishes)).toBe(true));
  });

  it('the Roquefort table is STILL correctly one wine', () => {
    // The hard fail that should stay a hard fail. If this ever returns more
    // than one, a dry wine is being poured against Roquefort again.
    const dishes = [dish('steak frites'), dish('cheese')];
    const { offerings } = computeOfferings('several', dishes, WINES, T);
    expect(offerings).toHaveLength(1);
    expect(offerings[0].wine.label).toMatch(/Huet/);
  });

  it('roquefort still hard-blocks a dry wine outright', () => {
    const chablis = WINES.find((w) => /Louis Michel/.test(w.label));
    expect(clearsTable(chablis, [dish('cheese')])).toBe(false);
  });

  it('a sweet garnish no longer hard-blocks anything', () => {
    // The pate is still sweetness 5. That must now cost points, not eligibility.
    const d = dishToEngineDish(dish('pate'));
    const { profile } = dishProfile(d.components, T);
    expect(profile.sweetness).toBeGreaterThanOrEqual(4);
    const blocked = WINES.filter((w) => !scoreWine(w, profile, d.components, T).eligible);
    expect(blocked.map((w) => w.label)).toEqual([]);
  });
});
