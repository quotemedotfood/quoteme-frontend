// helpLane — maps HelpField lane values to escalation source strings.

export type HelpLane = 'chef' | 'rep' | 'cc' | 'brand';

/**
 * Returns the source string passed to escalateHelp() for a given lane.
 * Chef lane does not call escalateHelp (it opens HelpDrawer instead).
 */
export function laneSource(lane: HelpLane): string {
  return `${lane}-sidebar`;
}
