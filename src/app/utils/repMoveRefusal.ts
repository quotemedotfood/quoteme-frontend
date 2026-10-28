// BE review 2026-10-21, H3 (QuoteMe #602). A distributor admin cannot take a
// rep or admin who is active at ANOTHER distributor, confirm or not: the
// invite endpoint refuses with error_code "rep_move_requires_quoteme_admin"
// (403 today). Only a QuoteMe admin can move that person, so the page shows
// one plain line saying so and never offers an "Add anyway" for it.
//
// Matched on error_code, not status, so the same line shows if the BE ever
// returns this code on a different status (e.g. ahead of the 409 confirm gate).

export const REP_MOVE_REQUIRES_QUOTEME_ADMIN = 'rep_move_requires_quoteme_admin';

export const REP_MOVE_REFUSED_MESSAGE =
  'This person is active at another distributor. Ask QuoteMe to move them.';

export function isRepMoveRefusal(res: { error_code?: string | null }): boolean {
  return res.error_code === REP_MOVE_REQUIRES_QUOTEME_ADMIN;
}
