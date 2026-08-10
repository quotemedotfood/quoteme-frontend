/**
 * Product-facing role slots (PairMe API Contract v1: `POST /v1/pairings`
 * `offerings[].slot` enum is "house"|"suited"|"crowd" - roles/labels locked
 * by this build, item 5). These map 1:1 onto `pair()`'s ranked `picks`
 * array position: picks[0] is always the top score, picks[1]/[2] are the
 * next-best picks of a DIFFERENT grape (pair()'s discovery mechanic).
 *
 * This is a display-name layer only - it changes no scoring. It sits next
 * to (not instead of) pairing_engine.py's own debug role names ("Classic",
 * "Made for this", "If you are curious", see scoring.js DEBUG_ROLES), which
 * exist purely for `--selftest` CLI parity and are not user-facing.
 */
export const SLOTS = [
  { slot: 'house', label: 'House suggestion' },
  { slot: 'suited', label: 'Suited to you' },
  { slot: 'crowd', label: 'Crowd pleaser' },
];

/**
 * Attach {slot, label} to each pick in a `pair()` result, in rank order.
 * Picks beyond SLOTS.length (pair() can be asked for more than 3 with a
 * larger `n`) are left unlabeled.
 *
 * @param {Array<Record<string, any>>} picks - `pair(...).picks`
 */
export function labelPicks(picks) {
  return picks.map((p, i) => ({
    ...p,
    slot: SLOTS[i]?.slot ?? null,
    label: SLOTS[i]?.label ?? null,
  }));
}
