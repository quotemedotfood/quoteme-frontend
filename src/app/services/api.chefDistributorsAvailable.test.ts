// B-121: getChefDistributorsAvailable must call the /available path, not the
// base /distributors path that getChefDistributors uses.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Minimal mock for fetchWithGuest — intercept fetch so no real network call is made.
const fetchSpy = vi.fn();

beforeEach(() => {
  // Replace global fetch with spy before each test.
  vi.stubGlobal('fetch', fetchSpy);
  fetchSpy.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ distributors: [], chef_state: null, geo_filtered: false }),
    headers: { get: () => 'application/json' },
  });
  // Stub localStorage so fetchWithGuest token look-up doesn't throw in node env.
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('getChefDistributorsAvailable — B-121 path verification', () => {
  it('calls /api/v1/chef/distributors/available', async () => {
    // Dynamic import so the module resolves after the global stubs are in place.
    const { getChefDistributorsAvailable } = await import('./api');
    await getChefDistributorsAvailable();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl: string = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain('/api/v1/chef/distributors/available');
  });

  it('does NOT call the base /distributors path', async () => {
    const { getChefDistributorsAvailable } = await import('./api');
    await getChefDistributorsAvailable();

    const calledUrl: string = fetchSpy.mock.calls[0][0];
    // Should end with /available, not stop at /distributors
    expect(calledUrl).not.toMatch(/\/chef\/distributors$/);
  });
});
