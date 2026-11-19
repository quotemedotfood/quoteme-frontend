/**
 * NO ALLERGY OR DIETARY CONTENT, EVER. Ruled permanently: this product does
 * not collect, store, display or compute on it. A "(GF)" that reaches a screen
 * reads as PairMe's claim about a guest's safety, and nothing here is
 * qualified to make one.
 *
 * ONE SCRUB, stripDietary(). It used to live in apps/pairme's
 * servedComponents.js and ran only on the text the matcher read, so the menu,
 * the wine lane labels, Present and the staff tablet all showed the venue's
 * "(GF)" verbatim and the phone cached it (review 2026-10-19, H1). It lives
 * here now so both the app and this package's resolver call the same
 * function, and every place venue text ENTERS the app runs it:
 *   apps/pairme remoteVenue.js  scrubVenuePayload (backend venues, guest walk,
 *                               the phone's cached copy, the staff tablet)
 *   apps/pairme servedVenue.js  makeServedVenue (every served venue's dishes)
 *   apps/pairme metropolisSeed.js, aquitaineVenue.js (the built-in menus)
 *   parseMenu.js, apps/pairme parseFreeText.js (pasted, photographed and
 *                               typed menus)
 *   resolveComponents.js, servedComponents.js (before any matching)
 *
 * WHAT IS REMOVED, in this order:
 *   1. the short markers scrubDietaryMarkers() has always removed: (GF) (V)
 *      (VG) (DF) (N) (VEG) (VEGAN) (VEGETARIAN), and a trailing ", GF".
 *   2. any parenthetical that holds a dietary word: "(gluten free on request)",
 *      "(GFA)", "(ask about allergies)".
 *   3. any CLAUSE that states an allergy, an intolerance or a diet, or what a
 *      dish contains: "contains shellfish allergens", "blue cheese allergy",
 *      "may contain nuts", "ask about dietary needs". A clause runs between
 *      , ; . ( ) | newline and a spaced dash, so "blue cheese allergy - burger"
 *      keeps "burger".
 *   4. the words and phrases themselves: "gluten-free", "dairy free",
 *      "nut-free" (a diet or allergen word before "free" only, so "free range"
 *      and "cage-free" stay), vegan, vegetarian, plant-based, pescatarian,
 *      keto, paleo, celiac, halal, kosher (but not "kosher salt"), and the bare
 *      GF / DF / VG / GFA / DFA / VGA markers.
 * Text with none of these comes back exactly as scrubDietaryMarkers() returns
 * it; punctuation is only tidied around something that was removed.
 *
 * NOT A DIETARY SCRUB: withoutNegated() below, which is for COMPUTATION only.
 */

/**
 * The short markers. Unchanged from aquitaineVenue.js, where it was written
 * (re-exported there under the same name).
 *
 * @param {string} text
 * @returns {string}
 */
export function scrubDietaryMarkers(text) {
  return String(text == null ? '' : text)
    // Parenthesised markers: (GF) (V) (VG) (DF) (N) (VEG), any case.
    .replace(/\s*\((?:gf|v|vg|df|n|veg|vegan|vegetarian)\)\s*/gi, ' ')
    // Trailing bare markers after a separator: ", GF" / " - V" / " · VG".
    .replace(/\s*[,;\u00b7|-]\s*(?:gf|vg|df|veg|vegan|vegetarian)\s*(?=$|[,;\u00b7|])/gi, '')
    // A removed marker leaves a gap in front of the punctuation that followed
    // it ("dill (GF), rye" -> "dill , rye"), so the space is closed up here.
    .replace(/\s+([,;.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// A diet or allergen word that "free" can follow: "gluten-free", "nut free".
const FREE_OF = '(?:gluten|wheat|grain|dairy|milk|lactose|egg|eggs|nut|nuts|peanut|peanuts|tree[\\s-]*nut|tree[\\s-]*nuts|soy|sesame|shellfish|fish|sulfite|sulfites|sugar|meat|corn|allergen|allergy)';
// Words that only ever name a diet. "kosher salt" is salt.
const DIET_WORDS = '(?:vegan|vegetarian|plant[\\s-]*based|pescatarian|pescetarian|keto|paleo|whole30|celiac|coeliac|halal|kosher(?!\\s+salt)|gfa?|dfa?|vga?)';
// Words that make a whole clause a dietary statement.
const CLAUSE_TRIGGER = '(?:allerg\\p{L}*|intoleran\\p{L}*|dietary|diets?|may\\s+contain|contains?)';

const ANY_DIETARY = new RegExp(`\\b${FREE_OF}\\s*-?\\s*free\\b|\\b${DIET_WORDS}\\b|\\b${CLAUSE_TRIGGER}\\b`, 'iu');

// One clause: no clause break inside it. A spaced dash is a break; a hyphen
// inside a word ("nut-free", "wood-fired") is not.
const CLAUSE_CHAR = '(?:(?!\\s[-\\u2013\\u2014]\\s)[^,;.()|\\n\\u00b7])';
const CLAUSE_RE = new RegExp(`${CLAUSE_CHAR}*\\b${CLAUSE_TRIGGER}\\b${CLAUSE_CHAR}*`, 'giu');
const PAREN_RE = /\(([^()]*)\)/g;
const FREE_RE = new RegExp(`\\b${FREE_OF}\\s*-?\\s*free\\b`, 'giu');
const WORD_RE = new RegExp(`\\b${DIET_WORDS}(?:[\\s-]*friendly)?\\b`, 'giu');

/**
 * The text with every dietary and allergy statement removed. THE one scrub;
 * see the file header for what it removes.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripDietary(text) {
  const marked = scrubDietaryMarkers(text);
  if (!ANY_DIETARY.test(marked)) return marked;
  return marked
    .replace(PAREN_RE, (whole, inner) => (ANY_DIETARY.test(inner) ? ' ' : whole))
    .replace(CLAUSE_RE, ' ')
    .replace(FREE_RE, ' ')
    .replace(WORD_RE, ' ')
    // Tidy only what a removal left behind.
    .replace(/\(\s*\)/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+([,;.:])/g, '$1')
    .replace(/([,;:])(?:\s*[,;:])+/g, '$1')
    .replace(/[,;:]\s*\./g, '.')
    .replace(/\.(?:\s*\.)+/g, '.')
    .replace(/(\s[-\u2013\u2014|\u00b7])(?:\s*[-\u2013\u2014|\u00b7])+/g, '$1')
    .replace(/^[\s,;:.\-\u2013\u2014|\u00b7]+/, '')
    .replace(/[\s,;:\-\u2013\u2014|\u00b7]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * NEGATED FOOD IS NOT PRESENT. For COMPUTATION only (what a dish is read as),
 * never for display: a menu line that says "(no blue cheese)" is shown as the
 * venue wrote it, but it must not fire the blue-cheese rule.
 *
 * THE RULE. A food word does not count as present when, inside its clause:
 *   - it follows "no", "without", "hold the", "minus", "sans", "except",
 *     "omit" or "skip": the words from the negator up to the next clause
 *     break, or the next " and " / " or " / " with " / " plus " / "&", are
 *     not read. "no onions and extra garlic" still reads garlic.
 *   - it comes right before "on the side": the words back to the clause
 *     break, or the last " with " / " and " / "&", are not read. "steak
 *     with sauce on the side" still reads steak. A side served apart is the
 *     diner's to add, so it is not what the plate is.
 * "no" only negates a following word that starts with a letter, so "No. 5"
 * is untouched.
 *
 * @param {string} text
 * @returns {string}
 */
export function withoutNegated(text) {
  return String(text == null ? '' : text)
    .replace(NEGATOR_RE, ' ')
    .replace(ON_THE_SIDE_RE, '$1 ');
}

const NEGATOR_RE = /\b(?:no|without|hold\s+the|minus|sans|except|omit|skip)\s+(?=\p{L})(?:(?!\s+(?:and|or|with|plus)\b|\s*&)[^,;.()|\n])*/giu;
const ON_THE_SIDE_RE = /(^|[,;.()|\n&]|\bwith\b|\band\b)((?:(?!\bwith\b|\band\b|&)[^,;.()|\n])*?)\bon\s+the\s+side\b/giu;
