/**
 * Unit tests for the wine-card icon gate logic (lib/wineCardIconGate.js).
 * No React here on purpose - these are pure functions over plain data, kept
 * testable in isolation from screens/WineCardIcons.jsx (see that file's own
 * header for the file-scope reason the two are split).
 */
import { describe, it, expect } from 'vitest';
import { buildTables } from '../../../../packages/pairing/src/tables.js';
import { DEMO_DISHES, buildDemoRows } from './demoSeed.js';
import { getOfflineTables } from './offlinePairing.js';
import { DEMO as SEEDED_WINES } from '../../../../packages/pairing/src/demoFixtures.js';
import { dishToEngineDish, rowToEngineWine } from './pairingAdapter.js';
import {
  tableWineEligible,
  isByTheGlass,
  isHousePick,
  isOurPick,
  resolveProteinIcons,
  PROTEIN_EMOJI,
} from './wineCardIconGate.js';

describe('tableWineEligible (icon 1: table wine)', () => {
  it('is false with no wine, no dishes, or no tables', () => {
    const T = getOfflineTables();
    const dish = { name: 'Steak', components: ['hanger steak'] };
    expect(tableWineEligible(null, [dish], T)).toBe(false);
    expect(tableWineEligible({ label: 'x' }, [], T)).toBe(false);
    expect(tableWineEligible({ label: 'x' }, null, T)).toBe(false);
    expect(tableWineEligible({ label: 'x' }, [dish], null)).toBe(false);
  });

  it('is false when only a GENERIC rule fires for every dish', () => {
    // match_weight fires unconditionally here (trigger_type axis, weight>=0
    // is true for any dish profile), so every dish "clears" but no
    // wine-specific claim is ever made.
    const T = buildTables({
      wine_axes: [],
      dish_axes: [
        { component: 'steak', weight: '3', fat: '3', acid: '2', sweetness: '1', heat: '1', salt: '2', umami: '3', bitter: '1', richness: '3' },
        { component: 'lettuce', weight: '1', fat: '1', acid: '1', sweetness: '1', heat: '1', salt: '1', umami: '1', bitter: '1', richness: '1' },
      ],
      pairing_rules: [
        { rule_id: 'match_weight', trigger_type: 'axis', trigger: 'weight>=0', wine_condition: '', kind: 'boost', weight: '5', why_template: 'generic weight tie-break', status: 'active' },
      ],
    });
    const wine = { label: 'Test Wine' };
    const dishes = [
      { name: 'Course A', components: ['steak'] },
      { name: 'Course B', components: ['lettuce'] },
    ];
    expect(tableWineEligible(wine, dishes, T)).toBe(false);
  });

  it('is true only when a wine-specific rule fires for EVERY dish', () => {
    const T = buildTables({
      wine_axes: [],
      dish_axes: [
        { component: 'steak', weight: '3', fat: '3', acid: '2', sweetness: '1', heat: '1', salt: '2', umami: '3', bitter: '1', richness: '3' },
        { component: 'truffle', weight: '3', fat: '2', acid: '1', sweetness: '1', heat: '1', salt: '2', umami: '4', bitter: '1', richness: '4' },
        { component: 'lettuce', weight: '1', fat: '1', acid: '1', sweetness: '1', heat: '1', salt: '1', umami: '1', bitter: '1', richness: '1' },
      ],
      pairing_rules: [
        { rule_id: 'match_weight', trigger_type: 'axis', trigger: 'weight>=0', wine_condition: '', kind: 'boost', weight: '5', why_template: 'generic', status: 'active' },
        { rule_id: 'earthy_pinot', trigger_type: 'component', trigger: 'steak', wine_condition: '', kind: 'boost', weight: '10', why_template: 'A wine-specific claim about this wine.', status: 'active' },
      ],
    });
    const wine = { label: 'Test Wine' };
    const allSteak = [
      { name: 'Course A', components: ['steak'] },
      { name: 'Course B', components: ['steak', 'truffle'] },
    ];
    expect(tableWineEligible(wine, allSteak, T)).toBe(true);

    // Same wine, same rule set, but ONE dish in the table never triggers the
    // wine-specific rule: the gate must go dark, because it did not fire
    // for EVERY selected dish, only most of them.
    const mixed = [
      { name: 'Course A', components: ['steak'] },
      { name: 'Course C', components: ['lettuce'] },
    ];
    expect(tableWineEligible(wine, mixed, T)).toBe(false);
  });

  it('never lights on the real /t/demo fixture (the honest-dark proof): no wine in the shipped demo list earns a wine-specific rule against every one of the thirteen demo dishes', () => {
    const T = getOfflineTables();
    const wines = buildDemoRows(SEEDED_WINES).map(rowToEngineWine);
    const dishes = DEMO_DISHES.map(dishToEngineDish);
    expect(dishes.length).toBeGreaterThan(0);
    expect(wines.length).toBeGreaterThan(0);
    const lit = wines.filter((w) => tableWineEligible(w, dishes, T));
    expect(lit.map((w) => w.label)).toEqual([]);
  });
});

describe('isByTheGlass (icon 2: by the glass)', () => {
  it('reads the engine-wine boolean shape', () => {
    expect(isByTheGlass({ label: 'x', glass: true })).toBe(true);
    expect(isByTheGlass({ label: 'x', glass: false })).toBe(false);
  });
  it('reads the static-demo price-or-null shape the same way', () => {
    expect(isByTheGlass({ label: 'x', glass: 26 })).toBe(true);
    expect(isByTheGlass({ label: 'x', glass: null })).toBe(false);
  });
  it('is false with no wine at all', () => {
    expect(isByTheGlass(null)).toBe(false);
    expect(isByTheGlass(undefined)).toBe(false);
  });
});

describe('isHousePick (icon 4: restaurant recommends)', () => {
  it('is true only when the venue disclosed THIS exact wine label', () => {
    const labels = new Set(['Domaine Huet, Vouvray Sec Le Mont']);
    expect(isHousePick({ label: 'Domaine Huet, Vouvray Sec Le Mont' }, labels)).toBe(true);
    expect(isHousePick({ label: 'Some Other Wine' }, labels)).toBe(false);
  });
  it('is false with no venue-pushed set, or no wine', () => {
    expect(isHousePick({ label: 'x' }, null)).toBe(false);
    expect(isHousePick({ label: 'x' }, new Set())).toBe(false);
    expect(isHousePick(null, new Set(['x']))).toBe(false);
  });
});

describe('isOurPick (icon 5: our pick / PairMe\'s own top recommendation)', () => {
  it('is true only for slot "house" (the algorithm\'s own top rank), not "suited"/"crowd"/null', () => {
    expect(isOurPick('house')).toBe(true);
    expect(isOurPick('suited')).toBe(false);
    expect(isOurPick('crowd')).toBe(false);
    expect(isOurPick(null)).toBe(false);
    expect(isOurPick(undefined)).toBe(false);
  });
});

describe('resolveProteinIcons (icon 3: enum-to-emoji lookup only)', () => {
  it('renders nothing when the key is absent', () => {
    expect(resolveProteinIcons(undefined)).toEqual([]);
    expect(resolveProteinIcons(null)).toEqual([]);
  });
  it('renders nothing when dish_label is missing, even with a valid protein', () => {
    expect(resolveProteinIcons({ protein: 'beef' })).toEqual([]);
  });
  it('renders nothing for an unrecognised enum value - never guesses', () => {
    expect(resolveProteinIcons({ protein: 'venison', dish_label: 'the venison' })).toEqual([]);
  });
  it('renders the right emoji for a single enum value', () => {
    const out = resolveProteinIcons({ protein: 'beef', dish_label: 'rib eye' });
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('beef');
    expect(out[0].emoji).toBe(PROTEIN_EMOJI.beef.emoji);
    expect(out[0].explainer).toBe('Pairs with your rib eye.');
  });
  it('covers every canonical enum value with a distinct emoji', () => {
    const keys = ['beef', 'chicken', 'fish', 'oyster', 'shrimp', 'lobster', 'cheese', 'mushroom', 'pasta'];
    for (const key of keys) {
      const out = resolveProteinIcons({ protein: key, dish_label: 'the dish' });
      expect(out, key).toHaveLength(1);
      expect(out[0].key, key).toBe(key);
    }
    const emojis = new Set(keys.map((k) => PROTEIN_EMOJI[k].emoji));
    expect(emojis.size).toBe(keys.length);
  });
  it('renders one icon per matched protein when the value is an array, dropping unknowns and duplicates', () => {
    const out = resolveProteinIcons({ protein: ['beef', 'fish', 'venison', 'beef'], dish_label: 'the surf and turf' });
    expect(out.map((o) => o.key)).toEqual(['beef', 'fish']);
    expect(out.every((o) => o.explainer === 'Pairs with your the surf and turf.')).toBe(true);
  });
});
