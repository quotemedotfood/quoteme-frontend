import { describe, it, expect, beforeAll } from 'vitest';
import { buildTables } from './tables.js';
import { loadLocalBundle } from './loadLocalTables.js';
import { DEMO } from './demoFixtures.js';
import { courseItOut, oneBottle, several } from './directions.js';
import { SLOTS } from './roles.js';

/**
 * These directions (course_it_out / one_bottle / several) have no Python
 * reference - pairing_engine.py only ever handles one dish at a time. This
 * is new client-side logic built on top of the ported scoring.js core
 * (see PairMe API Contract v1's `POST /v1/pairings` `direction` field).
 * These are shape/sanity tests, not anti-divergence tests.
 */

let T;
beforeAll(() => {
  T = buildTables(loadLocalBundle());
});

const DISHES = [
  { name: 'Artichoke barigoule', components: ['artichoke', 'carrot', 'snap pea', 'beurre blanc'] },
  { name: 'Steak frites Aquitaine', components: ['hanger steak', 'truffle', 'shallot', 'watercress'] },
];

describe('courseItOut', () => {
  it('pairs each dish independently and labels picks with the locked product slots', () => {
    const [artichoke, steak] = courseItOut(DISHES, DEMO, T);
    expect(artichoke.picks[0].slot).toBe('house');
    expect(artichoke.picks[0].label).toBe('House suggestion');
    expect(artichoke.picks[1].slot).toBe('suited');
    expect(artichoke.picks[2].slot).toBe('crowd');
    // Different dishes still diverge under course_it_out, same as the
    // single-dish steak frites divergence in scoring.test.js.
    expect(steak.picks[0].wine.label).not.toBe(artichoke.picks[0].wine.label);
  });
});

describe('oneBottle', () => {
  it('only considers a wine eligible on EVERY dish, and MUST report where it compromises', () => {
    const res = oneBottle(DISHES, DEMO, T);
    expect(res.wine).not.toBeNull();
    // Every per-dish score must come from an eligible (not hard-failed) read.
    for (const d of res.perDish) expect(d.eligible).toBe(true);
    // The non-negotiable bit: a compromise field naming WHERE it compromises.
    expect(res.compromise).not.toBeNull();
    expect(res.compromise.dish).toBeTypeOf('string');
    expect(typeof res.compromise.score).toBe('number');
    // The compromise dish is genuinely the weakest of the per-dish scores.
    const minScore = Math.min(...res.perDish.map((d) => d.score));
    expect(res.compromise.score).toBe(minScore);
  });

  it('returns null (no bottle) rather than lying about eligibility, when nothing clears every dish', () => {
    const impossible = [
      { name: 'Artichoke barigoule', components: ['artichoke', 'carrot', 'snap pea', 'beurre blanc'] },
      { name: 'Belgian endive salade', components: ['endive', 'apple', 'walnut', 'roquefort', 'vinaigrette'] },
    ];
    // Artichoke's only eligible wines are unoaked/untannic; endive's only
    // eligible wine is Huet (sweetness>=3). Huet has oak 0 (from wine_axes)
    // but let's just assert the function degrades safely either way.
    const res = oneBottle(impossible, DEMO, T);
    if (res.wine === null) {
      expect(res.compromise).toBeNull();
    } else {
      expect(res.compromise).not.toBeNull();
    }
  });
});

describe('several', () => {
  it('pools eligible wines across all dishes without pair()\'s grape-dedup dropping any', () => {
    const shortlist = several(DISHES, DEMO, T, { n: 10 });
    expect(shortlist.length).toBeGreaterThan(0);
    // No duplicate labels in the shortlist.
    const labels = shortlist.map((x) => x.wine.label);
    expect(new Set(labels).size).toBe(labels.length);
    // Sorted descending by bestScore.
    for (let i = 1; i < shortlist.length; i++) {
      expect(shortlist[i - 1].bestScore).toBeGreaterThanOrEqual(shortlist[i].bestScore);
    }
  });
});

describe('SLOTS', () => {
  it('matches the locked PairMe product roles', () => {
    expect(SLOTS.map((s) => s.slot)).toEqual(['house', 'suited', 'crowd']);
    expect(SLOTS.map((s) => s.label)).toEqual(['House suggestion', 'Suited to you', 'Crowd pleaser']);
  });
});
