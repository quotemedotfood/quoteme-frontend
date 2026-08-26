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
// AUTH CONTRACT (locked, feat/pairme-accounts-be): the Bearer token from
// POST /v1/auth/signup or POST /v1/auth/login. Kept separately from
// ANON_STORAGE_KEY - anon_id is a diner's history key even when signed out,
// this is only added on top once they sign in. See setAuthSession() below.
const AUTH_TOKEN_STORAGE_KEY = 'pairme:auth_token';

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

function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (e) {
    // Storage disabled - same tradeoff as setAnonId above.
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
  const authToken = getAuthToken();
  const headers = {};
  // Contract: keep sending X-PairMe-Anon even once signed in (anon_id stays
  // the diner's history key; a signed-in Bearer token is additive, not a
  // replacement for it).
  if (anonId) headers['X-PairMe-Anon'] = anonId;
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
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

// In-flight POST /v1/session promise, shared across concurrent callers.
// usePairMe's bootstrap effect and the /t/demo effect both call
// ensureSession() on the same mount; without this, both read localStorage
// before either write lands and each fires its own POST /v1/session.
let sessionRequest = null;

/** POST /v1/session - the only endpoint that does not require identity. */
export async function ensureSession() {
  const existing = getAnonId();
  if (existing) return existing;
  if (sessionRequest) return sessionRequest;
  sessionRequest = (async () => {
    try {
      const data = await request('/v1/session', { method: 'POST' });
      setAnonId(data.anon_id);
      return data.anon_id;
    } finally {
      sessionRequest = null;
    }
  })();
  return sessionRequest;
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

/** POST /v1/events - instrumentation beacon. Callers should use track() in
 * ./track.js rather than this directly, so a dropped beacon never throws.
 *
 * SHAPE (V1::EventsController, which does `params.require(:events)` and
 * permits :name, :occurred_at, props): a BATCH - `{events: [{name,
 * occurred_at, props}]}`. This client previously sent the singular
 * `{event, props}`, which missed on both the array and the key name, so
 * every beacon since the endpoint landed raised ParameterMissing server-
 * side. track() swallows failures by design, so it never surfaced.
 *
 * occurred_at is stamped HERE, on the client, not derived from server
 * receive time: a beacon can be queued behind an offline period or a slow
 * network, and receive time would then record when we got it rather than
 * when the diner did the thing. The funnel timings are the whole point of
 * these events, so the client clock is the correct source even though it is
 * the less trustworthy one.
 *
 * One event per call for now. The array is the contract, not a batching
 * promise; when a real queue lands it fills this array instead of changing
 * the shape. */
export function postEvent(event, props) {
  return request('/v1/events', {
    method: 'POST',
    body: { events: [{ name: event, occurred_at: new Date().toISOString(), props: props || {} }] },
  });
}

/**
 * GET /v1/demo - LANE A entry point (/t/demo). Not in the v1 contract doc;
 * mocked for now (see mocks/handlers.js) since the backend does not serve
 * it yet. Returns { venue, capture_id, raw_text, rows } - a pre-seeded
 * venue, wine list and its already-parsed rows so the /t/demo walk can run
 * end to end without depending on the still-stubbed client wine-list
 * parser.
 */
export function getDemo() {
  return request('/v1/demo');
}

/**
 * GET /v1/t/:code - generic table-code resolver (superset #340; NOT BUILT
 * server side yet, see routes.jsx's TableCodeRoute). Contract this FE codes
 * against ahead of the BE:
 *   200 { venue: {id,name,city,state}, capture_id, raw_text, rows: [...] }
 *     (same shape as GET /v1/demo)
 *   404 { error_code: "VENUE_NOT_FOUND", message: "<plain language>" } for
 *     an unknown code.
 * `/t/demo` keeps using getDemo() above, unchanged; this is for every other
 * table code. A network failure or the 404 both throw ApiError (see
 * request()); callers should render lib/errors.js's errorCopy(err), never
 * the raw code.
 */
export function getTableCode(code) {
  return request(`/v1/t/${encodeURIComponent(code)}`);
}

/**
 * Operator venue pairings persistence (BE feat/pairme-operator-persistence):
 *   GET /v1/venues/:code/pairings -> { code, confirmed: [...], pushed: [...] }
 *   PUT /v1/venues/:code/pairings { confirmed, pushed } -> same shape
 * Keyed by the /t/:code venue code, so an operator's confirmed pairings and
 * pushed wines survive a reload.
 */
export function getVenuePairings(code) {
  return request(`/v1/venues/${encodeURIComponent(code)}/pairings`);
}

export function putVenuePairings(code, { confirmed, pushed }) {
  return request(`/v1/venues/${encodeURIComponent(code)}/pairings`, {
    method: 'PUT',
    body: { confirmed, pushed },
  });
}

// ---------------------------------------------------------------------------
// AUTH CONTRACT (locked, from the accounts BE's feat/pairme-accounts-be):
//   POST /v1/auth/signup { email, password } (sends X-PairMe-Anon = the
//     current anon_id, same as every other request() call above) ->
//     201 { token, anon_id, user:{id,email,role} }
//   POST /v1/auth/login  { email, password } -> 200 { token, anon_id, user }
//   GET  /v1/auth/me     (Bearer token)      -> 200 { user, anon_id }
// Errors are the same { error_code, message } envelope as every other
// endpoint; callers should render message via lib/errors.js's errorCopy(),
// never error_code.
//
// This endpoint may not be deployed yet (accounts BE lands on its own
// branch); a network failure or 404 surfaces as the usual ApiError from
// request() above, same as any other not-yet-built endpoint. Diner login is
// ALWAYS optional (see screens/Login.jsx and the /t/:code walk in state.js,
// which never calls any of these three), so a failure here never blocks the
// walk to a wine recommendation.
// ---------------------------------------------------------------------------

/** POST /v1/auth/signup. Diner gives an email + password only (no name). */
export function signup(email, password) {
  return request('/v1/auth/signup', { method: 'POST', body: { email, password } });
}

/** POST /v1/auth/login. */
export function login(email, password) {
  return request('/v1/auth/login', { method: 'POST', body: { email, password } });
}

/** GET /v1/auth/me - confirms/re-hydrates a stored session. Callers should
 * treat a failure as "not logged in", not a fatal error. */
export function getMe() {
  return request('/v1/auth/me');
}

/**
 * Persist the two identity artifacts a signup/login response carries: the
 * Bearer token for authed calls, and anon_id. The RETURNED anon_id becomes
 * this account's history key going forward, overwriting whatever this tab
 * already had in localStorage - that is how a returning diner on a NEW
 * device gets their server-side history back (the whole point of the
 * account layer). Every subsequent request() call above picks up both
 * automatically.
 */
export function setAuthSession({ token, anon_id } = {}) {
  setAuthToken(token || null);
  if (anon_id) setAnonId(anon_id);
}

export function clearAuthSession() {
  setAuthToken(null);
}

export function isLoggedIn() {
  return !!getAuthToken();
}

export function getStoredAuthToken() {
  return getAuthToken();
}

/**
 * POST /v1/pairings - RECORDS a decision the client already made with the
 * scoring engine (packages/pairing); it does not compute one. See "PairMe
 * API Contract v1" section on POST /v1/pair (removed by design) vs this
 * endpoint.
 */
export async function postPairing(payload) {
  try {
    return await request('/v1/pairings', { method: 'POST', body: payload });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { notBuilt: true };
    throw e;
  }
}
