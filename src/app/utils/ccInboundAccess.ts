// ccInboundAccess — pure role-access helpers for the Command Center Inbound surface.
//
// B-42: reps must NOT see the CC Inbound page or its sidebar badge count.
//       Only distributor_admin accounts have access to the CC Inbound queue.
//
// These helpers are extracted as pure functions so they can be unit-tested
// without mounting React. Keep them free of component / hook imports.

/**
 * Returns true when the given role is allowed to see and navigate to the
 * Command Center Inbound page.
 *
 * Only `distributor_admin` has access — reps (role='rep') must be redirected
 * to their own inbound queue at /rep/quotes/inbound instead.
 */
export function canAccessCCInbound(role: string | null | undefined): boolean {
  return role === 'distributor_admin';
}

/**
 * The redirect target for users who land on /distributor-admin/command-center/inbound
 * but do not have CC Inbound access (i.e. reps).
 */
export const REP_INBOUND_REDIRECT = '/rep/quotes/inbound';
