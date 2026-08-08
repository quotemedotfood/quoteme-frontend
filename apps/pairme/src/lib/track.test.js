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

describe('track()', () => {
  it('posts to POST /v1/events with the event name and props in the body', () => {
    track('screen_1', { wines_found: 4 });
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(BASE_URL + '/v1/events');
    expect(calls[0].opts.method).toBe('POST');
    expect(calls[0].opts.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(calls[0].opts.body);
    expect(body.event).toBe('screen_1');
    expect(body.props).toEqual({ wines_found: 4 });
  });

  it('defaults props to an empty object when omitted', () => {
    track('launch');
    const body = JSON.parse(calls[0].opts.body);
    expect(body.event).toBe('launch');
    expect(body.props).toEqual({});
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
    expect(body.event).toBe(eventName);
  });

  it('attaches quality props (wines_found, corrections_per_capture, extraction_source) unchanged', () => {
    track('parse_ok', { wines_found: 7, extraction_source: 'corpus' });
    track('correction_made', { corrections_per_capture: 2 });
    expect(JSON.parse(calls[0].opts.body).props).toEqual({ wines_found: 7, extraction_source: 'corpus' });
    expect(JSON.parse(calls[1].opts.body).props).toEqual({ corrections_per_capture: 2 });
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
