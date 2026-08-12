// @vitest-environment node
/**
 * ITEM 3 (Amy interview): the `several` direction's three offerings must
 * SPREAD across price points rather than cluster at the top of the score
 * ranking - Amy sells on the floor by throwing out two price points and
 * reading which one the guest is more comfortable with, so a top-3-by-
 * score answer (which tends to bunch together in price) throws away the
 * comfort signal before the guest ever gets to reveal it.
 *
 * Same fixture/harness pattern as tests/budget-engine.test.js: the real
 * DEMO fixture (packages/pairing's own `--selftest` data) through the real
 * scoring engine, not a mock - a spread-priced wine list that is easy to
 * reason about (prices 44 to 340) rather than a synthetic stand-in.
 */
import { describe, it, expect } from 'vitest';
import { loadLocalBundle } from '../../../../packages/pairing/src/loadLocalTables.js';
import { buildTables } from '../../../../packages/pairing/src/tables.js';
import { computeOfferings, rowToEngineWine } from '../../src/lib/pairingAdapter.js';
import { DEMO } from '../../../../packages/pairing/src/demoFixtures.js';

const T = buildTables(loadLocalBundle());
const wines = DEMO.map(rowToEngineWine);
// Steak frites qualifies a wide spread of DEMO's reds (gamay through
// cabernet sauvignon, $44-$340) - the same dish tests/budget-engine.test.js
// already uses, so a fired rule here is directly comparable to that file's.
const dishes = [{ n: 'Steak frites', sec: 'Mains', components: ['hanger steak', 'truffle', 'shallot'] }];

function distinctPrices(offerings) {
  return new Set(offerings.map((o) => o.wine.price)).size;
}

describe('Item 3: price-spread selection in computeOfferings (several)', () => {
  it('with a budget range, the three offerings land in three different price brackets (low/mid/high), not clustered', () => {
    const budget = { min: 40, max: 340 };
    const r = computeOfferings('several', dishes, wines, T, { budget });
    expect(r.offerings.length).toBe(3);
    expect(distinctPrices(r.offerings)).toBe(3);

    const prices = r.offerings.map((o) => o.wine.price);
    const spread = Math.max(...prices) - Math.min(...prices);
    // Proves genuine spread rather than three near-identical price points.
    expect(spread).toBeGreaterThan(100);

    // Brackets as computeOfferings itself derives them from the budget
    // range: low = below the midpoint, high = the top quarter of the
    // range, mid = everything between.
    const mid = (budget.min + budget.max) / 2;
    const highStart = budget.min + (budget.max - budget.min) * 0.75;
    expect(prices.some((p) => p < mid)).toBe(true);
    expect(prices.some((p) => p >= highStart)).toBe(true);
    expect(prices.some((p) => p >= mid && p < highStart)).toBe(true);
  });

  it('every offering is still a genuine qualifying pick under the ceiling (Item 3 never invents an ineligible wine to fill a bracket)', () => {
    const budget = { min: 40, max: 340 };
    const r = computeOfferings('several', dishes, wines, T, { budget });
    for (const o of r.offerings) {
      expect(o.wine.price).toBeLessThanOrEqual(budget.max);
      // covers/coverage are still computed per offering, unchanged by Item 3.
      expect(Array.isArray(o.covers)).toBe(true);
    }
  });

  it("with no budget, brackets derive from the shortlist's own price distribution and still spread rather than cluster", () => {
    const r = computeOfferings('several', dishes, wines, T, {});
    expect(r.offerings.length).toBe(3);
    expect(distinctPrices(r.offerings)).toBe(3);
    const prices = r.offerings.map((o) => o.wine.price);
    const spread = Math.max(...prices) - Math.min(...prices);
    expect(spread).toBeGreaterThan(100);
  });

  it('is deterministic: the same inputs produce the same three offerings on repeat calls', () => {
    const budget = { min: 40, max: 340 };
    const a = computeOfferings('several', dishes, wines, T, { budget });
    const b = computeOfferings('several', dishes, wines, T, { budget });
    expect(a.offerings.map((o) => o.wine.label)).toEqual(b.offerings.map((o) => o.wine.label));
  });

  it('gracefully returns fewer than three when the eligible pool itself is smaller than three, never crashing', () => {
    const smallPool = wines.filter((w) => ['Vincent Paris, Cornas', 'Graillot, Crozes-Hermitage'].includes(w.label));
    expect(smallPool.length).toBe(2);
    const r = computeOfferings('several', dishes, smallPool, T, {});
    expect(r.offerings.length).toBe(2);
    expect(new Set(r.offerings.map((o) => o.wine.label)).size).toBe(2);
  });
});
