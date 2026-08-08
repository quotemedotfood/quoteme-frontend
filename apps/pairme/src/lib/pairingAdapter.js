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

const FALLBACK_WHY = (dishName) => `Best overall fit for the ${dishName.toLowerCase()}.`;

/**
 * @param {'course_it_out'|'one_bottle'|'several'} direction
 * @param {Array} dishes - demo dish objects (id/n/sec/components/...)
 * @param {Array} wines - engine wine objects (rowToEngineWine output)
 * @param {ReturnType<typeof buildTables>} T
 * @returns {{direction, offerings: Array, compromise: object|null}}
 */
export function computeOfferings(direction, dishes, wines, T) {
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
    const why = best.fired.length ? best.fired[0][1] : FALLBACK_WHY(best.dish);
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
    const why = scored.fired.length ? scored.fired[0][1] : FALLBACK_WHY(entry.bestForDish);
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
