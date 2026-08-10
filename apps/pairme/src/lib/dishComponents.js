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
import { resolveComponents as resolveComponentsPure } from '../../../../packages/pairing/src/resolveComponents.js';

/**
 * App wrapper: same "dish text in, dish_axes-vocabulary strings out" contract,
 * with the default T bound to the zero-network offline tables so callers pass
 * just (name, description). The resolver itself is the pure, Node-safe module in
 * packages/pairing (so the quality harness and any test can run it without the
 * browser-only `?raw` table bundle).
 *
 * @param {string} name
 * @param {string} [description]
 * @param {ReturnType<import('../../../../packages/pairing/src/tables.js').buildTables>} [T]
 * @returns {string[]} dish_axes-vocabulary component names, may be empty.
 */
export function resolveComponents(name, description = '', T = getOfflineTables()) {
  return resolveComponentsPure(name, description, T);
}
