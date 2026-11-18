/**
 * PAIRIT: HOW MANY BOTTLES, AND WHICH DISHES SHARE ONE (Moose 11-13, PairIt
 * Epic v1 MVP, via Assemblage).
 *
 * The diner says what they are eating, then answers "Bottles?" 1 / 2 / 3 / 4+.
 *
 *   1    one wine for every dish. With several dishes, the answer carries
 *        `moreWinesMatchBetter` so the screen can say two or three wines
 *        would match better. One bottle across a table always gives ground.
 *   2, 3 the dishes are lumped into that many groups, dishes that eat alike
 *        together, and each group gets its own wine. Fewer dishes than
 *        bottles is a bottle per dish.
 *   4+   a bottle per dish.
 *
 * Each group gets up to `n` (default 4) suggestions. A wine is only offered to
 * a group when it clears EVERY dish in it (no hard fail on any plate, the
 * same AND rule oneBottle() and several() use), ranked by the sum of its
 * scores across the group's dishes. The order is the engine's, not a crown:
 * the screen never labels one of the four as the winner.
 *
 * THE LUMPING. Each dish is its dishProfile() (the dish axes, 1 to 5). Every
 * dish starts as its own group; the two groups whose average profiles sit
 * closest are merged, again and again, until there are as many groups as
 * bottles. Ties go to the earliest dishes, so the same table always lumps the
 * same way. Groups come back in the order of their first dish; dishes inside
 * a group keep the diner's order. A dish is its POSITION (dishIndex), never
 * its name, so two dishes with the same name stay two dishes.
 *
 * Pure: no app import, no network. The wines are whatever pool the caller
 * passes (today the app's style wines; Decant's demo catalog when it lands).
 */
import { dishProfile, scoreWine } from './scoring.js';

/** 1, 2, 3, or 4 and up meaning a bottle per dish. */
export function normalizeBottles(bottles) {
  const n = Math.floor(Number(bottles));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** How many groups a table of `dishCount` dishes gets for `bottles`. */
export function groupCount(dishCount, bottles) {
  if (dishCount <= 0) return 0;
  const b = normalizeBottles(bottles);
  if (b >= 4) return dishCount;
  return Math.min(b, dishCount);
}

function mean(profiles) {
  const out = {};
  for (const p of profiles) {
    for (const [k, v] of Object.entries(p)) out[k] = (out[k] || 0) + v / profiles.length;
  }
  return out;
}

function distance(a, b) {
  let sum = 0;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = (a[k] || 0) - (b[k] || 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * @param {Array<{name: string, components: string[]}>} dishes
 * @param {number} bottles 1, 2, 3, or 4+
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @returns {number[][]} groups of dish indexes
 */
export function groupDishes(dishes, bottles, T) {
  const k = groupCount(dishes.length, bottles);
  if (k === 0) return [];
  const profiles = dishes.map((d) => dishProfile(d.components || [], T).profile);
  let groups = dishes.map((_, i) => [i]);
  while (groups.length > k) {
    let best = null;
    for (let a = 0; a < groups.length; a += 1) {
      const ca = mean(groups[a].map((i) => profiles[i]));
      for (let b = a + 1; b < groups.length; b += 1) {
        const d = distance(ca, mean(groups[b].map((i) => profiles[i])));
        // Strictly closer only: the first pair found wins a tie.
        if (!best || d < best.d - 1e-9) best = { a, b, d };
      }
    }
    const merged = [...groups[best.a], ...groups[best.b]].sort((x, y) => x - y);
    groups = groups.filter((_, i) => i !== best.a && i !== best.b);
    groups.push(merged);
    groups.sort((x, y) => x[0] - y[0]);
  }
  return groups;
}

/**
 * Up to `n` wines that clear every dish in the group, by summed score.
 *
 * @returns {Array<{wine: object, total: number, perDish: Array<{dishIndex: number, score: number, fired: Array}>}>}
 */
export function suggestForGroup(dishes, dishIndexes, wines, T, n = 4) {
  const plates = dishIndexes.map((i) => ({
    dishIndex: i,
    components: dishes[i].components || [],
    profile: dishProfile(dishes[i].components || [], T).profile,
  }));
  const out = [];
  wines.forEach((wine, order) => {
    const perDish = [];
    for (const p of plates) {
      const s = scoreWine(wine, p.profile, p.components, T);
      if (!s.eligible) return;
      perDish.push({ dishIndex: p.dishIndex, score: s.score, fired: s.fired });
    }
    out.push({ wine, order, total: perDish.reduce((t, x) => t + x.score, 0), perDish });
  });
  return out
    .sort((a, b) => b.total - a.total || a.order - b.order)
    .slice(0, n)
    .map(({ order, ...rest }) => rest);
}

/**
 * The whole PairIt answer for a table.
 *
 * @param {Array<{name: string, components: string[]}>} dishes
 * @param {Array<object>} wines engine wines
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @param {{bottles?: number, n?: number}} [opts]
 */
export function pairItGroups(dishes, wines, T, opts = {}) {
  const bottles = normalizeBottles(opts.bottles);
  const n = opts.n == null ? 4 : opts.n;
  const groups = groupDishes(dishes, bottles, T).map((dishIndexes) => ({
    dishIndexes,
    suggestions: suggestForGroup(dishes, dishIndexes, wines, T, n),
  }));
  return {
    bottles,
    groups,
    moreWinesMatchBetter: bottles === 1 && dishes.length >= 2,
  };
}
