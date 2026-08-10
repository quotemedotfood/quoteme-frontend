/**
 * Color/country derivation for the wine list browse view (screens/
 * WineList.jsx). A wine list prints Producer, Wine, Region and a price - it
 * never prints "this is a Red" - so both facts have to be inferred, in a
 * fixed order that prefers what the LIST ITSELF says before falling back to
 * the shared vocabulary:
 *
 *   color:   explicit color word on the wine's own name/label (a producer
 *            who made a rose out of an otherwise-red grape gets to have
 *            that choice respected) -> VOCAB.colorFor(region_head) -> VOCAB.
 *            colorFor(grape_head).
 *   country: VOCAB.countryFor(region_head) -> VOCAB.countryFor(grape_head)
 *            -> "Other" (never a blank country header).
 *
 * KNOWN LIMITATION (by design of this exact precedence, not a bug here):
 * a few of wine_vocab.csv's broader regions (Languedoc, Jura, Finger Lakes)
 * carry ONE color for what is actually a multi-color region, so a specific
 * white grape grown there (e.g. Picpoul from "Languedoc") can resolve to
 * that region's color rather than the grape's. Region-before-grape is what
 * this file was asked to implement; fixing the region granularity is a
 * wine_vocab.csv data change, not a derivation-order change.
 */
import { VOCAB, norm, has } from '../../../../packages/pairing/src/wineVocab.js';

/** Fixed display order; screens/WineList.jsx filters this down to whichever
 * of these six actually have a wine in them. */
export const COLOR_TAB_ORDER = ['White', 'Red', 'Rose', 'Sparkling', 'Orange', 'Dessert'];

const ROSE_WORDS = ['rose', 'rosado', 'rosato', 'rosé'];
const SPARKLING_WORDS = [
  'sparkling', 'champagne', 'cremant', 'crémant', 'prosecco', 'cava',
  'blanc de blancs', 'spumante', 'sekt',
];
const ORANGE_WORDS = ['orange', 'skin contact', 'skin-contact', 'ramato'];
const DESSERT_WORDS = ['port', 'sherry', 'madeira', 'sauternes', 'late harvest', 'dessert'];

/** Word/phrase boundary match (never a bare substring - "port" must not
 * fire on "Portugal"), reusing wineVocab.js's own `has`/`norm` helpers so
 * this derivation normalises text exactly the way VOCAB's own detectors do. */
function anyWord(normalizedText, words) {
  return words.some((w) => has(normalizedText, w));
}

/**
 * @param {Record<string, any>} row - a wine row (producer/wine_name/label/
 *   region_head/region/grape_head/grape - any subset; all optional).
 * @returns {'White'|'Red'|'Rose'|'Sparkling'|'Orange'|'Dessert'|''} '' when
 *   nothing - not even the vocabulary - resolves a color for this wine.
 */
// Grapes the wine vocab has no colour for, but that a diner would expect in a
// definite tab. Small and explicit; grows as real lists surface gaps.
const GRAPE_COLOR_FALLBACK = { aligote: 'White', poulsard: 'Red', gamay: 'Red' };
const STYLE_COLORS = new Set(['Sparkling', 'Dessert', 'Rose', 'Orange']);

export function deriveColor(row) {
  // 1. A real parsed row already carries an authoritative colour (parseWineList
  //    computes it from the menu text); trust it.
  if (row.color) return row.color;
  // 2. Explicit words in the wine's own name.
  const text = norm([row.wine_name, row.label].filter(Boolean).join(' '));
  if (text) {
    if (anyWord(text, ROSE_WORDS)) return 'Rose';
    if (anyWord(text, SPARKLING_WORDS)) return 'Sparkling';
    if (anyWord(text, ORANGE_WORDS)) return 'Orange';
    if (anyWord(text, DESSERT_WORDS)) return 'Dessert';
  }
  const regionHead = String(row.region_head || row.region || '').toLowerCase();
  const grapeHead = String(row.grape_head || row.grape || '').toLowerCase();
  const fromRegion = regionHead && VOCAB.colorFor(regionHead);
  // 3. STYLE (sparkling/dessert/rose/orange) is defined by the appellation, not
  //    the grape - Champagne is sparkling whatever the grape, Porto is dessert.
  if (fromRegion && STYLE_COLORS.has(fromRegion)) return fromRegion;
  // 4. Red vs White is defined by the GRAPE far more reliably than by a region
  //    that spans several colours (Languedoc makes red AND white; Picpoul is
  //    white). Grape wins here, with a small explicit fallback.
  const fromGrape = (grapeHead && VOCAB.colorFor(grapeHead)) || GRAPE_COLOR_FALLBACK[grapeHead];
  if (fromGrape) return fromGrape;
  // 5. Fall back to whatever the region says.
  if (fromRegion) return fromRegion;
  return '';
}

/**
 * @param {Record<string, any>} row
 * @returns {string} a country name, or "Other" when neither the region nor
 *   the grape resolves one.
 */
export function deriveCountry(row) {
  const regionHead = String(row.region_head || row.region || '').toLowerCase();
  const grapeHead = String(row.grape_head || row.grape || '').toLowerCase();
  return (regionHead && VOCAB.countryFor(regionHead)) || (grapeHead && VOCAB.countryFor(grapeHead)) || 'Other';
}
