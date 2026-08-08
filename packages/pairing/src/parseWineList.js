/**
 * parseWineList.js - line-for-line port of wine_menu_lib.py's
 * `parse_wine_list` (and every helper it calls: despace, detect_shape,
 * has_bin_column, split_entry, _score_producer, _looks_like_section,
 * _is_prose, _is_tasting_note, _color_from_text).
 *
 * Cooper owns the real client side wine list parser (G1 in the PairMe API
 * Contract v1: the server returns only raw_text from POST /v1/capture, the
 * client parses it into rows locally, and the same fixture set runs in both
 * this JS parser and the Python reference implementation so the two never
 * diverge).
 *
 * Anti-divergence contract: this file's output MUST match
 * `parse_wine_list()` in wine_menu_lib.py row-for-row (or at minimum
 * count-for-count, per fixture) on identical input text. See
 * parseWineList.test.js. If you find a mismatch, the bug is in this file -
 * fix the port, never adjust the fixture.
 *
 * Six shapes this handles (see wine_menu_lib.py's own comments for the two
 * measured real-world examples that forced this design):
 *   - price_last: name / vintage / price, price ends the record (most
 *     lists: brixton, barcelona, vendome, safta, postino, barolo).
 *   - price_last with vintage FIRST and wrapped name lines (tavernetta).
 *   - price_middle: price on line two, followed by the region as its own
 *     line (casual_list). expectPlace below is that "next line is the
 *     place" state.
 *   - price_leading: the price sits ABOVE the wine (single-page
 *     Squarespace/Wix menus where food is priced the same way).
 *   - slash pricing 15/45 for glass/bottle pairs (casual_list).
 *   - a BIN COLUMN (cellar): detected at the DOCUMENT level via
 *     hasBinColumn, never per line, because a letter-suffixed shelf code
 *     (606L) is not a price, and two trailing numbers on a casual list mean
 *     glass+bottle - the same "two trailing numbers" shape means opposite
 *     things depending on which kind of list it is.
 */
import { VOCAB, norm, has, resolveGrape, pySplit, stripChars, rstripChars } from './wineVocab.js';

// ---------------------------------------------------------------------------
// Shared regexes and word lists, ported verbatim from wine_menu_lib.py.
// ---------------------------------------------------------------------------
const NUM = '(?:\\d{1,3}(?:,\\d{3})+|\\d{2,5})';
const PRICE_END = new RegExp(`(?:\\$\\s?)?(${NUM})(?:\\.\\d{2})?\\s*$`);
// Glass and bottle on the same line. The first number is only read as a
// glass price when it is 5 to 99, which excludes vintages by construction.
const PRICE_PAIR_END = new RegExp(`(?<![\\d,])(\\d{1,2})\\s+(?:\\$\\s?)?(${NUM})(?:\\.\\d{2})?\\s*$`);
const BIN_START = /^(\d{1,5})[\s.)]+/;
const VINTAGE = /(?<!\d)(19[5-9]\d|20[0-3]\d)(?!\d)/;
const NV_TOKEN = /(?<![a-z])(n\.?v\.?|m\.?v\.?|non vintage|multi vintage)(?![a-z])/i;
const NV_TOKEN_G = /(?<![a-z])(n\.?v\.?|m\.?v\.?|non vintage|multi vintage)(?![a-z])/gi;
const NV_TOKEN_FULL = /^(?:n\.?v\.?|m\.?v\.?|non vintage|multi vintage)$/i;

const SECTION_PHRASES = [
  'by the glass', 'wines by the glass', 'by the bottle', 'bottle list',
  'old world', 'new world', 'half bottles', 'large format', 'magnums',
  'red wine', 'white wine', 'rose wine', 'sparkling wine', 'orange wine',
  'dessert wine', 'fortified', 'bubbles', 'coravin', 'reserve list',
  'glass pours', 'on tap', 'half bottle',
];
const BTG_SECTION = ['by the glass', 'glass pours', 'wines by the glass', 'btg',
  'glass', 'pours', 'coravin', 'the glass'];
const SPARKLING = ['sparkling', 'champagne', 'bubbles', 'bubbly', 'franciacorta',
  'cava', 'prosecco', 'cremant', 'pet nat', 'spumante', 'metodo',
  'sekt', 'trentodoc'];
const ROSE = ['rose', 'rosato', 'rosado', 'rosé'];
const WHITE = ['white', 'bianco', 'blanc', 'blanco', 'weiss', 'blancs', 'bianchi'];
const RED = ['red', 'rosso', 'rouge', 'tinto', 'rot', 'rossi', 'rouges'];
const DESSERT = ['dessert', 'sweet', 'fortified', 'port', 'madeira', 'sherry',
  'sauternes', 'vin santo', 'passito', 'ice wine', 'tokaji'];
const ORANGE = ['orange', 'skin contact', 'skin fermented', 'amber', 'ramato'];

// The section headings that appear on virtually every wine list, used only
// inside emit() to keep a colour word out of a multi-line record's producer
// field.
const COLOR_WORDS = ['red', 'reds', 'white', 'whites', 'rose', 'rosato', 'rosado',
  'sparkling', 'bubbles', 'bubbly', 'champagne', 'orange',
  'skin contact', 'dessert', 'fortified', 'bianco', 'rosso',
  'blanc', 'rouge', 'tinto', 'vini', 'vins'];

function colorFromText(s) {
  const low = norm(s);
  const groups = [
    ['Sparkling', SPARKLING],
    ['Rose', ROSE],
    ['Orange', ORANGE],
    ['Dessert/Fortified', DESSERT],
    ['White', WHITE],
    ['Red', RED],
  ];
  for (const [label, keys] of groups) {
    if (keys.some((k) => has(low, k))) return label;
  }
  return '';
}

// ---------------------------------------------------------------------------
// 5b. RECORD ASSEMBLY -- the thing that actually decides whether we get a
// list. Measured against two real Denver lists that do not agree with each
// other: Barolo Grill is name / vintage / price, Tavernetta is vintage / n
// name lines / price. The one thing they share is that a record ENDS at a
// bare price line, so that is the record boundary.
// ---------------------------------------------------------------------------
const SPACED = /(?<![A-Za-z0-9])((?:[A-Za-z0-9]\s){1,9}[A-Za-z0-9])(?![A-Za-z0-9])/g;

/**
 * PDF letter-spacing artefacts. 'C H A M P A G N E' and '2 0 1 2' are one
 * token each in the source, and the extractor hands them back spaced out.
 * Port of `despace`.
 * @param {string} line
 * @returns {string}
 */
export function despace(line) {
  const toks = pySplit(line);
  let out = line;
  if (toks.length && toks.filter((t) => t.length === 1).length / toks.length > 0.5) {
    const joined = [];
    let run = [];
    for (const t of toks) {
      if (t.length === 1) {
        run.push(t);
      } else {
        if (run.length) {
          joined.push(run.join(''));
          run = [];
        }
        joined.push(t);
      }
    }
    if (run.length) joined.push(run.join(''));
    out = joined.join(' ');
  }
  return out.replace(SPACED, (m, g1) => g1.replace(/ /g, ''));
}

/**
 * 'Cherry, strawberry, raspberry, rose petal, cranberry, earth' is a
 * descriptor string, not part of the wine's name. Casual lists print one
 * under every wine and it must never end up in the producer field. Port of
 * `_is_tasting_note`.
 * @param {string} line
 * @returns {boolean}
 */
export function isTastingNote(line) {
  const s = rstripChars(line.trim(), ',');
  const lower = s.toLowerCase();
  if (lower === 'xxx' || lower === 'x' || lower === 'tbd') return true;
  if (isAllLower(s) && pySplit(s).length <= 2 && s.length < 14) return true;
  const parts = s.split(',').map((p) => p.trim()).filter((p) => p);
  if (parts.length < 3) return false;
  const lowerCount = parts.filter((p) => /^\p{Ll}/u.test(p)).length;
  return lowerCount / parts.length >= 0.6;
}

/** Port of Python's str.islower(): has at least one cased char, none upper. */
function isAllLower(s) {
  return /\p{Ll}/u.test(s) && !/\p{Lu}/u.test(s);
}

/**
 * Barolo Grill writes a paragraph of introduction above most regions. Those
 * lines must never end up inside a wine record. Port of `_is_prose`.
 * @param {string} line
 * @returns {boolean}
 */
export function isProse(line) {
  if (line.length > 95) return true;
  if (pySplit(line).length > 14) return true;
  return line.endsWith('.') && line.length > 45;
}

const BARE_PRICE_LINE = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d{2,5})(?:\.\d{2})?$/;
// Casual lists price by the glass and the bottle with a slash: '15/45'.
const SLASH_PRICE_LINE = /^\$?\s*(\d{1,3})\s*[/|]\s*\$?\s*(\d{2,4})\s*$/;

/**
 * Port of `_looks_like_section`. A bare title-case line is NOT enough (a
 * lot of producers are single title-case words too), so a header is either
 * ALL CAPS / ends in ':' / a known section phrase / a colour word, or a
 * known PLACE that fills essentially the whole line.
 * @param {string} line
 * @returns {boolean}
 */
export function looksLikeSection(line) {
  const s = despace(line).trim();
  if (!s || s.length > 60) return false;
  if (BARE_PRICE_LINE.test(s) || PRICE_END.test(s)) return false;
  if (NV_TOKEN_FULL.test(stripChars(s, ' .,'))) return false; // 'NV' / 'M V' are vintage markers, not headers
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3) return false;
  const upperRatio = [...letters].filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length / letters.length;
  if (upperRatio > 0.7 || s.endsWith(':')) return true;
  const n = norm(s);
  // Casual and single-page lists head their sections in lowercase: 'red
  // wine', 'white wine by the glass', 'by the bottle', 'old world'.
  if (!/\d/.test(n)) {
    if (SECTION_PHRASES.some((ph) => has(n, ph)) && pySplit(n).length <= 7) return true;
    if (pySplit(n).length <= 6 && colorFromText(n)) return true;
  }
  const [head, alias] = VOCAB.detectAppellation(n);
  // The place must fill essentially the whole line. Two characters of
  // slack, not eight: 'Contesa - Montepulciano d Abruzzo' is a WINE whose
  // name is mostly an appellation, and at eight characters of slack it was
  // being read as a section header and swallowing the record.
  return Boolean(head) && alias.length >= n.length - 2;
}

// ---------------------------------------------------------------------------
// SHAPE DETECTION
// ---------------------------------------------------------------------------
const VINTAGE_ANY = /(?<!\d)(19[5-9]\d|20[0-3]\d)(?!\d)/;

function toIntLoose(s) {
  const n = parseInt(String(s).replace(/,/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * 'price_last', 'price_middle' or 'price_leading'. Barolo and Tavernetta
 * end a record with the price. Casual lists put the price on line two and
 * follow it with the region and a tasting note. price_leading is the price
 * sitting ABOVE the wine, common on single-page Squarespace/Wix menus.
 * Same file format, opposite record layout, so the shape has to be
 * measured rather than assumed. Port of `detect_shape`.
 * @param {string} text
 * @returns {'price_last'|'price_middle'|'price_leading'}
 */
export function detectShape(text) {
  const lines = (text || '').split('\n')
    .map((l) => l.trim())
    .filter((l) => l)
    .map((l) => despace(l));

  let afterPriceIsPlace = 0;
  let afterPrice = 0;
  for (let i = 0; i < lines.length - 1; i += 1) {
    const l = lines[i];
    if (BARE_PRICE_LINE.test(l) || SLASH_PRICE_LINE.test(l)) {
      const nxt = lines[i + 1];
      const bp = BARE_PRICE_LINE.exec(nxt);
      if (bp) {
        const v = toIntLoose(nxt);
        if (v >= 1950 && v <= 2035) continue;
      }
      afterPrice += 1;
      const [head] = VOCAB.detectAppellation(norm(nxt));
      if (head || /,\s*[A-Z]{2}$/.test(nxt)) afterPriceIsPlace += 1;
    }
  }

  let afterSection = 0;
  for (let i = 0; i < lines.length - 1; i += 1) {
    const l = lines[i];
    if (!looksLikeSection(l)) continue;
    const nxt = lines[i + 1];
    const m = BARE_PRICE_LINE.exec(nxt);
    const isVint = Boolean(m) && (() => {
      const v = toIntLoose(m[1]);
      return v >= 1950 && v <= 2035;
    })();
    if (SLASH_PRICE_LINE.test(nxt) || (m && !isVint)) afterSection += 1;
  }
  if (afterSection >= 2) return 'price_leading';

  let lead = 0;
  let trail = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    if (!(BARE_PRICE_LINE.test(l) || SLASH_PRICE_LINE.test(l))) continue;
    const bp = BARE_PRICE_LINE.exec(l);
    if (bp) {
      const v = toIntLoose(bp[1]);
      if (v >= 1950 && v <= 2035) continue;
    }
    const nxt = i + 1 < lines.length ? lines[i + 1] : '';
    const prv = i ? lines[i - 1] : '';
    if (VINTAGE_ANY.test(nxt) || VOCAB.countHeads(norm(nxt)) > 0) lead += 1;
    if (VINTAGE_ANY.test(prv) || VOCAB.countHeads(norm(prv)) > 0) trail += 1;
  }
  if (lead >= 4 && lead > trail * 1.5) return 'price_leading';
  if (afterPrice >= 4 && afterPriceIsPlace / afterPrice >= 0.4) return 'price_middle';
  return 'price_last';
}

// ---------------------------------------------------------------------------
// SHAPE: THE CELLAR LIST WITH A BIN COLUMN
// A serious cellar list prints producer, wine, region, vintage ... PRICE BIN
// where the bin is a cellar location, often with a letter suffix: 606L,
// 815R. Detected at the DOCUMENT level, because guessing per line would
// corrupt the glass-and-bottle pair shape, where two trailing numbers mean
// something else.
// ---------------------------------------------------------------------------
const PRICE_THEN_BIN = /(?<![\d,])(\d{1,3}(?:,\d{3})*|\d{1,5})\s{2,}(\d{1,5}[A-Za-z]{0,2})\s*$/;
const BIN_LETTER_TELL = /\d\s{2,}\d{1,5}[A-Za-z]{1,2}\s*$/;
const BIN_DOTS_TELL = /[.…]{2,}\s*\d{1,5}\s{2,}\d{1,5}[A-Za-z]{0,2}\s*$/;

/**
 * A letter-suffixed trailing token is the reliable tell. Dot leaders
 * followed by two numbers is the second. Either one, and the LAST number
 * on every line is a bin rather than a price. Port of `has_bin_column`.
 * @param {string} text
 * @returns {boolean}
 */
export function hasBinColumn(text) {
  let letter = 0;
  let dots = 0;
  for (const raw of (text || '').split('\n')) {
    const ln = raw.replace(/\s+$/, '');
    if (BIN_LETTER_TELL.test(ln)) letter += 1;
    if (BIN_DOTS_TELL.test(ln)) dots += 1;
  }
  return letter >= 2 || dots >= 3;
}

// ---------------------------------------------------------------------------
// PRODUCER / CUVEE SPLITTING
// ---------------------------------------------------------------------------
const PRODUCER_MARKERS = [
  'weingut', 'domaine', 'dom', 'chateau', 'ch', 'tenuta', 'tenute', 'azienda',
  'cantina', 'cantine', 'podere', 'poderi', 'fattoria', 'schloss', 'bodegas',
  'quinta', 'castello', 'cascina', 'feudo', 'marchesi', 'famiglia', 'maison',
  'villa', 'borgo', 'ronco', 'ronchi', 'casa', 'vigneti', 'vignai', 'clos',
  'chateau', 'estate', 'winery', 'cellars', 'vinicola', 'societa agricola',
];
const DESIGNATIONS = [
  'brut', 'extra brut', 'brut nature', 'nature', 'dosage zero', 'non dose',
  'riserva', 'reserve', 'reserva', 'gran selezione', 'classico', 'superiore',
  'secco', 'sec', 'demi sec', 'dry', 'trocken', 'halbtrocken', 'kabinett',
  'spatlese', 'auslese', 'beerenauslese', 'smaragd', 'federspiel', 'steinfeder',
  'grosses gewachs', 'erste lage', 'premier cru', 'grand cru', '1er cru',
  'vieilles vignes', 'vv', 'metodo classico', 'ancestrale', 'spumante',
  'rosato', 'rosso', 'bianco', 'blanc de blancs', 'blanc de noirs', 'rose',
  'magnum', 'jeroboam', 'imperial', 'en magnum', 'en jeroboam', 'qba',
  'gran riserva', 'single vineyard', 'old vine', 'cuvee', 'millesime',
];
const DESIGNATIONS_BY_LEN = [...DESIGNATIONS].sort((a, b) => b.length - a.length);
const COUNTRY_WORDS = ['france', 'italy', 'spain', 'portugal', 'germany', 'austria',
  'greece', 'hungary', 'usa', 'california', 'oregon', 'washington',
  'new york', 'colorado', 'argentina', 'chile', 'australia',
  'new zealand', 'south africa', 'slovenia', 'canada', 'israel'];

/**
 * A bare country or state is never the producer, a chunk that IS a grape or
 * place is not the producer, and a chunk carrying Weingut/Tenuta/Domaine/
 * Castello almost certainly is. Port of `_score_producer`.
 * @param {string} chunk
 * @returns {number}
 */
export function scoreProducer(chunk) {
  const low = norm(chunk);
  if (!low || !/[a-z]/.test(low)) return -99;
  if (COUNTRY_WORDS.some((c) => has(low, c)) && pySplit(low).length <= 3) return -98;
  let score = 0;
  if (PRODUCER_MARKERS.some((m) => has(low, m))) score += 4;
  const [g] = VOCAB.detectGrape(low);
  const [a] = VOCAB.detectAppellation(low);
  if (g) score -= 4;
  if (a) score -= 3;
  if (DESIGNATIONS.some((d) => has(low, d))) score -= 2;
  if (pySplit(low).length > 6) score -= 1;
  return score;
}

const QUOTED = /[‘'“"]([^’'”"]{2,60})[’'”"]/;

/**
 * Returns [producer, cuvee, remainder]. Barolo puts the producer before or
 * after a quoted cuvee. Tavernetta leads with the producer then
 * comma-separates grape, cuvee and place. Rather than guess by position,
 * every candidate chunk is scored. Port of `split_entry`.
 * @param {string} body
 * @returns {[string, string, string]}
 */
export function splitEntry(body) {
  let cuvee = '';
  const m = QUOTED.exec(body);
  let chunks;
  if (m) {
    cuvee = stripChars(m[1], ' ,');
    chunks = [body.slice(0, m.index), body.slice(m.index + m[0].length)];
  } else {
    chunks = [body];
  }
  let parts = [];
  for (const c of chunks) {
    // spaced hyphen is a field separator on stacked lists, comma is not
    const pieces = c.split(/\s+[-–]\s+|[|,]/);
    for (const p of pieces) {
      const stripped = stripChars(p, ' ,.–-');
      if (stripped) parts.push(stripped);
    }
  }
  if (parts.length === 0) return ['', cuvee, body];
  const scored = parts.map((p, i) => ({ score: scoreProducer(p), i, p }));
  scored.sort((x, y) => (y.score - x.score) || (x.i - y.i));
  const producer = scored[0].score > -99 ? scored[0].p : parts[0];
  const remainder = parts.filter((p) => p !== producer).join(' | ');
  return [producer, cuvee, remainder];
}

// ---------------------------------------------------------------------------
// MAIN PARSE
// ---------------------------------------------------------------------------
const FMT_SIZES = [
  ['half', ['375', '375ml', 'half bottle', 'half btl']],
  ['500ml', ['500ml', '50cl']],
  ['magnum', ['1.5l', '1500', '1500ml', 'magnum', 'en magnum']],
  ['large', ['3l', '5l', '6l', '9l', 'jeroboam', 'imperial',
    'methuselah', 'double magnum', 'salmanazar', 'en jeroboam']],
  ['can', ['can', 'cans', '250ml can']],
  ['glass', ['by the glass', 'glass', 'btg', '3oz', '5oz', '6oz']],
];

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Turn wine list text into structured rows, one per wine. Permissive on
 * purpose. Every row keeps its raw text and reports a confidence, so a bad
 * parse is auditable rather than silently wrong. Port of `parse_wine_list`.
 *
 * @param {string} rawText - the raw_text field from POST /v1/capture.
 * @param {string} [restaurantName]
 * @param {string} [placeId]
 * @param {string} [sourceUrl]
 * @param {string} [listDate]
 * @returns {Array<Record<string, any>>}
 */
export function parseWineList(rawText, restaurantName = '', placeId = '', sourceUrl = '', listDate = '') {
  const rows = [];
  let section = '';
  let color = '';
  let inBtg = false;
  let buf = [];
  const shape = detectShape(rawText);
  const binCol = hasBinColumn(rawText);
  let expectPlace = false; // price_middle: the line after a price is the place
  let heldPrice = null; // price_leading: the price arrives before the wine
  let heldGlass = '';

  function emit(bodyLines, price, glassPrice = '', binOverride = '') {
    let body = bodyLines.join(' ');
    body = stripChars(body.replace(/\s+/g, ' ').trim(), ' |,-.');
    if (body.replace(/[^A-Za-z]/g, '').length < 4) return;

    let vintage = '';
    const vm = VINTAGE.exec(body);
    if (vm) {
      vintage = vm[1];
      body = `${body.slice(0, vm.index)} ${body.slice(vm.index + vm[0].length)}`;
    } else if (NV_TOKEN.test(body)) {
      vintage = 'NV';
      body = body.replace(NV_TOKEN_G, ' ');
    }
    body = stripChars(body.replace(/\s+/g, ' ').trim(), ' |,-.');

    let binNo = binOverride;
    if (!binNo) {
      const bm = BIN_START.exec(body);
      if (bm) {
        binNo = bm[1];
        body = body.slice(bm[0].length).trim();
      }
    }

    const low = norm(body);
    const [regionHead, regionAlias] = VOCAB.detectAppellation(low);
    const [grapeHead] = VOCAB.detectGrape(low);
    const [grapeResolved, grapeSource] = resolveGrape(regionHead, grapeHead);

    let fmt = inBtg || glassPrice ? 'glass' : 'bottle';
    for (const [label, keys] of FMT_SIZES) {
      if (keys.some((k) => has(low, k))) {
        fmt = label;
        break;
      }
    }

    const designation = DESIGNATIONS_BY_LEN.find((d) => has(low, d)) || '';
    let [producer, cuvee, remainder] = splitEntry(body);

    // A multi-line record puts the trade name on its own first line. If
    // that line carries no grape, no appellation and no price, it IS the
    // producer, and it beats anything the chunk scorer can infer from the
    // detail line.
    if (bodyLines.length >= 2) {
      const headLine = stripChars(String(bodyLines[0]).trim(), ' ,.-|');
      const hl = norm(headLine);
      if (
        headLine
        && headLine.length < 60
        && !/\d/.test(headLine)
        && !VOCAB.detectGrape(hl)[0]
        && !VOCAB.detectAppellation(hl)[0]
        && !COLOR_WORDS.some((c) => has(hl, c))
      ) {
        producer = rstripChars(headLine, ' *');
      }
    }

    let conf = 20;
    conf += vintage ? 20 : 0;
    conf += regionHead ? 20 : 0;
    conf += grapeHead ? 15 : 0;
    conf += cuvee ? 10 : 0;
    conf += producer && scoreProducer(producer) > 0 ? 10 : 0;
    conf += binNo ? 5 : 0;
    conf = Math.min(conf, 100);

    rows.push({
      place_id: placeId,
      restaurant_name: restaurantName,
      source_url: sourceUrl,
      list_date: listDate,
      section,
      color: color || colorFromText(body) || VOCAB.colorFor(regionHead),
      format: fmt,
      bin: binNo,
      producer,
      wine_name: cuvee || remainder.slice(0, 60),
      designation,
      vintage,
      region_head: regionHead,
      region_as_written: regionAlias,
      grape_head: grapeResolved,
      grape_source: grapeSource,
      country: VOCAB.countryFor(regionHead) || VOCAB.countryFor(grapeResolved),
      pronunciation: VOCAB.pronunciation(regionHead) || VOCAB.pronunciation(grapeResolved),
      glass_price: glassPrice,
      price,
      raw_line: body.slice(0, 300),
      parse_confidence: conf,
      date_found: TODAY,
    });
  }

  for (const raw of (rawText || '').split('\n')) {
    const line = despace(raw.trim());
    if (!line || line.length < 2) continue;

    const lower = line.trim().toLowerCase();
    if (lower === 'back to top' || lower === 'back to menu') {
      if (shape === 'price_leading' && heldPrice && buf.length) emit(buf, heldPrice, heldGlass);
      buf = [];
      heldPrice = null;
      heldGlass = '';
      continue;
    }

    if (buf.length === 0 && looksLikeSection(line)) {
      if (shape === 'price_leading' && heldPrice && buf.length) {
        emit(buf, heldPrice, heldGlass);
        buf = [];
        heldPrice = null;
        heldGlass = '';
      }
      section = stripChars(line, ': ');
      color = colorFromText(section) || color;
      inBtg = BTG_SECTION.some((k) => has(norm(section), k));
      continue;
    }

    if (isTastingNote(line)) continue;
    if (isProse(line)) {
      buf = [];
      continue;
    }

    if (expectPlace) {
      expectPlace = false;
      if (rows.length) {
        const r = rows[rows.length - 1];
        const [head, alias] = VOCAB.detectAppellation(norm(line));
        if (head && !r.region_head) {
          r.region_head = head;
          r.region_as_written = alias;
          r.country = r.country || VOCAB.countryFor(head);
          r.pronunciation = r.pronunciation || VOCAB.pronunciation(head);
          if (!r.grape_source) {
            const [g, src] = resolveGrape(head, '');
            r.grape_head = g;
            r.grape_source = src;
          }
          r.parse_confidence = Math.min(r.parse_confidence + 20, 100);
        }
        r.raw_line = `${r.raw_line} | ${line}`.slice(0, 300);
      }
      // In this shape the line after the price IS the place line, so it is
      // consumed whether or not we recognised it. Letting an unrecognised
      // place fall through shifts every following record.
      continue;
    }

    if (shape === 'price_leading') {
      const sp = SLASH_PRICE_LINE.exec(line);
      const bp = BARE_PRICE_LINE.exec(line);
      const isVint = Boolean(bp) && (() => {
        const v = toIntLoose(bp[1]);
        return v >= 1950 && v <= 2035;
      })();
      if (sp || (bp && !isVint)) {
        if (heldPrice && buf.length) emit(buf, heldPrice, heldGlass);
        buf = [];
        if (sp) {
          heldGlass = toIntLoose(sp[1]);
          heldPrice = toIntLoose(sp[2]);
        } else {
          heldGlass = '';
          heldPrice = toIntLoose(bp[1]);
        }
        continue;
      }
      buf.push(line);
      if (buf.length > 4) buf = buf.slice(-4);
      continue;
    }

    const sp = SLASH_PRICE_LINE.exec(line);
    if (sp && buf.length) {
      emit(buf, toIntLoose(sp[2]), toIntLoose(sp[1]));
      buf = [];
      expectPlace = shape === 'price_middle';
      continue;
    }

    const bp = BARE_PRICE_LINE.exec(line);
    if (bp) {
      const value = toIntLoose(bp[1]);
      if (value >= 1950 && value <= 2035 && !bp[1].includes(',')) {
        buf.push(String(value)); // a vintage on its own line
        continue;
      }
      if (buf.length === 0) {
        continue; // a page number, nothing above it
      }
      if (value >= 5 && value <= 100000) emit(buf, value);
      buf = [];
      expectPlace = shape === 'price_middle';
      continue;
    }

    if (binCol) {
      const bm2 = PRICE_THEN_BIN.exec(line);
      if (bm2 && /[A-Za-z]/.test(line.slice(0, bm2.index))) {
        emit([...buf, line.slice(0, bm2.index)], toIntLoose(bm2[1]), '', bm2[2]);
        buf = [];
        continue;
      }
    }

    const pm = PRICE_PAIR_END.exec(line);
    if (pm && Number(pm[1]) >= 5 && Number(pm[1]) <= 99) {
      emit([...buf, line.slice(0, pm.index)], toIntLoose(pm[2]), Number(pm[1]));
      buf = [];
      continue;
    }
    const pe = PRICE_END.exec(line);
    if (pe && /[A-Za-z]/.test(line.slice(0, pe.index))) {
      const value = toIntLoose(pe[1]);
      if (value >= 5 && value <= 100000) emit([...buf, line.slice(0, pe.index)], value);
      buf = [];
      continue;
    }

    buf.push(line);
    if (buf.length > 6) buf = buf.slice(-6);
  }

  if (shape === 'price_leading' && heldPrice && buf.length) emit(buf, heldPrice, heldGlass);
  return rows;
}
