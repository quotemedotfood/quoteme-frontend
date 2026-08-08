/**
 * STUB. Cooper owns the real client side wine list parser (G1 in the PairMe
 * API Contract v1: the server returns only raw_text from POST /v1/capture,
 * the client parses it into rows locally, and the same fixture set is meant
 * to run in this JS parser and the Python reference implementation so the
 * two never diverge).
 *
 * This stub always returns an empty row set. That is intentional: it lets
 * the whole capture -> parse -> POST /v1/capture/:id/rows pipeline be wired
 * and exercised end to end today without pretending to understand any wine
 * list. Do not implement real parsing here.
 *
 * @param {string} rawText - the raw_text field from POST /v1/capture.
 * @returns {Array} always [] until Cooper's real parser replaces this stub.
 */
export function parseWineList(rawText) {
  return [];
}
