/**
 * Operator-side pairing helpers: pure functions layered onto the SAME
 * client engine the diner app already uses (EntryScreen.jsx's pattern -
 * parse -> resolve components -> score/rank). OperatorPage.jsx is a
 * restaurant_admin tool: paste/upload the venue's own menu, pick or paste
 * the venue's own wine list, and see the top-ranked wines per dish before
 * anything reaches a diner.
 *
 * READ ONLY reuse - no file this imports from is edited by this branch:
 *   packages/pairing/src/index.js       (dishProfile, scoreWine, parseWineList)
 *   ../lib/dishComponents.js            (resolveComponents)
 *   ../lib/offlinePairing.js            (getOfflineTables)
 *   ../lib/pairingAdapter.js            (computeOfferings, rowToEngineWine)
 *
 * BE PERSISTENCE SEAM (not built here, see OperatorPage.jsx's handlers for
 * the exact spot): everything this module returns is scored client side and
 * held in the caller's own React state. Nothing here calls the network.
 */
import { dishProfile, scoreWine, parseWineList } from '../../../../packages/pairing/src/index.js';
import { resolveComponents } from '../lib/dishComponents.js';
import { getOfflineTables } from '../lib/offlinePairing.js';
import { computeOfferings, rowToEngineWine } from '../lib/pairingAdapter.js';

/**
 * A parsed menu line (parseMenu output: name/description/price/section) ->
 * the same shape plus its resolved dish_axes-vocabulary components and an
 * honest `unresolved` flag, so the UI can show BOTH what we read and what
 * we could not.
 *
 * @param {{name: string, description: string, price: number|null, section: string|null}} dish
 * @param {ReturnType<typeof getOfflineTables>} [T]
 */
export function buildResolvedDish(dish, T = getOfflineTables()) {
  const components = resolveComponents(dish.name, dish.description, T);
  return {
    name: dish.name,
    description: dish.description,
    price: dish.price,
    section: dish.section,
    components,
    unresolved: components.length === 0,
  };
}

/**
 * Up to 3 ranked wines for ONE dish, with the fired-rule reason the diner
 * engine already produces. computeOfferings('several', ...) handed a
 * single-dish pool IS "rank the wines for this one dish" - the same
 * several() core a whole table gets, just scoped to one plate, so this adds
 * no second scoring path.
 *
 * @param {{name: string, section: string|null, components: string[]}} resolvedDish
 * @param {Array} wines - engine wine rows (rowToEngineWine shape)
 * @param {ReturnType<typeof getOfflineTables>} [T]
 * @returns {Array<{wine: object, why: string, fired: Array, score: number}>}
 */
export function rankWinesForDish(resolvedDish, wines, T = getOfflineTables()) {
  const engineDish = { n: resolvedDish.name, sec: resolvedDish.section || null, components: resolvedDish.components };
  const result = computeOfferings('several', [engineDish], wines, T, {});
  return result.offerings.map((o) => ({ wine: o.wine, why: o.why, fired: o.fired, score: o.score }));
}

/** Per-wine honest fallback when no rule fired for a swap candidate -
 * references the wine's own region/grape so it never reads as a templated
 * line repeated across every row, and never claims a rule that did not fire. */
function structuralFallback(wine) {
  const id = wine.region_head || wine.grape_head;
  if (!id) return 'A safe structural fit here, though nothing on this plate calls for it specifically.';
  const nice = id.charAt(0).toUpperCase() + id.slice(1);
  return `${nice} is a safe structural fit here, though nothing on this plate calls for it specifically.`;
}

/**
 * Every wine on the list that clears this dish's own hard rules, ranked -
 * the pool SWAP picks from ("another eligible wine from the list for that
 * dish"), never a blind free override that could recommend something the
 * dish's hard gates would have rejected outright.
 *
 * @param {{components: string[]}} resolvedDish
 * @param {Array} wines
 * @param {ReturnType<typeof getOfflineTables>} [T]
 * @returns {Array<{wine: object, why: string, fired: Array, score: number}>}
 */
export function eligibleWinesForDish(resolvedDish, wines, T = getOfflineTables()) {
  const { profile } = dishProfile(resolvedDish.components, T);
  return wines
    .map((wine) => ({ wine, scored: scoreWine(wine, profile, resolvedDish.components, T) }))
    .filter((x) => x.scored.eligible)
    .sort((a, b) => b.scored.score - a.scored.score)
    .map((x) => ({
      wine: x.wine,
      why: x.scored.fired[0] ? x.scored.fired[0][1] : structuralFallback(x.wine),
      fired: x.scored.fired,
      score: x.scored.score,
    }));
}

/** Role label shown on a confirmed pairing, matching the exact "With the
 * {dish}" convention pairingAdapter's course_it_out path and TheWine.jsx
 * already use, so the diner preview below reads identically to what a
 * diner actually sees once this ships to /t/:code. */
export function roleLabelForDish(dishName) {
  return `With the ${dishName.toLowerCase()}`;
}

/** A display line for a wine's meta (grape/region), same fallback
 * EntryScreen's offerings render use when a row has no curated `meta`. */
export function wineMetaLine(wine) {
  return wine.meta || [wine.region_head, wine.grape_head].filter(Boolean).join(', ');
}

/**
 * Parse a PASTED wine list (item 1's "plus": paste your own list instead of
 * picking a seeded one) into engine-ready wine rows, via the exact same
 * parseWineList -> rowToEngineWine pipeline seededLists.js already runs for
 * the bundled Barolo fixture. The parser itself is untouched; this only
 * wires its output into the scoring engine's expected wine shape.
 *
 * @param {string} rawText
 */
export function parsePastedWineList(rawText) {
  return parseWineList(rawText).map((r) => rowToEngineWine(Object.assign({}, r, { glass: !!r.glass_price })));
}

/**
 * The venue's own /t/:code URL (routes.jsx's TableCodeRoute) a diner lands
 * on. Trimmed and slug-safe-ish (whitespace stripped) so a pasted code with
 * stray spaces still builds a usable link.
 *
 * @param {string} code
 */
export function buildTableUrl(code) {
  const clean = String(code || '').trim().replace(/\s+/g, '');
  return clean ? `https://demo.pairme.wine/t/${clean}` : '';
}
