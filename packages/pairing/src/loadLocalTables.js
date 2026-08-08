/**
 * Node-only convenience loader for the three reference CSVs committed under
 * packages/pairing/data/ (byte-for-byte copies of the files Cooper hand-edits
 * at /pairing/{wine_axes,dish_axes,pairing_rules}.csv, and the exact files
 * `pairing_engine.py --selftest` reads). Mirrors Python's `_load()`.
 *
 * This module uses `node:fs`, so it only works in Node (dev scripts, the
 * vitest fixture spec). In the browser the same `buildTables()` in
 * tables.js is fed by GET /v1/rules/bundle instead - this file is not part
 * of that runtime path.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseCsv } from './csv.js';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

function loadCsv(filename) {
  const text = readFileSync(path.join(DATA_DIR, filename), 'utf-8');
  return parseCsv(text);
}

/**
 * @returns {{wine_axes: Array, dish_axes: Array, pairing_rules: Array}} raw
 *   row arrays, ready to hand to `buildTables()` in tables.js.
 */
export function loadLocalBundle() {
  return {
    wine_axes: loadCsv('wine_axes.csv'),
    dish_axes: loadCsv('dish_axes.csv'),
    pairing_rules: loadCsv('pairing_rules.csv'),
  };
}
