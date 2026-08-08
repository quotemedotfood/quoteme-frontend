/**
 * Port of wine_menu_lib.py's normalisation helpers (_norm, _boundary, _has)
 * and its Vocab class. head = English canonical, tails = native spellings,
 * alternates and misspellings; appellation -> grapes is a column, grape ->
 * appellations is the reverse index built at load, same as the Python
 * class's docstring says: "One table, two directions, no second file to
 * keep in sync."
 *
 * VOCAB below is a module-level singleton built once from the embedded
 * WINE_VOCAB_ROWS data (see wineVocabData.js), mirroring `VOCAB =
 * Vocab().load()` running once at import time in wine_menu_lib.py.
 */
import { WINE_VOCAB_ROWS } from './wineVocabData.js';

/**
 * Lowercase, unescape, and flatten +, _ and - to spaces. Port of `_norm`.
 * @param {string} s
 * @returns {string}
 */
export function norm(s) {
  let out = s || '';
  try {
    out = decodeURIComponent(out);
  } catch {
    // Python's unquote() is lenient about malformed %-escapes; mirror that
    // by leaving the string untouched rather than throwing.
  }
  out = out.replace(/\+/g, ' ').replace(/_/g, ' ').replace(/-/g, ' ');
  out = out.replace(/'/g, ' ').replace(/’/g, ' ');
  return out.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * A term matches only as a whole word or whole phrase. Port of `_boundary`.
 * @param {string} term
 * @returns {RegExp}
 */
export function boundary(term) {
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(term)}(?![a-z0-9])`);
}

/**
 * @param {string} text
 * @param {string} term
 * @returns {boolean}
 */
export function has(text, term) {
  return boundary(term).test(text);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip any of `chars` from both ends of `s`. Port of Python's str.strip(chars). */
export function stripChars(s, chars) {
  const set = new Set(chars.split(''));
  let start = 0;
  let end = s.length;
  while (start < end && set.has(s[start])) start += 1;
  while (end > start && set.has(s[end - 1])) end -= 1;
  return s.slice(start, end);
}

/** Strip any of `chars` from the RIGHT end only. Port of Python's str.rstrip(chars). */
export function rstripChars(s, chars) {
  const set = new Set(chars.split(''));
  let end = s.length;
  while (end > 0 && set.has(s[end - 1])) end -= 1;
  return s.slice(0, end);
}

/** Split on whitespace runs, dropping empty tokens. Port of Python's str.split(). */
export function pySplit(s) {
  const t = (s || '').trim();
  if (!t) return [];
  return t.split(/\s+/);
}

/**
 * Port of Vocab. Both directions work off one table loaded from
 * WINE_VOCAB_ROWS (the embedded copy of wine_vocab.csv).
 */
export class WineVocab {
  constructor() {
    this.rows = new Map(); // head -> row
    this.aliasToHead = new Map(); // any spelling -> head
    this.grapeToAppellations = new Map();
    this.grapeAlias = new Map();
    this.appellationAlias = new Map();
    this.grapePattern = null;
    this.appellationPattern = null;
  }

  /**
   * @param {Array<Record<string, string>>} csvRows - raw DictReader-shaped
   *   rows (head/kind/country/parent/color/grapes/tails/pronunciation/notes).
   * @returns {WineVocab}
   */
  load(csvRows) {
    for (const r of csvRows) {
      const head = norm(r.head || '');
      if (!head) continue;
      const kind = (r.kind || '').trim().toLowerCase();
      const tails = (r.tails || '')
        .split('|')
        .filter((t) => t.trim())
        .map((t) => norm(t));
      const grapes = (r.grapes || '')
        .split('|')
        .filter((g) => g.trim())
        .map((g) => norm(g));
      const row = {
        head,
        kind,
        country: (r.country || '').trim(),
        parent: (r.parent || '').trim(),
        color: (r.color || '').trim(),
        grapes,
        tails,
        pronunciation: (r.pronunciation || '').trim(),
        notes: (r.notes || '').trim(),
      };
      this.rows.set(head, row);
      for (const alias of [head, ...tails]) {
        this.aliasToHead.set(alias, head);
        if (kind === 'grape') this.grapeAlias.set(alias, head);
        else if (kind === 'appellation') this.appellationAlias.set(alias, head);
      }
      for (const g of grapes) {
        if (!this.grapeToAppellations.has(g)) this.grapeToAppellations.set(g, []);
        this.grapeToAppellations.get(g).push(head);
      }
    }
    this.grapePattern = compileAliasPattern(this.grapeAlias);
    this.appellationPattern = compileAliasPattern(this.appellationAlias);
    return this;
  }

  /** Returns [head, matchedAlias]. Longest match on the line wins. */
  _detect(text, pat, aliasMap) {
    if (!pat || !text) return ['', ''];
    let best = '';
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(text)) !== null) {
      if (m[1].length > best.length) best = m[1];
      if (m[0].length === 0) pat.lastIndex += 1; // guard against zero-width loops
    }
    if (!best) return ['', ''];
    return [aliasMap.get(best) || '', best];
  }

  detectAppellation(text) {
    return this._detect(text, this.appellationPattern, this.appellationAlias);
  }

  detectGrape(text) {
    return this._detect(text, this.grapePattern, this.grapeAlias);
  }

  /** How many DISTINCT wine heads appear. */
  countHeads(text) {
    const found = new Set();
    for (const [pat, amap] of [
      [this.appellationPattern, this.appellationAlias],
      [this.grapePattern, this.grapeAlias],
    ]) {
      if (pat) {
        pat.lastIndex = 0;
        let m;
        while ((m = pat.exec(text || '')) !== null) {
          found.add(amap.get(m[1]) || '');
          if (m[0].length === 0) pat.lastIndex += 1;
        }
      }
    }
    found.delete('');
    return found.size;
  }

  grapesFor(appellationHead) {
    const row = this.rows.get(appellationHead);
    return row ? row.grapes : [];
  }

  appellationsFor(grapeHead) {
    return this.grapeToAppellations.get(grapeHead) || [];
  }

  pronunciation(head) {
    const row = this.rows.get(head);
    return row ? row.pronunciation : '';
  }

  colorFor(head) {
    const row = this.rows.get(head);
    return row ? row.color : '';
  }

  countryFor(head) {
    const row = this.rows.get(head);
    return row ? row.country : '';
  }
}

/**
 * Longest alias first so 'chianti classico' wins over 'chianti'. Port of
 * Vocab._compile.
 */
function compileAliasPattern(aliasMap) {
  if (aliasMap.size === 0) return null;
  const terms = [...aliasMap.keys()].sort((a, b) => b.length - a.length);
  const body = terms.map((t) => escapeRegExp(t)).join('|');
  return new RegExp(`(?<![a-z0-9])(${body})(?![a-z0-9])`, 'g');
}

/** Module-level singleton, built once at import time (mirrors Python's
 * `VOCAB = Vocab().load()`). */
export const VOCAB = new WineVocab().load(WINE_VOCAB_ROWS);

/**
 * Port of `resolve_grape`. source is 'explicit' when the line named the
 * grape, 'appellation' when inferred from the place, '' when neither.
 * @param {string} regionHead
 * @param {string} grapeHead
 * @returns {[string, string]}
 */
export function resolveGrape(regionHead, grapeHead) {
  if (grapeHead) return [grapeHead, 'explicit'];
  if (regionHead) {
    const grapes = VOCAB.grapesFor(regionHead);
    if (grapes.length) return [grapes[0], 'appellation'];
  }
  return ['', ''];
}
