import { describe, it, expect } from 'vitest';
import { buildDemoRows, DEMO_DISHES } from './demoSeed.js';
import { dishToEngineDish } from './pairingAdapter.js';
import { buildWineListModel } from './wineListEngine.js';
import { getOfflineTables } from './offlinePairing.js';
import { DEMO as SEEDED_DEMO_WINES } from '../../../../packages/pairing/src/demoFixtures.js';

// The exact seeded wine list the /t/demo path renders (same buildDemoRows()
// call state.js's OFFLINE_WINE_ROWS makes), so these tests exercise the real
// producer/wine_name/region_head/grape_head data Moose will actually see,
// not a hand-picked toy fixture.
const SEEDED_ROWS = buildDemoRows(SEEDED_DEMO_WINES);
const T = getOfflineTables();

function dish(id) {
  return dishToEngineDish(DEMO_DISHES.find((d) => d.id === id));
}

describe('buildWineListModel - color tabs', () => {
  it('(a) only produces tabs for colors actually present, never an empty one', () => {
    const model = buildWineListModel(SEEDED_ROWS, [], T);
    expect(model.colors.length).toBeGreaterThan(0);
    for (const color of model.colors) {
      const total = model.byColor[color].countries.reduce(
        (n, cg) => n + (cg.topPick ? 1 : 0) + cg.regions.reduce((m, r) => m + r.wines.length, 0),
        0
      );
      expect(total).toBeGreaterThan(0);
    }
    // The seeded list is red/white/rose/sparkling/dessert-heavy (see
    // wineListVocab.js's KNOWN LIMITATION note for why a couple of these
    // wines land on a color a sommelier would dispute); it has no orange
    // wine at all, so Orange must never appear as a tab.
    expect(model.colors).not.toContain('Orange');
    expect(model.colors).toContain('White');
    expect(model.colors).toContain('Red');
  });
});

describe('buildWineListModel - country grouping', () => {
  it('(b) groups a color tab into distinct country sections, each holding only its own wines', () => {
    const model = buildWineListModel(SEEDED_ROWS, [], T);
    const redSection = model.byColor.Red;
    expect(redSection.countries.length).toBeGreaterThan(1); // France + USA at least
    const countryNames = redSection.countries.map((cg) => cg.country);
    expect(new Set(countryNames).size).toBe(countryNames.length); // no duplicate country sections
    for (const cg of redSection.countries) {
      const wines = cg.regions.flatMap((r) => r.wines);
      for (const w of wines) {
        expect(w.country).toBe(cg.country);
        expect(w.color).toBe('Red');
      }
    }
  });
});

describe('buildWineListModel - badges with picked dishes, no single winner', () => {
  it('(c) never crowns one wine as THE best match: no bestKey/topPick surface exists, and multiple wines can carry a defensible badge', () => {
    const picked = [dish('e6'), dish('e9')]; // Chicken roti + Steak frites Aquitaine, the app's own default demo picks
    const model = buildWineListModel(SEEDED_ROWS, picked, T);

    // The model must not expose any single-winner concept at all.
    expect(model.bestKey).toBeUndefined();

    let badgedCount = 0;
    for (const color of model.colors) {
      for (const cg of model.byColor[color].countries) {
        expect(cg.topPick).toBeUndefined();
        for (const r of cg.regions) {
          for (const w of r.wines) {
            // Every badged wine's pairing is a genuine (non-generic)
            // fired-rule pairing - defensible, never a ranking claim.
            if (w.hasBadge) {
              expect(w.pairsWith.length).toBeGreaterThan(0);
              badgedCount += 1;
            }
            expect(w.matchScore).toBeUndefined();
            expect(w.bestScore).toBeUndefined();
          }
        }
      }
    }
    // The seeded list + these two picked dishes defensibly pairs with more
    // than one wine - proving badges are not artificially collapsed down to
    // a single champion.
    expect(badgedCount).toBeGreaterThan(1);
  });

  it('(c2) within a region, wines that pair with more of what was picked list first (a coverage sort, not a ranking claim)', () => {
    const picked = [dish('e6'), dish('e9')];
    const model = buildWineListModel(SEEDED_ROWS, picked, T);
    for (const color of model.colors) {
      for (const cg of model.byColor[color].countries) {
        for (const r of cg.regions) {
          for (let i = 1; i < r.wines.length; i++) {
            expect(r.wines[i - 1].pairsWith.length).toBeGreaterThanOrEqual(r.wines[i].pairsWith.length);
          }
        }
      }
    }
  });

  it('(d) with no picked dishes, no wine gets a badge and grouping is unaffected', () => {
    const model = buildWineListModel(SEEDED_ROWS, [], T);
    expect(model.bestKey).toBeUndefined();
    expect(model.hasPicks).toBe(false);
    for (const color of model.colors) {
      for (const cg of model.byColor[color].countries) {
        expect(cg.topPick).toBeUndefined();
        for (const r of cg.regions) {
          for (const w of r.wines) {
            expect(w.hasBadge).toBe(false);
            expect(w.pairsWith).toEqual([]);
          }
        }
      }
    }
  });
});

describe('buildWineListModel - bin number pass-through', () => {
  it('(f) passes a parsed bin number through onto the wine object as binNo, next to whatever pronunciation carries', () => {
    const rowsWithBin = SEEDED_ROWS.map((r, i) => (i === 0 ? { ...r, bin: '902' } : r));
    const model = buildWineListModel(rowsWithBin, [], T);
    const all = model.colors.flatMap((c) =>
      model.byColor[c].countries.flatMap((cg) => cg.regions.flatMap((r) => r.wines))
    );
    const binned = all.find((w) => w.key === SEEDED_ROWS[0].client_row_id);
    expect(binned.binNo).toBe('902');

    // A wine with no bin in the source row never fabricates one.
    const unbinned = all.find((w) => w.key === SEEDED_ROWS[1].client_row_id);
    expect(unbinned.binNo).toBeFalsy();
  });

  it('(g) a bin with a letter suffix (cellar-location style, e.g. "606L") passes through unchanged', () => {
    const rowsWithBin = SEEDED_ROWS.map((r, i) => (i === 0 ? { ...r, bin: '606L' } : r));
    const model = buildWineListModel(rowsWithBin, [], T);
    const all = model.colors.flatMap((c) =>
      model.byColor[c].countries.flatMap((cg) => cg.regions.flatMap((r) => r.wines))
    );
    const binned = all.find((w) => w.key === SEEDED_ROWS[0].client_row_id);
    expect(binned.binNo).toBe('606L');
  });
});
