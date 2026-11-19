/**
 * PAIRIT: KINDS OF WINE PER BOTTLE (Assemblage orders 11-14, PR B; Desi
 * frames 06-10).
 *
 * After the dishes are grouped into bottles (pairIt.js groupDishes), each
 * bottle offers four kinds of wine: three traditional and a fourth,
 * "Something you may not have tried". The fourth clears the same dishes as
 * the other three. Different, not better: nothing here ranks or crowns, and
 * the picks come back in the kinds list's own order, not by score.
 *
 * Kinds come from Somm's kinds-of-wine route (GET /v1/pairit/kinds), shape:
 *   { id, name, descriptor, pronunciation, flag: 'traditional'|'adventurous',
 *     profile: { colour, grape_head, region_head }, bottle_count }
 * The engine scores a kind the way it scores a GENERIC_STYLE_WINES row: by
 * its heads in wine_axes.csv. Joined on `id`, never on the name.
 *
 * The line on what the food asks of the wine is written BY RULE from the
 * bottle's dish profile. No model call.
 */
import { dishProfile } from './scoring.js';
import { groupDishes, suggestForGroup, normalizeBottles } from './pairIt.js';
import { AXES_DISH } from './tables.js';

export function kindToEngineWine(kind) {
  const p = (kind && kind.profile) || {};
  return {
    id: kind.id,
    kind_id: kind.id,
    label: kind.name,
    grape_head: p.grape_head || '',
    region_head: p.region_head || '',
    color: String(p.colour || '').toLowerCase(),
  };
}

/** The bottle's profile: what its most demanding dish asks, axis by axis. */
export function groupProfile(dishes, dishIndexes, T) {
  const out = {};
  for (const a of AXES_DISH) out[a] = 1;
  for (const i of dishIndexes) {
    const p = dishProfile(dishes[i].components || [], T).profile;
    for (const a of AXES_DISH) out[a] = Math.max(out[a], p[a]);
  }
  return out;
}

/**
 * One plain line on body, acidity and tannin.
 *   body     the dish weight: 1-2 light, 3 medium, 4-5 full.
 *   acidity  bright when the food is sharp (acid 3+) or rich (fat 4+),
 *            since a wine less acidic than the food tastes flat and acid
 *            cuts fat; otherwise moderate.
 *   tannin   little when there is heat (tannin makes heat hotter); firm
 *            when the food is heavy and fatty enough to soften it; soft
 *            otherwise.
 */
export function askLine(profile) {
  const w = profile.weight || 1;
  const body = w <= 2 ? 'light-bodied' : w === 3 ? 'medium-bodied' : 'full-bodied';
  const acid = (profile.acid || 1) >= 3 || (profile.fat || 1) >= 4 ? 'bright acidity' : 'moderate acidity';
  let tannin = 'soft tannin';
  if ((profile.heat || 1) >= 3) tannin = 'little tannin';
  else if (w >= 4 && (profile.fat || 1) >= 3) tannin = 'firm tannin';
  return `This food wants a ${body} wine with ${acid} and ${tannin}.`;
}

/**
 * Three traditional and one adventurous kind for one bottle, each clearing
 * every dish in it. Fewer when fewer clear: never padded.
 */
export function kindsForGroup(dishes, dishIndexes, kinds, T) {
  const byId = new Map(kinds.map((k, order) => [k.id, { kind: k, order }]));
  const eligible = suggestForGroup(dishes, dishIndexes, kinds.map(kindToEngineWine), T, Infinity);
  const pick = (flag, n) => eligible
    .filter((s) => byId.get(s.wine.kind_id).kind.flag === flag)
    .slice(0, n)
    .map((s) => ({ kind: byId.get(s.wine.kind_id).kind, perDish: s.perDish, order: byId.get(s.wine.kind_id).order }))
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...rest }) => rest);
  const [adventurous = null] = pick('adventurous', 1);
  return { traditional: pick('traditional', 3), adventurous };
}

/**
 * @returns {{ bottles, perDish: boolean, moreWinesMatchBetter: boolean,
 *   groups: Array<{ dishIndexes, ask, traditional, adventurous }> }}
 */
export function pairItBottles(dishes, kinds, T, opts = {}) {
  const bottles = normalizeBottles(opts.bottles);
  const groups = groupDishes(dishes, bottles, T).map((dishIndexes) => ({
    dishIndexes,
    ask: askLine(groupProfile(dishes, dishIndexes, T)),
    ...kindsForGroup(dishes, dishIndexes, kinds, T),
  }));
  return {
    bottles,
    perDish: bottles >= 4,
    moreWinesMatchBetter: bottles === 1 && dishes.length >= 2,
    groups,
  };
}
