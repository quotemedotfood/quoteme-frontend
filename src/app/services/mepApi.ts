// MEP (MEPs + Hotels epic, step 2): the requests the MEP pages send.
//
// An MEP signs in with an emailed one-time link (no password). The page at
// /mep/sign-in trades the link's token at POST /api/v1/mep/sign_in_links/consume
// for a 24h JWT and a one-shot 30-day keep-signed-in token. Both are kept
// under their OWN keys, never quoteme_token: an MEP JWT is refused on every
// endpoint outside /api/v1/mep (the backend's FencesMepLane), so the main
// app's sign-in must never pick it up.
import { fetchWithPolicy } from './requestPolicy';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://web-production-9f6e9.up.railway.app';

export const MEP_TOKEN_KEY = 'quoteme_mep_token';
export const MEP_SESSION_KEY = 'quoteme_mep_session';

export interface MepConsumeResponse {
  jwt: string;
  user: { id: string; email: string; role: string; first_name: string; last_name: string };
  session: { token: string; expires_at: string } | null;
}

export interface MepMe {
  name: string;
  email: string;
}

export interface MepResult<T> {
  data?: T;
  error?: string;
  status?: number;
}

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Private window or blocked storage: the MEP signs in again next time.
  }
}

export function clearMepSession() {
  writeKey(MEP_TOKEN_KEY, null);
  writeKey(MEP_SESSION_KEY, null);
}

/** Trades an emailed link (or the kept keep-signed-in token) and stores what comes back. */
export async function consumeMepLink(token: string): Promise<MepResult<MepConsumeResponse>> {
  try {
    const res = await fetchWithPolicy(`${API_BASE_URL}/api/v1/mep/sign_in_links/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: body.message || body.error || `Request failed (${res.status})`, status: res.status };
    }
    writeKey(MEP_TOKEN_KEY, body.jwt);
    writeKey(MEP_SESSION_KEY, body.session?.token ?? null);
    return { data: body as MepConsumeResponse };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' };
  }
}

/** GET /api/v1/mep/me with the stored MEP JWT. */
export async function getMepMe(): Promise<MepResult<MepMe>> {
  const jwt = readKey(MEP_TOKEN_KEY);
  if (!jwt) return { error: 'Not signed in', status: 401 };
  try {
    const res = await fetchWithPolicy(`${API_BASE_URL}/api/v1/mep/me`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error || `Request failed (${res.status})`, status: res.status };
    return { data: body as MepMe };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' };
  }
}

/**
 * Who is signed in. When the 24h JWT has run out, trades the kept
 * keep-signed-in token once for a fresh one, then asks again.
 */
export async function loadMepMe(): Promise<MepResult<MepMe>> {
  const first = await getMepMe();
  if (first.data || first.status !== 401) return first;
  const session = readKey(MEP_SESSION_KEY);
  if (!session) return first;
  const traded = await consumeMepLink(session);
  if (!traded.data) {
    clearMepSession();
    return { error: traded.error, status: 401 };
  }
  return getMepMe();
}
