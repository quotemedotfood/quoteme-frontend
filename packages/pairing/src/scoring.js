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

/** Port of `_eval_atom`. */
function evalAtom(atomRaw, w, wine, dish) {
  const atom = (atomRaw || '').trim();
  if (!atom) return true;

  const absMatch = ABS_RE.exec(atom);
  if (absMatch) {
    const [, a, b, nStr] = absMatch;
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
    const key = FIELD_ALIAS[field] || field; // 'texture' has no alias -> itself
    const fallback = w.texture !== undefined ? w.texture : '';
    const rawLeft = key in wine ? wine[key] : fallback;
    const left = String(rawLeft == null ? '' : rawLeft).trim().toLowerCase();
    return left === val.trim().toLowerCase();
  }

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

/** Port of `_eval_cond`: every atom joined by literal " and " must hold. */
function evalCond(cond, w, wine, dish) {
  if (!(cond || '').trim()) return true;
  return cond.split(' and ').every((p) => evalAtom(p, w, wine, dish));
}

/** Port of `_triggered`. */
function triggered(rule, dish, components, w) {
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

  for (const r of T.rules) {
    if (!triggered(r, dish, components, w)) continue;
    const ok = evalCond(r.wine_condition, w, wine, dish);
    const kind = r.kind;
    const why = (r.why_template || '').replace('{wine}', wine.label || 'This wine');

    if (kind === 'hard_fail' || kind === 'require') {
      if (ok) {
        pts += 15;
        fired.push([r.rule_id, why]);
      } else {
        blocked.push([r.rule_id, why]);
        hardBlocked = true;
      }
    } else if (kind === 'penalty') {
      if (!ok) {
        pts += toInt(r.weight, -20);
        blocked.push([r.rule_id, why]);
      }
    } else if (kind === 'boost' || kind === 'bridge' || kind === 'score') {
      if (ok) {
        pts += toInt(r.weight, 10);
        fired.push([r.rule_id, why]);
      }
    }
    // any other kind (e.g. "note") is a silent no-op, matching Python's
    // if/elif chain falling through with no else branch.
  }

  if (source === 'unscored') pts -= 15;

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
    const g = (x.wine.grape_head || x.wine.grape || '').toLowerCase();
    if (picks.length === 0 || !seenGrapes.has(g)) {
      picks.push(x);
      seenGrapes.add(g);
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
