// Where an unauthenticated/authenticated visitor at "/" (or a demo /auth hit)
// should be sent. Pure so it can be unit-tested without the router.
//
// CRITICAL: in demo mode the guest must NOT be sent to /auth — /auth in demo
// redirects back to "/", which loops here forever. Demo guests land on the
// guest quote builder instead.
export function rootRedirectTarget(demo: boolean, isAuthenticated: boolean): string {
  if (isAuthenticated) return '/dashboard';
  return demo ? '/start-new-quote' : '/auth';
}
