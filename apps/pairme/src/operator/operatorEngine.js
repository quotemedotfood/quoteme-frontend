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
 *   packages/pairing/src/wineVocab.js   (VOCAB, norm, has - colour/country lookups)
 *   ../lib/dishComponents.js            (resolveComponents)
 *   ../lib/offlinePairing.js            (getOfflineTables)
 *   ../lib/pairingAdapter.js            (computeOfferings, rowToEngineWine)
 *
 * Deliberately NOT imported: ../lib/wineListEngine.js / ../lib/
 * wineListVocab.js (the diner wine-list-browse worker's files, in flight on
 * a parallel branch). Amy's coverage view and the add-a-wine drawer below
 * need a wine's colour/country too, so wineColor()/wineCountry() re-derive
 * them locally straight off packages/pairing's own VOCAB - the same
 * engine-level vocabulary that worker's file also reads, just without a
 * cross-branch file dependency.
 *
 * BE PERSISTENCE SEAM (not built here, see OperatorPage.jsx's handlers for
 * the exact spot): everything this module returns is scored client side and
 * held in the caller's own React state. Nothing here calls the network.
 */
import { dishProfile, scoreWine, parseWineList } from '../../../../packages/pairing/src/index.js';
import { VOCAB, norm, has } from '../../../../packages/pairing/src/wineVocab.js';
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

/* --------------------------------------------------------------------- *
 * WINE-TO-DISHES (Amy the sommelier's model): a wine list is built one
 * wine at a time asking "how many dishes does this cover", not one dish
 * at a time asking "what is THE best wine". The dish-centric ranking above
 * (rankWinesForDish / eligibleWinesForDish) is unchanged; everything below
 * is additive - the same eligibility, read the other way round.
 * --------------------------------------------------------------------- */

/** A wine "covers" a dish when it is ELIGIBLE for it - the exact same
 * dishProfile + scoreWine(...).eligible test eligibleWinesForDish runs per
 * dish, just summed the other way (per wine, across every dish on the
 * menu). Coverage is disclosed as eligibility, never dressed up as a
 * ranking claim - see wineMetaLine's neighbours in OperatorPage.jsx for the
 * exact wording shown to the operator.
 *
 * @param {Array<{name: string, components: string[]}>} dishes - buildResolvedDish output
 * @param {Array} wines - engine wine rows
 * @param {ReturnType<typeof getOfflineTables>} [T]
 * @returns {Array<{wine: object, coveredDishNames: string[], coveredCount: number}>}
 *   sorted by coveredCount desc, ties broken alphabetically by label for a
 *   stable, deterministic order.
 */
export function computeWineCoverage(dishes, wines, T = getOfflineTables()) {
  const dishProfiles = (dishes || []).map((d) => ({
    name: d.name,
    components: d.components,
    profile: dishProfile(d.components, T).profile,
  }));
  const rows = (wines || []).map((wine) => {
    const coveredDishNames = dishProfiles
      .filter((d) => scoreWine(wine, d.profile, d.components, T).eligible)
      .map((d) => d.name);
    return { wine, coveredDishNames, coveredCount: coveredDishNames.length };
  });
  return rows.sort((a, b) => b.coveredCount - a.coveredCount || String(a.wine.label).localeCompare(String(b.wine.label)));
}

/** @param {Array<{wine: object, coveredCount: number}>} coverageRows
 * @returns {Map<string, number>} wine label -> coveredCount, for O(1) lookup
 * when sorting a smaller candidate pool (e.g. the add-a-wine drawer) by the
 * SAME whole-menu coverage count the coverage view shows. */
export function coverageCountMap(coverageRows) {
  const m = new Map();
  (coverageRows || []).forEach((r) => m.set(r.wine.label, r.coveredCount));
  return m;
}

// Colour/country derivation, LOCAL to this module (see the file header for
// why this does not import ../lib/wineListVocab.js or wineListEngine.js).
// Same precedence that file documents - explicit word on the wine's own
// name, then STYLE-by-region (Champagne is sparkling whatever the grape),
// then colour-by-grape (a region like Languedoc spans colours; the grape
// does not), then whatever the region says, in that order - kept here as a
// smaller, standalone copy rather than a shared dependency.
const ROSE_WORDS = ['rose', 'rosado', 'rosato', 'rosé'];
const SPARKLING_WORDS = ['sparkling', 'champagne', 'cremant', 'crémant', 'prosecco', 'cava', 'blanc de blancs', 'spumante', 'sekt'];
const ORANGE_WORDS = ['orange', 'skin contact', 'skin-contact', 'ramato'];
const DESSERT_WORDS = ['port', 'sherry', 'madeira', 'sauternes', 'late harvest', 'dessert'];
const STYLE_COLORS = new Set(['Sparkling', 'Dessert', 'Rose', 'Orange']);
const GRAPE_COLOR_FALLBACK = { aligote: 'White', poulsard: 'Red', gamay: 'Red' };

function anyWord(normalizedText, words) {
  return words.some((w) => has(normalizedText, w));
}

/** Best-effort colour for ONE wine, derived from its own fields only (label/
 * wine_name/producer text, then grape_head/region_head via packages/
 * pairing's own VOCAB). Returns 'Unknown' rather than guessing wrong - an
 * honest sort bucket, never a silently dropped row (unlike the browse
 * view's stricter filter, the operator still needs to SEE every candidate).
 * @param {object} wine
 */
export function wineColor(wine) {
  if (!wine) return 'Unknown';
  if (wine.color) return wine.color;
  const text = norm([wine.wine_name, wine.label, wine.producer].filter(Boolean).join(' '));
  if (text) {
    if (anyWord(text, ROSE_WORDS)) return 'Rose';
    if (anyWord(text, SPARKLING_WORDS)) return 'Sparkling';
    if (anyWord(text, ORANGE_WORDS)) return 'Orange';
    if (anyWord(text, DESSERT_WORDS)) return 'Dessert';
  }
  const regionHead = String(wine.region_head || '').toLowerCase();
  const grapeHead = String(wine.grape_head || '').toLowerCase();
  const fromRegion = regionHead && VOCAB.colorFor(regionHead);
  if (fromRegion && STYLE_COLORS.has(fromRegion)) return fromRegion;
  const fromGrape = (grapeHead && VOCAB.colorFor(grapeHead)) || GRAPE_COLOR_FALLBACK[grapeHead];
  if (fromGrape) return fromGrape;
  if (fromRegion) return fromRegion;
  return 'Unknown';
}

/** Best-effort country for ONE wine, region first then grape, 'Other' when
 * neither resolves one (never a blank sort bucket).
 * @param {object} wine
 */
export function wineCountry(wine) {
  if (!wine) return 'Other';
  const regionHead = String(wine.region_head || '').toLowerCase();
  const grapeHead = String(wine.grape_head || '').toLowerCase();
  return (regionHead && VOCAB.countryFor(regionHead)) || (grapeHead && VOCAB.countryFor(grapeHead)) || 'Other';
}

/** Fixed price-bracket ladder for the drawer's price sort - a bracket
 * (what a buyer actually thinks in) rather than a raw-cents sort, which
 * would just be "price" wearing a different label.
 * @type {Array<{max: number, label: string}>} */
export const PRICE_BRACKETS = [
  { max: 40, label: 'Under $40' },
  { max: 70, label: '$40-70' },
  { max: 120, label: '$70-120' },
  { max: Infinity, label: '$120+' },
];

/** @param {number|null|undefined} price
 * @returns {{order: number, label: string}} order is the bracket's index
 * (no-price sorts last, after every priced bracket). */
export function priceBracket(price) {
  if (price == null) return { order: PRICE_BRACKETS.length, label: 'No price listed' };
  const idx = PRICE_BRACKETS.findIndex((b) => price <= b.max);
  const safeIdx = idx === -1 ? PRICE_BRACKETS.length - 1 : idx;
  return { order: safeIdx, label: PRICE_BRACKETS[safeIdx].label };
}

/** Sort options for the add-a-wine drawer. Coverage is FIRST and is the
 * default (Amy's model: a buyer optimises for how much of the menu a wine
 * carries, not for a single best-dish claim). */
export const DRAWER_SORT_OPTIONS = [
  { id: 'coverage', label: 'Most menu items covered' },
  { id: 'colour', label: 'Colour' },
  { id: 'country', label: 'Country' },
  { id: 'price', label: 'Price bracket' },
];
export const DEFAULT_DRAWER_SORT = 'coverage';

/**
 * Sort a candidate list (eligibleWinesForDish's shape: {wine, why, fired,
 * score}) for the add-a-wine drawer. `coverage` (the default) reads whole-
 * menu coverage from `coverageMap` (coverageCountMap's output) rather than
 * this one dish's score, because "how many menu items does this wine
 * cover" is a menu-wide question, not a per-dish one; every other sort
 * keeps coverage as its tie-break so the list never reads as arbitrarily
 * ordered.
 *
 * @param {Array<{wine: object, why: string, fired: Array, score: number}>} entries
 * @param {string} sortId - one of DRAWER_SORT_OPTIONS' ids
 * @param {Map<string, number>} [coverageMap]
 */
export function sortDrawerCandidates(entries, sortId, coverageMap) {
  const list = (entries || []).slice();
  const covOf = (wine) => (coverageMap && coverageMap.get(wine.label)) || 0;
  const byLabel = (a, b) => String(a.wine.label).localeCompare(String(b.wine.label));
  switch (sortId) {
    case 'colour':
      list.sort((a, b) => wineColor(a.wine).localeCompare(wineColor(b.wine)) || covOf(b.wine) - covOf(a.wine) || byLabel(a, b));
      break;
    case 'country':
      list.sort((a, b) => wineCountry(a.wine).localeCompare(wineCountry(b.wine)) || covOf(b.wine) - covOf(a.wine) || byLabel(a, b));
      break;
    case 'price':
      list.sort((a, b) => {
        const pa = priceBracket(a.wine.price);
        const pb = priceBracket(b.wine.price);
        return pa.order - pb.order || (a.wine.price ?? Infinity) - (b.wine.price ?? Infinity) || byLabel(a, b);
      });
      break;
    case 'coverage':
    default:
      list.sort((a, b) => covOf(b.wine) - covOf(a.wine) || byLabel(a, b));
      break;
  }
  return list;
}

/** How close two scores have to be before Amy's "do not break the tie,
 * explain both and let the guest decide" applies (see item 2's rank-label
 * removal). 8 points is roughly one fired boost/bridge rule (10-20pts) or
 * a couple of the +/-body,+/-acid structural adjustments - close enough
 * that which one "wins" is a matter of guest taste, not of fit. */
export const CLOSE_SCORE_THRESHOLD = 8;

/** @param {number|null|undefined} a @param {number|null|undefined} b
 * @param {number} [threshold] */
export function areScoresClose(a, b, threshold = CLOSE_SCORE_THRESHOLD) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= threshold;
}
