/**
 * chefProductName: strip warehouse tokens from a CJ product name before it
 * reaches a chef-facing surface.
 *
 * CJ catalog product names sometimes carry asterisk-wrapped warehouse/internal
 * tokens (e.g. "SALMON *DEAD* FILLET", "*CNSEA* GINGER PASTE"). These tokens
 * are operational shorthand meant for the rep/warehouse side, not the chef.
 *
 * Governing constitution: VIII (chef sees a clean quote) + XVIII (no
 * technical/warehouse language to the chef).
 *
 * REP-FACING surfaces must keep showing the raw name as returned by the API.
 * This function is render-time only, it never mutates stored data, so a rep
 * screen reading the same field is unaffected unless it also calls this.
 */
export function chefProductName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
