// roleRouting - single source of truth for "where does this role land after
// authenticating". Extracted out of AuthPage's login-success effect so any
// other flow that establishes a session (password reset, invite accept,
// magic-link consume) sends the user to the SAME place a normal login would,
// rather than re-deriving (and risking drifting from) its own copy of this
// mapping.
export function routeByRole(role?: string): string {
  switch (role) {
    case 'quoteme_admin': return '/qm-admin/';
    case 'distributor_admin': return '/distributor-admin/command-center';
    case 'buyer': return '/dashboard';
    case 'group_admin': return '/dashboard';
    case 'chef': return '/dashboard';
    case 'rep': return '/rep/quotes/inbound';
    // ROOT CAUSE FIX: brand users have their own shell - never put them in rep/distributor.
    case 'brand': return '/brand';
    default: return '/start-new-quote';
  }
}
