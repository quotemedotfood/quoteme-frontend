/**
 * Pure, React-free gate logic for the five wine-card icons (screens/
 * WineCardIcons.jsx renders them; TheWine.jsx wires one instance of that
 * component per offering card). Kept out of pairingAdapter.js and out of
 * TheWine.jsx on purpose: a concurrent branch is editing
 * screens/TheWine.jsx, routes.jsx, App.jsx and lib/theme.css, so this file
 * only ever needs pairingAdapter.js's already-exported GENERIC_RULE_IDS
 * plus packages/pairing's own scoring core, imported READ ONLY - the same
 * convention pairingAdapter.js's own header documents for itself.
 */
import { dishProfile, scoreWine } from '../../../../packages/pairing/src/scoring.js';
import { GENERIC_RULE_IDS } from './pairingAdapter.js';

/** True only if a rule id NOT in GENERIC_RULE_IDS fired for this wine on
 * this one dish - a rule that made a wine-specific claim, not the
 * match_weight/pen_neutral_dish structural tie-breakers that fire for
 * almost every wine on almost every dish. */
function wineSpecificRuleFiredForDish(wine, dish, T) {
  const { profile } = dishProfile(dish.components, T);
  const { fired } = scoreWine(wine, profile, dish.components, T);
  return fired.some(([ruleId]) => !GENERIC_RULE_IDS.has(ruleId));
}

/**
 * TABLE WINE gate (icon 1, people U+1F465): "works with everything your
 * table ordered" is only honest if a WINE-SPECIFIC rule fired for this wine
 * on EVERY dish the table picked - not merely that the wine cleared the
 * generic several()/oneBottle() eligibility gate, which today almost every
 * wine does via the match_weight/pen_neutral_dish fallback alone. Gating on
 * mere eligibility would light this icon on all twenty demo wines, a lie
 * printed twenty times.
 *
 * With today's rule set this correctly returns false for every wine against
 * the real demo fixture (see wineCardIconGate.test.js's "never lights on
 * the real demo fixture" case) - that is the intended, honest state, not a
 * bug: the icon "ships dark" until a genuinely wine-specific rule fires for
 * an entire table.
 *
 * @param {object|null|undefined} wine - engine wine (rowToEngineWine output)
 * @param {Array<{name:string, components:string[]}>|null|undefined} dishes -
 *   engine dishes (dishToEngineDish output) for every dish the table ordered
 * @param {ReturnType<typeof import('./offlinePairing.js').getOfflineTables>|null|undefined} T
 * @returns {boolean}
 */
export function tableWineEligible(wine, dishes, T) {
  if (!wine || !T || !Array.isArray(dishes) || dishes.length === 0) return false;
  return dishes.every((d) => wineSpecificRuleFiredForDish(wine, d, T));
}

/** icon 2 (clinking glasses U+1F942): true when this wine can actually be
 * ordered by the glass. Engine wines carry a boolean `glass`; the static
 * demo fixture (state.js's hand-authored `W`) carries a glass PRICE or null
 * under the same key - `!!wine.glass` reads both shapes correctly (a price
 * is truthy, null is not), the same truthiness test state.js's own
 * "$N glass" / "bottle only" display already uses. */
export function isByTheGlass(wine) {
  return !!(wine && wine.glass);
}

/** icon 4 (house U+1F3E0): true when the RESTAURANT itself pushed this
 * exact wine (GET /v1/venues/:code/pairings - see state.js's venuePushed /
 * "Featured by the venue" section). `venuePushedLabels` is a Set of the
 * wine labels the venue disclosed, read verbatim, never inferred. */
export function isHousePick(wine, venuePushedLabels) {
  return !!(wine && venuePushedLabels && venuePushedLabels.has(wine.label));
}

/** icon 5 (pear U+1F350): PairMe's OWN top algorithmic recommendation.
 * pairingAdapter.js's SLOTS labels the highest-ranked offering 'house'
 * ("House suggestion"), which is a different concept from icon 4's
 * restaurant pick even though the product spec and this codebase happen to
 * both use the word "house" for two unrelated things. `slot` is the raw
 * offering.slot ('house'|'suited'|'crowd'|null). */
export function isOurPick(slot) {
  return slot === 'house';
}

/** Enum -> emoji/label lookup for icon 3, the protein slot. FE never derives
 * a protein from a dish name; this is a closed table over the canonical
 * enum the backend contract describes. Any value not in this table is
 * silently dropped, never guessed. */
export const PROTEIN_EMOJI = {
  beef: { emoji: '\u{1F969}', label: 'Beef' },
  chicken: { emoji: '\u{1F357}', label: 'Chicken' },
  fish: { emoji: '\u{1F41F}', label: 'Fish' },
  oyster: { emoji: '\u{1F9AA}', label: 'Oyster' },
  shrimp: { emoji: '\u{1F990}', label: 'Shrimp' },
  lobster: { emoji: '\u{1F99E}', label: 'Lobster' },
  cheese: { emoji: '\u{1F9C0}', label: 'Cheese' },
  mushroom: { emoji: '\u{1F344}', label: 'Mushroom' },
  pasta: { emoji: '\u{1F35D}', label: 'Pasta' },
};

/**
 * Builds the protein icon list for one wine's protein match, in the shape
 * the backend contract describes: `{ protein: string|string[], dish_label:
 * string }`, or absent/undefined entirely (the canonical enum has not
 * shipped yet, so this is undefined for every wine today). Renders NOTHING
 * (an empty array) when the key is absent, when dish_label is missing (the
 * explainer needs it), or when a value holds no recognised enum - an absent
 * icon is correct, a guessed one is not. Never reads a dish NAME; only the
 * enum key.
 *
 * @param {{protein?: string|string[], dish_label?: string}|null|undefined} proteinMatch
 * @returns {Array<{key:string, emoji:string, label:string, explainer:string}>}
 */
export function resolveProteinIcons(proteinMatch) {
  if (!proteinMatch || !proteinMatch.dish_label) return [];
  const values = Array.isArray(proteinMatch.protein) ? proteinMatch.protein : [proteinMatch.protein];
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const key = String(raw || '').trim().toLowerCase();
    if (!key || seen.has(key) || !PROTEIN_EMOJI[key]) continue;
    seen.add(key);
    const def = PROTEIN_EMOJI[key];
    out.push({
      key,
      emoji: def.emoji,
      label: def.label,
      explainer: `Pairs with your ${proteinMatch.dish_label}.`,
    });
  }
  return out;
}
