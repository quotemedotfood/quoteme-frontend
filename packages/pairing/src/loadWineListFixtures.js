/**
 * Node-only loader for the nine hand-verified wine list fixtures committed
 * under packages/pairing/data/wine_list_fixtures/. Mirrors
 * loadLocalTables.js's pattern (node:fs, test-only - this is not part of
 * the browser runtime path).
 *
 * Seven are already-extracted plain text, copied verbatim from
 * /PairMe/pairing/{name}.txt. Two (barolo, tavernetta) come from PDFs with
 * no extraction step inside wine_menu_lib.py itself - see parseWineList.test.js
 * for exactly how that text was produced, so the JS and Python parsers are
 * fed byte-for-byte identical input for those two as well.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'wine_list_fixtures');

export const WINE_LIST_FIXTURE_NAMES = [
  'brixton', 'barcelona', 'vendome', 'cellar', 'casual_list', 'safta', 'postino',
  'barolo', 'tavernetta',
];

/** @param {string} name @returns {string} */
export function loadWineListFixture(name) {
  return readFileSync(path.join(FIXTURES_DIR, `${name}.txt`), 'utf-8');
}
