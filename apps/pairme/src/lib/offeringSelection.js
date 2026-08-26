/**
 * Card identity for TheWine's offering cards, and the selection built on it.
 *
 * A CARD IS (DISH, WINE). course_it_out / mains_only emit one card per dish
 * per recommended wine - three bottles per dish - so the same wine legitimately
 * appears under several dishes. Before this module the cards were keyed by dish
 * while the selection was keyed by wine label, so tapping one card lit every
 * other card that happened to share its wine, and the Present handoff resolved
 * a selected label back to whichever dish came first in the list. Both bugs
 * were the same missing idea: the wine is not the card.
 *
 * one_bottle and several are table-wide - their cards have no `forDish`, and
 * there the wine label IS the whole identity. Both shapes go through the same
 * key function so nothing downstream has to know which direction produced the
 * list.
 */

// A NUL byte cannot occur in a parsed dish name or wine label (parseMenu and
// parseWineList both work over text lines), so it separates the two halves
// without a dish name ever being able to run into a wine label and forge
// another card's key. See the collision test in this file's spec.
const SEP = '\u0000';

/**
 * @param {{forDish?: string|null, wine: {label: string}}} offering
 * @returns {string} stable identity - a function of (dish, wine), never of
 *   list position, so it survives a re-render or a format re-rank that
 *   reorders the offerings.
 */
export function offeringKey(offering) {
  if (!offering || !offering.wine) return '';
  return `${offering.forDish || ''}${SEP}${offering.wine.label || ''}`;
}

/**
 * @param {string[]} selectedKeys
 * @param {object} offering
 */
export function isSelected(selectedKeys, offering) {
  return (selectedKeys || []).includes(offeringKey(offering));
}

/**
 * Tap-to-toggle for ONE card. Returns a new array and never mutates the input,
 * because this feeds a React state patch.
 *
 * @param {string[]} selectedKeys
 * @param {object} offering
 */
export function toggleOffering(selectedKeys, offering) {
  const key = offeringKey(offering);
  const current = selectedKeys || [];
  return current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
}
