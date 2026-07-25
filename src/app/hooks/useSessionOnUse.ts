// useSessionOnUse - shared "session-on-use" helper for consume-a-token flows
// (chef magic link, rep magic link, rep invite accept).
//
// Every one of these flows follows the same three-step sequence to turn a
// server-issued JWT into a working session, and skipping a step is exactly
// the class of bug this hook exists to prevent:
//
//   1. Persist the JWT (localStorage['quoteme_token']) so subsequent
//      Bearer-authed calls succeed.
//   2. Force a /me roundtrip (refreshUser, from AuthContext) so
//      AuthContext.user is populated BEFORE we navigate anywhere that
//      depends on role-based routing or auth guards. AuthProvider only
//      auto-validates on app boot, so a JWT stored after boot is otherwise
//      invisible to the rest of the app until the next hard refresh.
//   3. Optionally sync UserContext's display profile (syncWithAuthUser) so
//      the chef/rep name and distributor show up correctly in chrome.
//
// Then navigate to `target`, which MUST be a real authenticated view, never
// a token-consume route. Consume routes (/rep/welcome, /chef/welcome, or
// anything carrying a `?token=` query) are one-shot: the token backing them
// is already spent, so navigating back into one after a session is already
// established renders the page's own dead-link error. If `target` looks
// like a consume route, we log an error and fall back to a safe default
// authenticated view instead of trusting it.

import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';

/** Authenticated landing route to fall back to if a caller ever passes a
 * consume route as the navigation target. */
const SAFE_DEFAULT_TARGET = '/rep/quotes/inbound';

/**
 * BUG #29 (magic-link session isolation): localStorage keys that belong to
 * a DIFFERENT identity than the one about to be established here - a prior
 * QM-admin session, an in-flight impersonation, or an anonymous guest.
 * Establishing a new session (chef magic link, rep magic link, rep invite
 * accept) MUST clear every one of these first, or a stale key survives
 * underneath the new `quoteme_token` and gets picked up by anything that
 * reads it (ImpersonationBanner in particular), hijacking the UI with the
 * PRIOR admin/impersonation identity instead of the session that was just
 * established.
 *
 * `quoteme_token` itself is intentionally NOT in this list: it is the
 * current session's own key and is overwritten (not cleared) immediately
 * below with the freshly-issued JWT.
 */
export const PRIOR_SESSION_KEYS_TO_CLEAR = [
  'quoteme_admin_token', // real admin JWT, stashed client-side during impersonation
  'quoteme_impersonating', // legacy (non-chef) impersonation display name
  'quoteme_chef_impersonating', // chef impersonation display name
  'quoteme_chef_impersonation_event_id', // chef impersonation audit event id
  'quoteme_guest_token', // anonymous guest session
] as const;

/**
 * Fired on `window` immediately after `clearPriorIdentityKeys` removes the
 * keys above, so anything that derives its own state from those keys (e.g.
 * ImpersonationBanner) can re-derive right away instead of waiting for its
 * own next trigger (ImpersonationBanner otherwise only re-derives on route
 * change, per BUG #29). Same-tab `localStorage.removeItem` calls do NOT fire
 * the browser's native `storage` event (that only fires in OTHER tabs), so a
 * dedicated same-tab signal is required.
 */
export const PRIOR_IDENTITY_CLEARED_EVENT = 'quoteme:prior-identity-cleared';

/**
 * clearPriorIdentityKeys - the ONE place that removes every prior-identity
 * localStorage key (see PRIOR_SESSION_KEYS_TO_CLEAR above) and announces it.
 * Both the success path (useEstablishSession, below) and a failed
 * consume/open attempt (ChefWelcomePage) MUST call this same function rather
 * than each keeping their own copy of the key list, so the two paths can
 * never drift out of sync with each other.
 */
export function clearPriorIdentityKeys(): void {
  for (const key of PRIOR_SESSION_KEYS_TO_CLEAR) {
    localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event(PRIOR_IDENTITY_CLEARED_EVENT));
}

/** Identity shape accepted by UserContext.syncWithAuthUser. Callers map
 * their own consume-response `user` payload into this shape before calling
 * the hook (mirrors what ChefWelcomePage already did inline). */
export interface SessionSyncUser {
  fullName: string;
  email: string;
  phoneNumber: string;
  distributorName: string;
  plan: 'free' | 'premium';
  isGuest: false;
}

export interface EstablishSessionArgs {
  jwt: string;
  target: string;
  user?: SessionSyncUser;
}

/**
 * isConsumeRoute - true when `target` is a one-shot token-consume page (or
 * still carries a raw token in the query string) rather than a real
 * authenticated view. Navigating back into one of these after the session
 * is already established is always a bug: the token has been spent and the
 * page has no other job than to consume it.
 */
export function isConsumeRoute(target: string): boolean {
  return target === '/rep/welcome' || target === '/chef/welcome' || target.includes('?token=');
}

/**
 * useEstablishSession - the persist + refresh + sync steps (1-3 above),
 * without navigating. Use this directly when a page needs the session
 * established immediately (e.g. on mount) but must defer navigation to a
 * later user action (e.g. a CTA click), so the async /me roundtrip never
 * blocks or delays that click.
 */
export function useEstablishSession() {
  const { refreshUser } = useAuth();
  const { syncWithAuthUser } = useUser();

  return useCallback(
    async (jwt: string, user?: SessionSyncUser) => {
      // Clear every prior-identity key BEFORE writing the new session's
      // token. Order matters: if this ran after setItem('quoteme_token', ...)
      // a stale quoteme_admin_token etc. would still exist underneath the
      // new token for one tick, which is exactly the hijack window BUG #29
      // exploited.
      clearPriorIdentityKeys();
      localStorage.setItem('quoteme_token', jwt);
      await refreshUser();
      if (user) syncWithAuthUser(user);
    },
    [refreshUser, syncWithAuthUser],
  );
}

/**
 * useSessionOnUse - establish the session (steps 1-3) and then navigate to
 * `target`, guarding against ever landing back on a consume route.
 *
 *   const establishSessionAndGo = useSessionOnUse();
 *   await establishSessionAndGo({ jwt, target, user });
 */
export function useSessionOnUse() {
  const establishSession = useEstablishSession();
  const navigate = useNavigate();

  return useCallback(
    async ({ jwt, target, user }: EstablishSessionArgs) => {
      await establishSession(jwt, user);

      let safeTarget = target;
      if (isConsumeRoute(target)) {
        console.error(
          `useSessionOnUse: refusing to navigate to consume route "${target}" after the session was already established; falling back to "${SAFE_DEFAULT_TARGET}".`,
        );
        safeTarget = SAFE_DEFAULT_TARGET;
      }

      navigate(safeTarget, { replace: true });
    },
    [establishSession, navigate],
  );
}
