/**
 * PairMe API client. Implements "PairMe API Contract v1" (Artifacts/PairMe
 * API Contract v1.md) as it stood 2026-08. Endpoints marked NOT BUILT there
 * (POST /v1/pair, POST /v1/capture/:id/rows) are still called for real; a
 * 404 from either is expected while the backend catches up and is surfaced
 * to callers as `{ notBuilt: true }` instead of throwing, so the UI can fall
 * back gracefully instead of breaking.
 *
 * IDENTITY: anon_id is the ONLY thing this app keeps in localStorage. Every
 * request other than POST /v1/session sends it back as X-PairMe-Anon.
 *
 * ERRORS: every non-2xx response is `{ error_code, message }` per the
 * contract. This client throws ApiError(errorCode, message, status); callers
 * should render `message` verbatim and branch on `errorCode`, never on the
 * message text.
 */

const ANON_STORAGE_KEY = 'pairme:anon_id';

export const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PAIRME_API_BASE) ||
  'https://web-production-9f6e9.up.railway.app';

export class ApiError extends Error {
  constructor(errorCode, message, status) {
    super(message);
    this.name = 'ApiError';
    this.errorCode = errorCode;
    this.status = status;
  }
}

function getAnonId() {
  try {
    return localStorage.getItem(ANON_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function setAnonId(id) {
  try {
    localStorage.setItem(ANON_STORAGE_KEY, id);
  } catch (e) {
    // Storage disabled (private mode, quota, etc). The session still works
    // for this page load, it just will not survive a reload.
  }
}

async function parseErrorBody(res) {
  try {
    const body = await res.json();
    if (body && body.error_code) return body;
  } catch (e) {
    // fall through to the generic message below
  }
  return { error_code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
}

async function request(path, { method = 'GET', body, isMultipart = false } = {}) {
  const anonId = getAnonId();
  const headers = {};
  if (anonId) headers['X-PairMe-Anon'] = anonId;
  if (!isMultipart && body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: isMultipart ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError(
      'NETWORK_ERROR',
      'We could not reach the server. Check your connection and try again.',
      0
    );
  }

  if (res.status === 304) {
    return { status: 304 };
  }

  if (!res.ok) {
    const { error_code, message } = await parseErrorBody(res);
    throw new ApiError(error_code, message, res.status);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** POST /v1/session - the only endpoint that does not require identity. */
export async function ensureSession() {
  const existing = getAnonId();
  if (existing) return existing;
  const data = await request('/v1/session', { method: 'POST' });
  setAnonId(data.anon_id);
  return data.anon_id;
}

export function getProfile() {
  return request('/v1/profile');
}

/** payload must be { preferences?: {...}, safety?: {...} }, nested. */
export function putProfile(payload) {
  return request('/v1/profile', { method: 'PUT', body: payload });
}

/** multipart/form-data; venueId is optional and enables the corpus short circuit. */
export function capture(imageFile, venueId) {
  const form = new FormData();
  form.append('image', imageFile);
  if (venueId) form.append('venue_id', venueId);
  return request('/v1/capture', { method: 'POST', body: form, isMultipart: true });
}

/** NOT BUILT server side yet (G1 catch up). A 404 is expected and swallowed. */
export async function postCaptureRows(captureId, parserVersion, rows) {
  try {
    return await request(`/v1/capture/${captureId}/rows`, {
      method: 'POST',
      body: { parser_version: parserVersion, rows },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { notBuilt: true };
    throw e;
  }
}

export function patchCorrection(captureId, correction) {
  return request(`/v1/capture/${captureId}/corrections`, {
    method: 'PATCH',
    body: { correction },
  });
}

export function flagCapture(captureId) {
  return request(`/v1/capture/${captureId}/flag`, { method: 'POST' });
}

export function setCaptureVenue(captureId, venueId) {
  return request(`/v1/capture/${captureId}/venue`, {
    method: 'POST',
    body: { venue_id: venueId },
  });
}

export function getVenues(q, state) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (state) params.set('state', state);
  return request(`/v1/venues?${params.toString()}`);
}

/** PLANNED, not built (item 5). A 404 is expected and swallowed. */
export async function pair(payload) {
  try {
    return await request('/v1/pair', { method: 'POST', body: payload });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { notBuilt: true };
    throw e;
  }
}

export function rate(payload) {
  return request('/v1/rating', { method: 'POST', body: payload });
}

/** Not wired to any screen yet: Desi's Settings screen has no delete-account
 * control. Kept here so it exists once that control lands. */
export function deleteAccount() {
  return request('/v1/account', { method: 'DELETE' });
}

/** since_version omitted on the very first call. */
export function fetchRulesBundle(sinceVersion) {
  const qs = sinceVersion != null ? `?since_version=${sinceVersion}` : '';
  return request(`/v1/rules/bundle${qs}`);
}

/** POST /v1/events - instrumentation beacon. Not in the documented v1
 * contract (see PairMe API Contract v1); wired ahead of the BE catching up
 * per the demo instrumentation spec. Callers should use track() in
 * ./track.js rather than this directly, so a dropped beacon never throws. */
export function postEvent(event, props) {
  return request('/v1/events', { method: 'POST', body: { event, props: props || {} } });
}
