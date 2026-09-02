/**
 * MSW handlers for LANE A (/t/demo happy path). Backend is not deployed for
 * these endpoints yet, so this is the contract mock: "PairMe API Contract
 * v1.md" for POST /v1/session, GET /v1/rules/bundle, POST /v1/pairings,
 * POST /v1/rating, DELETE /v1/account (all present in that doc); GET /v1/demo
 * is new for this lane (the seeded-venue entry point) and is not in the v1
 * doc, its shape is exactly what the LANE A brief specifies:
 * { venue, capture_id, raw_text, rows[] }.
 *
 * GET/PUT /v1/profile are mocked too even though the contract marks them
 * built (checked into the deployed backend elsewhere): this app's bootstrap
 * effect (state.js) calls them unconditionally on mount, and a demo session
 * minted here has no matching row on a real server, so leaving them
 * unmocked would surface a stray "could not load your saved taste" banner
 * on every single load of the happy path. Small, deliberate deviation from
 * the exact five endpoints named in the brief; noted in the report.
 *
 * Only these paths are intercepted (onUnhandledRequest: 'bypass' in
 * browser.js); GET /v1/venues and the rest of the onboarding flow still hit
 * the real deployed backend, unchanged.
 */
import { http, HttpResponse } from 'msw';
import { parseCsv } from '../../../../packages/pairing/src/csv.js';
import { DEMO } from '../../../../packages/pairing/src/demoFixtures.js';
import wineAxesCsv from '../../../../packages/pairing/data/wine_axes.csv?raw';
import dishAxesCsv from '../../../../packages/pairing/data/dish_axes.csv?raw';
import pairingRulesCsv from '../../../../packages/pairing/data/pairing_rules.csv?raw';
import { DEMO_VENUE, DEMO_CAPTURE_ID, buildDemoRows, buildDemoRawText } from '../lib/demoSeed.js';

const RULES_VERSION = 1;
const DEMO_ROWS = buildDemoRows(DEMO);
const DEMO_RAW_TEXT = buildDemoRawText(DEMO_ROWS);

function uuid() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const handlers = [
  // AUTH CONTRACT (locked, feat/pairme-accounts-be): mocked for local dev
  // the same way GET /v1/demo etc are, in case that backend is not deployed
  // yet. Always succeeds; there is no dev-time need to exercise the error
  // paths this app's E2E suite covers separately (tests/e2e/msw/handlers.js).
  http.post('*/v1/auth/signup', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json(
      { token: `dev_token_${uuid()}`, anon_id: uuid(), user: { id: uuid(), email: body.email, role: 'diner' } },
      { status: 201 }
    );
  }),
  http.post('*/v1/auth/login', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json({
      token: `dev_token_${uuid()}`,
      anon_id: uuid(),
      user: { id: uuid(), email: body.email, role: 'diner' },
    });
  }),
  http.get('*/v1/auth/me', () =>
    HttpResponse.json({ user: { id: uuid(), email: 'dev@example.com', role: 'diner' }, anon_id: uuid() })
  ),

  http.post('*/v1/session', () =>
    HttpResponse.json({ anon_id: uuid(), created_at: new Date().toISOString() }, { status: 201 })
  ),

  http.get('*/v1/profile', () =>
    HttpResponse.json({
      preferences: {
        som_level: null, target_level: null, adventure: null, budget: null,
        celebration_flag: null, likes: [], likes_free_text: null,
        dislikes: [], dislikes_free_text: null, not_drinking: null,
      },
    })
  ),

  http.put('*/v1/profile', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json({
      preferences: { som_level: null, target_level: null, adventure: null, budget: null, celebration_flag: null, likes: [], likes_free_text: null, dislikes: [], dislikes_free_text: null, not_drinking: null, ...(body.preferences || {}) },
    });
  }),

  // LANE A entry point: seeded venue + wine list + (via demoSeed.js, not
  // this response) the food menu. Not part of the v1 contract doc; shape
  // per the LANE A brief.
  http.get('*/v1/demo', () =>
    HttpResponse.json({
      venue: DEMO_VENUE,
      capture_id: DEMO_CAPTURE_ID,
      raw_text: DEMO_RAW_TEXT,
      rows: DEMO_ROWS,
    })
  ),

  // GET /v1/rules/bundle: the 3 tables from packages/pairing/data, parsed
  // with packages/pairing's own csv.js so the mock and the engine never
  // disagree about row shape.
  http.get('*/v1/rules/bundle', ({ request }) => {
    const url = new URL(request.url);
    const since = url.searchParams.get('since_version');
    if (since && Number(since) === RULES_VERSION) {
      return new HttpResponse(null, { status: 304 });
    }
    return HttpResponse.json({
      version: RULES_VERSION,
      tables: {
        wine_axes: parseCsv(wineAxesCsv),
        dish_axes: parseCsv(dishAxesCsv),
        pairing_rules: parseCsv(pairingRulesCsv),
      },
      checksum: 'demo-fixture-v1',
    });
  }),

  // POST /v1/pairings RECORDS a decision the client already made
  // client-side; it does not compute one (POST /v1/pair was removed by
  // design, see the contract doc).
  http.post('*/v1/pairings', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json(
      {
        pairing_id: uuid(),
        capture_id: body.capture_id || DEMO_CAPTURE_ID,
        rules_version: body.rules_version || RULES_VERSION,
        parser_version: body.parser_version || null,
        recorded_offerings: Array.isArray(body.offerings) ? body.offerings.length : 0,
      },
      { status: 201 }
    );
  }),

  http.post('*/v1/rating', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json(
      {
        id: uuid(),
        capture_id: body.capture_id,
        pairing_id: body.pairing_id || null,
        dish: body.dish,
        wine: body.wine,
        pairing: body.pairing,
        free_text: body.free_text || null,
        share_with_venue: body.share_with_venue !== false,
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  http.delete('*/v1/account', () =>
    HttpResponse.json({ message: 'Your account and all associated data have been permanently deleted.' })
  ),
];
