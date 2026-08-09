/**
 * /t/barolo - a second seeded venue alongside /t/demo, and the seed for the
 * "Barolo Grill" option in the entry-points "Which wine list?" picker (see
 * seededLists.js). The list is the COMMITTED fixture
 * packages/pairing/data/wine_list_fixtures/barolo.txt (~1832 wine rows -
 * see packages/pairing/src/parseWineList.test.js's own `barolo: 1832`
 * assertion, the anti-divergence contract this count is held to), pulled in
 * with Vite's `?raw` import so the text ships inside this app's own JS
 * bundle at build time - zero network, same pattern offlinePairing.js's CSV
 * imports use for the rules tables.
 *
 * getBaroloTableData() feeds the SAME state.js effect /t/demo's own GET
 * /v1/demo response feeds (see state.js's LANE A effect: `venueName`/
 * `venueCity`/`selectedVenueId`/`demoWineRows`), so every downstream
 * consumer (HowToDrink's client-engine pairing call, TheWine) needs no
 * changes at all - it is just a different, real set of wine rows sitting in
 * the same slot the mocked demo rows already occupy. No seeded FOOD menu
 * exists for Barolo Grill (only their wine list was committed as a
 * fixture): state.js's effect assigns Desi's curated DEMO_DISHES to every
 * successfully-resolved table code, this one included (same as any other
 * non-"demo" code, e.g. the generic GET /v1/t/:code resolver's "Le Petit
 * Bistro") - so the walk still has real dishes to pick from, they are just
 * not literally Barolo Grill's own menu.
 */
import baroloRaw from '../../../../packages/pairing/data/wine_list_fixtures/barolo.txt?raw';
import { parseWineList } from '../../../../packages/pairing/src/index.js';

export const BAROLO_VENUE = { id: 'venue-barolo-grill', name: 'Barolo Grill', city: 'Denver', state: 'CO' };

let _rows = null;

/**
 * parseWineList rows carry `glass_price` but not the boolean `glass` field
 * pairingAdapter.js's rowToEngineWine reads; this normalizes that one field
 * so Barolo rows are a drop-in match for demoSeed.js's buildDemoRows output.
 * Lazily parsed once (parsing ~1832 rows is cheap - well under a frame -
 * but there is no reason to redo it every time the picker re-renders).
 * @returns {Array<Record<string, any>>}
 */
export function getBaroloRows() {
  if (!_rows) {
    _rows = parseWineList(baroloRaw).map((r) => Object.assign({}, r, { glass: !!r.glass_price }));
  }
  return _rows;
}

/** Same resolved shape GET /v1/demo / GET /v1/t/:code hand back
 * ({venue, capture_id, raw_text, rows}), so state.js's effect can treat all
 * three sources identically. Wrapped in a resolved Promise (rather than a
 * plain return) only to match that same call-site shape (`await ...()`),
 * not because anything here is actually async. */
export async function getBaroloTableData() {
  return { venue: BAROLO_VENUE, capture_id: null, raw_text: '', rows: getBaroloRows() };
}
