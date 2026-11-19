/**
 * corpus_categories.csv, indexed: the vocabulary layer the resolver's
 * documented SEAM asked for.
 *
 * WHAT THE CORPUS IS. 192 rows (39 categories, 153 components) with a `head`,
 * a `parent`, a pipe-separated `tails` list of 708 aliases, and its own eight
 * axis columns. Unlike a normal taxonomy it is ALREADY DENORMALISED: every row
 * carries explicit axis values, so nothing has to be inherited down the tree at
 * read time. The `parent` column is kept for provenance and for a human reading
 * the file, and this module does not walk it.
 *
 * TWO LAYERS, AND WHY THEY ARE SEPARATE.
 *
 *   1. MATCHING - which strings are looked for in a dish's text. Governed by
 *      corpus_alias_verdicts.csv, one row per head and per alias, each either
 *      `accept` or `reject` with a reason. A REJECT removes the string from the
 *      matcher. It does NOT remove the head from the vocabulary: rejecting the
 *      head `aged cheese` (nobody writes that on a menu) still leaves
 *      "fontina" resolving TO the key `aged cheese`.
 *
 *   2. AXES - what a resolved key is worth. dish_axes.csv WINS wherever a key
 *      exists in both tables. The corpus's own numbers are used only for keys
 *      dish_axes has never carried. This is deliberate and it is not a
 *      preference: the two tables disagree on several shared heads (see
 *      corpusAxisDisagreements below), and changing an axis value changes
 *      scoring for every venue at once, which is a separate decision from
 *      widening the vocabulary.
 *
 * WHY THE VERDICT FILE EXISTS AT ALL. A blind union of 708 aliases introduces
 * false positives, and the ones it introduces are not obscure: `saba` resolves
 * a grape-must syrup to MACKEREL, `jam` matches inside "jamon" because
 * JavaScript's \b is ASCII-only, and `serrano` reads a Spanish ham as a Mexican
 * chili carrying a hard_fail. The line drawn in that file is MECHANICAL, NOT
 * SEMANTIC: whether a word APPEARS in dish text is mechanical and is kept;
 * whether a word MEANS a particular ingredient is trade judgement, and an alias
 * asserting meaning is a semantic claim dressed as a mechanical rule. It is
 * data, not code, so a person can review and amend it without reading this
 * file.
 */

/** Split a `tails` cell into its alias strings. */
function tailsOf(row) {
  return String(row.tails || '')
    .split('|')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const AXES = ['weight', 'fat', 'acid', 'sweetness', 'heat', 'salt', 'umami', 'bitter'];

/**
 * Index the corpus against its verdict table.
 *
 * A term with NO verdict row is treated as REJECTED, not accepted. That is the
 * fail-closed direction on purpose: the verdict file is the reviewed artifact,
 * so a term nobody has ruled on has not been reviewed, and an unreviewed alias
 * is exactly the kind that turns a grape-must syrup into mackerel. The
 * coverage test in corpus.test.js keeps the two files in lockstep so this can
 * never quietly swallow a new corpus row.
 *
 * @param {Array<Record<string,string>>} corpusRows - parsed corpus_categories.csv
 * @param {Array<Record<string,string>>} verdictRows - parsed corpus_alias_verdicts.csv
 * @returns {{terms: Array<{term: string, head: string}>, axes: Record<string, Record<string, string>>, rejected: Array<{term: string, head: string, reason: string}>}}
 */
export function buildCorpusIndex(corpusRows, verdictRows) {
  const verdict = new Map();
  for (const v of verdictRows || []) {
    const term = String(v.term || '').trim().toLowerCase();
    const head = String(v.head || '').trim().toLowerCase();
    if (!term || !head) continue;
    verdict.set(`${term}@${head}`, {
      accepted: String(v.verdict || '').trim().toLowerCase() === 'accept',
      reason: String(v.reason || '').trim(),
    });
  }

  const terms = [];
  const rejected = [];
  const axes = {};
  const rowByHead = new Map();

  for (const r of corpusRows || []) {
    const head = String(r.head || '').trim().toLowerCase();
    if (!head) continue;
    rowByHead.set(head, r);
    for (const term of [head, ...tailsOf(r)]) {
      const v = verdict.get(`${term}@${head}`);
      if (v && v.accepted) terms.push({ term, head });
      else rejected.push({ term, head, reason: v ? v.reason : 'no verdict row (fail closed)' });
    }
  }

  // Axes only for heads something can actually resolve TO. A head nothing
  // reaches would be dead weight in the table.
  for (const { head } of terms) {
    if (axes[head]) continue;
    const r = rowByHead.get(head);
    if (!r) continue;
    const row = { component: head, notes: String(r.notes || '').trim() };
    // kind rides along so the app can tell a cooking word (kind 'method':
    // grilled, seared, poached) from food. The engine never reads it.
    row.kind = String(r.kind || '').trim().toLowerCase();
    for (const a of AXES) row[a] = r[a];
    axes[head] = row;
  }

  return { terms, axes, rejected };
}

/**
 * Heads the corpus and dish_axes.csv BOTH carry but score differently. Reported,
 * never applied: dish_axes wins (see the module header). Exposed so the number
 * can be printed by the quality harness and asserted by a test rather than
 * living in a commit message.
 *
 * @param {Array<Record<string,string>>} corpusRows
 * @param {Array<Record<string,string>>} dishAxesRows
 */
export function corpusAxisDisagreements(corpusRows, dishAxesRows) {
  const dish = new Map();
  for (const d of dishAxesRows || []) {
    const c = String(d.component || '').trim().toLowerCase();
    if (c) dish.set(c, d);
  }
  const out = [];
  for (const r of corpusRows || []) {
    const head = String(r.head || '').trim().toLowerCase();
    const d = dish.get(head);
    if (!d) continue;
    const diffs = AXES.filter((a) => String(r[a] ?? '').trim() !== String(d[a] ?? '').trim())
      .map((a) => ({ axis: a, corpus: String(r[a] ?? '').trim(), dishAxes: String(d[a] ?? '').trim() }));
    if (diffs.length) out.push({ head, diffs });
  }
  return out;
}
