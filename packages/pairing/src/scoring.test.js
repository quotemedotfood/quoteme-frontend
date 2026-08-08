import { describe, it, expect, beforeAll } from 'vitest';
import { buildTables } from './tables.js';
import { pair, dishProfile, scoreWine } from './scoring.js';
import { loadLocalBundle } from './loadLocalTables.js';
import { DEMO, SELFTEST } from './demoFixtures.js';

/**
 * Anti-divergence spec: every number here was captured from
 *   cd /mnt/c/Users/DavidMoosman/quoteme/pairing && python3 pairing_engine.py --selftest
 * against the SAME three CSVs (packages/pairing/data/*.csv are byte-for-byte
 * copies of the ones next to pairing_engine.py) and the SAME DEMO wine list
 * and SELFTEST dish set (copied verbatim into demoFixtures.js).
 *
 * If any assertion here fails, the JS port has diverged from the Python
 * reference - fix scoring.js/tables.js, never this fixture.
 */

let T;

beforeAll(() => {
  T = buildTables(loadLocalBundle());
});

describe('tables load exactly like Python\'s Tables class', () => {
  it('matches "tables loaded: 109 wine heads, 119 components, 46 active rules"', () => {
    expect(Object.keys(T.wine).length).toBe(109);
    expect(Object.keys(T.dish).length).toBe(119);
    expect(T.rules.length).toBe(46);
    expect(T.stats()).toBe('109 wine heads, 119 components, 46 active rules');
  });
});

// Full reconciliation table, one entry per SELFTEST dish, captured from the
// Python --selftest run described above.
const EXPECTED = {
  'Artichoke barigoule': {
    considered: 20,
    eligible: 7,
    top: { label: 'Gimonnet, Blanc de Blancs Champagne', score: 130, fired: ['hf_artichoke', 'boost_fried_sparkling', 'match_weight'] },
    ruledOutFirst3: [
      ['Pataille, Bourgogne Aligote', 'hf_artichoke'],
      ['Berthet-Bondet, Jura Savagnin', 'hf_artichoke'],
      ['Joguet, Chinon', 'hf_artichoke'],
    ],
  },
  'Steak frites Parisienne': {
    considered: 20,
    eligible: 20,
    top: { label: 'Pichon Comtesse Reserve, Pauillac', score: 123, fired: ['match_weight', 'boost_bigmeat_tannin'] },
  },
  'Steak frites Aquitaine': {
    considered: 20,
    eligible: 20,
    top: { label: 'Trapet, Gevrey-Chambertin', score: 138, fired: ['boost_umami_pinot', 'boost_truffle_pinot', 'match_weight'] },
  },
  'Chicken roti': {
    considered: 20,
    eligible: 20,
    top: { label: 'Berthet-Bondet, Jura Savagnin', score: 113, fired: ['boost_morel_jura', 'match_weight'] },
  },
  'Belgian endive salade': {
    considered: 20,
    eligible: 1,
    top: {
      label: 'Huet, Vouvray Demi-Sec',
      score: 165,
      fired: ['req_sweet_roquefort', 'req_acid_vinaigrette', 'req_acid_general'],
    },
    ruledOutFirst3: [
      ['Louis Michel, Chablis 1er Cru', 'req_sweet_roquefort'],
      ['Domaine Vacheron, Sancerre', 'req_sweet_roquefort'],
      ['Pepiere, Muscadet Clos des Briords', 'req_sweet_roquefort'],
    ],
  },
  'Moules en cassoulette': {
    considered: 20,
    eligible: 20,
    top: { label: 'Domaine Vacheron, Sancerre', score: 140, fired: ['bridge_cooked_in', 'match_weight'] },
    unknown: ['sauvignon blanc'],
  },
  'French onion soup': {
    considered: 20,
    eligible: 20,
    top: { label: 'Trapet, Gevrey-Chambertin', score: 143, fired: ['boost_umami_pinot', 'match_weight', 'match_salt_acid'] },
  },
  'Roasted mushrooms': {
    considered: 20,
    eligible: 20,
    top: { label: 'Trapet, Gevrey-Chambertin', score: 150, fired: ['boost_umami_pinot', 'boost_mushroom_pinot', 'match_weight'] },
  },
  'Au poivre burger': {
    considered: 20,
    eligible: 17,
    top: { label: 'Graillot, Crozes-Hermitage', score: 161, fired: ['req_acid_general', 'boost_pepper_syrah', 'match_weight'] },
    ruledOutFirst3: [
      ['Corison, Napa Cabernet', 'hf_heat_soft'],
      ['Pichon Comtesse Reserve, Pauillac', 'hf_heat_soft'],
      ["Dow's, LBV Port", 'hf_heat_soft'],
    ],
  },
  'Tuna crudo': {
    considered: 20,
    eligible: 17,
    top: { label: 'Huet, Vouvray Demi-Sec', score: 135, fired: ['req_acid_general', 'match_weight', 'match_salt_acid'] },
    unknown: ['avocado'],
    ruledOutFirst3: [
      ['Corison, Napa Cabernet', 'req_acid_general'],
      ['Pichon Comtesse Reserve, Pauillac', 'req_acid_general'],
      ["Dow's, LBV Port", 'req_acid_general'],
    ],
  },
  'Truffle frites': {
    considered: 20,
    eligible: 20,
    top: { label: 'Trapet, Gevrey-Chambertin', score: 178, fired: ['boost_umami_pinot', 'boost_truffle_pinot', 'match_weight'] },
  },
  'Chicken liver pate': {
    considered: 20,
    eligible: 2,
    top: { label: 'Huet, Vouvray Demi-Sec', score: 125, fired: ['req_sweet_sweet', 'boost_liver_sweet', 'match_weight'] },
    ruledOutFirst3: [
      ['Louis Michel, Chablis 1er Cru', 'req_sweet_sweet'],
      ['Domaine Vacheron, Sancerre', 'req_sweet_sweet'],
      ['Pepiere, Muscadet Clos des Briords', 'req_sweet_sweet'],
    ],
  },
};

describe('pair() reproduces pairing_engine.py --selftest for all 12 dishes', () => {
  for (const [name, components] of SELFTEST) {
    it(`${name}: matches Python's eligibility count and #1 pick`, () => {
      const exp = EXPECTED[name];
      const res = pair(name, components, DEMO, T);

      expect(res.considered).toBe(exp.considered);
      expect(res.eligible).toBe(exp.eligible);

      if (exp.unknown) {
        expect(res.unknown).toEqual(exp.unknown);
      }

      const top = res.picks[0];
      expect(top.wine.label).toBe(exp.top.label);
      expect(top.score).toBe(exp.top.score);
      expect(top.fired.slice(0, 3).map((f) => f[0])).toEqual(exp.top.fired);

      if (exp.ruledOutFirst3) {
        const gotRuledOut = res.rejected.slice(0, 3).map((x) => [x.wine.label, x.blocked[0][0]]);
        expect(gotRuledOut).toEqual(exp.ruledOutFirst3);
      }
    });
  }
});

describe('reconciliation table (from the task acceptance criteria)', () => {
  it('Artichoke barigoule: 7 of 20 eligible, and no pick (nor any eligible candidate) is oaked or tannic (hard_fail working)', () => {
    const components = ['artichoke', 'carrot', 'snap pea', 'beurre blanc'];
    const res = pair('Artichoke barigoule', components, DEMO, T);
    expect(res.eligible).toBe(7);
    expect(res.considered).toBe(20);

    // Every ELIGIBLE candidate across the full 20-wine list obeys the
    // hard_fail's wine_condition (oak<=1 and tannin<=2), not just the top 3
    // picks - proving the hard_fail actually gates eligibility rather than
    // merely influencing rank.
    const { profile } = dishProfile(components, T);
    const allEligible = DEMO.map((wine) => scoreWine(wine, profile, components, T)).filter((x) => x.eligible);
    expect(allEligible.length).toBe(7);
    for (const x of allEligible) {
      expect(x.axes.oak).toBeLessThanOrEqual(1);
      expect(x.axes.tannin).toBeLessThanOrEqual(2);
    }
  });

  it('Belgian endive salade: 1 of 20 eligible via the REQUIRE rule for blue cheese + residual sugar (not a penalty)', () => {
    const res = pair('Belgian endive salade', ['endive', 'apple', 'walnut', 'roquefort', 'vinaigrette'], DEMO, T);
    expect(res.eligible).toBe(1);
    expect(res.considered).toBe(20);
    const firedIds = res.picks[0].fired.map((f) => f[0]);
    expect(firedIds).toContain('req_sweet_roquefort');
    const rule = T.rules.find((r) => r.rule_id === 'req_sweet_roquefort');
    expect(rule.kind).toBe('hard_fail'); // gates via hard_fail's require-style "must pass or blocked" path
    // Confirm it is NOT merely a penalty: a penalty rule never blocks eligibility.
    expect(rule.kind).not.toBe('penalty');
  });

  it('Steak frites Parisienne leads Pauillac; Steak frites Aquitaine leads Gevrey - they DIVERGE', () => {
    const parisienne = pair('Steak frites Parisienne', ['ny strip', 'garlic', 'butter', 'potato'], DEMO, T);
    const aquitaine = pair('Steak frites Aquitaine', ['hanger steak', 'truffle', 'shallot', 'watercress'], DEMO, T);

    expect(parisienne.picks[0].wine.label).toBe('Pichon Comtesse Reserve, Pauillac');
    expect(aquitaine.picks[0].wine.label).toBe('Trapet, Gevrey-Chambertin');
    expect(parisienne.picks[0].wine.label).not.toBe(aquitaine.picks[0].wine.label);

    // Confirms it is COMPONENT rules diverging the outcome, not protein-only
    // scoring: Aquitaine's win comes from truffle/umami boosts firing for
    // pinot noir, which Parisienne's component list never triggers.
    const aquitaineFired = aquitaine.picks[0].fired.map((f) => f[0]);
    expect(aquitaineFired).toContain('boost_truffle_pinot');
    expect(aquitaineFired).toContain('boost_umami_pinot');
    const parisienneFired = parisienne.picks[0].fired.map((f) => f[0]);
    expect(parisienneFired).not.toContain('boost_truffle_pinot');
  });

  it('scores are UNCAPPED: the 12 dishes range well above a would-be 100 cap, and vary a lot (no tie-flattening)', () => {
    const topScores = SELFTEST.map(([name, components]) => pair(name, components, DEMO, T).picks[0].score);
    expect(Math.max(...topScores)).toBeGreaterThanOrEqual(170); // Truffle frites hits 178
    expect(Math.min(...topScores)).toBeLessThanOrEqual(120); // Chicken roti is 113
    // Not all identical (proves nothing is clamped to a single ceiling value):
    expect(new Set(topScores).size).toBeGreaterThan(6);
  });
});
