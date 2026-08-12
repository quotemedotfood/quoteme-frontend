/**
 * Tables: the indexed form of the three-CSV rules bundle. A line-for-line
 * port of the `Tables` class in pairing_engine.py (the deterministic wine
 * pairing "left brain" - see that file's module docstring for the full
 * rationale). Do not add a fourth (terroir) table here: Levels 1 and 2 only,
 * appellation-first then grape, exactly what wine_axes.csv covers today.
 */

// Order matters for nothing here, but keep it identical to Python's
// AXES_WINE / AXES_DISH so a future column addition is obvious to diff.
//
// `richness` is the axis that lets the engine MATCH intensity, not only cut it
// (fat-on-fat: a buttery Montrachet to a foie gras raviolo). It is deliberately
// NOT body - Chablis is body 2 / richness 1, Meursault is body 4 / richness 5,
// same grape; the difference is texture from oak, lees, malolactic and glycerol.
// If a value ever looks derivable from body+oak, it is wrong. It is declared
// here AHEAD of the data so the pending wine_axes/dish_axes drop (real richness
// columns) plus Amy's three rules (amy_rich_on_rich / amy_rich_dessert /
// amy_thin_on_rich) is a pure data landing, not a code change. Until that data
// arrives toInt() defaults the missing column to a neutral value and no rule
// reads it, so scoring output is unchanged.
export const AXES_WINE = ['body', 'acid', 'tannin', 'sweetness', 'alcohol', 'oak', 'richness'];
export const AXES_DISH = ['weight', 'fat', 'acid', 'sweetness', 'heat', 'salt', 'umami', 'bitter', 'richness'];

/**
 * Port of Python's `_i(v, d=1)`: cast to int if `v` is an exact integer
 * literal once trimmed, else fall back to the default. Python's `int()`
 * rejects "3.0" (raises ValueError, caught, returns default) so this must
 * NOT accept decimals either.
 */
export function toInt(v, d = 1) {
  if (v === null || v === undefined) return d;
  const s = String(v).trim();
  if (/^[+-]?\d+$/.test(s)) {
    return parseInt(s, 10);
  }
  return d;
}

function low(v) {
  return (v || '').trim().toLowerCase();
}

/**
 * Build the indexed Tables object from raw row arrays (the shape both the
 * parsed local CSVs and GET /v1/rules/bundle's `tables` payload share:
 * plain objects keyed by CSV header / JSON key, values as strings).
 *
 * @param {{wine_axes: Array<Record<string,string>>, dish_axes: Array<Record<string,string>>, pairing_rules: Array<Record<string,string>>}} bundle
 */
export function buildTables(bundle) {
  const wine = {};
  for (const r of bundle.wine_axes || []) {
    const h = low(r.head);
    if (!h) continue;
    const row = {};
    for (const a of AXES_WINE) row[a] = toInt(r[a], 3);
    row.texture = low(r.texture) || 'still';
    row.confidence = (r.confidence || 'med').trim();
    row.notes = (r.notes || '').trim();
    wine[h] = row;
  }

  const dish = {};
  for (const r of bundle.dish_axes || []) {
    const c = low(r.component);
    if (!c) continue;
    const row = {};
    for (const a of AXES_DISH) row[a] = toInt(r[a], 1);
    row.notes = (r.notes || '').trim();
    dish[c] = row;
  }

  const rules = (bundle.pairing_rules || []).filter(
    (r) => ((r.status || 'active').trim() === 'active')
  );

  return {
    wine,
    dish,
    rules,
    stats() {
      return `${Object.keys(this.wine).length} wine heads, ${Object.keys(this.dish).length} components, ${this.rules.length} active rules`;
    },
  };
}
