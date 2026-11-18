/**
 * Tables: the indexed form of the three-CSV rules bundle. A line-for-line
 * port of the `Tables` class in pairing_engine.py (the deterministic wine
 * pairing "left brain" - see that file's module docstring for the full
 * rationale). Do not add a fourth (terroir) table here: Levels 1 and 2 only,
 * appellation-first then grape, exactly what wine_axes.csv covers today.
 *
 * (That warning is about the WINE side and still stands. The dish-side corpus
 * added below is a vocabulary table, not a fourth axis level: it introduces no
 * new lookup order and no new axis, it only widens which strings reach the
 * component vocabulary that already exists.)
 */
import { buildCorpusIndex } from './corpus.js';

// Order matters for nothing here, but keep it identical to Python's
// AXES_WINE / AXES_DISH so a future column addition is obvious to diff.
//
// `richness` is the axis that lets the engine MATCH intensity, not only cut it
// (fat-on-fat: a buttery Montrachet to a foie gras raviolo). It is deliberately
// NOT body - Chablis is body 2 / richness 1, Meursault is body 4 / richness 5,
// same grape; the difference is texture from oak, lees, malolactic and glycerol.
// If a value ever looks derivable from body+oak, it is wrong. It is declared
// here AHEAD of the data so the pending wine_axes/dish_axes drop (real richness
// columns) plus Amy's three rules (amy_rich_on_rich / amy_rich_dessert /
// amy_thin_on_rich) is a pure data landing, not a code change. Until that data
// arrives toInt() defaults the missing column to a neutral value and no rule
// reads it, so scoring output is unchanged.
export const AXES_WINE = ['body', 'acid', 'tannin', 'sweetness', 'alcohol', 'oak', 'richness'];
export const AXES_DISH = ['weight', 'fat', 'acid', 'sweetness', 'heat', 'salt', 'umami', 'bitter', 'richness'];

/**
 * Port of Python's `_i(v, d=1)`: cast to int if `v` is an exact integer
 * literal once trimmed, else fall back to the default. Python's `int()`
 * rejects "3.0" (raises ValueError, caught, returns default) so this must
 * NOT accept decimals either.
 */
export function toInt(v, d = 1) {
  if (v === null || v === undefined) return d;
  const s = String(v).trim();
  if (/^[+-]?\d+$/.test(s)) {
    return parseInt(s, 10);
  }
  return d;
}

function low(v) {
  return (v || '').trim().toLowerCase();
}

/**
 * Build the indexed Tables object from raw row arrays (the shape both the
 * parsed local CSVs and GET /v1/rules/bundle's `tables` payload share:
 * plain objects keyed by CSV header / JSON key, values as strings).
 *
 * THE CORPUS IS OPTIONAL, AND ABSENT IT CHANGES NOTHING. `corpus_categories`
 * plus `corpus_alias_verdicts` are a FOURTH, additive pair. Hand this function
 * the three CSVs alone - which is exactly what loadLocalBundle() and every
 * server bundle shaped by the v1 contract do - and every field below is
 * byte-for-byte what it was before the corpus existed: `dish` holds the same
 * 119 components, `stats()` returns the same string, and `corpusTerms` is
 * empty so resolveComponents' second pass has nothing to walk. That is what
 * keeps scoring.test.js's anti-divergence fixture (125/119/46; 109 wine heads as captured from
 * pairing_engine.py) true and unedited: the Python reference has no corpus, so
 * the bundle held to it must not gain one.
 *
 * When the corpus IS supplied, it only ADDS keys. dish_axes wins on every head
 * the two tables share - see corpus.js for why that is a rule and not a
 * preference.
 *
 * @param {{wine_axes: Array<Record<string,string>>, dish_axes: Array<Record<string,string>>, pairing_rules: Array<Record<string,string>>, corpus_categories?: Array<Record<string,string>>, corpus_alias_verdicts?: Array<Record<string,string>>}} bundle
 */
export function buildTables(bundle) {
  const wine = {};
  for (const r of bundle.wine_axes || []) {
    const h = low(r.head);
    if (!h) continue;
    const row = {};
    for (const a of AXES_WINE) row[a] = toInt(r[a], 3);
    row.texture = low(r.texture) || 'still';
    row.confidence = (r.confidence || 'med').trim();
    row.notes = (r.notes || '').trim();
    wine[h] = row;
  }

  const dish = {};
  for (const r of bundle.dish_axes || []) {
    const c = low(r.component);
    if (!c) continue;
    const row = {};
    for (const a of AXES_DISH) row[a] = toInt(r[a], 1);
    row.notes = (r.notes || '').trim();
    dish[c] = row;
  }

  // WHEN A RULE MAY BE A HARD FAIL.
  //
  // dishProfile takes the MAX across a dish's components, so a single
  // component sets the axis for the whole plate. That propagation is
  // deliberate and stays: one artichoke really does constrain the plate.
  //
  // But MAX must not be able to slam a door on its own. A hard_fail or a
  // require needs the constraint to come FROM THE DISH, not from something
  // sitting beside it. Roquefort genuinely demands residual sugar, so
  // req_sweet_roquefort is a hard_fail. A liver pate with confiture on the
  // side does not, so req_sweet_sweet is a boost: Sauternes with pate is one
  // classic answer, not a requirement, and Chinon, Beaujolais and Champagne
  // are all standard with that plate.
  //
  // (It was flipped back to a require on 2026-09-03 and reversed again by
  // Moose on 2026-10-16: the sweetness rule is a "bonus". Weight 25, rule
  // version 3. One sweet item on the plate had left 8 of Aquitaine's 90
  // bottles eligible for the duck breast.)
  //
  // Test for a new blocking rule: would a sommelier refuse to pour this, or
  // would they merely prefer something else? Only the first is a hard_fail.
  //
  // (pairing_rules.csv has no comment syntax, so this doctrine lives next to
  // the consumer rather than in the data file.)
  const rules = (bundle.pairing_rules || []).filter(
    (r) => ((r.status || 'active').trim() === 'active')
  );

  // ------------------------------------------------------------ the corpus
  // Additive only, and only when both halves are present: the corpus without
  // its verdict table is an UNREVIEWED 708-alias union, which is the thing
  // corpus.js exists to prevent, so a bundle carrying one and not the other
  // gets neither.
  // The dish_axes vocabulary, captured BEFORE the corpus merge below.
  //
  // This exists because of a bug worth naming. resolveComponents' first pass
  // matches every key in `dish`, so merging corpus heads into `dish` silently
  // made those heads matchable by that pass - which is the one pass the
  // verdict table does not govern. Heads REJECTED as match terms came straight
  // back in through the side door: the bare word "seed" resolved on "celery
  // seed dressing", and "sugar" would have on "sugar snap peas", each carrying
  // axes nobody had approved for that dish.
  //
  // A corpus head still has to be IN `dish`, because that is where its axes
  // live and where an accepted alias resolves TO. So the two roles are split:
  // `dish` is the AXIS lookup and holds everything, `dishVocab` is the
  // MATCHABLE dish_axes vocabulary and holds only what it always held. Corpus
  // heads reach the matcher through `corpusTerms`, and only if their verdict
  // row says accept.
  const dishVocab = Object.keys(dish);

  const corpusTerms = [];
  // Heads whose corpus kind is 'method' (grilled, seared, poached, raw,
  // acid_cured). They still feed a profile; PairIt never counts one alone as
  // a dish it can read (Moose 11-15: "roasted" is not a dish).
  const methods = [];
  if ((bundle.corpus_categories || []).length && (bundle.corpus_alias_verdicts || []).length) {
    const idx = buildCorpusIndex(bundle.corpus_categories, bundle.corpus_alias_verdicts);
    for (const [head, r] of Object.entries(idx.axes)) if (r.kind === 'method') methods.push(head);
    // dish_axes wins: only heads it has never carried take the corpus's axes.
    for (const [head, r] of Object.entries(idx.axes)) {
      if (dish[head]) continue;
      const row = {};
      for (const a of AXES_DISH) row[a] = toInt(r[a], 1);
      row.notes = (r.notes || '').trim();
      dish[head] = row;
    }
    // Longest term first, mirroring vocabPatterns: "calabrian chili" is tested
    // before its substring "chili". Both matching is harmless (dishProfile
    // takes the MAX) - this just keeps the specific match ahead of the general.
    // `at` is the term's place in the corpus as written (a head, then its
    // spellings in the row's order), kept through the sort. Reader: PairIt's
    // shown spelling (apps/pairme/src/lib/pairItSlips.js shownSpelling).
    corpusTerms.push(...idx.terms.map((t, at) => ({ ...t, at })).sort((a, b) => b.term.length - a.term.length));
  }

  return {
    wine,
    dish,
    rules,
    dishVocab,
    corpusTerms,
    methods,
    stats() {
      return `${Object.keys(this.wine).length} wine heads, ${Object.keys(this.dish).length} components, ${this.rules.length} active rules`;
    },
  };
}
