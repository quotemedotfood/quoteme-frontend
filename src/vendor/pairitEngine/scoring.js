/**
 * scoring.js - line-for-line port of pairing_engine.py's scoring core. No
 * AI, no network, deterministic: the same dish + wine list always produces
 * the same ranked picks, because a rep who gets a different recommendation
 * on Tuesday than Monday cannot defend either one.
 *
 * Anti-divergence contract: this file's output MUST match
 * `python3 pairing_engine.py --selftest` exactly (eligibility counts, #1
 * pick, fired rule ids) for the twelve SELFTEST dishes. See scoring.test.js.
 * If you find a mismatch, the bug is in this file - fix the port, never
 * adjust the fixture.
 */
import { AXES_WINE, AXES_DISH, toInt } from './tables.js';

// Scores are UNCAPPED on purpose. 100 is good, 140 is a bridge. A cap on the
// upper end creates ties, and ties destroy ranking. The only clamp applied
// (below, in scoreWine) is a FLOOR at 0, which pairing_engine.py also does -
// that is not a cap, it just keeps a very bad candidate from reporting a
// nonsensical negative score.
const BASE = 50;

/**
 * A dish's axes are the MAX of its components, never the mean - one
 * artichoke sets the constraint for the whole plate. Port of `dish_profile`.
 *
 * @param {string[]} components
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @returns {{profile: Record<string, number>, known: string[], unknown: string[]}}
 */
export function dishProfile(components, T) {
  const profile = {};
  for (const a of AXES_DISH) profile[a] = 1;
  const known = [];
  const unknown = [];
  for (const raw of components) {
    const c = (raw || '').trim().toLowerCase();
    const row = T.dish[c];
    if (!row) {
      unknown.push(c);
      continue;
    }
    known.push(c);
    for (const a of AXES_DISH) {
      profile[a] = Math.max(profile[a], row[a]);
    }
  }
  return { profile, known, unknown };
}

/**
 * Wine axes resolve APPELLATION FIRST, then grape - Chablis and Napa
 * chardonnay are not the same wine. Falls back to a neutral middle (and
 * says so via `source: "unscored"`) when neither is in wine_axes.csv. Port
 * of `wine_profile`. Levels 1 and 2 only: no terroir table is read here.
 *
 * @param {Record<string, any>} wine
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @returns {{axes: Record<string, any>, source: string}}
 */
export function wineProfile(wine, T) {
  for (const key of ['region_head', 'appellation', 'region']) {
    const h = String(wine[key] || '').trim().toLowerCase();
    if (h && T.wine[h]) return { axes: T.wine[h], source: `appellation:${h}` };
  }
  for (const key of ['grape_head', 'grape']) {
    const h = String(wine[key] || '').trim().toLowerCase();
    if (h && T.wine[h]) return { axes: T.wine[h], source: `grape:${h}` };
  }
  const neutral = {};
  for (const a of AXES_WINE) neutral[a] = 3;
  neutral.texture = 'still';
  neutral.confidence = 'none';
  neutral.notes = '';
  return { axes: neutral, source: 'unscored' };
}

const CMP_RE = /^\s*(\w+)\s*(<=|>=|==|<|>)\s*(.+?)\s*$/;
const ABS_RE = /^abs\((\w+)-(\w+)\)\s*<=\s*(\d+)$/;
const FIELD_ALIAS = { grape: 'grape_head', region: 'region_head' };

function cmpOp(op, left, right) {
  switch (op) {
    case '<=':
      return left <= right;
    case '>=':
      return left >= right;
    case '==':
      return left === right;
    case '<':
      return left < right;
    case '>':
      return left > right;
    default:
      return true;
  }
}

const WINE_AXIS = new Set(AXES_WINE);

/**
 * Port of `_eval_atom`, with one addition: THREE-VALUED for an unscored wine.
 *
 * An unscored wine's axes are an invented neutral 3 (see wineProfile). An atom
 * that reads one of those axes, or reads `texture` when the wine row carries
 * none of its own, cannot be shown to hold or to fail, so it returns null
 * (unknown) instead of a verdict computed from the made-up number. Atoms that
 * read the wine's real fields (grape, region) or only the dish are evaluated
 * as before. For a scored wine nothing changes: `unscored` is false and this
 * returns true/false exactly as the Python port did.
 */
function evalAtom(atomRaw, w, wine, dish, unscored = false) {
  const atom = (atomRaw || '').trim();
  if (!atom) return true;

  const absMatch = ABS_RE.exec(atom);
  if (absMatch) {
    const [, a, b, nStr] = absMatch;
    if (unscored && (WINE_AXIS.has(a) || WINE_AXIS.has(b))) return null;
    const n = parseInt(nStr, 10);
    const left = a in w ? w[a] : (a in dish ? dish[a] : 3);
    const right = b in dish ? dish[b] : (b in w ? w[b] : 3);
    return Math.abs(Number(left) - Number(right)) <= n;
  }

  const m = CMP_RE.exec(atom);
  if (!m) return true;
  let [, field, op, valRaw] = m;
  const val = valRaw.trim();
  if (field.endsWith('_wine')) field = field.slice(0, -5);

  if (field === 'grape' || field === 'region' || field === 'texture') {
    if (unscored && field === 'texture' && !('texture' in wine)) return null;
    const key = FIELD_ALIAS[field] || field; // 'texture' has no alias -> itself
    const fallback = w.texture !== undefined ? w.texture : '';
    const rawLeft = key in wine ? wine[key] : fallback;
    const left = String(rawLeft == null ? '' : rawLeft).trim().toLowerCase();
    return left === val.trim().toLowerCase();
  }

  if (unscored && field in w && WINE_AXIS.has(field)) return null;
  const left = field in w ? w[field] : dish[field];
  if (left === undefined || left === null) return true;
  try {
    const n = parseInt(val, 10);
    if (Number.isNaN(n)) return true;
    return cmpOp(op, left, n);
  } catch {
    return true;
  }
}

/**
 * Port of `_eval_cond`: every atom joined by literal " and " must hold.
 * Three-valued AND for an unscored wine: any false atom makes it false, else
 * any unknown atom makes it null (unknown), else true.
 */
function evalCond(cond, w, wine, dish, unscored = false) {
  if (!(cond || '').trim()) return true;
  let unknown = false;
  for (const p of cond.split(' and ')) {
    const v = evalAtom(p, w, wine, dish, unscored);
    if (v === false) return false;
    if (v === null) unknown = true;
  }
  return unknown ? null : true;
}

/** Port of `_triggered`. An axis trigger on the WINE's own axis
 * (`tannin_wine>=4`) is not triggered for an unscored wine: its axis is
 * invented, so it cannot be shown to meet the trigger. */
function triggered(rule, dish, components, w, unscored = false) {
  const kind = rule.trigger_type;
  const trig = (rule.trigger || '').trim().toLowerCase();
  if (kind === 'component') {
    return components.map((c) => (c || '').trim().toLowerCase()).includes(trig);
  }
  if (kind === 'axis') {
    const m = CMP_RE.exec(trig);
    if (!m) return trig in dish;
    let [, f, op, v] = m;
    let left;
    if (f.endsWith('_wine')) {
      if (unscored) return false;
      left = w[f.slice(0, -5)];
    } else {
      left = dish[f];
    }
    if (left === undefined || left === null) return false;
    try {
      const n = parseInt(v, 10);
      if (Number.isNaN(n)) return false;
      return cmpOp(op, left, n);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Port of `score_wine`. Runs the baseline structural fit, then every active
 * rule that is triggered for this dish. hard_fail/require ABORT (block)
 * eligibility when their wine_condition fails; penalty subtracts points
 * (never aborts); boost/bridge/score add points. why-text is always the
 * rule's own why_template - never generated free text.
 *
 * @param {Record<string, any>} wine
 * @param {Record<string, number>} dish - a dish PROFILE (already MAX'd).
 * @param {string[]} components
 * @param {ReturnType<import('./tables.js').buildTables>} T
 */
export function scoreWine(wine, dish, components, T) {
  const { axes: w, source } = wineProfile(wine, T);
  let pts = BASE;
  const fired = [];
  const blocked = [];
  let hardBlocked = false;

  pts += 20 - 7 * Math.abs(w.body - dish.weight);
  if (w.acid >= dish.acid) {
    pts += 10;
  } else {
    pts -= 12 * (dish.acid - w.acid);
  }
  if (w.sweetness >= dish.sweetness - 1) {
    pts += 5;
  } else {
    pts -= 10 * (dish.sweetness - 1 - w.sweetness);
  }

  // AN UNSCORED WINE NEVER PASSES A RULE ON AN AXIS IT DOES NOT HAVE. Review
  // finding C1: the neutral sweetness of 3 satisfied req_sweet_roquefort's
  // `sweetness>=3`, so a dry Grand Cru and a cocktail were offered with the
  // cheese course and the sweet-wine rule was recorded as FIRED. The rule now:
  //   hard_fail / require  -> passes only when PROVEN (ok === true). Unknown
  //                           blocks, exactly as a failure does.
  //   boost / bridge /score -> fires only when proven, so no why-line is ever
  //                           written from an invented axis.
  //   penalty              -> applied only on a PROVEN failure, as before. The
  //                           flat unscored demerit below already carries the
  //                           uncertainty; stacking guessed penalties on it
  //                           would rank on made-up numbers in the other
  //                           direction.
  // A rule whose condition reads only real fields (grape, region) or only the
  // dish is evaluated normally, so an unscored wine stays eligible wherever no
  // hard rule needs an axis it lacks. Scored wines are untouched (Python
  // parity holds: no DEMO wine is unscored).
  const unscored = source === 'unscored';
  for (const r of T.rules) {
    if (!triggered(r, dish, components, w, unscored)) continue;
    const ok = evalCond(r.wine_condition, w, wine, dish, unscored);
    const kind = r.kind;
    const why = (r.why_template || '').replace('{wine}', wine.label || 'This wine');

    if (kind === 'hard_fail' || kind === 'require') {
      if (ok === true) {
        pts += 15;
        fired.push([r.rule_id, why]);
      } else {
        blocked.push([r.rule_id, why]);
        hardBlocked = true;
      }
    } else if (kind === 'penalty') {
      if (ok === false) {
        pts += toInt(r.weight, -20);
        blocked.push([r.rule_id, why]);
      }
    } else if (kind === 'boost' || kind === 'bridge' || kind === 'score') {
      if (ok === true) {
        pts += toInt(r.weight, 10);
        fired.push([r.rule_id, why]);
      }
    }
    // any other kind (e.g. "note") is a silent no-op, matching Python's
    // if/elif chain falling through with no else branch.
  }

  if (unscored) pts -= 15;

  return {
    score: Math.max(0, pts),
    fired,
    blocked,
    axisSource: source,
    axes: w,
    eligible: !hardBlocked,
  };
}

/**
 * Port of `pair`. Ranks eligible wines by score (desc), then assigns roles
 * by walking the ranked list and taking the next wine with a grape we
 * haven't picked yet (the "discovery" mechanic), stopping at `n` picks.
 *
 * @param {string} dishName
 * @param {string[]} components
 * @param {Array<Record<string, any>>} wines
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @param {{n?: number, budget?: number|null, glassOnly?: boolean}} [opts]
 */
export function pair(dishName, components, wines, T, opts = {}) {
  const { n = 3, budget = null, glassOnly = false } = opts;
  const { profile, known, unknown } = dishProfile(components, T);

  const out = [];
  for (const wine of wines) {
    if (budget && toInt(wine.price, 0) > budget) continue;
    if (glassOnly && !wine.glass) continue;
    const s = scoreWine(wine, profile, components, T);
    s.wine = wine;
    out.push(s);
  }

  const eligible = out.filter((x) => x.eligible);
  eligible.sort((a, b) => b.score - a.score);

  const picks = [];
  const seenGrapes = new Set();
  for (const x of eligible) {
    // AN UNKNOWN GRAPE IS NOT ONE GRAPE (M7). '' used to be a single dedupe
    // bucket, so the first unknown-grape wine shut out every other one and a
    // dish with nine eligible wines got one pick. An unknown grape is never
    // a duplicate of anything; only a NAMED grape already picked is skipped.
    const g = String(x.wine.grape_head || x.wine.grape || '').trim().toLowerCase();
    if (picks.length === 0 || !g || !seenGrapes.has(g)) {
      picks.push(x);
      if (g) seenGrapes.add(g);
    }
    if (picks.length >= n) break;
  }

  return {
    dish: dishName,
    profile,
    known,
    unknown,
    picks,
    considered: out.length,
    eligible: eligible.length,
    rejected: out.filter((x) => !x.eligible).slice(0, 5),
  };
}

/** CLI-facing role names, purely for display/debug parity with the Python
 * script's own `--selftest` print output ("Classic", "Made for this", "If
 * you are curious"). The PairMe product surface uses its own slot labels -
 * see roles.js. */
export const DEBUG_ROLES = ['Classic', 'Made for this', 'If you are curious'];

/**
 * IS THIS A DISH THE ENGINE CAN READ AT ALL. True when at least one component
 * is a row in dish_axes.csv, or is the trigger of an active component rule
 * (bridge_cooked_in fires on "sauvignon blanc", which has no dish row of its
 * own). A dish with neither has the all-1 profile dishProfile falls back to:
 * nothing about the plate was read, so ranking wines against it ranks them
 * against nothing (review finding H7: "Burger" with no components was handed
 * three light whites as if they were chosen for it).
 *
 * Not part of the Python port: pairing_engine.py pairs any dish. No SELFTEST
 * dish is affected, because every one of the twelve has known components.
 *
 * @param {string[]} components
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @returns {boolean}
 */
export function dishIsRecognised(components, T) {
  for (const raw of components || []) {
    const c = String(raw || '').trim().toLowerCase();
    if (!c) continue;
    if (T.dish[c]) return true;
    if (T.rules.some((r) => r.trigger_type === 'component' && String(r.trigger || '').trim().toLowerCase() === c)) return true;
  }
  return false;
}

const BREADTH = new WeakMap(); // T -> Map(wine key -> {fits, total})

/** What scoreWine reads off a wine besides its label: the axes it resolves to
 * and the real grape/region/texture fields rules compare against. Two wines
 * with the same key score identically against every dish profile. */
function breadthKey(wine, T) {
  const { source } = wineProfile(wine, T);
  return [source, wine.grape_head, wine.grape, wine.region_head, wine.region, wine.appellation, wine.texture]
    .map((v) => String(v == null ? '' : v).trim().toLowerCase()).join('|');
}

/**
 * HOW VERSATILE A WINE IS, by the engine's own data: on how many of the dish
 * profiles in dish_axes.csv it comes back ELIGIBLE (scoreWine, each row taken
 * as a one-component dish so its component rules fire too), and its mean
 * score across the ones it clears. Nothing here is a new rule or a new
 * number: it is the same eligibility and the same score every pairing uses,
 * asked of every dish the engine knows instead of one.
 *
 * @returns {{fits: number, total: number, meanScore: number}}
 */
export function wineBreadth(wine, T) {
  if (!BREADTH.has(T)) BREADTH.set(T, new Map());
  const memo = BREADTH.get(T);
  const key = breadthKey(wine, T);
  if (memo.has(key)) return memo.get(key);
  let fits = 0;
  let sum = 0;
  const heads = Object.keys(T.dish);
  for (const h of heads) {
    const s = scoreWine(wine, dishProfile([h], T).profile, [h], T);
    if (s.eligible) { fits += 1; sum += s.score; }
  }
  const out = { fits, total: heads.length, meanScore: fits ? sum / fits : 0 };
  memo.set(key, out);
  return out;
}

/**
 * THE LIST'S MOST VERSATILE WINES, for a dish the engine could not read (Moose,
 * 2026-10-19: "versatile" wording). Ranked by wineBreadth: the most dish
 * profiles cleared first, then the higher mean score across them, then the
 * label so the order never depends on list order. An UNSCORED wine is never
 * offered here: its axes are an invented neutral 3, so the engine cannot know
 * it is versatile and must not say so. Named grapes are picked once each, as
 * pair() does, so the three are three different answers; an unknown grape is
 * never a duplicate of anything (M7).
 *
 * Not part of the Python port.
 *
 * @param {Array<Record<string, any>>} wines
 * @param {ReturnType<import('./tables.js').buildTables>} T
 * @param {{n?: number}} [opts]
 * @returns {Array<{wine: object, fits: number, total: number, meanScore: number}>}
 */
export function versatileWines(wines, T, opts = {}) {
  const { n = 3 } = opts;
  const ranked = (wines || [])
    .filter((w) => wineProfile(w, T).source !== 'unscored')
    .map((wine) => ({ wine, ...wineBreadth(wine, T) }))
    .filter((x) => x.fits > 0)
    .sort((a, b) => b.fits - a.fits || b.meanScore - a.meanScore
      || String(a.wine.label || '').localeCompare(String(b.wine.label || '')));
  const picks = [];
  const seen = new Set();
  for (const x of ranked) {
    const g = String(x.wine.grape_head || x.wine.grape || '').trim().toLowerCase();
    if (g && seen.has(g)) continue;
    picks.push(x);
    if (g) seen.add(g);
    if (picks.length >= n) break;
  }
  return picks;
}
