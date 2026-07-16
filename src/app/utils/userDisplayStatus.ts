// userDisplayStatus — shared honest-status pill helper (Feature 2 Slice 1).
//
// WHY: QM-admin user/team lists set `status` to "active" the instant an
// admin creates/invites a user, before that person has ever accepted the
// invite or logged in. Paired with a "Last Login: Never" cell, that read
// as a contradictory/misleading "Active" pill next to an empty-feeling
// last-login value (Justin's "Last Active blank" finding). The backend
// now derives an honest `display_status` (see User#display_status in
// app/models/user.rb) from EXISTING columns only (status + last_login_at,
// no new columns, no sign-in-tracking migration — that's Slice 2, held):
//
//   "invite_sent" — account exists, nobody has ever completed a sign-in
//   "active"      — at least one real sign-in has happened
//   "archived"    — status == "archived"
//
// This helper turns that derived value into a label + badge class, and
// falls back to the RAW `status` column for any state the derivation
// doesn't touch (e.g. "inactive"/"suspended" — an admin explicitly set
// those, so they are already honest and must not be overridden/hidden
// behind a collapsed "Active" pill).

export interface UserStatusPill {
  label: string;
  className: string;
}

export interface UserForStatusPill {
  status: string;
  display_status?: string | null;
}

const RAW_STATUS_PILL: Record<string, UserStatusPill> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactive', className: 'bg-yellow-100 text-yellow-700' },
  suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-500' },
};

/**
 * Returns the honest status pill (label + Tailwind class) for a user row.
 *
 * Only overrides the raw `status` pill in one case: a never-logged-in user
 * whose backend-derived `display_status` is "invite_sent". Every other raw
 * status (inactive/suspended/archived) is rendered exactly as before —
 * this is additive honesty, not a status-taxonomy rewrite.
 */
export function userStatusPill(user: UserForStatusPill): UserStatusPill {
  if (user.display_status === 'invite_sent') {
    return { label: 'Invite sent', className: 'bg-blue-100 text-blue-700' };
  }

  return RAW_STATUS_PILL[user.status] ?? { label: user.status, className: 'bg-gray-100 text-gray-600' };
}
