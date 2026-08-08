import { describe, it, expect } from 'vitest';
import { parseWineList, detectShape, hasBinColumn } from './parseWineList.js';
import { loadWineListFixture, WINE_LIST_FIXTURE_NAMES } from './loadWineListFixtures.js';

/**
 * Anti-divergence spec: every count here was captured by running
 * wine_menu_lib.py's own `parse_wine_list()` against the EXACT text
 * committed in packages/pairing/data/wine_list_fixtures/{name}.txt (same
 * command the seven text fixtures always used):
 *
 *   WINE_VOCAB=/path/to/wine_vocab.csv python3 -c "
 *     import wine_menu_lib as w
 *     text = open('data/wine_list_fixtures/<name>.txt', encoding='utf-8').read()
 *     print(len(w.parse_wine_list(text, restaurant_name='<name>')))
 *   "
 *
 * barolo.txt and tavernetta.txt are not hand-typed text - they come from
 * "barolo wine.pdf" and the Tavernetta PDF, which wine_menu_lib.py has no
 * extraction step for (its own CLI just does `open(path).read()`). PINNED
 * EXTRACTION CONTRACT (see also PARSER_CONTRACT.md): PyMuPDF's
 * `page.get_text()` with DEFAULT args (no "text"/"blocks" mode string, no
 * sort=True), per page, pages joined with a single "\n". This is the exact
 * param set both committed .txt files were produced with; do not
 * re-extract with different params and do not call a PDF library at test
 * time (loadWineListFixtures.js only ever reads the committed .txt files).
 *
 * With these params barolo/tavernetta land at exactly 1832/807, matching
 * the hand-verified acceptance numbers below with no tolerance window
 * needed. If any assertion here fails, the bug is in parseWineList.js -
 * fix the port, never the fixture. Do not change the fixture text to hit
 * the number.
 */

// Captured from the Python reference run described above, against the
// EXACT files in data/wine_list_fixtures/.
const PY_REFERENCE = {
  brixton: { count: 23, shape: 'price_last', binCol: false },
  barcelona: { count: 390, shape: 'price_last', binCol: false },
  vendome: { count: 112, shape: 'price_last', binCol: false },
  cellar: { count: 22, shape: 'price_last', binCol: true },
  casual_list: { count: 9, shape: 'price_middle', binCol: false },
  safta: { count: 5, shape: 'price_last', binCol: false },
  postino: { count: 21, shape: 'price_last', binCol: false },
  barolo: { count: 1832, shape: 'price_last', binCol: false },
  // Under the pinned extraction params (no sort=True; see file-level
  // comment) tavernetta's price genuinely sits ahead of the wine name on
  // more lines than not - detectShape() correctly reads this text as
  // price_leading, a real documented shape (see parseWineList.js), not a
  // detection bug. The row count (807) is what the acceptance table below
  // holds authoritative, and it matches exactly.
  tavernetta: { count: 807, shape: 'price_leading', binCol: false },
};

// The task's own hand-verified acceptance numbers. With the pinned
// extraction params (see file-level comment above) all nine fixtures,
// including the two PDF-derived ones, match this exactly.
const HAND_VERIFIED = {
  brixton: 23,
  barcelona: 390,
  vendome: 112,
  cellar: 22, // "of 23" per the task - see the dedicated bin-column test below
  casual_list: 9,
  safta: 5,
  postino: 21,
  barolo: 1832,
  tavernetta: 807,
};

describe('parseWineList matches the Python reference (parse_wine_list) count-for-count', () => {
  for (const name of WINE_LIST_FIXTURE_NAMES) {
    it(`${name}: shape, bin-column detection, and row count all match`, () => {
      const text = loadWineListFixture(name);
      const ref = PY_REFERENCE[name];

      expect(detectShape(text)).toBe(ref.shape);
      expect(hasBinColumn(text)).toBe(ref.binCol);

      const rows = parseWineList(text);
      expect(rows.length).toBe(ref.count);
    });
  }
});

describe('acceptance table (hand-verified counts from the task)', () => {
  it('brixton: 23', () => {
    expect(parseWineList(loadWineListFixture('brixton')).length).toBe(HAND_VERIFIED.brixton);
  });
  it('barcelona: 390', () => {
    expect(parseWineList(loadWineListFixture('barcelona')).length).toBe(HAND_VERIFIED.barcelona);
  });
  it('vendome: 112', () => {
    expect(parseWineList(loadWineListFixture('vendome')).length).toBe(HAND_VERIFIED.vendome);
  });
  it('safta: 5', () => {
    expect(parseWineList(loadWineListFixture('safta')).length).toBe(HAND_VERIFIED.safta);
  });
  it('postino: 21', () => {
    expect(parseWineList(loadWineListFixture('postino')).length).toBe(HAND_VERIFIED.postino);
  });
  it('casual_list: 9', () => {
    expect(parseWineList(loadWineListFixture('casual_list')).length).toBe(HAND_VERIFIED.casual_list);
  });

  it('cellar: 22 of 23, a bin column document, and every PRICE is the wine price - never the bin', () => {
    const text = loadWineListFixture('cellar');
    expect(hasBinColumn(text)).toBe(true);
    const rows = parseWineList(text);
    expect(rows.length).toBe(HAND_VERIFIED.cellar);
    // The bug this whole shape guards against: taking the LAST number on
    // the line turns a bin code into the price (a $65 wine reading as 813,
    // per the source's own worked example). Every parsed price here must be
    // a plausible dollar amount, and the bin (when present) must be a
    // shelf-code-shaped token, never equal to the price.
    for (const r of rows) {
      expect(r.price).toBeGreaterThanOrEqual(5);
      expect(r.price).toBeLessThanOrEqual(100000);
      if (r.bin) {
        expect(r.bin).not.toBe(String(r.price));
      }
    }
  });

  // barolo/tavernetta: with the pinned PyMuPDF extraction params (see the
  // file-level comment above and PARSER_CONTRACT.md), the committed .txt
  // fixtures now match the hand-verified target exactly - no tolerance
  // window needed.
  it('barolo: 1832', () => {
    const rows = parseWineList(loadWineListFixture('barolo'));
    expect(rows.length).toBe(HAND_VERIFIED.barolo);
    expect(rows.length).toBe(PY_REFERENCE.barolo.count);
  });
  it('tavernetta: 807', () => {
    const rows = parseWineList(loadWineListFixture('tavernetta'));
    expect(rows.length).toBe(HAND_VERIFIED.tavernetta);
    expect(rows.length).toBe(PY_REFERENCE.tavernetta.count);
  });
});
