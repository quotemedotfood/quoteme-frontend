import { impersonateUser } from '../services/adminApi';

/**
 * True when an admin is inside an impersonated session.
 *
 * `quoteme_admin_token` holds the REAL admin JWT and is set ONLY during
 * impersonation (handleImpersonate below, plus the chef/rep impersonation
 * paths), and removed on exit (see ImpersonationBanner). It is therefore the
 * universal "am I currently impersonating" signal across every impersonation
 * flow — used to suppress the QM-admin chrome (outer icon rail) so the
 * impersonated distributor/rep view shows only its own sidebar.
 */
export function isImpersonating(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('quoteme_admin_token') !== null;
}

/**
 * Shared impersonation handler used by QM admin surfaces.
 *
 * Calls POST /api/v1/admin/users/:userId/impersonate, swaps the JWT in
 * localStorage, stores the original admin token + display name so the
 * ImpersonationBanner can restore the session, then redirects to '/'.
 *
 * Security: the banner identity and the "am I actually impersonating who I
 * clicked" check are both derived from the server's response, never from
 * the caller-supplied `userName` or the row the admin clicked. If the
 * response identifies a different user than the one requested, the token
 * swap is aborted entirely (no admin token stash, no quoteme_token
 * overwrite, no navigation) and an error is surfaced instead.
 *
 * @param userId   - The UUID of the user to impersonate
 * @param userName - Fallback label only (unused once the response identity
 *                    is available); kept for caller compatibility
 * @param setImpersonating - State setter to track in-flight request
 * @param setError - State setter for error display (pass null to reset)
 */
export async function handleImpersonate(
  userId: string,
  userName: string,
  setImpersonating: (id: string | null) => void,
  setError: (msg: string | null) => void,
): Promise<void> {
  setImpersonating(userId);
  const res = await impersonateUser(userId);
  if (res.data?.token) {
    const returnedUser = res.data.user;
    if (!returnedUser || returnedUser.id !== userId) {
      setError('Impersonation target mismatch; not switching.');
      setImpersonating(null);
      return;
    }
    const displayName =
      [returnedUser.first_name, returnedUser.last_name].filter(Boolean).join(' ') ||
      returnedUser.email;
    localStorage.setItem('quoteme_admin_token', localStorage.getItem('quoteme_token') || '');
    localStorage.setItem('quoteme_impersonating', displayName);
    localStorage.setItem('quoteme_token', res.data.token);
    window.location.href = '/';
  } else {
    setError(res.error || 'Failed to impersonate');
    setImpersonating(null);
  }
}
