/**
 * PAIRIT: SLIPS AND "DID YOU MEAN" (Moose 11-15, Assemblage's order).
 *
 * Moose said "Roasted brussel sprouts" and got "We're not sure what this
 * is." The tables say "brussels sprout". Two rules, both read against the
 * same words the resolver matches (dish_axes keys and the accepted corpus
 * terms, each pointing at its head):
 *
 *   SLIP (rule 1), read silently, no prompt: every word of a table term
 *   matches a word of the dish in order, each either the same, or the same
 *   but for one trailing s, or, on a word of 6+ letters, one letter off.
 *
 *   CLOSE (rule 2), only ever offered as "Did you mean ...?": looser. A word
 *   of 4 or 5 letters may be one letter off, a word of 6+ letters two.
 *   Words under 4 letters must match (or be a trailing-s slip).
 *
 * A cooking word alone (a head of kind 'method': grilled, seared, poached)
 * is never matched here: it never makes a dish readable and never comes
 * back as a suggestion (rule 5). "Roasted" and "fried" are in no table.
 *
 * Nothing dietary is read: the text goes through the resolver's own scrub
 * first, so "no brussel sprouts" is not cabbage.
 *
 * A suggestion is a word in our tables, matched on its spelling and shown
 * to the diner, who decides. Nothing is joined or stored on it.
 */
import { stripDietary, withoutNegated } from './dietary.js';
import { singularize } from './resolveComponents.js';

const WORD = /[a-zà-ɏ]+/g;

/** Levenshtein distance, stopping early once past `cap`. */
export function editDistance(a, b, cap = 3) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= b.length; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < low) low = cur[j];
    }
    if (low > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Rule 1, one word: the same, the same once both are singular (the
 * resolver's own rule, so a trailing s either way: "brussel"/"brussels",
 * "sprouts"/"sprout"), or one letter off at 6+ letters.
 */
export function isSlip(w, k) {
  if (w === k) return true;
  if (singularize(w) === singularize(k)) return true;
  return w.length >= 6 && k.length >= 6 && editDistance(w, k, 1) === 1;
}

/** Rule 2, one word: how far off, or -1 when not close enough to offer. */
export function closeness(w, k) {
  if (w === k) return 0;
  if (isSlip(w, k)) return 1;
  const n = Math.min(w.length, k.length);
  if (n < 4) return -1;
  const most = n >= 6 ? 2 : 1;
  const d = editDistance(w, k, most);
  return d <= most ? d : -1;
}

const vocabCache = new WeakMap();
/** The terms the resolver matches, each with its head, cooking words left out. */
export function slipVocab(T) {
  if (!T) return [];
  if (vocabCache.has(T)) return vocabCache.get(T);
  const methods = new Set(T.methods || []);
  const out = [];
  const seen = new Set();
  const push = (term, head) => {
    const t = String(term || '').trim().toLowerCase();
    const h = String(head || '').trim().toLowerCase();
    if (!t || !h || methods.has(h) || seen.has(`${t}@${h}`)) return;
    const words = t.match(WORD);
    if (!words) return;
    seen.add(`${t}@${h}`);
    out.push({ term: t, head: h, words, at });
  };
  // `at`: the term's place in the tables as written. dish_axes keys first,
  // then the corpus in its own order (a head, then its spellings as listed).
  let at = 0;
  const keys = Array.isArray(T.dishVocab) ? T.dishVocab : Object.keys(T.dish || {});
  keys.forEach((k, i) => { at = i; push(k, k); });
  (T.corpusTerms || []).forEach((t, i) => { at = keys.length + (Number.isInteger(t.at) ? t.at : i); push(t.term, t.head); });
  vocabCache.set(T, out);
  return out;
}

/** The dish's words with where each sits in the text, dietary words scrubbed. */
function wordsOf(text) {
  const clean = withoutNegated(stripDietary(String(text || '').toLowerCase()));
  const out = [];
  let m;
  WORD.lastIndex = 0;
  while ((m = WORD.exec(clean)) !== null) out.push(m[0]);
  return out;
}

/** Every window of the dish's words that a term covers, scored by `score`. */
function windows(words, entry, score) {
  const hits = [];
  const k = entry.words.length;
  for (let i = 0; i + k <= words.length; i += 1) {
    let total = 0;
    let ok = true;
    for (let j = 0; j < k; j += 1) {
      const d = score(words[i + j], entry.words[j]);
      if (d < 0) { ok = false; break; }
      total += d;
    }
    if (ok) hits.push({ at: i, total });
  }
  return hits;
}

/** Rule 1: the heads a dish's text reaches through slips. */
export function slipHeads(text, T) {
  const words = wordsOf(text);
  if (!words.length) return [];
  const heads = [];
  for (const e of slipVocab(T)) {
    if (heads.includes(e.head)) continue;
    if (windows(words, e, (w, k) => (isSlip(w, k) ? 0 : -1)).length) heads.push(e.head);
  }
  return heads;
}

/**
 * Rule 2: the one closest term to the dish's text, or null. The dish's own
 * wording is kept and only the words that were off are swapped:
 * "Roasted brocolli" -> "Roasted broccoli". Ties go to the longer term, then
 * the table's order.
 * @returns {{ text: string, head: string } | null}
 */
export function closestTerm(text, T) {
  const original = String(text || '');
  const spans = [];
  let m;
  const re = /[a-zà-ɏ]+/gi;
  while ((m = re.exec(original)) !== null) spans.push({ word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  // Only words that survive the dietary scrub may be matched.
  const kept = wordsOf(original);
  if (!kept.length) return null;
  const words = spans.map((s) => s.word);
  let best = null;
  for (const e of slipVocab(T)) {
    for (const hit of windows(words, e, closeness)) {
      if (hit.total === 0) continue;
      const span = words.slice(hit.at, hit.at + e.words.length);
      if (!span.every((w) => kept.includes(w))) continue;
      const better = !best || hit.total < best.total
        || (hit.total === best.total && e.term.length > best.entry.term.length);
      if (better) best = { entry: e, at: hit.at, total: hit.total };
    }
  }
  if (!best) return null;
  const from = spans[best.at].start;
  const to = spans[best.at + best.entry.words.length - 1].end;
  return { text: `${original.slice(0, from)}${best.entry.term}${original.slice(to)}`, head: best.entry.head };
}

/**
 * THE SHOWN SPELLING (Moose's walk of #218, 11-16: the count page and the
 * lane label read "Brussel sprouts").
 *
 * A dish's shown name is the shopper's words. Where those words are a slip of
 * a food in the tables (rule 1, read with no prompt), the name is shown in
 * the tables' spelling of that food, so what is on screen is what we read.
 *
 * The tables can hold several spellings of one food under one head
 * ("brussels sprout", "brussels sprouts", "brussel sprout", "brussel
 * sprouts", all cabbage). They carry no mark for the proper one, so the
 * proper one is the spelling the tables list FIRST for that head.
 *
 *   - Words said exactly as some table term has them belong to that term's
 *     food: only its head's spellings that differ by a trailing s are looked
 *     at. A word spelled as the tables spell it is never traded for another
 *     word a letter away.
 *   - Words in no table term take the first-listed term they slip to.
 *   - The last word keeps the shopper's own singular or plural ("sprouts"
 *     stays "sprouts"); every other word takes the tables' spelling.
 *
 * Only words that survive the dietary scrub are touched. Nothing is joined
 * on the name and nothing is stored: this changes letters on screen only.
 * Writer: the tables (pairItTables). Reader: pairItMeal.js shownName.
 */
const sameButS = (w, k) => w === k || singularize(w) === singularize(k);
export function shownSpelling(text, T) {
  const original = String(text || '');
  const spans = [];
  let m;
  const re = /[a-zà-ɏ]+/gi;
  while ((m = re.exec(original)) !== null) spans.push({ word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  if (!spans.length) return original;
  const kept = wordsOf(original);
  const words = spans.map((s) => s.word);
  const vocab = slipVocab(T);
  // Every window a term reaches by rule 1, with the terms that reach it.
  const byWindow = new Map();
  for (const e of vocab) {
    for (const hit of windows(words, e, (w, k) => (isSlip(w, k) ? 0 : -1))) {
      const key = `${hit.at}:${e.words.length}`;
      if (!byWindow.has(key)) byWindow.set(key, { at: hit.at, n: e.words.length, entries: [] });
      byWindow.get(key).entries.push(e);
    }
  }
  // Longest windows first; a word is respelled by one window only.
  const taken = new Set();
  const swaps = [];
  [...byWindow.values()].sort((a, b) => b.n - a.n || a.at - b.at).forEach((win) => {
    const idx = Array.from({ length: win.n }, (_, j) => win.at + j);
    if (idx.some((i) => taken.has(i) || !kept.includes(words[i]))) return;
    const said = idx.map((i) => words[i]);
    // Said as a term has it: every word the same, the last one give or take its s.
    const exact = win.entries.filter((e) => e.words.every((k, j) => (j === win.n - 1 ? sameButS(said[j], k) : k === said[j])));
    const family = exact.length
      ? win.entries.filter((e) => exact.some((x) => x.head === e.head) && e.words.every((k, j) => sameButS(said[j], k)))
      : win.entries;
    const proper = family.reduce((a, b) => (b.at < a.at ? b : a));
    idx.forEach((i, j) => {
      taken.add(i);
      const last = j === win.n - 1;
      const k = proper.words[j];
      if (said[j] === k || (last && sameButS(said[j], k))) return;
      swaps.push({ ...spans[i], to: k });
    });
  });
  if (!swaps.length) return original;
  let out = original;
  swaps.sort((a, b) => b.start - a.start).forEach((s) => { out = `${out.slice(0, s.start)}${s.to}${out.slice(s.end)}`; });
  return out;
}
