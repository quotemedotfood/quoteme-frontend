import { impersonateUser } from '../services/adminApi';

/**
 * Shared impersonation handler used by QM admin surfaces.
 *
 * Calls POST /api/v1/admin/users/:userId/impersonate, swaps the JWT in
 * localStorage, stores the original admin token + display name so the
 * ImpersonationBanner can restore the session, then redirects to '/'.
 *
 * @param userId   - The UUID of the user to impersonate
 * @param userName - Display name shown in the banner
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
    localStorage.setItem('quoteme_admin_token', localStorage.getItem('quoteme_token') || '');
    localStorage.setItem('quoteme_impersonating', userName);
    localStorage.setItem('quoteme_token', res.data.token);
    window.location.href = '/';
  } else {
    setError(res.error || 'Failed to impersonate');
    setImpersonating(null);
  }
}
