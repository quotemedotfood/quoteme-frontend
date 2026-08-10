// @vitest-environment node
/**
 * Budget as a RANGE in the engine: max is a hard ceiling, min is a soft floor
 * that costs score rather than excluding. (Founder ruling: a low end is real
 * information - the diner does not want the cheapest bottle.)
 */
import { describe, it, expect } from 'vitest';
import { loadLocalBundle } from '../../../packages/pairing/src/loadLocalTables.js';
import { buildTables } from '../../../packages/pairing/src/tables.js';
import { computeOfferings, rowToEngineWine } from '../src/lib/pairingAdapter.js';
import { DEMO } from '../../../packages/pairing/src/demoFixtures.js';

const T = buildTables(loadLocalBundle());
const wines = DEMO.map(rowToEngineWine);
const dishes = [{ n: 'Steak frites', sec: 'Mains', components: ['hanger steak', 'truffle', 'shallot'] }];

describe('budget range in computeOfferings', () => {
  it('ceiling (max) hard-excludes bottles above it', () => {
    const r = computeOfferings('several', dishes, wines, T, { budget: { min: 20, max: 110 } });
    expect(r.offerings.length).toBeGreaterThan(0);
    for (const o of r.offerings) expect(o.wine.price).toBeLessThanOrEqual(110);
  });

  it('a max at/above the top of the range (400) means no ceiling', () => {
    const capped = computeOfferings('several', dishes, wines, T, { budget: { min: 20, max: 130 } });
    const uncapped = computeOfferings('several', dishes, wines, T, { budget: { min: 20, max: 400 } });
    const maxCapped = Math.max(...capped.offerings.map((o) => o.wine.price));
    const maxUncapped = Math.max(...uncapped.offerings.map((o) => o.wine.price));
    expect(maxUncapped).toBeGreaterThan(maxCapped);
  });

  it('floor (min) is soft: a below-floor bottle loses score but is not excluded outright', () => {
    // With a high floor, a cheaper-but-fitting bottle should rank below a
    // pricier in-budget one it would otherwise beat. Prove the ordering shifts
    // rather than the pool emptying.
    const noFloor = computeOfferings('several', dishes, wines, T, { budget: { min: 20, max: 400 } });
    const withFloor = computeOfferings('several', dishes, wines, T, { budget: { min: 130, max: 400 } });
    expect(withFloor.offerings.length).toBe(noFloor.offerings.length); // nothing excluded by the floor
    // the top pick under a floor should not be cheaper than the floor when an
    // in-budget alternative exists
    expect(withFloor.offerings[0].wine.price).toBeGreaterThanOrEqual(130);
  });
});
