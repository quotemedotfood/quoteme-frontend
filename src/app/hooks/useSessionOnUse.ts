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
