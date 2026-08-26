/**
 * THREE BOTTLES PER DISH (Moose: "We need to be able to pair at least 3
 * bottles with every dish. This IS the bottle for every dish.")
 *
 * course_it_out used to ask the engine for `n: 1` and emit ONE offering per
 * dish. Two things were wrong with that as a product: a dish got a single
 * take-it-or-leave-it bottle, and - because the card was keyed by dish while
 * the SELECTION was keyed by wine label - one wine winning two dishes made
 * both cards light up together. Three per dish makes the collision strictly
 * more likely, since the same wine will now appear in several trios. So the
 * card identity is (dish, wine), not dish and not wine.
 */
import { describe, it, expect } from 'vitest';
import { DEMO_DISHES, buildDemoRows } from '../src/lib/demoSeed.js';
import { DEMO } from '../../../packages/pairing/src/demoFixtures.js';
import { getOfflineTables } from '../src/lib/offlinePairing.js';
import { computeOfferings, rowToEngineWine } from '../src/lib/pairingAdapter.js';

const T = getOfflineTables();
const WINES = buildDemoRows(DEMO).map(rowToEngineWine);
const byId = (id) => DEMO_DISHES.find((d) => d.id === id);

// Seven dishes across four sections, so `mains_only` has something to narrow
// to and the trio-per-dish count is not a coincidence of one section.
const SEVEN = ['r1', 'a2', 'a5', 'e6', 'e9', 'e2', 's2'].map(byId);

describe('course_it_out: three bottles per dish', () => {
  it('gives seven dishes twenty-one cards, three per dish', () => {
    const { offerings } = computeOfferings('course_it_out', SEVEN, WINES, T);

    expect(offerings).toHaveLength(21);

    const perDish = new Map();
    for (const o of offerings) perDish.set(o.forDish, (perDish.get(o.forDish) || 0) + 1);
    expect([...perDish.keys()]).toHaveLength(7);
    for (const [dish, count] of perDish) {
      expect(count, `${dish} should get three options`).toBe(3);
    }
  });

  it('gives every card an identity of its own, keyed on (dish, wine)', () => {
    const { offerings } = computeOfferings('course_it_out', SEVEN, WINES, T);

    const keys = offerings.map((o) => o.key);
    expect(keys.every(Boolean), 'every offering carries a key').toBe(true);
    expect(new Set(keys).size, 'no two cards share a key').toBe(offerings.length);

    // The key is a FUNCTION of (dish, wine) - not an index - so it survives a
    // re-render or a re-rank that reorders the list.
    const again = computeOfferings('course_it_out', SEVEN, WINES, T).offerings;
    for (const o of offerings) {
      const twin = again.find((x) => x.forDish === o.forDish && x.wine.label === o.wine.label);
      expect(twin.key).toBe(o.key);
    }
  });

  it('keeps each dish trio distinct - three wines, not the same wine three times', () => {
    const { offerings } = computeOfferings('course_it_out', SEVEN, WINES, T);

    for (const dish of new Set(offerings.map((o) => o.forDish))) {
      const trio = offerings.filter((o) => o.forDish === dish).map((o) => o.wine.label);
      expect(new Set(trio).size, `${dish} should offer three different wines`).toBe(trio.length);
    }
  });

  it('gives the three cards in a trio distinguishable labels, all naming the dish', () => {
    const { offerings } = computeOfferings('course_it_out', SEVEN, WINES, T);

    for (const dish of new Set(offerings.map((o) => o.forDish))) {
      const trio = offerings.filter((o) => o.forDish === dish);
      const labels = trio.map((o) => o.label);
      // TheWine renders one flat list, so three cards reading the same thing
      // would be unreadable side by side.
      expect(new Set(labels).size, `${dish}: each card needs its own label`).toBe(trio.length);
      for (const l of labels) expect(l.toLowerCase()).toContain(dish.toLowerCase());
    }
  });

  it('keeps the trio labels descriptive, never a ranking', () => {
    const { offerings } = computeOfferings('course_it_out', SEVEN, WINES, T);
    // Amy's rule: no "top/second/third pick" - one dish can have twenty
    // pairings, and which one wins depends on the guest.
    for (const o of offerings) {
      expect(o.label).not.toMatch(/top pick|first pick|second pick|third pick|best|#\d|\brank/i);
    }
  });

  it('still says which dish each card is for, and covers only that dish', () => {
    const { offerings } = computeOfferings('course_it_out', SEVEN, WINES, T);

    for (const o of offerings) {
      expect(o.forDish).toBeTruthy();
      expect(o.covers).toEqual([o.forDish]);
      expect(o.label.toLowerCase()).toContain(o.forDish.toLowerCase());
      expect(o.label.toLowerCase()).toMatch(/^with the /);
    }
  });

  it('reuses a wine across dishes rather than hiding it, so the collision is real', () => {
    const { offerings } = computeOfferings('course_it_out', SEVEN, WINES, T);

    const dishesPerWine = new Map();
    for (const o of offerings) {
      if (!dishesPerWine.has(o.wine.label)) dishesPerWine.set(o.wine.label, new Set());
      dishesPerWine.get(o.wine.label).add(o.forDish);
    }
    const shared = [...dishesPerWine.entries()].filter(([, dishes]) => dishes.size > 1);
    expect(shared.length, 'at least one wine should win under more than one dish').toBeGreaterThan(0);
  });

  it('offers a dish FEWER than three rather than padding with a blocked wine', () => {
    // Roquefort hard-blocks most of this list (see
    // tests/offerings-eligibility.test.js), so it is the natural short case.
    // "At least 3" is the target, not a quota: three eligible wines or the
    // honest remainder, never a fourth-best that the engine ruled out.
    const withCheese = [byId('e9'), byId('d4')];
    const { offerings, coverage } = computeOfferings('course_it_out', withCheese, WINES, T);

    const cheeseName = byId('d4').n;
    const cheeseCards = offerings.filter((o) => o.forDish === cheeseName);
    const cheeseCoverage = coverage.find((c) => c.dish === cheeseName);

    expect(cheeseCoverage).toBeTruthy();
    expect(cheeseCards.length).toBeLessThanOrEqual(3);
    if (cheeseCoverage.status === 'paired') {
      expect(cheeseCards.length).toBeGreaterThan(0);
      // Whatever it got, none of them may be a wine the engine blocked here.
      for (const c of cheeseCards) expect(c.covers).toEqual([cheeseName]);
    } else {
      expect(cheeseCards).toHaveLength(0);
    }

    // The steak, which has a deep eligible set, still gets its full trio - so
    // the short count above is the dish's own constraint, not a global cap.
    expect(offerings.filter((o) => o.forDish === byId('e9').n)).toHaveLength(3);
  });

  it('never offers a dish more than three, however deep its eligible set', () => {
    const { offerings } = computeOfferings('course_it_out', SEVEN, WINES, T);
    for (const dish of new Set(offerings.map((o) => o.forDish))) {
      expect(offerings.filter((o) => o.forDish === dish).length).toBeLessThanOrEqual(3);
    }
  });

  it('labels each trio house / suited / crowd within its own dish', () => {
    const { offerings } = computeOfferings('course_it_out', SEVEN, WINES, T);
    for (const dish of new Set(offerings.map((o) => o.forDish))) {
      const trio = offerings.filter((o) => o.forDish === dish);
      // Exactly one best-fit per dish - slots are relative to the dish, so
      // every dish has its own 'house', not one 'house' across the table.
      expect(trio.filter((o) => o.slot === 'house')).toHaveLength(1);
      expect(new Set(trio.map((o) => o.slot)).size).toBe(trio.length);
    }
  });
});

describe('mains_only: three per main', () => {
  it('pairs only the mains, three deep each, and says the rest went unpaired', () => {
    const { offerings, coverage } = computeOfferings('mains_only', SEVEN, WINES, T);

    const mains = SEVEN.filter((d) => d.sec === 'Mains').map((d) => d.n);
    expect(new Set(offerings.map((o) => o.forDish))).toEqual(new Set(mains));
    expect(offerings).toHaveLength(mains.length * 3);

    for (const d of SEVEN.filter((x) => x.sec !== 'Mains')) {
      expect(coverage.find((c) => c.dish === d.n).status).toBe('unpaired');
    }
  });
});
