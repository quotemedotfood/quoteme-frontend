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
import { dishProfile, scoreWine } from '../../../../packages/pairing/src/scoring.js';
import { SLOTS } from '../../../../packages/pairing/src/roles.js';
import { oneBottle, several } from '../../../../packages/pairing/src/directions.js';
import { buildTables } from '../../../../packages/pairing/src/tables.js';

export { buildTables };

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
const GENERIC_RULE_IDS = new Set(['match_weight', 'pen_neutral_dish']);

/**
 * The single reason sentence a card leads with. A pairing must be defensible
 * and it must vary by wine, so this prefers the most wine-specific rule that
 * fired for THIS wine over the generic weight tie-breaker, and never falls
 * back to a per-dish label (two wines cannot share one reason). When nothing
 * wine-specific fired, it says so honestly, in terms of THIS wine's own
 * identity (its appellation or grape), rather than pretending confidence.
 *
 * @param {Array<[string,string]>} fired - [rule_id, why] pairs from scoreWine
 * @param {object} wine - engine wine (has label/region_head/grape_head)
 */
function headlineWhy(fired, wine) {
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
 * @param {'course_it_out'|'one_bottle'|'several'} direction
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
  const { format = 'both' } = opts;
  const pool = format === 'glass' ? wines.filter((w) => w.glass) : wines;
  // If the glass filter empties the pool (a list with no by-the-glass wines),
  // fall back to the full pool rather than returning zero offerings: better to
  // show bottles and let the toggle read as "none by the glass" upstream than
  // to leave the diner with a blank screen.
  wines = pool.length ? pool : wines;
  const engineDishes = dishes.map(dishToEngineDish);
  const dishNames = engineDishes.map((d) => d.name);

  function coversFor(wine) {
    return engineDishes
      .filter((d) => {
        const { profile } = dishProfile(d.components, T);
        return scoreWine(wine, profile, d.components, T).eligible;
      })
      .map((d) => d.name);
  }

  if (direction === 'one_bottle') {
    const result = oneBottle(engineDishes, wines, T);
    if (!result.wine) {
      return { direction, offerings: [], compromise: null };
    }
    const best = result.perDish.reduce((top, x) => (x.score > top.score ? x : top));
    const why = headlineWhy(best.fired, result.wine);
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
          covers: dishNames, // a qualifying one-bottle pick is eligible for every dish, by construction
        },
      ],
      compromise: result.compromise,
    };
  }

  // course_it_out and several both surface a table-wide shortlist here (the
  // per-course split course_it_out implies is a further UI refinement not
  // built in this lane; both directions get the same three ranked,
  // role-labelled offerings for now). several() is used rather than pair()
  // because pair()'s picks are grape-deduped for its single-dish discovery
  // mechanic (see directions.js), which is the wrong shape for "best across
  // everything ordered".
  const shortlist = several(engineDishes, wines, T, { n: 3 });
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
      score: entry.bestScore,
      covers: coversFor(entry.wine),
    };
  });

  return { direction, offerings, compromise: null };
}
