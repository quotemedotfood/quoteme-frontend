/**
 * THE MISSING INVARIANT: an offering must never be a wine the engine
 * hard-blocked for something on the table.
 *
 * scoring.js's own pair() filters on `eligible` before ranking. The product
 * path (computeOfferings -> several -> selectAcrossPriceBrackets) drifted
 * from that, and the result was a dry Chablis offered against Roquefort while
 * the one correct answer, an off-dry Vouvray, sat unshown at rank 2.
 *
 * A hard fail outranks price spread, budget and preference. Empty beats wrong.
 */
import { describe, it, expect } from 'vitest';
import { DEMO_DISHES, buildDemoRows } from '../src/lib/demoSeed.js';
import { getOfflineTables } from '../src/lib/offlinePairing.js';
import { dishProfile, scoreWine } from '../../../packages/pairing/src/scoring.js';
import { DEMO as SEEDED } from '../../../packages/pairing/src/demoFixtures.js';
import { computeOfferings, rowToEngineWine, dishToEngineDish } from '../src/lib/pairingAdapter.js';

const T = getOfflineTables();
const WINES = buildDemoRows(SEEDED).map(rowToEngineWine);
const dish = (frag) => DEMO_DISHES.find((d) => d.n.toLowerCase().includes(frag));

/** A wine is a legitimate table-wide offering only if NOTHING on the table
 *  hard-blocks it. Per-dish eligibility ORed across dishes is not enough. */
function blockedBy(wine, dishes) {
  return dishes
    .map(dishToEngineDish)
    .filter((d) => !scoreWine(wine, dishProfile(d.components, T).profile, d.components, T).eligible)
    .map((d) => d.name);
}

function eligibleCount(dishes) {
  return WINES.filter((w) => blockedBy(w, dishes).length === 0).length;
}

const SETS = {
  'steak + roquefort': [dish('steak frites'), dish('cheese')],
  'oysters + moules + sole': [dish('oysters'), dish('moules'), dish('sole')],
  'roquefort alone': [dish('cheese')],
  'oysters alone': [dish('oysters')],
  'all thirteen': DEMO_DISHES,
  'chicken roti + truffle frites': [dish('chicken roti'), dish('truffle frites')],
  'pate + escargots': [dish('pate'), dish('escargots')],
};

describe('offering eligibility invariant', () => {
  it.each(Object.entries(SETS))(
    'no offering is hard-blocked by anything on the table: %s',
    (_name, dishes) => {
      const { offerings } = computeOfferings('several', dishes, WINES, T);
      const violations = offerings
        .map((o) => ({ wine: o.wine.label, blockedBy: blockedBy(o.wine, dishes) }))
        .filter((v) => v.blockedBy.length);
      expect(violations, `offered a wine the engine hard-blocked: ${JSON.stringify(violations)}`).toEqual([]);
    }
  );

  it('steak frites plus Cheese three offers the Huet Vouvray Demi-Sec', () => {
    // Roquefort hard-fails every wine that is not sweeter than the cheese
    // (req_sweet_roquefort, sweetness>=3). The Vouvray Demi-Sec is the only
    // wine on this list that clears it, and it scores 158.
    const dishes = SETS['steak + roquefort'];
    const { offerings } = computeOfferings('several', dishes, WINES, T);
    const labels = offerings.map((o) => o.wine.label);
    expect(labels.join(' | ')).toMatch(/Huet/);
  });

  it('returns no more offerings than there are eligible wines', () => {
    for (const [name, dishes] of Object.entries(SETS)) {
      const { offerings } = computeOfferings('several', dishes, WINES, T);
      const n = eligibleCount(dishes);
      expect(offerings.length, `${name}: ${offerings.length} offered, only ${n} eligible`).toBeLessThanOrEqual(Math.min(3, n));
    }
  });

  it('offers nothing at all when nothing on the list clears the table', () => {
    // Roquefort with no sweet wine anywhere: the honest answer is none.
    const dryOnly = WINES.filter((w) => !/Huet|Dow/i.test(w.label || ''));
    const { offerings } = computeOfferings('several', [dish('cheese')], dryOnly, T);
    expect(offerings).toEqual([]);
  });

  it('every dish a wine claims to cover actually admits that wine', () => {
    for (const [name, dishes] of Object.entries(SETS)) {
      const { offerings } = computeOfferings('several', dishes, WINES, T);
      for (const o of offerings) {
        for (const covered of o.covers) {
          const d = dishes.map(dishToEngineDish).find((x) => x.name === covered);
          if (!d) continue;
          const ok = scoreWine(o.wine, dishProfile(d.components, T).profile, d.components, T).eligible;
          expect(ok, `${name}: "${o.wine.label}" claims to cover "${covered}" but is blocked for it`).toBe(true);
        }
      }
    }
  });
});

describe('nothing clears the table', () => {
  it('names the blocking rule instead of returning a bare empty list', () => {
    const dryOnly = WINES.filter((w) => !/Huet|Dow/i.test(w.label || ''));
    const res = computeOfferings('several', [dish('cheese')], dryOnly, T);
    expect(res.offerings).toEqual([]);
    expect(res.blocked, 'an empty shortlist must say why').toBeTruthy();
    expect(res.blocked.dish).toMatch(/Cheese/);
    expect(res.blocked.ruleId).toBe('req_sweet_roquefort');
    // The sentence is the rule's own why_template, not free prose.
    expect(res.blocked.why).toEqual(expect.any(String));
    expect(res.blocked.why.length).toBeGreaterThan(0);
  });

  it('marks every dish unpaired when nothing clears', () => {
    const dryOnly = WINES.filter((w) => !/Huet|Dow/i.test(w.label || ''));
    const res = computeOfferings('several', [dish('cheese')], dryOnly, T);
    expect(res.coverage.every((c) => c.status === 'unpaired')).toBe(true);
  });

  it('reports no blocker when the pool is simply empty of wines', () => {
    const res = computeOfferings('several', [dish('cheese')], [], T);
    expect(res.offerings).toEqual([]);
    expect(res.blocked).toBeNull();
  });
});
