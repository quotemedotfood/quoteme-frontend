// UX polish (post-100km-Foods-demo): a mid-deploy blip on Railway threw a raw
// "TypeError: Failed to fetch" that surfaced as a bare, meaningless error to
// the rep — it looked like a broken CORS config but was really a transient
// network-class failure. The core fetch helper in api.ts (`fetchWithRetry`)
// now auto-retries once on that failure class before giving up, and only
// then falls back to a plain-language message. This is centralized so every
// caller in api.ts benefits without each call site knowing about retries.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NETWORK_FAILURE_MESSAGE } from './api';

const fetchSpy = vi.fn();

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    headers: { get: () => null },
  };
}

function httpErrorResponse(status: number, body: unknown) {
  return {
    ok: false,
    status,
    json: async () => body,
    headers: { get: () => null },
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('fetchWithRetry (core fetch helper) — network-class failures', () => {
  it('retries once on a network/CORS-class rejection and succeeds on the retry', async () => {
    fetchSpy
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(okResponse({ id: 'd-1', name: 'Acme Foods', logo_url: null }));

    const { getDistributorById } = await import('./api');
    const res = await getDistributorById('d-1');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(res.error).toBeUndefined();
    expect(res.data).toMatchObject({ id: 'd-1', name: 'Acme Foods' });
  }, 10000);

  it('surfaces plain-language copy (not the raw TypeError) when both the original attempt and the retry fail', async () => {
    fetchSpy
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { getDistributorById } = await import('./api');
    const res = await getDistributorById('d-1');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(res.error).toBe(NETWORK_FAILURE_MESSAGE);
    expect(res.error).not.toMatch(/failed to fetch/i);
  }, 10000);

  it('does NOT retry on an HTTP error response (4xx/5xx have a meaningful body)', async () => {
    fetchSpy.mockResolvedValueOnce(httpErrorResponse(404, { error: 'Distributor not found' }));

    const { getDistributorById } = await import('./api');
    const res = await getDistributorById('missing-id');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res.error).toBe('Distributor not found');
  });

  it('does NOT retry a non-network thrown error (only TypeError network rejections are retried)', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('boom: unrelated failure'));

    const { getDistributorById } = await import('./api');
    const res = await getDistributorById('d-1');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res.error).toBe('boom: unrelated failure');
  });
});
