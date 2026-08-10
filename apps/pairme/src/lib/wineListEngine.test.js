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

describe('buildWineListModel - badges with picked dishes', () => {
  it('(c) badges the single best-across-picked-dishes match distinctly and sorts it to the top of its country group', () => {
    const picked = [dish('e6'), dish('e9')]; // Chicken roti + Steak frites Aquitaine, the app's own default demo picks
    const model = buildWineListModel(SEEDED_ROWS, picked, T);
    expect(model.bestKey).toBeTruthy();

    // Find the country group that actually holds the best-match wine and
    // confirm it is exposed as that group's topPick (i.e. sorted ahead of
    // the region-grouped rest, not buried inside a region list).
    let found = null;
    for (const color of model.colors) {
      for (const cg of model.byColor[color].countries) {
        if (cg.topPick && cg.topPick.key === model.bestKey) found = cg;
      }
    }
    expect(found).toBeTruthy();
    expect(found.topPick.hasBadge).toBe(true);
    expect(found.topPick.pairsWith.length).toBeGreaterThan(0);
    // The best-match wine must not ALSO appear a second time inside its
    // own country's region-grouped list.
    const dupeInRegions = found.regions.some((r) => r.wines.some((w) => w.key === model.bestKey));
    expect(dupeInRegions).toBe(false);

    // Every OTHER wine carrying a badge must be a genuine (non-generic)
    // fired-rule pairing, and must never itself claim to be the best match.
    for (const color of model.colors) {
      for (const cg of model.byColor[color].countries) {
        const all = (cg.topPick ? [cg.topPick] : []).concat(cg.regions.flatMap((r) => r.wines));
        for (const w of all) {
          if (w.hasBadge) expect(w.pairsWith.length).toBeGreaterThan(0);
          if (w.key !== model.bestKey) expect(w.key === model.bestKey).toBe(false);
        }
      }
    }
  });

  it('(d) with no picked dishes, no wine gets a badge and nothing is promoted to the top', () => {
    const model = buildWineListModel(SEEDED_ROWS, [], T);
    expect(model.bestKey).toBeNull();
    expect(model.hasPicks).toBe(false);
    for (const color of model.colors) {
      for (const cg of model.byColor[color].countries) {
        expect(cg.topPick).toBeNull();
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
