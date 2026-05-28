/**
 * Route-guard utilities for chef magic-link paths.
 *
 * These are extracted from RootLayout so they can be unit-tested without
 * a full DOM / React render environment.
 */

/**
 * Matches any /chef/quotes/<id> path (one segment, no trailing slash).
 * This is the chef receipt route delivered via emailed magic links.
 */
export const CHEF_RECEIPT_PATH = /^\/chef\/quotes\/[^/]+/;

/**
 * Returns true when a `quoteme_guest_token` in localStorage should allow
 * the route guard to pass without a real auth session.
 *
 * The check is intentionally narrow — only chef-receipt paths bypass the
 * guard; rep / admin routes still require a real JWT.
 *
 * Uses `globalThis.localStorage` so the call-site is mockable in a vitest
 * node environment via `vi.stubGlobal('localStorage', ...)` without needing
 * a full jsdom setup.
 *
 * @param pathname - window.location.pathname (or React Router's location.pathname)
 */
export function guestTokenBypassesAuthGuard(pathname: string): boolean {
  const storage = globalThis.localStorage;
  if (!storage) return false;
  const guestToken = storage.getItem('quoteme_guest_token');
  return Boolean(guestToken) && CHEF_RECEIPT_PATH.test(pathname);
}
