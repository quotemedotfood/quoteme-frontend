/**
 * parseMenu.js - a FOOD menu text parser. Deliberately NOT a reuse of
 * parseWineList.js: that parser's whole shape (producer/vintage/region/
 * price, price-as-record-boundary) is built for wine lists and does not fit
 * a food menu, where most lines have no price at all and the thing under a
 * dish name is a plain-English description, not a place/appellation line.
 *
 * There is no Python reference for this one (unlike parseWineList's
 * anti-divergence contract with wine_menu_lib.py) - this is a new, FE-only,
 * best-effort parser for PairMe's paste-first diner entry points.
 *
 * Rules (see PairMe entry-points brief):
 *  - A SECTION heading is either an ALL-CAPS line ("APPETIZERS", "MAINS",
 *    "SIDES") or a short (<=3 word) line where every word is capitalized
 *    ("Small Plates", "Family Style"). A dish name in ordinary sentence
 *    case ("Roast chicken") capitalizes only its first word and so never
 *    matches the second case - that is what keeps a short, price-less dish
 *    name from being swallowed as a section header.
 *  - A DISH is any other non-blank line: a name, plus an OPTIONAL trailing
 *    price. No price is the normal case (most menus price only some
 *    items, or none) and must never disqualify a line from being a dish.
 *  - The line immediately under a dish, IF it is a lowercase, comma
 *    separated list with no price of its own, is that dish's description
 *    (this is where the components live: "garlic, thyme, jus").
 *
 * @param {string} rawText
 * @returns {Array<{name: string, description: string, price: number|null, section: string|null}>}
 */

const TRAILING_PRICE_RE = /(?:\$\s?)?(\d{1,4}(?:\.\d{2})?)\s*$/;

/** @param {string} line @returns {{index: number, value: number}|null} */
function matchTrailingPrice(line) {
  const m = TRAILING_PRICE_RE.exec(line);
  if (!m) return null;
  const before = line.slice(0, m.index);
  if (!/[A-Za-z]/.test(before)) return null; // a bare number line, not "name + price"
  return { index: m.index, value: Number(m[1]) };
}

/** @param {string} line @returns {{name: string, price: number|null}} */
function splitTrailingPrice(line) {
  const hit = matchTrailingPrice(line);
  if (!hit) return { name: line.trim(), price: null };
  const name = line.slice(0, hit.index).trim().replace(/[\s.,-]+$/, '');
  return { name, price: hit.value };
}

function upperRatioOfLetters(line) {
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (!letters.length) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

/** @param {string} line @returns {boolean} */
function isSectionHeading(line) {
  if (matchTrailingPrice(line)) return false; // sections never carry a price
  if (line.includes(',')) return false; // a comma list is a description, never a header
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (letters.length < 2) return false;
  if (upperRatioOfLetters(line) >= 0.85) return true; // ALL-CAPS: APPETIZERS, MAINS, SIDES
  const words = line.trim().split(/\s+/).filter(Boolean);
  // Every-word-capitalized, 2-3 words ("Small Plates"). Deliberately >=2
  // words: a single capitalized word ("Bruschetta") is far more often a
  // dish name than a section, so the ALL-CAPS rule above is the only path
  // for a one-word header.
  if (words.length >= 2 && words.length <= 3 && words.every((w) => /^[A-Z]/.test(w))) return true;
  return false;
}

/** @param {string} line @returns {boolean} */
function isDescriptionLine(line) {
  if (!line) return false;
  if (matchTrailingPrice(line)) return false; // a priced line is its own dish
  if (!line.includes(',')) return false; // descriptions are comma separated components
  if (isSectionHeading(line)) return false;
  // "lowercase": overall a mostly-lowercase line, not Title Case/ALL-CAPS.
  return upperRatioOfLetters(line) < 0.5;
}

export function parseMenu(rawText) {
  const lines = String(rawText || '').split('\n').map((l) => l.trim());
  const dishes = [];
  let section = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue; // blank lines separate blocks, never a dish/section themselves

    if (isSectionHeading(line)) {
      section = line.replace(/:\s*$/, '').trim();
      continue;
    }

    const { name, price } = splitTrailingPrice(line);
    if (!name) continue;

    let description = '';
    const next = lines[i + 1];
    if (isDescriptionLine(next)) {
      description = next;
      i += 1; // consume the description line so it is never re-read as its own dish
    }

    dishes.push({ name, description, price, section });
  }

  return dishes;
}
