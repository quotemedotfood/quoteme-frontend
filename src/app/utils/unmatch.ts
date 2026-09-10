/**
 * Unmatch: a rep's claim that a menu COMPONENT has no answer in this catalog.
 *
 * Moose's definition, which settles the semantics: "The unmatch button will
 * tell the system to NOT match this component with anything in my catalog
 * because I don't carry it." That is component-level suppression rather than
 * rejecting one product, and a claim about the ASSORTMENT rather than about
 * the match.
 *
 * SCOPE IS REP (Moose, 2026-09-10). The claim is keyed to the acting rep, so
 * rep A unmatching a component does not change what rep B at the same
 * distributor is matched. Accepted trade: a rep's own memory is a smaller and
 * reversible claim than a distributor-wide one. This is why the confirm says
 * "your future quotes" and not "this distributor's".
 */

/**
 * The `miss_reason` value that marks a line as unmatched BY A REP rather than
 * missed by the engine.
 *
 * Every pre-existing value in QuoteLine::VALID_MISS_REASONS (no_retrieval,
 * gate_failure, threshold_failure, cross_family_block, no_defensible_candidate)
 * is engine-origin, and QuoteLine#resolution_label maps all of them to
 * "Awaiting rep review" or "Pending distributor confirmation". Neither is true
 * of a component the rep has deliberately marked as not carried, which is why
 * this is a distinct value rather than a reuse of `rep_handled`.
 *
 * PAIRED WITH THE BACKEND. This constant must equal the value Claudio's half
 * adds to VALID_MISS_REASONS. Until it does, no line will ever carry it and
 * every helper below simply returns the pre-existing engine-miss behaviour.
 */
export const REP_UNMATCHED_MISS_REASON = 'rep_unmatched';

/** Copy for a line the rep marked as not carried. Not an engine miss. */
export const REP_UNMATCHED_LABEL = 'Marked not carried';

/**
 * True when this line is a miss because a rep said so, rather than because the
 * engine found nothing. Written to read safely against a backend that has not
 * shipped the new value yet: an unknown or absent miss_reason is an engine
 * miss, which is what every line is today.
 */
export function isRepUnmatched(
  line: { availability_status?: string | null; miss_reason?: string | null } | null | undefined,
): boolean {
  if (!line) return false;
  return (
    line.availability_status === 'not_in_catalog' &&
    line.miss_reason === REP_UNMATCHED_MISS_REASON
  );
}

/**
 * The chip copy for an unresolved line.
 *
 * A rep who has just said "we don't carry this" must not be told the line is
 * "Awaiting rep review" and invited to go find a match: that is the loop this
 * feature would otherwise create. Engine misses keep the server's own
 * resolution_label untouched.
 */
export function unresolvedChipLabel(
  line: { availability_status?: string | null; miss_reason?: string | null } | null | undefined,
  resolutionLabel?: string | null,
): string {
  if (isRepUnmatched(line)) return REP_UNMATCHED_LABEL;
  return resolutionLabel || 'Awaiting rep review';
}

/**
 * ============================================================================
 * THE ROLE GATE IS DELIBERATELY NOT WIRED YET.
 * ============================================================================
 *
 * Chit, 2026-09-10: "DO NOT WRITE THE GATE UNTIL THAT COMES BACK." The
 * endpoint's guard is with Moose. The conflict being resolved: rep scope is
 * rep_id-keyed and a distributor_admin has no rep_profile, so admitting them
 * means a claim keyed to a rep who is not one. Chit has recommended rep-only.
 *
 * Both candidate rulings are implemented and tested here so that landing the
 * decision is a one-line change at the call site rather than a design pass.
 * Nothing imports the result yet: MatchDrawer takes `canUnmatch` as a prop
 * defaulting to FALSE, so the control renders nowhere until someone wires this
 * deliberately. A write control that renders for a role the endpoint refuses
 * is exactly the live ChainToggle defect (rendered on !readOnly, but
 * rep_memory_lock resolves to rep-only, so a distributor_admin gets a 403),
 * and defaulting closed is what keeps this from shipping the same shape.
 */
export type UnmatchRuling = 'rep_only' | 'rep_and_distributor_admin';

export function canUnmatchRole(
  role: string | null | undefined,
  ruling: UnmatchRuling,
): boolean {
  // quoteme_admin is refused by block_quoteme_admin_rep_write! under either
  // ruling, so it never renders regardless of which one lands.
  if (role === 'rep') return true;
  if (ruling === 'rep_and_distributor_admin' && role === 'distributor_admin') return true;
  return false;
}
