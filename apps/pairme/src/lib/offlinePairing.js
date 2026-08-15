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
 * GET /v1/rules/bundle returns `{ version, tables, checksum }` per the v1
 * contract, so the three axis tables arrive NESTED under `tables`, while
 * buildTables() reads `wine_axes`/`dish_axes`/`pairing_rules` at the TOP
 * level. Handing the raw response straight to buildTables silently produced
 * a table set with zero rules, zero dish axes and zero wine axes.
 *
 * That is not a cosmetic mismatch. With zero rules nothing can hard-fail, so
 * every wine is eligible for every dish and every pairing degrades to the
 * generic structural fallback: the exact wrong-match failure the eligibility
 * gate exists to prevent, applied to the entire list at once, with no error
 * anywhere on screen. It was invisible only because the endpoint has not been
 * serving, so the app kept falling back to LOCAL_TABLES.
 *
 * Accept both shapes: nested under `tables` (the contract) and flat (what
 * offlinePairing.noSignal.test.js primes the cache with).
 */
function unwrapBundle(bundle) {
  if (!bundle) return null;
  const t = bundle.tables && typeof bundle.tables === 'object' ? bundle.tables : bundle;
  return {
    wine_axes: t.wine_axes || [],
    dish_axes: t.dish_axes || [],
    pairing_rules: t.pairing_rules || [],
  };
}

/**
 * AN EMPTY BUNDLE IS NOT A BUNDLE.
 *
 * A well-formed response carrying empty arrays is truthy, and trusting
 * truthiness alone let a degenerate payload disable scoring app-wide. The
 * rules bundle cache is a module-level singleton shared by every screen, so
 * one bad response poisons the whole tab until reload. Falling back to the
 * tables compiled into the app is always safe: they are the ones we shipped.
 */
function isUsable(b) {
  return !!b && b.pairing_rules.length > 0 && b.dish_axes.length > 0 && b.wine_axes.length > 0;
}

/**
 * The tables to score with right now, preferring whatever the server sent
 * last (if this tab ever had signal) over the tables shipped in the app.
 * Rebuilding only happens when the underlying bundle object actually
 * changes, so calling this on every pairing request is cheap.
 *
 * A server bundle only wins if it actually carries rules. Otherwise we score
 * with LOCAL_TABLES rather than with nothing.
 */
export function getOfflineTables() {
  const raw = getCachedRulesBundle();
  if (raw && raw !== cachedServerBundle) {
    cachedServerBundle = raw;
    const unwrapped = unwrapBundle(raw);
    cachedServerTables = isUsable(unwrapped) ? buildTables(unwrapped) : null;
  }
  return cachedServerTables || LOCAL_TABLES;
}

/**
 * True once GET /v1/rules/bundle has returned a bundle we can actually score
 * with. A response that arrived but carried no rules is reported as NO server
 * bundle, because that is the honest answer: we are scoring with the tables
 * compiled into the app, and `usedFallbackTables` below must say so.
 */
export function hasServerRulesBundle() {
  return isUsable(unwrapBundle(getCachedRulesBundle()));
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
