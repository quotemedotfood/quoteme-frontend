/**
 * "Direction" wrappers over the single-dish `pair()` core, for a table that
 * ordered more than one dish (PairMe API Contract v1, `POST /v1/pairings`
 * `direction` enum: "course_it_out"|"one_bottle"|"several"). None of this
 * changes scoring - it is purely how multiple dishes' single-dish results
 * get combined into one table-facing recommendation.
 *
 * There is no Python reference for this file: pairing_engine.py's `pair()`
 * only ever handles one dish at a time. scoring.js is the ported half held
 * to the Python fixture; this file is new client-side logic built on top of
 * it for the multi-dish case, per the "roles/labels/compromise are locked"
 * note in the API contract (item 5 = this build).
 */
import { pair, dishProfile, scoreWine } from './scoring.js';
import { labelPicks } from './roles.js';

/**
 * course_it_out: pair EACH dish separately - a different bottle (or glass)
 * per course, exactly `pair()`'s normal behaviour, with product-facing
 * slot labels attached.
 *
 * @param {Array<{name: string, components: string[]}>} dishes
 * @param {Array<Record<string, any>>} wines
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @param {object} [opts] - forwarded to `pair()` (n, budget, glassOnly).
 */
export function courseItOut(dishes, wines, T, opts = {}) {
  return dishes.map((d) => {
    const res = pair(d.name, d.components, wines, T, opts);
    return { ...res, picks: labelPicks(res.picks) };
  });
}

/**
 * one_bottle: the table is drinking ONE wine across every dish ordered.
 * A single bottle almost never fits every dish equally, so this MUST
 * surface where it compromises rather than pretend it is perfect for all
 * of them.
 *
 * A wine only qualifies if it is `eligible` (no hard_fail/require block)
 * against EVERY dish's own profile - a hard_fail on any one dish rules the
 * bottle out entirely, same as pair()'s own eligibility rule, just applied
 * across the whole table instead of one plate. Among qualifying wines, rank
 * by the SUM of per-dish scores (uncapped, same scoring core). The
 * `compromise` field names the weakest-fitting dish for the winning wine
 * and carries that dish's own blocked-rule why-text (rule-generated, never
 * free text) when one exists, or a plain axis-gap note when the shortfall
 * is only the baseline structural fit (no rule actually fired against it).
 *
 * @param {Array<{name: string, components: string[]}>} dishes
 * @param {Array<Record<string, any>>} wines
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @returns {{wine: object|null, totalScore: number, perDish: Array, compromise: object|null}}
 */
export function oneBottle(dishes, wines, T) {
  const dishProfiles = dishes.map((d) => ({
    name: d.name,
    components: d.components,
    ...dishProfile(d.components, T),
  }));

  const candidates = [];
  for (const wine of wines) {
    const perDish = dishProfiles.map((dp) => ({
      dish: dp.name,
      ...scoreWine(wine, dp.profile, dp.components, T),
    }));
    const qualifies = perDish.every((x) => x.eligible);
    if (!qualifies) continue;
    const totalScore = perDish.reduce((sum, x) => sum + x.score, 0);
    candidates.push({ wine, perDish, totalScore });
  }

  if (candidates.length === 0) {
    return { wine: null, totalScore: null, perDish: [], compromise: null };
  }

  candidates.sort((a, b) => b.totalScore - a.totalScore);
  const winner = candidates[0];

  const weakest = winner.perDish.reduce((worst, x) => (x.score < worst.score ? x : worst));
  const compromise = {
    dish: weakest.dish,
    score: weakest.score,
    // Prefer the actual rule that penalized this dish, if any fired against
    // it (why-text generated from the rule that fired, never free-written).
    // Otherwise fall back to a plain data note - still not free prose, just
    // the two numbers a rep would need to defend the pick.
    reason:
      weakest.blocked.length > 0
        ? weakest.blocked[0][1]
        : { note: 'lowest structural fit of the dishes on this bottle', score: weakest.score },
  };

  return {
    wine: winner.wine,
    totalScore: winner.totalScore,
    perDish: winner.perDish,
    compromise,
  };
}

/**
 * several: no single dish or single bottle framing - a shortlist for the
 * table to choose from together. Pools each dish's own eligible wines,
 * dedupes by label, and ranks by the best score any dish gave that wine
 * (so a wine that is a standout for one course outranks one that is merely
 * fine for all of them).
 *
 * @param {Array<{name: string, components: string[]}>} dishes
 * @param {Array<Record<string, any>>} wines
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @param {{n?: number}} [opts]
 */
export function several(dishes, wines, T, opts = {}) {
  const { n = 5 } = opts;
  const best = new Map(); // label -> { wine, bestScore, bestForDish }

  // Deliberately NOT built on pair(): pair()'s picks are grape-deduped for
  // the single-dish discovery mechanic, which would silently drop an
  // eligible wine here just because an earlier dish already claimed its
  // grape. "several" wants every eligible wine, so it calls scoreWine
  // directly per dish.
  for (const d of dishes) {
    const { profile } = dishProfile(d.components, T);
    for (const wine of wines) {
      const s = scoreWine(wine, profile, d.components, T);
      if (!s.eligible) continue;
      const label = wine.label;
      const prev = best.get(label);
      if (!prev || s.score > prev.bestScore) {
        best.set(label, { wine, bestScore: s.score, bestForDish: d.name });
      }
    }
  }

  return Array.from(best.values())
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, n);
}
