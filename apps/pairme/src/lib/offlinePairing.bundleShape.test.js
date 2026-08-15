/**
 * THE RULES BUNDLE MUST NOT BE ABLE TO SILENTLY DISABLE SCORING.
 *
 * Two defects, one consequence.
 *
 * 1. SHAPE. GET /v1/rules/bundle returns `{ version, tables, checksum }` per
 *    the v1 contract, so the axis tables arrive nested under `tables`, while
 *    buildTables() reads them at the top level. The raw response was handed
 *    straight to buildTables, producing zero rules from a fully populated,
 *    perfectly valid response.
 *
 * 2. DEGENERATE PAYLOAD. Any truthy bundle beat the tables compiled into the
 *    app, including one carrying empty arrays.
 *
 * Either one yields a table set with no rules. With no rules nothing can
 * hard-fail, so every wine is eligible for every dish and every pairing
 * degrades to the generic structural fallback, with no error on screen. That
 * is the wrong-match failure the eligibility gate exists to prevent, applied
 * to the whole list at once. The cache is a module-level singleton, so one
 * bad response poisons every screen until reload.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadRulesBundle, clearRulesBundleCache } from '../../../../packages/pairing/src/rulesBundle.js';
import { parseCsv } from '../../../../packages/pairing/src/csv.js';
import { getOfflineTables, hasServerRulesBundle } from './offlinePairing.js';
import wineAxesCsv from '../../../../packages/pairing/data/wine_axes.csv?raw';
import dishAxesCsv from '../../../../packages/pairing/data/dish_axes.csv?raw';
import rulesCsv from '../../../../packages/pairing/data/pairing_rules.csv?raw';

const realTables = () => ({
  wine_axes: parseCsv(wineAxesCsv),
  dish_axes: parseCsv(dishAxesCsv),
  pairing_rules: parseCsv(rulesCsv),
});
const prime = (payload) => loadRulesBundle(async () => payload);
const counts = () => {
  const T = getOfflineTables();
  return { rules: T.rules.length, dish: Object.keys(T.dish).length, wine: Object.keys(T.wine).length };
};

beforeEach(() => clearRulesBundleCache());
afterEach(() => clearRulesBundleCache());

describe('rules bundle shape and degeneracy', () => {
  it('scores with the app-compiled tables before any fetch', () => {
    expect(counts().rules).toBeGreaterThan(0);
    expect(hasServerRulesBundle()).toBe(false);
  });

  it('accepts the DOCUMENTED nested contract shape', async () => {
    // This is exactly what src/mocks/handlers.js returns in dev mode, and
    // what the contract says the real endpoint returns.
    await prime({ version: 1, tables: realTables(), checksum: 'x' });
    const c = counts();
    expect(c.rules).toBeGreaterThan(0);
    expect(c.dish).toBeGreaterThan(0);
    expect(c.wine).toBeGreaterThan(0);
    expect(hasServerRulesBundle()).toBe(true);
  });

  it('still accepts the flat shape', async () => {
    await prime({ version: 1, ...realTables() });
    expect(counts().rules).toBeGreaterThan(0);
    expect(hasServerRulesBundle()).toBe(true);
  });

  it('falls back to app tables when the bundle carries empty arrays', async () => {
    await prime({ version: 1, tables: { wine_axes: [], dish_axes: [], pairing_rules: [] }, checksum: 'x' });
    const c = counts();
    expect(c.rules, 'an empty bundle must never zero the rules').toBeGreaterThan(0);
    expect(c.dish).toBeGreaterThan(0);
    expect(c.wine).toBeGreaterThan(0);
  });

  it('falls back when only the rules table is empty', async () => {
    const t = realTables();
    await prime({ version: 1, tables: { ...t, pairing_rules: [] }, checksum: 'x' });
    expect(counts().rules).toBeGreaterThan(0);
  });

  it('reports NO server bundle when the bundle is unusable, so usedFallbackTables stays honest', async () => {
    await prime({ version: 1, tables: { wine_axes: [], dish_axes: [], pairing_rules: [] }, checksum: 'x' });
    expect(hasServerRulesBundle()).toBe(false);
  });

  it('a degenerate bundle cannot make every wine eligible', async () => {
    // The real consequence, stated as the product invariant rather than as a
    // table count: roquefort hard-fails a dry white. With zero rules it would
    // not, and nothing on screen would say why.
    const { buildDemoRows, DEMO_DISHES } = await import('./demoSeed.js');
    const { DEMO } = await import('../../../../packages/pairing/src/demoFixtures.js');
    const { rowToEngineWine, dishToEngineDish } = await import('./pairingAdapter.js');
    const { dishProfile, scoreWine } = await import('../../../../packages/pairing/src/scoring.js');

    await prime({ version: 1, tables: { wine_axes: [], dish_axes: [], pairing_rules: [] }, checksum: 'x' });
    const T = getOfflineTables();
    const chablis = buildDemoRows(DEMO).map(rowToEngineWine).find((w) => /Louis Michel/.test(w.label));
    const cheese = dishToEngineDish(DEMO_DISHES.find((d) => d.n.startsWith('Cheese')));
    const scored = scoreWine(chablis, dishProfile(cheese.components, T).profile, cheese.components, T);
    expect(scored.eligible, 'a dry Chablis must still be blocked by Roquefort').toBe(false);
  });
});
