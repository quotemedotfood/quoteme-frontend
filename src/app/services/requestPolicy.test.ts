// The rule under test, in one line: a timed-out MUTATION is UNKNOWN, not failed.
//
// Aborts are simulated by rejecting with a DOMException named 'TimeoutError',
// which is exactly what AbortSignal.timeout() produces. Driving the real timer
// would test setTimeout, not the classification and retry logic, which is where
// the defect lives.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  fetchWithPolicy,
  timeoutForEndpoint,
  DEFAULT_TIMEOUT_MS,
  SLOW_TIMEOUT_MS,
  NETWORK_FAILURE_MESSAGE,
  TIMEOUT_READ_MESSAGE,
  TIMEOUT_MUTATION_MESSAGE,
  NetworkFetchFailedError,
  RequestTimedOutError,
} from './requestPolicy';

const URL_READ = 'https://example.test/api/v1/admin/things';
const URL_SLOW = 'https://example.test/api/v1/admin/matching-engine/teach-apply';

const timeoutError = () => new DOMException('signal timed out', 'TimeoutError');
const abortError = () => new DOMException('aborted', 'AbortError');
const networkError = () => new TypeError('Failed to fetch');

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('timeout budget', () => {
  it('gives an ordinary endpoint the default budget', () => {
    expect(timeoutForEndpoint(URL_READ)).toBe(DEFAULT_TIMEOUT_MS);
    expect(DEFAULT_TIMEOUT_MS).toBe(30_000);
  });

  it('gives an enumerated model-backed endpoint the slow budget', () => {
    expect(timeoutForEndpoint(URL_SLOW)).toBe(SLOW_TIMEOUT_MS);
    expect(SLOW_TIMEOUT_MS).toBe(120_000);
  });

  it('does NOT grant the slow budget by prefix', () => {
    // Enumerated, not pattern-matched: a sibling endpoint under the same prefix
    // must not inherit a 2-minute budget just by living next door.
    expect(timeoutForEndpoint('https://example.test/api/v1/admin/matching-engine/rules'))
      .toBe(DEFAULT_TIMEOUT_MS);
  });
});

describe('a timed-out MUTATION is unknown, not failed', () => {
  it('is never retried', async () => {
    fetchMock.mockRejectedValue(timeoutError());
    await expect(fetchWithPolicy(URL_READ, { method: 'POST' })).rejects.toBeInstanceOf(RequestTimedOutError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not tell the user it failed', async () => {
    fetchMock.mockRejectedValue(timeoutError());
    await expect(fetchWithPolicy(URL_READ, { method: 'DELETE' })).rejects.toThrow(TIMEOUT_MUTATION_MESSAGE);
    // The copy must leave the outcome open. "failed" on a send that actually
    // succeeded is how a chef gets two quotes.
    expect(TIMEOUT_MUTATION_MESSAGE).not.toMatch(/fail/i);
    expect(TIMEOUT_MUTATION_MESSAGE).toMatch(/may or may not/i);
  });

  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('applies to %s', async (method) => {
    fetchMock.mockRejectedValue(timeoutError());
    await expect(fetchWithPolicy(URL_READ, { method })).rejects.toThrow(TIMEOUT_MUTATION_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('a timed-out READ is safe to repeat', () => {
  it('retries exactly once, then surfaces the read copy', async () => {
    fetchMock.mockRejectedValue(timeoutError());
    await expect(fetchWithPolicy(URL_READ)).rejects.toThrow(TIMEOUT_READ_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('succeeds if the retry lands', async () => {
    const ok = new Response('{}', { status: 200 });
    fetchMock.mockRejectedValueOnce(timeoutError()).mockResolvedValueOnce(ok);
    await expect(fetchWithPolicy(URL_READ)).resolves.toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('an abort is classified separately from a network failure', () => {
  it('never lets a raw DOMException reach the caller', async () => {
    fetchMock.mockRejectedValue(abortError());
    // Without the isAbortLike branch this fell through the TypeError check and
    // the caller rendered "signal is aborted without reason".
    const err = await fetchWithPolicy(URL_READ).catch((e) => e);
    expect(err).toBeInstanceOf(RequestTimedOutError);
    expect(err).not.toBeInstanceOf(DOMException);
    expect(err.message).toBe(TIMEOUT_READ_MESSAGE);
  });
});

describe('network-failure behaviour is preserved (BUG #28)', () => {
  it('retries a safe method once', async () => {
    fetchMock.mockRejectedValue(networkError());
    await expect(fetchWithPolicy(URL_READ)).rejects.toBeInstanceOf(NetworkFetchFailedError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries a mutation', async () => {
    fetchMock.mockRejectedValue(networkError());
    await expect(fetchWithPolicy(URL_READ, { method: 'POST' })).rejects.toThrow(NETWORK_FAILURE_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows a non-network, non-abort error untouched', async () => {
    const weird = new RangeError('something else entirely');
    fetchMock.mockRejectedValue(weird);
    await expect(fetchWithPolicy(URL_READ)).rejects.toBe(weird);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('every request carries a signal', () => {
  it('attaches one even when the caller passes no init', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await fetchWithPolicy(URL_READ);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
