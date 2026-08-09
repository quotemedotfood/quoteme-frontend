/**
 * Component resolution: a dish's free-text name + description -> the
 * dish_axes.csv-vocabulary component strings packages/pairing's scoring
 * engine (dishProfile/scoreWine) reads.
 *
 * STOPGAP, by design. The real answer here is corpus_categories.csv (188
 * nodes, 752 keys, axes inherit down the tree) - Moose has not sent it yet.
 * Until it lands, this keyword-matches the dish's text against the flat
 * vocabulary packages/pairing/data/dish_axes.csv already ships (the exact
 * same ~119-row table demoSeed.js's hand-curated DEMO_DISHES.components
 * arrays draw from, and the same one dishProfile() itself reads), so
 * paste -> pair works end to end today without inventing a second lookup.
 * A dish that matches nothing gets [] back; dishProfile() already handles
 * that by falling back to its documented neutral profile (weight/acid/etc
 * all 1) rather than throwing, so an unresolved dish degrades gracefully,
 * it does not block the walk.
 *
 * SEAM for corpus_categories.csv: when it lands, replace resolveComponents'
 * body with a lookup into the corpus tree (walking from each matched leaf
 * up to its inherited axes). Callers below do not need to change - the
 * contract is "dish name + description in, dish_axes-vocabulary component
 * strings out" - as long as the corpus's leaf keys are mapped onto this
 * same vocabulary, or dish_axes.csv is regenerated from the corpus itself.
 */
import { getOfflineTables } from './offlinePairing.js';

let _vocab = null;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Longest component name first, so "chicken liver" is tested as a whole
 * phrase before its substring "chicken" would also independently match -
 * both ending up in the result is harmless (dishProfile takes the MAX
 * across matched components), this just keeps the more specific match from
 * being crowded out by a coincidence of ordering. */
function vocabPatterns(T) {
  if (_vocab) return _vocab;
  const keys = Object.keys((T && T.dish) || {});
  _vocab = keys
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((key) => ({ key, re: new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i') }));
  return _vocab;
}

/**
 * @param {string} name
 * @param {string} [description]
 * @param {ReturnType<import('../../../../packages/pairing/src/tables.js').buildTables>} [T]
 *   Defaults to the zero-network offline tables (packages/pairing/data/*.csv
 *   shipped in this app's bundle) - the same source offlinePairing.js's
 *   no-signal fallback uses, so this resolver works even with no server
 *   rules bundle loaded yet.
 * @returns {string[]} dish_axes-vocabulary component names, may be empty.
 */
export function resolveComponents(name, description = '', T = getOfflineTables()) {
  const text = `${name || ''} ${description || ''}`.toLowerCase().trim();
  if (!text) return [];
  const hits = [];
  for (const { key, re } of vocabPatterns(T)) {
    if (re.test(text)) hits.push(key);
  }
  return hits;
}
