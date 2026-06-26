// B-182: a single source of truth for "is this visitor an unauthenticated guest?"
//
// A guest is someone with NO loaded user AND NO bearer token. Anyone holding a
// real bearer token (rep / distributor_admin / quoteme_admin / chef) — or a
// loaded user object — is authenticated and must NEVER be routed into the guest
// flow, which creates a guest session and bleeds their identity into
// "Guest User" / "Guest Distributor".
//
// The regression: a previous gate used `profile.isGuest || token === null`, so a
// stale `profile.isGuest` flag flipped an authenticated rep into a guest.

export function isGuestVisitor(user: unknown, bearerToken: string | null): boolean {
  return !user && !bearerToken;
}
