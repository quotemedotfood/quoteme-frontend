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

export const requestLog = [];

export function resetRequestLog() {
  requestLog.length = 0;
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

export const handlers = [
  http.post(`${BASE_URL}/v1/session`, async ({ request }) => {
    record(request);
    return HttpResponse.json({ anon_id: TEST_ANON_ID }, { status: 201 });
  }),

  http.get(`${BASE_URL}/v1/profile`, async ({ request }) => {
    record(request);
    return HttpResponse.json({ preferences: {}, safety: {} });
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
