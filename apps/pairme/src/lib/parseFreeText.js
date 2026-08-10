/**
 * TYPE / AT HOME entry point: "What are you having?" free text (e.g.
 * "roast chicken, potatoes, green beans") -> dishes, so the same
 * multi-select -> pair flow B (PASTE) uses can run on it unchanged.
 *
 * Deliberately NOT parseMenu.js: there are no sections, no prices, and no
 * separate description line here - it is one short sentence, so each
 * comma/"and"/newline separated fragment becomes its own pickable dish
 * with an empty description. Component resolution (dishComponents.js)
 * still works fine off the name alone.
 *
 * @param {string} text
 * @returns {Array<{name: string, description: string, price: null, section: null}>}
 */
export function parseFreeText(text) {
  return String(text || '')
    .split(/[,\n]|(?:\s+and\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, description: '', price: null, section: null }));
}
