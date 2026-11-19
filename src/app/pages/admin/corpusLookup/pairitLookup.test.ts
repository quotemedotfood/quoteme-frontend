/**
 * The Corpus lookup's copy of PairIt's engine (ruling Q265).
 *
 * GUARDS (each beside a positive control):
 *   PL1 the copied engine is byte for byte what PIN.json pinned: a hand edit
 *       to any vendored file fails here
 *   PL2 a food the engine knows gets three traditional kinds and one
 *       adventurous, exactly what PairIt's own pairItBottles gives for one
 *       dish; a food it cannot read gets none
 *   PL3 a served bundle below the floor is not scored with; the bundled
 *       tables are, and the source says so
 *   PL4 a lane is at most four bottles, a pushed bottle that fits goes first,
 *       and a bottle without a price is never shown
 *   PL5 a draft food is paired from its own scores alone: the picks equal
 *       pairItBottles on a table holding that one food, heavy and light
 *       scores pick differently, and the shared tables are never changed
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pairItBottles } from '../../../../vendor/pairitEngine/pairItKinds.js';
import { ENGINE_PIN, LOCAL_TABLES, fitBottles, pickKinds, pickKindsForScores, tablesFor, engineDish } from './pairitLookup';

const VENDOR = join(__dirname, '../../../../vendor/pairitEngine');

const kind = (id: string, flag: string, colour: string, grape: string, region = '') => ({
  id, name: id, descriptor: '', pronunciation: null, flag, profile: { colour, grape_head: grape, region_head: region }, bottle_count: 3,
});
const KINDS = [
  kind('cabernet', 'traditional', 'Red', 'cabernet sauvignon'),
  kind('pinot', 'traditional', 'Red', 'pinot noir'),
  kind('chardonnay', 'traditional', 'White', 'chardonnay'),
  kind('riesling', 'traditional', 'White', 'riesling'),
  kind('sauvignon', 'traditional', 'White', 'sauvignon blanc'),
  kind('zinfandel', 'traditional', 'Red', 'zinfandel'),
  kind('assyrtiko', 'adventurous', 'White', 'assyrtiko'),
  kind('lambrusco', 'adventurous', 'Red', 'lambrusco'),
  kind('nero', 'adventurous', 'Red', "nero d'avola"),
];

describe('PL1 the vendored engine matches its pin', () => {
  it('every file hashes to PIN.json', () => {
    const names = Object.keys(ENGINE_PIN.files);
    expect(names.length).toBe(14);
    for (const name of names) {
      const sha = createHash('sha256').update(readFileSync(join(VENDOR, name), 'utf8')).digest('hex');
      expect([name, sha]).toEqual([name, ENGINE_PIN.files[name]]);
    }
  });
});

describe('PL2 kinds for one food, as PairIt picks them', () => {
  it('a food the engine knows gets what pairItBottles gives one dish', () => {
    const T = LOCAL_TABLES;
    const picks = pickKinds('steak', KINDS, T);
    const [group] = pairItBottles([engineDish('steak', T)], KINDS, T, { bottles: 1 }).groups;
    expect(picks.readable).toBe(true);
    expect(picks.traditional.length).toBeGreaterThan(0);
    expect(picks.traditional.map((k) => k.id)).toEqual(group.traditional.map((t) => t.kind.id));
    expect(picks.adventurous && picks.adventurous.id).toEqual(group.adventurous && group.adventurous.kind.id);
    expect(picks.traditional.length).toBeLessThanOrEqual(3);
  });

  it('a food it cannot read gets nothing', () => {
    const picks = pickKinds('zzqx flurb', KINDS, LOCAL_TABLES);
    expect(picks.readable).toBe(false);
    expect(picks.traditional).toEqual([]);
    expect(picks.adventurous).toBeNull();
  });
});

describe('PL3 the tables PairIt scores with', () => {
  it('a served bundle below the floor falls back to the bundled tables', () => {
    const thin = tablesFor({ version: 7, tables: { wine_axes: [], dish_axes: [], pairing_rules: [] } });
    expect(thin.T).toBe(LOCAL_TABLES);
    expect(thin.source).toContain('below the floor');
    expect(tablesFor(null).T).toBe(LOCAL_TABLES);
  });
});

describe('PL4 a lane of bottles', () => {
  const bottle = (id: string, cents: number | null, push: string | null = null) => ({
    id, producer: `P${id}`, wine: `W${id}`, shown_price_cents: cents, push,
    profile: { colour: 'Red', grape_head: 'cabernet sauvignon', region_head: '' },
  });
  it('holds at most four, pushed first, never one without a price', () => {
    const bands = [{ band: 'under_20', label: 'Under $20', bottles: [bottle('1', 1500), bottle('2', 1600), bottle('3', null)] },
      { band: '20_to_35', label: '$20 to $35', bottles: [bottle('4', 2500), bottle('5', 2600), bottle('6', 2700, 'big_push')] }];
    const lane = fitBottles(bands, 'steak', LOCAL_TABLES);
    expect(lane.length).toBe(4);
    expect(lane[0].id).toBe('6');
    expect(lane.map((b) => b.id)).not.toContain('3');
  });
});

describe('PL5 a draft food pairs from its own scores', () => {
  const heavy = { weight: 5, fat: 4, acid: 1, sweetness: 1, heat: 1, salt: 3, umami: 4, bitter: 1 };
  const light = { weight: 1, fat: 1, acid: 4, sweetness: 1, heat: 1, salt: 2, umami: 1, bitter: 1 };

  it('gives what pairItBottles gives for a table holding that one food', () => {
    const picks = pickKindsForScores('barbecue ribs', heavy, KINDS, LOCAL_TABLES);
    const T2 = { ...LOCAL_TABLES, dish: { ...LOCAL_TABLES.dish, 'barbecue ribs': { ...heavy, richness: 1 } } };
    const [group] = pairItBottles([{ id: 'x', name: 'barbecue ribs', components: ['barbecue ribs'] }], KINDS, T2, { bottles: 1 }).groups;
    expect(picks.traditional.map((k) => k.id)).toEqual(group.traditional.map((t) => t.kind.id));
    expect(picks.adventurous?.id).toEqual(group.adventurous?.kind.id);
    expect(picks.traditional.length).toBe(3);
  });

  it('heavy and light scores pick differently, and the shared tables are untouched', () => {
    const a = pickKindsForScores('draft heavy', heavy, KINDS, LOCAL_TABLES).traditional.map((k) => k.id);
    const b = pickKindsForScores('draft light', light, KINDS, LOCAL_TABLES).traditional.map((k) => k.id);
    expect(a).not.toEqual(b);
    expect(LOCAL_TABLES.dish['draft heavy']).toBeUndefined();
    expect(LOCAL_TABLES.dish['draft light']).toBeUndefined();
  });
});
