/**
 * App-side glue between the demo seed / mocked API rows and Cooper's
 * packages/pairing scoring engine. Imports packages/pairing READ ONLY: no
 * file under packages/pairing is edited by this branch, this module only
 * calls its exported functions.
 *
 * "Direction" (course_it_out | one_bottle | several) is decided by
 * HowToDrink's UI (see state.js mapDirection); this file turns that plus the
 * table's chosen dishes and the parsed wine rows into the three
 * role-labelled offerings (house/suited/crowd) TheWine screen renders, or,
 * for one_bottle, the single bottle + its required `compromise` field
 * (packages/pairing/src/directions.js's oneBottle already computes exactly
 * that; this file only shapes it for display).
 */
import { dishProfile, scoreWine, pair } from '../../../../packages/pairing/src/scoring.js';
import { SLOTS } from '../../../../packages/pairing/src/roles.js';
import { oneBottle, several } from '../../../../packages/pairing/src/directions.js';
import { buildTables } from '../../../../packages/pairing/src/tables.js';

export { buildTables };

/**
 * The glass/bottle toggle is a switch between two SEPARATE candidate pools with
 * two different ranking strategies, not a filter over one ranked list:
 *
 *   glass  -> a pour PER dish (course_it_out), over the by-the-glass pool only.
 *             A glass is one dish, one wine, so each course is optimised alone.
 *   bottle -> ONE wine ACROSS every dish (one_bottle), over the whole list.
 *             A bottle is the table's compromise, so it optimises the sum and
 *             names where it gives ground.
 *   both   -> a neutral table-wide shortlist (several).
 *
 * Ranking one pool and filtering it would give the bottle answer wearing a
 * glass price; keeping the pools and strategies separate is the point.
 */
export const DIRECTION_FOR_FORMAT = {
  glass: 'course_it_out',
  bottle: 'one_bottle',
  both: 'several',
};

/** A mocked GET /v1/demo row -> the plain wine object the scoring engine
 * reads (label/grape_head/region_head/price/glass), with display-only extras
 * (producer/wine_name/say/speak/tip/meta/client_row_id/binNo) passed through
 * untouched since scoreWine/wineProfile only look at the axis-relevant keys.
 *
 * ITEM 4 (Amy interview): a bin number lets a guest say "I want wine 902"
 * without the pronunciation anxiety a long producer/appellation name causes
 * - the SAME anxiety `say`/`speak` already address, solved a second way.
 * packages/pairing's parseWineList.js sets this as `bin` on parsed rows
 * (see BIN_START there); demo/seed rows never carry it (most cellars have
 * no bin system), a pasted cellar list sometimes does. Read either key so a
 * caller handing this a row already shaped `binNo` (rather than a raw
 * parseWineList row) still passes through cleanly.
 */
export function rowToEngineWine(row) {
  return {
    label: row.label || [row.producer, row.wine_name].filter(Boolean).join(', '),
    grape_head: (row.grape_head || row.grape || '').toLowerCase(),
    region_head: (row.region_head || row.region || '').toLowerCase(),
    price: row.price,
    glass: !!row.glass,
    glass_price: row.glass_price,
    producer: row.producer,
    wine_name: row.wine_name,
    meta: row.meta,
    say: row.say,
    speak: row.speak,
    tip: row.tip,
    binNo: row.binNo || row.bin || null,
    client_row_id: row.client_row_id,
  };
}

/** A demo menu dish -> {name, components} the scoring engine expects. */
export function dishToEngineDish(dish) {
  return { name: dish.n, components: dish.components || [] };
}

// `match_weight` fires for almost every same-weight wine, so its text
// ("{wine} sits at the same weight as the plate.") reads identically across
// offerings. It is a structural tie-breaker, never the defensible reason a
// diner repeats at the pour. Any rule id in here is demoted below a
// wine-specific fired rule when choosing the ONE headline sentence.
//
// Exported so the wine-list browse view (lib/wineListEngine.js) can hold
// its "Pairs with X" badges to the same bar this file's own cards hold
// themselves to - a badge and an offering card must never disagree about
// whether a rule fired for a "real" (wine-specific) reason.
export const GENERIC_RULE_IDS = new Set(['match_weight', 'pen_neutral_dish']);

/**
 * The single reason sentence a card leads with. A pairing must be defensible
 * and it must vary by wine, so this prefers the most wine-specific rule that
 * fired for THIS wine over the generic weight tie-breaker, and never falls
 * back to a per-dish label (two wines cannot share one reason). When nothing
 * wine-specific fired, it says so honestly, in terms of THIS wine's own
 * identity (its appellation or grape), rather than pretending confidence.
 *
 * Exported: lib/wineListEngine.js reuses this verbatim for its "pairs with"
 * badge reasons, so a wine's badge on the browse screen and its "why" on
 * TheWine's offering card are never two different sentences about the same
 * fired rule.
 *
 * @param {Array<[string,string]>} fired - [rule_id, why] pairs from scoreWine
 * @param {object} wine - engine wine (has label/region_head/grape_head)
 */
export function headlineWhy(fired, wine) {
  const specific = fired.find(([id]) => !GENERIC_RULE_IDS.has(id));
  if (specific) return specific[1];
  // Only the generic weight tie-breaker fired (or nothing): there is no
  // wine-specific claim the rules support, so say that honestly in terms of
  // this wine's own identity rather than repeating one templated sentence
  // across every card.
  return structuralWhy(wine);
}

/** Per-wine honest fallback when no rule fired: references this wine's own
 * region or grape so it can never read the same as another offering, and
 * makes no claim the rules did not support. */
function structuralWhy(wine) {
  const id = wine.region_head || wine.grape_head;
  if (id) {
    const nice = id.charAt(0).toUpperCase() + id.slice(1);
    return `${nice} is a safe structural fit for what you ordered, though nothing on this plate calls for it specifically.`;
  }
  return `A safe structural fit for what you ordered, though nothing on this plate calls for it specifically.`;
}

function median(sortedNums) {
  const n = sortedNums.length;
  if (!n) return null;
  return n % 2 === 1 ? sortedNums[(n - 1) / 2] : (sortedNums[n / 2 - 1] + sortedNums[n / 2]) / 2;
}

/**
 * ITEM 3 (Amy interview): SPREAD the several-offerings across price points
 * rather than surfacing whichever three score highest, which tend to
 * cluster near each other in price. Amy sells on the floor by throwing out
 * two price points and reading which one the guest is more comfortable
 * with - the diner's pick is comfort information a clustered top-3 throws
 * away before the guest ever gets to reveal it.
 *
 * `ranked` is already both (a) restricted to wines that clear EVERY dish on
 * the table - several()'s whole-table eligibility gate already ran - and
 * (b) sorted desc by adjScore. This function only SELECTS among those
 * already-qualifying entries by price bracket; it never promotes an
 * ineligible wine just to fill a bracket, and the score ranking that
 * established quality is preserved for the final 3 (see the sort at the end).
 *
 * That first half of the invariant was ASSERTED here and was not true:
 * several() used to admit a wine that cleared any ONE dish, so this function
 * faithfully spread hard-blocked wines across price brackets. The gate was
 * fixed in several() rather than here, because bracketing among valid answers
 * is this function's only job. If a bracket has no qualifying candidate it
 * stays empty. Empty beats wrong.
 *
 * Brackets: low = below the midpoint, high = the top quarter of the range
 * (near budget.max / the priciest candidates), mid = everything between.
 * When a two-handle budget range is present (budget.min AND budget.max),
 * the midpoint is the diner's own range midpoint - "below what you asked
 * for" should mean below what they actually asked for, not below the
 * shortlist's median. When no budget range exists, the bracket boundaries
 * fall back to the shortlist's OWN price distribution (min/median/max).
 *
 * @param {Array<{wine: object, bestScore: number, bestForDish: string, adjScore: number}>} ranked
 * @param {{min?: number, max?: number}|null} budget
 * @returns {Array} up to 3 entries from `ranked`, one per bracket where a
 *   qualifying candidate exists there, sorted back to score order.
 */
/**
 * Which rule shut the door, and on which dish. Used only when NOTHING on the
 * list clears the table, so the screen can name the constraint instead of
 * going blank or, worse, falling back to a canned shortlist.
 *
 * Counts every hard block across every wine and dish and reports the rule
 * responsible for the most of them, with that rule's own why_template.
 *
 * @returns {{ruleId: string, dish: string, why: string, wineCount: number}|null}
 */
function dominantBlocker(engineDishes, wines, T) {
  const tally = new Map();
  for (const d of engineDishes) {
    const { profile } = dishProfile(d.components, T);
    for (const wine of wines) {
      const s = scoreWine(wine, profile, d.components, T);
      if (s.eligible) continue;
      for (const [ruleId, why] of s.blocked) {
        const k = `${ruleId} ${d.name}`;
        const prev = tally.get(k);
        if (prev) prev.wineCount += 1;
        else tally.set(k, { ruleId, dish: d.name, why, wineCount: 1 });
      }
    }
  }
  if (tally.size === 0) return null;
  return [...tally.values()].sort((a, b) => b.wineCount - a.wineCount)[0];
}

function selectAcrossPriceBrackets(ranked, budget) {
  if (ranked.length <= 3) return ranked.slice(0, 3);

  const priced = ranked.filter((e) => e.wine.price != null);
  // Not enough price data to bracket meaningfully - fall back to pure score
  // rank rather than inventing brackets from one or zero data points.
  if (priced.length < 2) return ranked.slice(0, 3);

  const sortedPrices = priced.map((e) => e.wine.price).sort((a, b) => a - b);
  const distMin = sortedPrices[0];
  const distMax = sortedPrices[sortedPrices.length - 1];
  const distMedian = median(sortedPrices);

  const hasBudgetRange = !!(budget && budget.min != null && budget.max != null);
  // Same "max at/above 400 means no ceiling" convention this file already
  // uses above (see `ceil`): an uncapped budget.max is not a real top-of-
  // range for bracketing, the shortlist's own priciest candidate is.
  const rangeMin = budget && budget.min != null ? budget.min : distMin;
  const rangeMax = budget && budget.max != null && budget.max < 400 ? budget.max : distMax;
  const mid = hasBudgetRange ? (budget.min + budget.max) / 2 : distMedian;
  const highStart = rangeMax > rangeMin ? rangeMin + (rangeMax - rangeMin) * 0.75 : mid;

  const bracketOf = (entry) => {
    const p = entry.wine.price;
    if (p == null) return 'unknown';
    if (p >= highStart) return 'high';
    if (p < mid) return 'low';
    return 'mid';
  };

  const used = new Set();
  const pick = (bracket) => {
    const hit = ranked.find((e) => !used.has(e.wine.label) && bracketOf(e) === bracket);
    if (hit) used.add(hit.wine.label);
    return hit;
  };

  // High first: it is typically the narrowest, least-populated bracket (a
  // top-quarter-of-range slice), so claim its occupant before a fallback
  // fill from another bracket could take it.
  let high = pick('high');
  let low = pick('low');
  let mid_ = pick('mid');

  // Graceful fallback: an empty bracket (no qualifying candidate landed in
  // it) fills from the next-best UNUSED qualifying candidate rather than
  // shorting the offering count or throwing - "genuine qualifying pick"
  // stays true (it always comes from `ranked`), only the "clean bracket
  // spread" ideal is what gives way when the shortlist can't support it.
  const fallback = () => ranked.find((e) => !used.has(e.wine.label));
  if (!high) {
    high = fallback();
    if (high) used.add(high.wine.label);
  }
  if (!low) {
    low = fallback();
    if (low) used.add(low.wine.label);
  }
  if (!mid_) {
    mid_ = fallback();
    if (mid_) used.add(mid_.wine.label);
  }

  const chosen = [low, mid_, high].filter(Boolean);
  // Slot assignment (house/suited/crowd) still reads top-to-bottom by
  // quality among the three CHOSEN wines, same as the pre-Item-3 behaviour -
  // price-bracket selection changed WHICH three get shown, not how the
  // three that were chosen get ordered into slots.
  return chosen.sort((a, b) => b.adjScore - a.adjScore);
}

/**
 * @param {'course_it_out'|'mains_only'|'one_bottle'|'several'} direction
 * @param {Array} dishes - demo dish objects (id/n/sec/components/...)
 * @param {Array} wines - engine wine objects (rowToEngineWine output)
 * @param {ReturnType<typeof buildTables>} T
 * @param {{format?: 'glass'|'bottle'|'both'}} [opts] - `format:'glass'`
 *   restricts the candidate pool to wines the venue actually pours by the
 *   glass, so the glass/bottle toggle on TheWine re-ranks over the right set
 *   rather than recommending a bottle-only wine you cannot get a glass of.
 *   'bottle' and 'both' leave the pool intact (every wine comes as a bottle);
 *   they differ only in what price the card leads with, which is display.
 * @returns {{direction, offerings: Array, compromise: object|null}}
 */
export function computeOfferings(direction, dishes, wines, T, opts = {}) {
  const { format = 'both', budget = null } = opts;
  // The by-the-glass POOL is genuinely a different candidate set, not a view of
  // the bottle set: only wines the venue actually pours by the glass. If that
  // set is empty (a bottle-only cellar like Barolo Grill), we return zero
  // offerings and let the UI SAY "no by-the-glass list" - never fall back to
  // bottles wearing a glass price, which would be the bottle answer in
  // disguise. See DIRECTION_FOR_FORMAT: glass ranks per dish, bottle ranks
  // across dishes, so the two formats are separate rankings, not a filter.
  wines = format === 'glass' ? wines.filter((w) => w.glass) : wines;

  // BUDGET as a RANGE, not a ceiling. The max is a hard ceiling ("we never show
  // you what you didn't ask to see"); a max at/above the top of the UI range
  // (400) means "no ceiling". The min is a SOFT FLOOR: a bottle under it still
  // appears but loses score, because a diner who set a floor is telling us they
  // do not want the cheapest bottle on the list - the behaviour we break.
  const ceil = budget && budget.max && budget.max < 400 ? budget.max : null;
  if (ceil) wines = wines.filter((w) => w.price == null || w.price <= ceil);
  const FLOOR_PENALTY = 25;
  const floorPenalty = (price) =>
    budget && budget.min && price != null && price < budget.min
      ? Math.round((FLOOR_PENALTY * (budget.min - price)) / budget.min)
      : 0;

  const engineDishes = dishes.map(dishToEngineDish);
  const dishNames = engineDishes.map((d) => d.name);

  // Original dish objects carry section + display name; engineDishes is the
  // components-only shape the scoring core wants. `secOf` bridges the two so
  // coverage can speak in course/section terms (Starters, Mains, ...).
  const MAINS = 'Mains';
  const secOf = (name) => {
    const src = dishes.find((d) => (d.n || d.name) === name);
    return src ? src.sec || null : null;
  };

  function coversFor(wine) {
    return engineDishes
      .filter((d) => {
        const { profile } = dishProfile(d.components, T);
        return scoreWine(wine, profile, d.components, T).eligible;
      })
      .map((d) => d.name);
  }

  // ---- one_bottle: one wine across everything, name where it gives ground ----
  if (direction === 'one_bottle') {
    const result = oneBottle(engineDishes, wines, T);
    if (!result.wine) {
      return {
        direction,
        offerings: [],
        compromise: null,
        coverage: engineDishes.map((d) => ({ dish: d.name, sec: secOf(d.name), status: 'unpaired', wine: null })),
      };
    }
    const best = result.perDish.reduce((top, x) => (x.score > top.score ? x : top));
    const why = headlineWhy(best.fired, result.wine);
    // Every dish is covered by construction (the bottle qualified against all
    // of them). The compromise dish is flagged, never silently dropped.
    const coverage = result.perDish.map((pd) => ({
      dish: pd.dish,
      sec: secOf(pd.dish),
      status: 'paired',
      wine: result.wine.label,
      note: result.compromise && pd.dish === result.compromise.dish ? 'gives the most ground here' : undefined,
    }));
    return {
      direction,
      offerings: [
        {
          wine: result.wine,
          slot: 'house',
          label: SLOTS[0].label,
          why,
          fired: best.fired,
          bestForDish: best.dish,
          score: result.totalScore,
          covers: dishNames, // a qualifying one-bottle pick is eligible for every dish
        },
      ],
      compromise: result.compromise,
      coverage,
    };
  }

  // ---- course_it_out / mains_only: a pour per course ----
  // course_it_out pairs EVERY dish in course order; mains_only pairs only the
  // mains and SAYS which dishes go unpaired (silent omission is the failure
  // mode: a diner must never wonder whether we forgot their starter).
  if (direction === 'course_it_out' || direction === 'mains_only') {
    const target =
      direction === 'mains_only' ? engineDishes.filter((d) => secOf(d.name) === MAINS) : engineDishes;
    // mains_only with no identifiable main pairs everything rather than pairing
    // nothing (still honest: coverage below reflects what actually happened).
    const toPair = target.length ? target : engineDishes;
    const offerings = toPair
      .map((d) => {
        const res = pair(d.name, d.components, wines, T, { n: 1 });
        const top = res.picks[0];
        if (!top) return null;
        return {
          wine: top.wine,
          slot: 'house',
          label: `With the ${d.name.toLowerCase()}`,
          why: headlineWhy(top.fired, top.wine),
          fired: top.fired,
          forDish: d.name,
          forSec: secOf(d.name),
          bestForDish: d.name,
          score: top.score,
          covers: [d.name],
        };
      })
      .filter(Boolean);
    const pairedNames = new Set(offerings.map((o) => o.forDish));
    const coverage = engineDishes.map((d) => ({
      dish: d.name,
      sec: secOf(d.name),
      status: pairedNames.has(d.name) ? 'paired' : 'unpaired',
      wine: pairedNames.has(d.name) ? offerings.find((o) => o.forDish === d.name).wine.label : null,
    }));
    return { direction, offerings, compromise: null, coverage };
  }

  // ---- several (default): a table-wide shortlist to choose from together ----
  // several() is used rather than pair() because pair()'s picks are
  // grape-deduped for its single-dish discovery mechanic (see directions.js),
  // which is the wrong shape for "best across everything ordered".
  // Pull a deeper shortlist so the soft floor can DEMOTE below-floor bottles out
  // of the top three, AND so ITEM 3's price-bracket selection below has enough
  // genuinely-qualifying candidates to spread across price points rather than
  // three that happen to cluster together near the top of the score ranking.
  const SEVERAL_POOL_N = 12;
  const ranked = several(engineDishes, wines, T, { n: SEVERAL_POOL_N })
    .map((entry) => ({ ...entry, adjScore: entry.bestScore - floorPenalty(entry.wine.price) }))
    .sort((a, b) => b.adjScore - a.adjScore);
  // NOTHING CLEARS THE TABLE. Say so, and name the constraint.
  //
  // Real state now that eligibility is applied across the whole table: one
  // hard_fail dish (a Roquefort wanting a sweeter wine than anything on the
  // list) can empty the pool. The honest answer is none, plus a named reason.
  // Three confident cards would be a wrong match, which doctrine forbids.
  // The sentence is the blocking RULE'S OWN why_template, never free prose.
  if (ranked.length === 0) {
    return {
      direction,
      offerings: [],
      compromise: null,
      coverage: engineDishes.map((d) => ({ dish: d.name, sec: secOf(d.name), status: 'unpaired', wine: null })),
      blocked: dominantBlocker(engineDishes, wines, T),
    };
  }

  const shortlist = selectAcrossPriceBrackets(ranked, budget);
  const offerings = shortlist.map((entry, i) => {
    const dish = engineDishes.find((d) => d.name === entry.bestForDish) || { components: [] };
    const { profile } = dishProfile(dish.components, T);
    const scored = scoreWine(entry.wine, profile, dish.components, T);
    const why = headlineWhy(scored.fired, entry.wine);
    return {
      wine: entry.wine,
      slot: SLOTS[i]?.slot ?? null,
      label: SLOTS[i]?.label ?? null,
      why,
      fired: scored.fired,
      bestForDish: entry.bestForDish,
      score: entry.adjScore,
      covers: coversFor(entry.wine),
    };
  });
  const coverage = engineDishes.map((d) => {
    const cov = offerings.find((o) => o.covers.includes(d.name));
    return { dish: d.name, sec: secOf(d.name), status: cov ? 'paired' : 'unpaired', wine: cov ? cov.wine.label : null };
  });

  return { direction, offerings, compromise: null, coverage };
}
