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
export function guestTokenBypassesAuthGuard(pathname: string, search = ''): boolean {
  if (!CHEF_RECEIPT_PATH.test(pathname)) return false;
  // The "ready" email link carries a signed receipt_token for that one quote
  // (BE review M7). It opens the receipt on a device with no guest session;
  // the BE checks the token, so this only lets the page mount.
  if (new URLSearchParams(search).get('receipt_token')) return true;
  const storage = globalThis.localStorage;
  if (!storage) return false;
  const guestToken = storage.getItem('quoteme_guest_token');
  return Boolean(guestToken);
}
