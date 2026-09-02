/**
 * MSW request handlers implementing "PairMe API Contract v1" shapes, as the
 * real client (src/lib/api.js) calls them. Kept deterministic on purpose:
 * every handler below is pure request-in -> response-out, no randomness, so
 * the whole E2E suite reruns identically every time (LANE E requirement).
 *
 * Endpoint naming note: src/lib/api.js's `pair()` calls POST /v1/pair (that
 * is the real, live client code this suite exercises). Some comments
 * elsewhere in the repo (packages/pairing/src/roles.js, directions.js,
 * directions.test.js) instead cite "POST /v1/pairings" for the same
 * endpoint. That is a pre-existing naming mismatch in the contract docs
 * themselves, not something LANE E introduced, so this is flagged here
 * rather than silently picking one. This file mocks the path api.js actually
 * calls: /v1/pair.
 *
 * requestLog is exported so specs can assert on what the client actually
 * sent (method, path, body, headers) without reaching into MSW internals.
 */
import { http, HttpResponse } from 'msw';
import { BASE_URL } from '../../../src/lib/api.js';
import { DEMO } from '../../../../../packages/pairing/src/demoFixtures.js';
import { DEMO_VENUE, DEMO_CAPTURE_ID, buildDemoRows, buildDemoRawText } from '../../../src/lib/demoSeed.js';

export const requestLog = [];

// In-memory operator venue-pairings store (GET/PUT /v1/venues/:code/pairings).
export const venuePairingsStore = new Map();

export function resetRequestLog() {
  requestLog.length = 0;
  venuePairingsStore.clear();
}

function record(req, extra) {
  requestLog.push({
    method: req.method,
    path: new URL(req.url).pathname,
    search: new URL(req.url).search,
    anon: req.headers.get('X-PairMe-Anon'),
    ...extra,
  });
}

// Fixed identity the whole suite hydrates around. Matches the
// "IDENTITY: anon_id is the ONLY thing kept in localStorage" contract note
// in api.js.
export const TEST_ANON_ID = 'anon_e2e_test';

// One venue the demo table sits at, keyed to what WhereTo.jsx's copy already
// hints at ("Type 'aqu' to see it come up.").
const VENUES = [{ id: 'venue_aquitaine', name: 'Aquitaine', city: 'Boston', state: 'MA' }];

// GET /v1/demo's rows[] (LANE A entry point via /t/:code). Built with the
// same demoSeed.js helper the app's own dev-time mock (src/mocks/handlers.js)
// uses, from packages/pairing's own DEMO fixture, so a fired rule in this
// suite is the same fired rule pairing_engine.py's --selftest would report.
const DEMO_ROWS = buildDemoRows(DEMO);
const DEMO_RAW_TEXT = buildDemoRawText(DEMO_ROWS);

// Contract shape for POST /v1/pair's 200 response: { offerings: [...],
// compromise: {...} | null }. offerings[].slot is the "house"|"suited"|
// "crowd" enum locked in packages/pairing/src/roles.js SLOTS. `compromise`
// is only meaningful for the one_bottle direction (packages/pairing/src/
// directions.js's oneBottle() is the only one that computes it), so this
// handler mirrors that: course_it_out/several get compromise: null.
function buildPairResponse(direction) {
  const offerings = [
    {
      slot: 'house',
      label: 'House suggestion',
      why: 'Mussels in cream and a liver pate do not usually want the same wine. Champagne is the one thing that serves both.',
      wine: {
        producer: 'Pierre Gimonnet & Fils',
        name: 'Blanc de Blancs 1er Cru Brut',
        pronunciation: 'zhee-moh-NAY',
        region: 'Champagne, France',
        price_cents: 13800,
      },
    },
    {
      slot: 'suited',
      label: 'Suited to you',
      why: 'You said you love Burgundy. The roti has morels, the steak has a black truffle vinaigrette, and both point at the same bottle.',
      wine: {
        producer: 'Domaine Trapet',
        name: 'Gevrey-Chambertin',
        pronunciation: 'zhev-RAY shom-ber-TAN',
        region: 'Burgundy, France',
        price_cents: 23400,
      },
    },
    {
      slot: 'crowd',
      label: 'Crowd pleaser',
      why: 'If two bottles feels like a lot, this is the one wine here nobody at the table will argue with.',
      wine: {
        producer: 'Jean Foillard',
        name: 'Morgon Cote du Py',
        pronunciation: 'fwah-YAR, mor-GOHN',
        region: 'Beaujolais, France',
        price_cents: 10200,
      },
    },
  ];

  if (direction !== 'one_bottle') {
    return { offerings, compromise: null };
  }

  return {
    offerings,
    compromise: {
      dish: 'Steak frites Aquitaine',
      score: 61,
      reason: 'The truffle vinaigrette pulls harder toward tannin than the rest of the table needs.',
    },
  };
}

// AUTH CONTRACT (locked, feat/pairme-accounts-be, mocked here since that
// backend may not be deployed yet). One fixed test account so login.test.jsx
// can exercise the "wrong password" error path deterministically; any other
// email/password on POST /v1/auth/login succeeds so a spec doesn't have to
// pre-seed a signup first. anon_id returned is deliberately different from
// TEST_ANON_ID above - proves the caller adopts the RETURNED anon_id rather
// than keeping the one that was already in localStorage.
export const TEST_AUTH_TOKEN = 'auth_token_e2e_test';
export const TEST_AUTH_ANON_ID = 'anon_after_auth_e2e_test';
const KNOWN_ACCOUNT_EMAIL = 'diner@example.com';
const KNOWN_ACCOUNT_PASSWORD = 'correct-password';
const SIGNED_UP_EMAILS = new Set();

export function resetAuthFixtures() {
  SIGNED_UP_EMAILS.clear();
}

export const handlers = [
  http.post(`${BASE_URL}/v1/auth/signup`, async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    record(request, { body });
    if (body.email && SIGNED_UP_EMAILS.has(body.email)) {
      return HttpResponse.json(
        { error_code: 'EMAIL_TAKEN', message: 'An account already exists for that email. Try logging in instead.' },
        { status: 422 }
      );
    }
    if (body.email) SIGNED_UP_EMAILS.add(body.email);
    return HttpResponse.json(
      {
        token: TEST_AUTH_TOKEN,
        anon_id: TEST_AUTH_ANON_ID,
        user: { id: 'user_e2e_1', email: body.email, role: 'diner' },
      },
      { status: 201 }
    );
  }),

  http.post(`${BASE_URL}/v1/auth/login`, async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    record(request, { body });
    if (body.email === KNOWN_ACCOUNT_EMAIL && body.password !== KNOWN_ACCOUNT_PASSWORD) {
      return HttpResponse.json(
        { error_code: 'INVALID_CREDENTIALS', message: 'That email and password do not match. Please try again.' },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      token: TEST_AUTH_TOKEN,
      anon_id: TEST_AUTH_ANON_ID,
      user: { id: 'user_e2e_1', email: body.email, role: 'diner' },
    });
  }),

  http.get(`${BASE_URL}/v1/auth/me`, async ({ request }) => {
    record(request);
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error_code: 'NO_IDENTITY', message: 'Please log in again.' }, { status: 401 });
    }
    return HttpResponse.json({
      user: { id: 'user_e2e_1', email: KNOWN_ACCOUNT_EMAIL, role: 'diner' },
      anon_id: TEST_AUTH_ANON_ID,
    });
  }),

  http.post(`${BASE_URL}/v1/session`, async ({ request }) => {
    record(request);
    return HttpResponse.json({ anon_id: TEST_ANON_ID }, { status: 201 });
  }),

  http.get(`${BASE_URL}/v1/profile`, async ({ request }) => {
    record(request);
    return HttpResponse.json({ preferences: {} });
  }),

  http.put(`${BASE_URL}/v1/profile`, async ({ request }) => {
    const body = await request.json();
    record(request, { body });
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${BASE_URL}/v1/venues`, async ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').toLowerCase();
    record(request);
    if (q.startsWith('nowhere')) {
      return HttpResponse.json({ covered: false, message: 'We are not there yet. Photograph the list instead.' });
    }
    const venues = VENUES.filter((v) => v.name.toLowerCase().includes(q));
    return HttpResponse.json({ venues });
  }),

  // Operator venue-pairings persistence, in-memory so a spec can round-trip
  // (PUT then GET). Keyed by :code, mirroring V1::VenuePairingsController.
  http.get(`${BASE_URL}/v1/venues/:code/pairings`, async ({ request, params }) => {
    record(request);
    const saved = venuePairingsStore.get(params.code) || { confirmed: [], pushed: [] };
    return HttpResponse.json({ code: params.code, confirmed: saved.confirmed, pushed: saved.pushed });
  }),

  http.put(`${BASE_URL}/v1/venues/:code/pairings`, async ({ request, params }) => {
    record(request);
    const body = await request.json().catch(() => ({}));
    const confirmed = Array.isArray(body.confirmed) ? body.confirmed : [];
    const pushed = Array.isArray(body.pushed) ? body.pushed : [];
    venuePairingsStore.set(params.code, { confirmed, pushed });
    return HttpResponse.json({ code: params.code, confirmed, pushed });
  }),

  http.post(`${BASE_URL}/v1/capture`, async ({ request }) => {
    record(request, { body: '[multipart form-data]' });
    return HttpResponse.json({ capture_id: 'cap_e2e_1', raw_text: '' });
  }),

  // NOT BUILT server side per the contract (item G1): api.js expects a 404
  // here and swallows it into { notBuilt: true }. Kept as a real 404, not a
  // 200, so this suite fails loudly if that swallow-behavior regresses.
  http.post(`${BASE_URL}/v1/capture/:captureId/rows`, async ({ request }) => {
    record(request);
    return HttpResponse.json({ error_code: 'NOT_FOUND', message: 'Not built yet.' }, { status: 404 });
  }),

  http.post(`${BASE_URL}/v1/pair`, async ({ request }) => {
    const body = await request.json();
    record(request, { body });
    return HttpResponse.json(buildPairResponse(body.direction));
  }),

  // GET /v1/demo - LANE A's /t/demo entry point (see api.js's own comment:
  // not in the documented v1 contract, mocked ahead of the BE catching up).
  http.get(`${BASE_URL}/v1/demo`, async ({ request }) => {
    record(request);
    return HttpResponse.json({
      venue: DEMO_VENUE,
      capture_id: DEMO_CAPTURE_ID,
      raw_text: DEMO_RAW_TEXT,
      rows: DEMO_ROWS,
    });
  }),

  // GET /v1/t/:code - PART 2's generic table-code resolver (superset #340,
  // NOT BUILT server side yet - see lib/api.js's getTableCode doc comment
  // and routes.jsx's TableCodeRoute). Mocked here per the CONTRACT this FE
  // codes against: 200 {venue,capture_id,raw_text,rows} (same shape as GET
  // /v1/demo) for a known code, 404 {error_code:"VENUE_NOT_FOUND",message}
  // for an unknown one. TABLE_CODE_NOT_FOUND is the one sentinel this suite
  // treats as unknown; any other code resolves.
  http.get(`${BASE_URL}/v1/t/:code`, async ({ request, params }) => {
    record(request);
    if (params.code === 'TABLE_CODE_NOT_FOUND') {
      return HttpResponse.json(
        { error_code: 'VENUE_NOT_FOUND', message: 'We could not find that table. Ask your server for the code, or point your camera at the wine list instead.' },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      venue: { id: 'venue_t_e2e', name: 'Le Petit Bistro', city: 'Cambridge', state: 'MA' },
      capture_id: 'cap_t_e2e',
      raw_text: DEMO_RAW_TEXT,
      rows: DEMO_ROWS,
    });
  }),

  // POST /v1/pairings - RECORDS a decision already computed client-side by
  // packages/pairing (state.js's s===10 cta handler on the /t/demo path).
  http.post(`${BASE_URL}/v1/pairings`, async ({ request }) => {
    const body = await request.json();
    record(request, { body });
    return HttpResponse.json(
      { pairing_id: 'pairing_e2e_1', recorded_offerings: Array.isArray(body.offerings) ? body.offerings.length : 0 },
      { status: 201 }
    );
  }),

  // POST /v1/events - fire-and-forget instrumentation beacon (track.js).
  // Mocked for real, same reasoning as GET /v1/rules/bundle below: every
  // go()/skip()/cta call fires one of these, so leaving it unmocked means
  // an "unhandled request" error on nearly every interaction in this suite
  // even though track() itself always swallows the failure.
  http.post(`${BASE_URL}/v1/events`, async ({ request }) => {
    const body = await request.json();
    record(request, { body });
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${BASE_URL}/v1/rating`, async ({ request }) => {
    const body = await request.json();
    record(request, { body });
    return HttpResponse.json({ ok: true });
  }),

  http.delete(`${BASE_URL}/v1/account`, async ({ request }) => {
    record(request);
    return new HttpResponse(null, { status: 204 });
  }),

  // Fire-and-forget warm up (packages/pairing's loadRulesBundle, called from
  // usePairMe's bootstrap effect, its own failure swallowed by a bare
  // .catch(() => {})). Mocked for real so the suite does not print a noisy
  // "unhandled request" error on every render. Shape per the contract:
  // GET /v1/rules/bundle?since_version=<int> -> 200 { version, tables,
  // checksum } (this suite never sends since_version, so the 304 branch is
  // not exercised here).
  http.get(`${BASE_URL}/v1/rules/bundle`, async ({ request }) => {
    record(request);
    return HttpResponse.json({
      version: 1,
      tables: { wine_axes: [], dish_axes: [], pairing_rules: [] },
      checksum: 'e2e-test-checksum',
    });
  }),
];
