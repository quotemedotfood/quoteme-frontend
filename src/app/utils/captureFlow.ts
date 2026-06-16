// P0 guest-accept capture flow.
// A guest who clicks "Looks good" is sent to /auth to sign up (capturing them);
// on auth-return we go back to the receipt with intent=accept so it auto-fires.

export function acceptCaptureAuthUrl(quoteId: string): string {
  return `/auth?intent=accept&redirect=${encodeURIComponent(`/chef/quotes/${quoteId}`)}`;
}

export function postAuthTarget(params: {
  redirect: string | null;
  intent: string | null;
  roleHome: string;
}): string {
  const { redirect, intent, roleHome } = params;
  if (!redirect) return roleHome;
  return intent ? `${redirect}?intent=${encodeURIComponent(intent)}` : redirect;
}
