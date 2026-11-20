/**
 * WHAT PAIRIT WOULD PICK FOR ONE FOOD, for the QM admin Corpus lookup
 * (Moose 2026-11-18; ruling Q265: a pinned copy of PairIt's engine).
 *
 * The engine itself is src/vendor/pairitEngine, an exact copy of pairme at
 * the commit in its PIN.json (scripts/sync-pairit-engine.mjs; never edited
 * by hand). This file is the wiring the PairIt app does around it, copied
 * from pairme at the same commit. Where the app's file changes, change this:
 *   tablesFor          apps/pairme/src/lib/offlinePairing.js (LOCAL_TABLES,
 *                      unwrapBundle, SERVED_FLOOR, meetsFloor, getOfflineTables)
 *   engineDish         apps/pairme/src/lib/pairItMeal.js engineDish, for a
 *                      dish typed as its name alone (no parts, not heard)
 *   isReadable         apps/pairme/src/lib/pairItMeal.js isReadable
 *   cleanKinds         apps/pairme/src/lib/pairItKinds.js cleanKinds, and the
 *                      bottles step's hasBottle filter
 *   cleanBands, engineWine, fitBottles, pushRank, LANE_BOTTLES
 *                      apps/pairme/src/lib/pairItBottles.js
 *   pickKinds          screens/pairit/PairItBottlesStep.jsx: pairItBottles
 *                      for one readable dish and one bottle
 *
 * WHAT IT DOES NOT COPY: how the server's /v1/tell/extract splits a typed
 * dish into parts. The lookup reads the food as a dish name with no parts,
 * which is what PairIt does for a dish the diner types by hand.
 *
 * Reads only. Ids are the join: kinds by id, bottles by products.id.
 */
import { parseCsv } from '../../../../vendor/pairitEngine/csv.js';
import { AXES_DISH, buildTables } from '../../../../vendor/pairitEngine/tables.js';
import { dishProfile } from '../../../../vendor/pairitEngine/scoring.js';
import { suggestForGroup } from '../../../../vendor/pairitEngine/pairIt.js';
import { pairItBottles } from '../../../../vendor/pairitEngine/pairItKinds.js';
import { resolveComponents } from '../../../../vendor/pairitEngine/resolveComponents.js';
import { slipHeads } from '../../../../vendor/pairitEngine/pairItSlips.js';
import wineAxesRaw from '../../../../vendor/pairitEngine/data/wine_axes.csv?raw';
import dishAxesRaw from '../../../../vendor/pairitEngine/data/dish_axes.csv?raw';
import pairingRulesRaw from '../../../../vendor/pairitEngine/data/pairing_rules.csv?raw';
import corpusRaw from '../../../../vendor/pairitEngine/data/corpus_categories.csv?raw';
import corpusVerdictsRaw from '../../../../vendor/pairitEngine/data/corpus_alias_verdicts.csv?raw';
import pinRaw from '../../../../vendor/pairitEngine/PIN.json?raw';

export const ENGINE_PIN: { commit: string; copied_at: string; files: Record<string, string> } = JSON.parse(pinRaw);

const LOCAL_CORPUS = {
  corpus_categories: parseCsv(corpusRaw),
  corpus_alias_verdicts: parseCsv(corpusVerdictsRaw),
};
export const LOCAL_TABLES = buildTables({
  wine_axes: parseCsv(wineAxesRaw),
  dish_axes: parseCsv(dishAxesRaw),
  pairing_rules: parseCsv(pairingRulesRaw),
  ...LOCAL_CORPUS,
});

function unwrapBundle(bundle) {
  if (!bundle) return null;
  const t = bundle.tables && typeof bundle.tables === 'object' ? bundle.tables : bundle;
  const corpus = (t.corpus_categories || []).length && (t.corpus_alias_verdicts || []).length
    ? { corpus_categories: t.corpus_categories, corpus_alias_verdicts: t.corpus_alias_verdicts }
    : LOCAL_CORPUS;
  return { wine_axes: t.wine_axes || [], dish_axes: t.dish_axes || [], pairing_rules: t.pairing_rules || [], ...corpus };
}

const BLOCKING_KINDS = ['hard_fail', 'require'];
const half = (n: number) => Math.ceil(n / 2);
export const SERVED_FLOOR = Object.freeze({
  rules: half(LOCAL_TABLES.rules.length),
  dish: half(LOCAL_TABLES.dishVocab.length),
  wine: half(Object.keys(LOCAL_TABLES.wine).length),
  kinds: Object.freeze(BLOCKING_KINDS.filter((k) => LOCAL_TABLES.rules.some((r) => r.kind === k))),
});

function meetsFloor(T) {
  return (
    T.rules.length >= SERVED_FLOOR.rules
    && T.dishVocab.length >= SERVED_FLOOR.dish
    && Object.keys(T.wine).length >= SERVED_FLOOR.wine
    && SERVED_FLOOR.kinds.every((k) => T.rules.some((r) => r.kind === k))
  );
}

/**
 * The tables PairIt scores with: the served rules bundle when it meets the
 * floor, otherwise the tables compiled into the app. source says which.
 */
export function tablesFor(bundle): { T: any; source: string } {
  if (bundle) {
    const built = buildTables(unwrapBundle(bundle));
    if (meetsFloor(built)) return { T: built, source: `served rules bundle v${bundle.version}` };
    return { T: LOCAL_TABLES, source: `bundled tables (served v${bundle.version} is below the floor)` };
  }
  return { T: LOCAL_TABLES, source: 'bundled tables (no served bundle)' };
}

/** The dish as the engine reads it: the food's own words, resolved. */
export function engineDish(text: string, T) {
  const out: string[] = [];
  const add = (c) => { const k = String(c || '').trim().toLowerCase(); if (k && !out.includes(k)) out.push(k); };
  resolveComponents(text, '', T).forEach(add);
  slipHeads(text, T).forEach(add);
  return { id: 'lookup', name: text, components: out };
}

/** True when the engine knows a food in it, not only a cooking word. */
export function isReadable(text: string, T) {
  const methods = new Set(T.methods || []);
  return dishProfile(engineDish(text, T).components, T).known.some((c) => !methods.has(c));
}

const FLAGS = ['traditional', 'adventurous'];
export function cleanKinds(list) {
  return (Array.isArray(list) ? list : []).filter((k) => k
    && typeof k.id === 'string' && k.id
    && typeof k.name === 'string' && k.name.trim()
    && FLAGS.includes(k.flag)
    && k.profile && typeof k.profile === 'object'
    && !(typeof k.bottle_count === 'number' && k.bottle_count <= 0));
}

export type KindPicks = {
  readable: boolean;
  components: string[];
  known: string[];
  ask: string | null;
  traditional: any[];
  adventurous: any | null;
};

/** Three traditional kinds and one adventurous, as PairIt offers one dish. */
export function pickKinds(text: string, kinds, T): KindPicks {
  const dish = engineDish(text, T);
  const known = dishProfile(dish.components, T).known;
  if (!isReadable(text, T)) {
    return { readable: false, components: dish.components, known, ask: null, traditional: [], adventurous: null };
  }
  const usable = cleanKinds(kinds);
  if (!usable.length) return { readable: true, components: dish.components, known, ask: null, traditional: [], adventurous: null };
  const [group] = pairItBottles([dish], usable, T, { bottles: 1 }).groups;
  return {
    readable: true,
    components: dish.components,
    known,
    ask: group.ask,
    traditional: group.traditional.map((t) => t.kind),
    adventurous: group.adventurous ? group.adventurous.kind : null,
  };
}

/**
 * A DRAFT FOOD'S SAMPLE PAIRING (Moose Q95 to Q98). The draft's scores are
 * the tags' existing tasting profiles combined on the server; here they become
 * one food row in a copy of the tables, under the draft's own key, and the
 * dish is that one food. The engine itself is unchanged and the shared tables
 * are never touched. Axes the server does not score read as the engine's
 * default, 1. Rule keys are not mapped (the pin predates Cork's mapping), so
 * the sample ignores them; the screen lists them as text.
 */
export function pickKindsForScores(key: string, scores: Record<string, number | null | undefined>, kinds, T): KindPicks {
  const food = String(key || '').trim().toLowerCase() || 'draft food';
  const row: Record<string, number> = {};
  for (const a of AXES_DISH) {
    const v = scores ? scores[a] : null;
    row[a] = typeof v === 'number' && Number.isFinite(v) ? v : 1;
  }
  const T2 = { ...T, dish: { ...T.dish, [food]: row } };
  const dish = { id: 'draft', name: food, components: [food] };
  const usable = cleanKinds(kinds);
  if (!usable.length) return { readable: true, components: [food], known: [food], ask: null, traditional: [], adventurous: null };
  const [group] = pairItBottles([dish], usable, T2, { bottles: 1 }).groups;
  return {
    readable: true,
    components: [food],
    known: [food],
    ask: group.ask,
    traditional: group.traditional.map((t) => t.kind),
    adventurous: group.adventurous ? group.adventurous.kind : null,
  };
}

const isId = (v) => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim() !== '');
const text = (v) => (typeof v === 'string' ? v.trim() : '');

export function cleanBands(list) {
  return (Array.isArray(list) ? list : [])
    .filter((b) => b && typeof b.band === 'string' && b.band && typeof b.label === 'string' && b.label)
    .map((b) => ({
      band: b.band,
      label: b.label,
      bottles: (Array.isArray(b.bottles) ? b.bottles : []).filter((x) => x
        && isId(x.id)
        && (text(x.producer) || text(x.wine))
        && Number.isInteger(x.shown_price_cents) && x.shown_price_cents > 0),
    }))
    .filter((b) => b.bottles.length);
}

function engineWine(bottle) {
  const p = bottle.profile || {};
  return {
    id: String(bottle.id),
    grape_head: text(p.grape_head).toLowerCase(),
    region_head: text(p.region_head).toLowerCase(),
    color: text(p.colour).toLowerCase(),
  };
}

export const LANE_BOTTLES = 4;
export const PUSH_ORDER = ['big_push', 'push'];
export function pushRank(bottle) {
  const at = PUSH_ORDER.indexOf(bottle && bottle.push);
  return at === -1 ? PUSH_ORDER.length : at;
}

/** A kind's bottles for this food, best fit first, the ones the rules block left out; up to four. */
export function fitBottles(bands, foodText: string, T, n = LANE_BOTTLES) {
  const all = cleanBands(bands).flatMap((b) => b.bottles);
  if (!all.length) return [];
  const dishes = [engineDish(foodText, T)];
  const byId = new Map(all.map((b) => [String(b.id), b]));
  const fit = suggestForGroup(dishes, [0], all.map(engineWine), T, Infinity).map((s) => byId.get(s.wine.id));
  return fit.map((b, i) => ({ b, i }))
    .sort((x, y) => pushRank(x.b) - pushRank(y.b) || x.i - y.i)
    .slice(0, n)
    .map((x) => x.b);
}

/** $29, or $29.50 when there are cents. */
export function formatPrice(cents: number) {
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest ? `$${whole}.${String(rest).padStart(2, '0')}` : `$${whole}`;
}
