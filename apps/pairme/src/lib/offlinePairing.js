/**
 * NO SIGNAL fallback for pairing.
 *
 * Once a menu photo has been read into rows and a dish has been chosen,
 * finishing the pairing needs nothing else from the network: the scoring
 * engine (packages/pairing) is a pure function over three tables (wine
 * axes, dish axes, pairing rules) plus the wine list rows and the dish's
 * own components, all of which are already sitting in memory by that
 * point. This module is the thin seam that proves that and keeps it true.
 *
 * Two sources for "already have it", in preference order:
 *
 *  1. getCachedRulesBundle() - packages/pairing/src/rulesBundle.js's
 *     in-memory cache, filled the last time GET /v1/rules/bundle succeeded
 *     (see apps/pairme/src/lib/state.js's boot effect). This is the live,
 *     server-versioned bundle. If the phone had signal even once this tab
 *     session, this is populated and this is what gets used offline later.
 *
 *  2. LOCAL_TABLES - built once, at import time, from the same three CSVs
 *     Cooper hand-edits (packages/pairing/data/*.csv), pulled in with
 *     Vite's `?raw` import so the text ships inside this app's own JS
 *     bundle at build time. No fetch, no node:fs (packages/pairing's own
 *     loadLocalTables.js is Node-only and cannot run in the browser - this
 *     is the browser-safe equivalent of that same file). Covers a genuinely
 *     cold install that has never once reached the server.
 *
 * Either path is zero network calls at call time, by construction: nothing
 * in buildTables/pair/labelPicks touches fetch, XMLHttpRequest, or anything
 * else that leaves the tab.
 */
import wineAxesRaw from '../../../../packages/pairing/data/wine_axes.csv?raw';
import dishAxesRaw from '../../../../packages/pairing/data/dish_axes.csv?raw';
import pairingRulesRaw from '../../../../packages/pairing/data/pairing_rules.csv?raw';
import {
  parseCsv,
  buildTables,
  pair,
  labelPicks,
  getCachedRulesBundle,
} from '../../../../packages/pairing/src/index.js';

const LOCAL_BUNDLE = {
  wine_axes: parseCsv(wineAxesRaw),
  dish_axes: parseCsv(dishAxesRaw),
  pairing_rules: parseCsv(pairingRulesRaw),
};

// Built once. Same cost as buildTables(getCachedRulesBundle()) would be, so
// there is no penalty to always having this ready as the fallback.
const LOCAL_TABLES = buildTables(LOCAL_BUNDLE);

let cachedServerTables = null;
let cachedServerBundle = null;

/**
 * The tables to score with right now, preferring whatever the server sent
 * last (if this tab ever had signal) over the tables shipped in the app.
 * Rebuilding only happens when the underlying bundle object actually
 * changes, so calling this on every pairing request is cheap.
 */
export function getOfflineTables() {
  const serverBundle = getCachedRulesBundle();
  if (serverBundle && serverBundle !== cachedServerBundle) {
    cachedServerBundle = serverBundle;
    cachedServerTables = buildTables(serverBundle);
  }
  if (serverBundle) return cachedServerTables;
  return LOCAL_TABLES;
}

/** True once GET /v1/rules/bundle has succeeded at least once this tab. */
export function hasServerRulesBundle() {
  return !!getCachedRulesBundle();
}

/**
 * Pair a dish against an already-loaded wine list with zero network calls.
 * Same shape as packages/pairing's own `pair()`, with product-facing
 * slot/label attached to each pick (house/suited/crowd - see roles.js).
 *
 * @param {string} dishName
 * @param {string[]} components
 * @param {Array<Record<string, any>>} wines - rows already parsed from the
 *   photographed menu (or the demo wine list), never fetched here.
 * @param {{n?: number, budget?: number|null, glassOnly?: boolean}} [opts]
 * @returns {ReturnType<import('../../../../packages/pairing/src/scoring.js').pair> & { picks: any[], usedFallbackTables: boolean }}
 */
export function pairOffline(dishName, components, wines, opts = {}) {
  const usedFallbackTables = !hasServerRulesBundle();
  const T = getOfflineTables();
  const result = pair(dishName, components, wines, T, opts);
  return { ...result, picks: labelPicks(result.picks), usedFallbackTables };
}
