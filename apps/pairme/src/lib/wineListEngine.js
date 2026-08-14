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
 *
 * There is deliberately NO single "best match" crown. A working sommelier
 * does not assert one defensible winner across a whole cellar - "one dish
 * can have 20 wine pairings ... I just explain what those two wines are and
 * let them see what they think is more interesting" (Amy, restaurant
 * sommelier interview). So every wine that defensibly pairs with at least
 * one picked dish gets the SAME kind of descriptive badge (which dishes, how
 * many) - none is ever singled out as THE best match. Within a region, wines
 * that pair with more of what was picked simply list first (a coverage
 * sort, not a ranking claim) so that useful signal survives without
 * crowning a champion.
 */
import { dishProfile, scoreWine } from '../../../../packages/pairing/src/scoring.js';
import { VOCAB } from '../../../../packages/pairing/src/wineVocab.js';
import { rowToEngineWine, headlineWhy, GENERIC_RULE_IDS } from './pairingAdapter.js';
import { deriveColor, deriveCountry, deriveRegion, COLOR_TAB_ORDER } from './wineListVocab.js';

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
 * the same bar an offering card's headline reason holds itself to. A wine
 * that merely scores well without ever firing anything wine-specific gets no
 * pairs and no badge at all; among wines that DO get pairs, none is ranked
 * above another here - this returns a plain list of (dish, why), in picked-
 * dish order, never a score used to crown a winner.
 *
 * @param {Record<string, any>} engineWine
 * @param {Array<{name: string, components: string[]}>} pickedDishes
 * @param {ReturnType<import('../../../../packages/pairing/src/tables.js').buildTables>} T
 */
function scoreAgainstPicked(engineWine, pickedDishes, T) {
  const pairs = [];
  for (const dish of pickedDishes) {
    const components = dish.components || [];
    const { profile } = dishProfile(components, T);
    const scored = scoreWine(engineWine, profile, components, T);
    if (!scored.eligible) continue;
    const hasSpecific = scored.fired.some(([id]) => !GENERIC_RULE_IDS.has(id));
    if (hasSpecific) {
      pairs.push({ dish: dish.name, why: headlineWhy(scored.fired, engineWine) });
    }
  }
  return pairs;
}

/**
 * @param {Array<Record<string, any>>} wines - raw wine rows (producer/
 *   wine_name/label/vintage/region_head/grape_head/glass_price/price/bin/...).
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
      const region = deriveRegion(row, regionHead ? titleCase(regionHead) : row.region || '');
      const grape = grapeHead ? titleCase(grapeHead) : row.grape || '';
      const pronunciation = row.say || VOCAB.pronunciation(regionHead) || VOCAB.pronunciation(grapeHead) || '';
      const displayName = [row.producer, row.wine_name].filter(Boolean).join(', ') || row.label || '';
      const speak = row.speak || pronunciation || displayName;
      // Every wine is scored against every picked dish the same way, no
      // matter which tab/color it sits in - but the result is a plain list
      // of defensible pairs, never a global ranking (see file header).
      const pairsWith = hasPicks ? scoreAgainstPicked(engineWine, pickedDishes, tables) : [];
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
        // A bin number lets a guest order by number ("I want wine 902")
        // instead of having to pronounce the name - the SAME anxiety
        // pronunciation solves, a second way (Amy). Only present when the
        // parsed list actually had one (parseWineList.js's `bin`); never
        // fabricated when absent.
        binNo: row.bin || row.binNo || null,
        speak,
        pairsWith,
        hasBadge: hasPicks && pairsWith.length > 0,
      };
    })
    // A wine with no derivable color has nowhere honest to sit in a
    // color-tabbed browse view; dropping it beats guessing wrong (see the
    // KNOWN LIMITATION note in wineListVocab.js - this is rare: it needs
    // neither an explicit color word, nor a placed region, nor a known
    // grape).
    .filter((w) => w.color);

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
      const regionNames = Array.from(new Set(countryWines.map((w) => w.region || 'Other region'))).sort((a, b) =>
        a.localeCompare(b)
      );
      const regions = regionNames.map((region) => ({
        region,
        // Coverage sort, not a ranking claim: a wine that pairs with more
        // of what was picked lists first within its own region, ties break
        // alphabetically. No wine is singled out as THE best match (see
        // file header) - this only orders an already-honest grouping.
        wines: countryWines
          .filter((w) => (w.region || 'Other region') === region)
          .sort(
            (a, b) =>
              b.pairsWith.length - a.pairsWith.length ||
              a.producer.localeCompare(b.producer) ||
              a.wineName.localeCompare(b.wineName)
          ),
      }));
      return { country, regions };
    });
    byColor[color] = { countries };
  }

  return { colors: presentColors, byColor, hasPicks };
}
