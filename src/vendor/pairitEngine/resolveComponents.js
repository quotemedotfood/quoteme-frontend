/**
 * Component resolution, pure: a dish's free-text name + description -> the
 * dish_axes.csv-vocabulary component strings the scoring engine reads. Takes
 * the built tables `T` explicitly so it runs anywhere (browser, Node, the
 * quality harness) with no `?raw`/bundler dependency. The app wraps this with
 * a default T in apps/pairme/src/lib/dishComponents.js.
 *
 * TWO PASSES, AND THE SECOND ONE IS THE CORPUS. This used to be a documented
 * stopgap that keyword-matched the dish text against the flat 119-row
 * dish_axes.csv vocabulary alone. corpus_categories.csv has now landed under
 * ../data (192 heads, 708 aliases, its own axis columns), and the SEAM that
 * comment described is the second loop below.
 *
 *   pass 1  the dish_axes keys, exactly as before, byte for byte.
 *   pass 2  the corpus terms that survived curation, each mapped to its head.
 *
 * The two are UNIONED, and that direction matters: pass 1 is never overridden,
 * only added to. Several pairing rules trigger on a dish_axes key that the
 * corpus files under a broader head - `dill` sits under `soft herb`, `chicken
 * liver` under `liver`, `roquefort` under `blue cheese` - so collapsing a term
 * into its corpus head INSTEAD of keeping the dish_axes key would silently
 * unhook boost_dill_riesling, boost_liver_gamay and req_sweet_roquefort. Union,
 * not replacement, is what makes this change unable to remove a component that
 * resolved yesterday.
 *
 * A dish that still matches nothing gets [] back; dishProfile() falls back to
 * its neutral profile, so an unresolved dish degrades gracefully rather than
 * blocking. resolveComponentsDetailed() below exists because that fallback is
 * SILENT - see its own header.
 *
 * Before either pass the text goes through stripDietary() and
 * withoutNegated() (./dietary.js): no dietary or allergy statement is ever
 * matched, and a negated food ("no blue cheese", "dressing on the side") is
 * not read as present.
 *
 * The corpus is optional. Handed a T built from the three CSVs alone,
 * T.corpusTerms is empty, pass 2 does nothing, and this returns exactly what it
 * returned before.
 */

import { stripDietary, withoutNegated } from './dietary.js';

let _vocab = null;
let _vocabFor = null;
let _corpus = null;
let _corpusFor = null;

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
  // dishVocab is the dish_axes keys ALONE. `dish` also holds corpus heads (it
  // is the axis lookup), and matching those here would route around the
  // verdict table - see the note where buildTables captures it. A hand-built T
  // in a test has no dishVocab, so fall back to the whole table.
  // Cache on a STABLE identity: dishVocab's array, or the dish table itself.
  // Keying on Object.keys(dish) would allocate a fresh array every call and
  // miss the cache every time.
  const cacheOn = (T && T.dishVocab) || dish;
  if (_vocab && _vocabFor === cacheOn) return _vocab;
  _vocabFor = cacheOn;
  _vocab = (Array.isArray(cacheOn) ? cacheOn : Object.keys(cacheOn))
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((key) => ({ key, re: new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i') }));
  return _vocab;
}

/** The curated corpus terms, compiled and cached the same way vocabPatterns
 * caches the dish_axes keys. Already sorted longest-first by buildTables. */
export function corpusPatterns(T) {
  const terms = (T && T.corpusTerms) || [];
  if (_corpus && _corpusFor === terms) return _corpus;
  _corpusFor = terms;
  _corpus = terms.map(({ term, head }) => ({
    term,
    head,
    re: new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i'),
  }));
  return _corpus;
}

/** One pass of matching over a single blob of text. Shared by both entry
 * points so the array form and the detailed form can never disagree. */
function matchAll(raw, T) {
  // NOTHING DIETARY IS COMPUTED ON, and nothing the text says is NOT on the
  // plate is read as on it: "contains nuts" is not `nut`, "Burger (no blue
  // cheese)" is not `blue cheese`. One scrub and one rule, both in
  // ./dietary.js, shared with the app's served-menu reader.
  const text = withoutNegated(stripDietary(raw));
  if (!text.trim()) return [];
  // Match against the original text (so multi-word keys hit as phrases) AND a
  // singularised copy (so plural menu terms hit the singular keys). Union the
  // two; dishProfile takes the MAX across components so duplicates are safe.
  const singular = singularizeText(text);
  const out = [];
  const seen = new Set();
  const add = (key, term, source) => {
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, term, source });
  };
  for (const { key, re } of vocabPatterns(T)) {
    if (re.test(text) || re.test(singular)) add(key, key, 'dish_axes');
  }
  for (const { term, head, re } of corpusPatterns(T)) {
    if (re.test(text) || re.test(singular)) add(head, term, 'corpus');
  }
  return out;
}

/**
 * @param {string} name
 * @param {string} [description]
 * @param {ReturnType<import('./tables.js').buildTables>} T - REQUIRED here.
 * @returns {string[]} component-vocabulary names, may be empty.
 */
export function resolveComponents(name, description = '', T) {
  const text = `${name || ''} ${description || ''}`.toLowerCase().trim();
  return matchAll(text, T).map((m) => m.key);
}

/**
 * THE SIGNAL FOR THE CASE NOTHING CAN SEE.
 *
 * resolveComponents returns a bare array, so two very different outcomes reach
 * a caller looking identical. A dish that resolved NOTHING returns [], and
 * dishProfile answers that with an all-ones neutral profile - a real number,
 * silently standing in for no signal at all. A dish that resolved only what sat
 * beside the food is worse, because it returns a full-looking array: Alaskan
 * Halibut reading as endive, tomato, fennel, basil and dill, or a $52 filet
 * reading as asparagus, gruyere and potato. Nothing downstream can tell either
 * apart from a good read.
 *
 * So this returns the same components plus two honest flags:
 *
 *   unresolved  nothing matched. Same shape and meaning as the flag
 *               operatorEngine.js's buildResolvedDish already sets.
 *   incidental  something matched, but NOTHING matched inside the dish's own
 *               NAME - every key came from the component line.
 *
 * HOW `incidental` WAS DECIDED, because the choice is arguable. It reads only
 * WHERE a match occurred, never what a word means, which is the same mechanical
 * line the alias curation is held to. Judging a key to be "just a garnish"
 * would mean ruling that dairy is incidental on one plate and the whole point
 * on another, which is trade judgement, and trade judgement is what turns
 * `saba` into mackerel. Where the match landed is a fact about the text.
 *
 * It is a flag, not a verdict, and it has a known false alarm: a dish whose
 * name carries no food word at all - a pizza called "White", a plate called
 * "Tots" - reads as incidental even when its component line was read
 * perfectly. That is the honest answer rather than a wrong one, because we did
 * not in fact recognise the dish, only its parts. `matches` carries the raw
 * per-key provenance so a caller that wants a different rule can build one
 * without touching this file.
 *
 * NOTHING RENDERS THIS. Its readers today are the quality harness
 * (packages/pairing/quality/pairing-quality.mjs, which counts and reports the
 * three states) and the tests. No screen reads it and none is changed here.
 *
 * @param {string} name
 * @param {string} [description]
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @returns {{components: string[], unresolved: boolean, incidental: boolean, matches: Array<{key: string, term: string, source: string, where: string}>}}
 */
export function resolveComponentsDetailed(name, description = '', T) {
  const nameText = String(name || '').toLowerCase().trim();
  const fullText = `${name || ''} ${description || ''}`.toLowerCase().trim();
  const fromName = new Set(matchAll(nameText, T).map((m) => m.key));
  const all = matchAll(fullText, T);
  return {
    components: all.map((m) => m.key),
    unresolved: all.length === 0,
    incidental: all.length > 0 && fromName.size === 0,
    matches: all.map((m) => ({ ...m, where: fromName.has(m.key) ? 'name' : 'description' })),
  };
}
