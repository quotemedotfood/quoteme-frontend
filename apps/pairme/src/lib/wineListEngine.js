/**
 * Grouping + badge scoring for the wine list browse view (screens/
 * WineList.jsx): color tabs -> country -> region -> wine rows, plus which
 * picked dishes each wine defensibly pairs with.
 *
 * Badges reuse the SAME scoring core (packages/pairing/src/scoring.js) and
 * the SAME "is this reason wine-specific or just the generic weight
 * tie-breaker" bar (pairingAdapter.js's headlineWhy/GENERIC_RULE_IDS) that
 * TheWine's own offering cards hold themselves to, so a "Pairs with X"
 * badge here and the "why" on an offering card for the same wine+dish are
 * never two different claims about the same fired rule.
 */
import { dishProfile, scoreWine } from '../../../../packages/pairing/src/scoring.js';
import { VOCAB } from '../../../../packages/pairing/src/wineVocab.js';
import { rowToEngineWine, headlineWhy, GENERIC_RULE_IDS } from './pairingAdapter.js';
import { deriveColor, deriveCountry, COLOR_TAB_ORDER } from './wineListVocab.js';

function titleCase(s) {
  return String(s || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * A wine's pairing against every picked dish. `pairs` only counts a dish
 * where the wine is eligible AND a wine-specific (non-generic) rule fired -
 * the same bar an offering card's headline reason holds itself to. `bestScore`
 * is the highest score among those defensible pairs only, so a wine that
 * merely scores well without ever firing anything wine-specific can never
 * become the ONE badged "Best match".
 *
 * @param {Record<string, any>} engineWine
 * @param {Array<{name: string, components: string[]}>} pickedDishes
 * @param {ReturnType<import('../../../../packages/pairing/src/tables.js').buildTables>} T
 */
function scoreAgainstPicked(engineWine, pickedDishes, T) {
  const pairs = [];
  let bestScore = null;
  for (const dish of pickedDishes) {
    const components = dish.components || [];
    const { profile } = dishProfile(components, T);
    const scored = scoreWine(engineWine, profile, components, T);
    if (!scored.eligible) continue;
    const hasSpecific = scored.fired.some(([id]) => !GENERIC_RULE_IDS.has(id));
    if (hasSpecific) {
      pairs.push({ dish: dish.name, why: headlineWhy(scored.fired, engineWine) });
      if (bestScore === null || scored.score > bestScore) bestScore = scored.score;
    }
  }
  return { pairs, bestScore };
}

/**
 * @param {Array<Record<string, any>>} wines - raw wine rows (producer/
 *   wine_name/label/vintage/region_head/grape_head/glass_price/price/...).
 * @param {Array<{name: string, components: string[]}>} pickedDishes - []
 *   when the diner has picked nothing yet (no badges, no re-sort, see below).
 * @param {ReturnType<import('../../../../packages/pairing/src/tables.js').buildTables>} tables
 */
export function buildWineListModel(wines, pickedDishes, tables) {
  const hasPicks = Array.isArray(pickedDishes) && pickedDishes.length > 0;

  const rows = (wines || [])
    .map((row, i) => {
      const engineWine = rowToEngineWine(row);
      const color = deriveColor(row);
      const country = deriveCountry(row);
      const regionHead = String(row.region_head || row.region || '').toLowerCase();
      const grapeHead = String(row.grape_head || row.grape || '').toLowerCase();
      const region = regionHead ? titleCase(regionHead) : row.region || '';
      const grape = grapeHead ? titleCase(grapeHead) : row.grape || '';
      const pronunciation = row.say || VOCAB.pronunciation(regionHead) || VOCAB.pronunciation(grapeHead) || '';
      const displayName = [row.producer, row.wine_name].filter(Boolean).join(', ') || row.label || '';
      const speak = row.speak || pronunciation || displayName;
      // Every wine gets scored the same way regardless of tab/color - a
      // badge is about the pairing, not about which tab the wine happens
      // to sit in - so "best match" below is a genuinely GLOBAL comparison.
      const scoring = hasPicks ? scoreAgainstPicked(engineWine, pickedDishes, tables) : { pairs: [], bestScore: null };
      return {
        key: row.client_row_id != null ? String(row.client_row_id) : `wine-${i}`,
        producer: row.producer || '',
        wineName: row.wine_name || row.label || '',
        vintage: row.vintage || null,
        region,
        grape,
        country,
        color,
        glassPrice: row.glass_price != null ? row.glass_price : null,
        price: row.price != null ? row.price : null,
        pronunciation,
        speak,
        pairsWith: scoring.pairs,
        matchScore: scoring.bestScore,
        hasBadge: hasPicks && scoring.pairs.length > 0,
      };
    })
    // A wine with no derivable color has nowhere honest to sit in a
    // color-tabbed browse view; dropping it beats guessing wrong (see the
    // KNOWN LIMITATION note in wineListVocab.js - this is rare: it needs
    // neither an explicit color word, nor a placed region, nor a known
    // grape).
    .filter((w) => w.color);

  // GLOBAL best match: the single highest matchScore among badge-eligible
  // wines (score, eligibility and "fired something wine-specific" all
  // already folded into hasBadge/matchScore above). Ties keep whichever
  // wine was encountered first, for a deterministic result.
  let bestKey = null;
  if (hasPicks) {
    let best = -Infinity;
    for (const w of rows) {
      if (w.hasBadge && w.matchScore > best) {
        best = w.matchScore;
        bestKey = w.key;
      }
    }
  }

  const presentColors = COLOR_TAB_ORDER.filter((c) => rows.some((w) => w.color === c));

  const byColor = {};
  for (const color of presentColors) {
    const colorWines = rows.filter((w) => w.color === color);
    const countryNames = Array.from(new Set(colorWines.map((w) => w.country)));
    // Alphabetical, but "Other" (nothing resolved) always sorts last - a
    // catch-all bucket reads as a fallback, never as if it were a real
    // country alphabetically ahead of France.
    countryNames.sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
    const countries = countryNames.map((country) => {
      const countryWines = colorWines.filter((w) => w.country === country);
      // The one global best match, if it lives in this country, sorts to
      // the top of the group (its own line, ahead of the region grouping) -
      // it never gets ALSO left inside a region list further down.
      const topPick = countryWines.find((w) => w.key === bestKey) || null;
      const rest = countryWines.filter((w) => w.key !== bestKey);
      const regionNames = Array.from(new Set(rest.map((w) => w.region || 'Other region'))).sort((a, b) =>
        a.localeCompare(b)
      );
      const regions = regionNames.map((region) => ({
        region,
        wines: rest
          .filter((w) => (w.region || 'Other region') === region)
          .sort((a, b) => a.producer.localeCompare(b.producer) || a.wineName.localeCompare(b.wineName)),
      }));
      return { country, topPick, regions };
    });
    byColor[color] = { countries };
  }

  return { colors: presentColors, byColor, bestKey, hasPicks };
}
