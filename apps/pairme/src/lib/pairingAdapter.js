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
 * (producer/wine_name/say/speak/tip/meta/client_row_id) passed through
 * untouched since scoreWine/wineProfile only look at the axis-relevant keys. */
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
  // of the top three rather than merely reorder a fixed three - a cheap bottle
  // that fits well should still lose to an in-budget one.
  const shortlist = several(engineDishes, wines, T, { n: 8 })
    .map((entry) => ({ ...entry, adjScore: entry.bestScore - floorPenalty(entry.wine.price) }))
    .sort((a, b) => b.adjScore - a.adjScore)
    .slice(0, 3);
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
