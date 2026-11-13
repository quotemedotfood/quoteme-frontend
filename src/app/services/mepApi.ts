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
  /** True only when a QM admin opened the MEP pages with View as (view only). */
  viewing_as_admin?: boolean;
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

// ============= THE ACCOUNT LIST AND STARS (MEP platform, part A, Moose 2026-11-13) =============
// READER of GET /api/v1/mep/accounts; WRITER of POST/DELETE
// /api/v1/mep/accounts/:account_type/:id/star (the MEP's own star only).

export type MepAccountType = 'hotel' | 'restaurant_group' | 'restaurant';

export interface MepAccount {
  account_type: MepAccountType;
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  group: { id: string; name: string } | null;
  hotel: { id: string; name: string } | null;
  restaurant_count: number | null;
  starred: boolean;
}

export interface MepAccountPage {
  accounts: MepAccount[];
  total: number;
  page: number;
  per_page: number;
  cities?: { city: string; count: number }[];
}

export interface MepAccountQuery {
  q?: string;
  type?: MepAccountType | '';
  city?: string;
  starred?: boolean;
  page?: number;
}

/** A request with the stored MEP JWT, trading the keep-signed-in token once on a 401. */
async function mepFetch<T>(path: string, init: RequestInit = {}, retried = false): Promise<MepResult<T>> {
  const jwt = readKey(MEP_TOKEN_KEY);
  if (!jwt) return { error: 'Not signed in', status: 401 };
  try {
    const res = await fetchWithPolicy(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && !retried) {
      const session = readKey(MEP_SESSION_KEY);
      if (session && (await consumeMepLink(session)).data) return mepFetch<T>(path, init, true);
    }
    if (!res.ok) return { error: body.message || body.error || `Request failed (${res.status})`, status: res.status };
    return { data: body as T };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' };
  }
}

export function getMepAccounts(query: MepAccountQuery = {}): Promise<MepResult<MepAccountPage>> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.type) params.set('type', query.type);
  if (query.city) params.set('city', query.city);
  if (query.starred) params.set('starred', '1');
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const qs = params.toString();
  return mepFetch<MepAccountPage>(`/api/v1/mep/accounts${qs ? `?${qs}` : ''}`);
}

export function setMepStar(type: MepAccountType, id: string, starred: boolean): Promise<MepResult<{ starred: boolean }>> {
  return mepFetch<{ starred: boolean }>(
    `/api/v1/mep/accounts/${encodeURIComponent(type)}/${encodeURIComponent(id)}/star`,
    { method: starred ? 'POST' : 'DELETE' },
  );
}

// ============= VIEW AS and CSV (MEP platform, part C, Moose 2026-11-13) =============

/**
 * A QM admin's View as token (POST /api/v1/admin/meps/:id/view_as): kept under
 * the MEP key so /mep opens as that MEP. No keep-signed-in token: it lasts one
 * hour and is view only (the server refuses every write made with it).
 */
export function startMepViewAs(token: string) {
  writeKey(MEP_TOKEN_KEY, token);
  writeKey(MEP_SESSION_KEY, null);
}

/** GET /api/v1/mep/accounts/export with the list's filters, saved as a file. */
export async function downloadMepAccountsCsv(query: MepAccountQuery = {}): Promise<MepResult<true>> {
  const jwt = readKey(MEP_TOKEN_KEY);
  if (!jwt) return { error: 'Not signed in', status: 401 };
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.type) params.set('type', query.type);
  if (query.city) params.set('city', query.city);
  if (query.starred) params.set('starred', '1');
  const qs = params.toString();
  try {
    const res = await fetchWithPolicy(`${API_BASE_URL}/api/v1/mep/accounts/export${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return { error: `Download failed (${res.status})`, status: res.status };
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pairme-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { data: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' };
  }
}
