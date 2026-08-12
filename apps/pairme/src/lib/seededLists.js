/**
 * "Which wine list?" picker data for the entry-points screen
 * (EntryScreen.jsx). Shown whenever no venue/table code is already known.
 * Every option resolves to engine-ready wine objects (rowToEngineWine
 * shape: label/grape_head/region_head/price/glass) with zero network calls
 * - the seeded lists are bundled fixtures, and "I do not have one" is a
 * small set of style archetypes built straight from
 * packages/pairing/data/wine_axes.csv's own vocabulary, not a real venue
 * list at all.
 */
import { parseWineList } from '../../../../packages/pairing/src/index.js';
import { DEMO as OFFLINE_DEMO_WINES } from '../../../../packages/pairing/src/demoFixtures.js';
import baroloRaw from '../../../../packages/pairing/data/wine_list_fixtures/barolo.txt?raw';
import { buildDemoRows } from './demoSeed.js';
import { rowToEngineWine } from './pairingAdapter.js';

let _baroloWines = null;
function baroloWines() {
  if (!_baroloWines) {
    _baroloWines = parseWineList(baroloRaw).map((r) =>
      rowToEngineWine(Object.assign({}, r, { glass: !!r.glass_price }))
    );
  }
  return _baroloWines;
}

let _demoWines = null;
function demoWines() {
  if (!_demoWines) {
    _demoWines = buildDemoRows(OFFLINE_DEMO_WINES).map(rowToEngineWine);
  }
  return _demoWines;
}

// "I do not have one": no real venue list exists, so there is nothing to
// parse. Six broad styles, each pointed at a `grape_head` that
// wine_axes.csv already scores (chardonnay/gamay/pinot noir/cabernet
// sauvignon/champagne/sauvignon blanc), so the scoring engine reasons about
// these exactly like a real bottle - it just displays as a style, not a
// producer, because there is no producer to show.
export const GENERIC_STYLE_WINES = [
  { label: 'A crisp, high-acid white', grape_head: 'sauvignon blanc', region_head: '', price: 0, glass: true },
  { label: 'A rounder, richer white', grape_head: 'chardonnay', region_head: '', price: 0, glass: true },
  { label: 'Something with bubbles', grape_head: 'champagne', region_head: '', price: 0, glass: true },
  { label: 'A light, fruity red', grape_head: 'gamay', region_head: '', price: 0, glass: true },
  { label: 'A medium-bodied red', grape_head: 'pinot noir', region_head: '', price: 0, glass: true },
  { label: 'A bold, structured red', grape_head: 'cabernet sauvignon', region_head: '', price: 0, glass: true },
];

/**
 * @typedef {{id: string, label: string, sublabel: string, wines: () => Array}} SeededList
 * @type {SeededList[]}
 */
export const SEEDED_WINE_LISTS = [
  { id: 'barolo', label: 'Barolo Grill', sublabel: '~1,832 wines on the list', wines: baroloWines },
  { id: 'demo', label: 'Aquitaine (demo)', sublabel: `${OFFLINE_DEMO_WINES.length} wines on the list`, wines: demoWines },
  { id: 'generic', label: 'I do not have one', sublabel: 'Pair by style instead', wines: () => GENERIC_STYLE_WINES },
];

/** @param {string} id @returns {Array} */
export function getSeededWines(id) {
  const entry = SEEDED_WINE_LISTS.find((l) => l.id === id);
  return entry ? entry.wines() : [];
}
