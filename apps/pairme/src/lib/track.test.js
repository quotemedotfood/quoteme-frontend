import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { track } from './track.js';
import { BASE_URL } from './api.js';

let calls;

beforeEach(() => {
  calls = [];
  global.fetch = vi.fn(async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 201, text: async () => JSON.stringify({ ok: true }) };
  });
});

afterEach(() => {
  delete global.fetch;
});

/*
 * These assertions are written against the SERVER's shape, deliberately.
 * The previous version of this file asserted `body.event` - the singular
 * key this client used to send - so it passed for the whole time the
 * endpoint was rejecting every beacon. A client-side test that only agrees
 * with the client is what let that run silently, so each assertion below
 * names what V1::EventsController actually requires: `params.require(
 * :events)`, then `permit(:name, :occurred_at, props: {})`.
 */
describe('track()', () => {
  it('posts to POST /v1/events with a batch envelope, not a single event', () => {
    track('screen_1', { wines_found: 4 });
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(BASE_URL + '/v1/events');
    expect(calls[0].opts.method).toBe('POST');
    expect(calls[0].opts.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(calls[0].opts.body);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBe(1);
    expect(body.events[0].name).toBe('screen_1');
    expect(body.events[0].props).toEqual({ wines_found: 4 });
  });

  it('names the event `name`, the key the server permits, and sends no `event` key', () => {
    track('screen_1');
    const body = JSON.parse(calls[0].opts.body);
    expect(body.events[0]).toHaveProperty('name');
    expect(body).not.toHaveProperty('event');
    expect(body.events[0]).not.toHaveProperty('event');
  });

  it('stamps occurred_at on the client as an ISO-8601 instant', () => {
    const before = Date.now();
    track('launch');
    const after = Date.now();
    const occurredAt = JSON.parse(calls[0].opts.body).events[0].occurred_at;
    expect(occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    const t = Date.parse(occurredAt);
    expect(Number.isNaN(t)).toBe(false);
    // Client clock, so it must be the moment of the call - not left for the
    // server to fill in from receive time, which would be wrong for any
    // beacon that was queued.
    expect(t).toBeGreaterThanOrEqual(before - 1000);
    expect(t).toBeLessThanOrEqual(after + 1000);
  });

  it('defaults props to an empty object when omitted', () => {
    track('launch');
    const body = JSON.parse(calls[0].opts.body);
    expect(body.events[0].name).toBe('launch');
    expect(body.events[0].props).toEqual({});
  });

  // The full wired event set from the Lane C spec, exercised one at a time
  // so a typo in any single event name fails the assertion pointing at it.
  const WIRED_EVENTS = [
    'launch',
    'onboard_start',
    'screen_1',
    'screen_2',
    'screen_3',
    'screen_4',
    'screen_5',
    'screen_6',
    'skip_screen_1',
    'capture_start',
    'capture_ok',
    'parse_ok',
    'correction_made',
    'pair_request',
    'show_server',
    'rate_submit',
  ];

  it.each(WIRED_EVENTS)('posts event name "%s" verbatim', (eventName) => {
    calls = [];
    track(eventName);
    expect(calls.length).toBe(1);
    const body = JSON.parse(calls[0].opts.body);
    expect(body.events[0].name).toBe(eventName);
  });

  it('attaches quality props (wines_found, corrections_per_capture, extraction_source) unchanged', () => {
    track('parse_ok', { wines_found: 7, extraction_source: 'corpus' });
    track('correction_made', { corrections_per_capture: 2 });
    expect(JSON.parse(calls[0].opts.body).events[0].props).toEqual({ wines_found: 7, extraction_source: 'corpus' });
    expect(JSON.parse(calls[1].opts.body).events[0].props).toEqual({ corrections_per_capture: 2 });
  });

  it('never throws, even when the network call rejects', () => {
    global.fetch = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(() => track('launch')).not.toThrow();
  });

  it('never throws, even when the server returns a non-2xx error', () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error_code: 'SERVER_ERROR', message: 'oops' }),
    }));
    expect(() => track('launch')).not.toThrow();
  });
});
