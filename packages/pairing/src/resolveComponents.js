/**
 * Component resolution, pure: a dish's free-text name + description -> the
 * dish_axes.csv-vocabulary component strings the scoring engine reads. Takes
 * the built tables `T` explicitly so it runs anywhere (browser, Node, the
 * quality harness) with no `?raw`/bundler dependency. The app wraps this with
 * a default T in apps/pairme/src/lib/dishComponents.js.
 *
 * STOPGAP, by design. The real answer is corpus_categories.csv (188 nodes,
 * 752 keys, axes inherit down the tree), which is not in the repo yet. Until
 * it lands, this keyword-matches the dish text against the flat ~119-row
 * vocabulary dish_axes.csv already ships. A dish that matches nothing gets []
 * back; dishProfile() falls back to its neutral profile, so an unresolved dish
 * degrades gracefully rather than blocking.
 *
 * SEAM for corpus_categories.csv: replace the body with a walk from each
 * matched leaf up to its inherited axes; the contract ("dish text in,
 * dish_axes-vocabulary strings out") does not change.
 */

let _vocab = null;
let _vocabFor = null;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Words that LOOK plural but are singular ingredients/preparations - never
// singularise these. Explicit by design; it will grow. Multi-word entries are
// split to tokens so "fines herbes" protects "herbes".
const SINGULAR_EXCEPTION_PHRASES = [
  'fines herbes', 'frites', 'pommes', 'greens', 'asparagus', 'hummus',
  'couscous', 'bordelaise', 'mayonnaise', 'bearnaise', 'hollandaise', 'escabeche',
];
const SINGULAR_EXCEPTIONS = new Set(
  SINGULAR_EXCEPTION_PHRASES.flatMap((p) => p.split(/\s+/)),
);

/**
 * Singularise ONE word before lookup. First rule that matches wins, mirroring
 * the resolver spec:
 *   ies->y, ves->f, oes->o, ses/xes/zes/ches/shes->strip es,
 *   trailing s->strip (only if 4+ chars and not ending ss/us).
 * Exception words are returned unchanged.
 */
export function singularize(w) {
  if (!w || SINGULAR_EXCEPTIONS.has(w)) return w;
  if (/ies$/.test(w)) return `${w.slice(0, -3)}y`;
  if (/ves$/.test(w)) return `${w.slice(0, -3)}f`;
  if (/oes$/.test(w)) return w.slice(0, -2);
  if (/(ses|xes|zes|ches|shes)$/.test(w)) return w.slice(0, -2);
  if (/s$/.test(w) && w.length >= 4 && !/(ss|us)$/.test(w)) return w.slice(0, -1);
  return w;
}

/** A copy of the text with every word singularised, so plural menu terms
 * ("mussels", "shallots", "snap peas") match the singular corpus keys. Runs
 * alongside the original text so multi-word keys still match as phrases. */
function singularizeText(text) {
  return text.replace(/[a-z]+/g, (w) => singularize(w));
}

/** Longest key first, so "chicken liver" is tested as a whole phrase before
 * its substring "chicken" also matches (both matching is harmless - dishProfile
 * takes the MAX across components - this just keeps the specific match). */
export function vocabPatterns(T) {
  const dish = (T && T.dish) || {};
  if (_vocab && _vocabFor === dish) return _vocab;
  _vocabFor = dish;
  _vocab = Object.keys(dish)
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((key) => ({ key, re: new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i') }));
  return _vocab;
}

/**
 * @param {string} name
 * @param {string} [description]
 * @param {ReturnType<import('./tables.js').buildTables>} T - REQUIRED here.
 * @returns {string[]} dish_axes-vocabulary component names, may be empty.
 */
export function resolveComponents(name, description = '', T) {
  const text = `${name || ''} ${description || ''}`.toLowerCase().trim();
  if (!text) return [];
  // Match keys against the original text (so multi-word keys hit as phrases)
  // AND a singularised copy (so plural menu terms hit the singular keys). Union
  // the two; dishProfile takes the MAX across components so duplicates are safe.
  const singular = singularizeText(text);
  const hits = [];
  for (const { key, re } of vocabPatterns(T)) {
    if (re.test(text) || re.test(singular)) hits.push(key);
  }
  return hits;
}
