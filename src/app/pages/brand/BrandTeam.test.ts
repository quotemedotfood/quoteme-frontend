// BrandTeam.test.ts
//
// Tests for B-119 and B-120 fixes.
//
// B-119: Brand role-selector routing:
//   - authed brand → /brand
//   - unauthed / non-brand → /brand/signup
//
// B-120: getBrandTeam() correctly parses the bare JSON array returned by
//   GET /api/v1/brand/team (HTTP 200 with [{ id, first_name, ... }]).
//   Previously the function called .ok and .json() on the ApiResponse object
//   (treating it like a raw Response), which always threw because res.ok is
//   undefined on ApiResponse. Fix: check res.error and return res.data.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getBrandTeam } from '../../services/api';

// ─── B-119: Brand routing predicate ─────────────────────────────────────────
//
// The AuthPage brand card click handler now does:
//   if (isAuthenticated && user?.role === 'brand') navigate('/brand')
//   else navigate('/brand/signup')
//
// We encode that predicate as a pure function and test the two branches.

function brandCardDestination(
  isAuthenticated: boolean,
  userRole: string | undefined,
): string {
  if (isAuthenticated && userRole === 'brand') return '/brand';
  return '/brand/signup';
}

describe('B-119: brand card routing', () => {
  it('routes an authenticated brand user to /brand', () => {
    expect(brandCardDestination(true, 'brand')).toBe('/brand');
  });

  it('routes an unauthenticated visitor to /brand/signup', () => {
    expect(brandCardDestination(false, undefined)).toBe('/brand/signup');
  });

  it('routes a non-brand authenticated user to /brand/signup', () => {
    expect(brandCardDestination(true, 'chef')).toBe('/brand/signup');
    expect(brandCardDestination(true, 'rep')).toBe('/brand/signup');
    expect(brandCardDestination(true, 'distributor_admin')).toBe('/brand/signup');
  });

  it('routes when role is explicitly undefined (no user) to /brand/signup', () => {
    expect(brandCardDestination(false, undefined)).toBe('/brand/signup');
  });
});

// ─── B-120: getBrandTeam bare-array response parsing ────────────────────────
//
// Ground truth: GET /api/v1/brand/team returns HTTP 200 with a bare JSON array:
//   [{ id, first_name, last_name, email, status, role, joined_at, last_active_at }]
//
// The old code called res.ok (undefined on ApiResponse → falsy) and threw
// 'Failed to load team' on every request. The fix checks res.error instead
// and returns res.data which fetchWithAuth<T> populates with the parsed JSON.
//
// We stub globalThis.fetch to simulate the bare-array 200 response and verify
// that getBrandTeam resolves to the array without throwing.

const MEMBER_FIXTURE = {
  id: 'abc-123',
  first_name: 'Alice',
  last_name: 'Smith',
  email: 'alice@example.com',
  status: 'active',
  role: 'brand_owner',
  joined_at: '2026-01-15T10:00:00Z',
  last_active_at: '2026-06-20T08:30:00Z',
};

beforeEach(() => {
  // Stub localStorage so fetchWithAuth can read (or not find) a token.
  vi.stubGlobal('localStorage', {
    getItem: () => 'fake-jwt-token',
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('B-120: getBrandTeam parses bare-array 200 response', () => {
  it('resolves to the member array when the BE returns a bare JSON array', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [MEMBER_FIXTURE],
    }));

    const result = await getBrandTeam();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('abc-123');
    expect(result[0].first_name).toBe('Alice');
    expect(result[0].email).toBe('alice@example.com');
    expect(result[0].status).toBe('active');
  });

  it('resolves to an empty array when the BE returns []', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [],
    }));

    const result = await getBrandTeam();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('resolves to an array with multiple members', async () => {
    const MEMBER_2 = { ...MEMBER_FIXTURE, id: 'def-456', first_name: 'Bob', email: 'bob@example.com' };
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => [MEMBER_FIXTURE, MEMBER_2],
    }));

    const result = await getBrandTeam();
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('def-456');
  });

  it('throws when the BE returns an error (non-ok response)', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 403,
      headers: { get: () => null },
      json: async () => ({ error: 'Unauthorized' }),
    }));

    await expect(getBrandTeam()).rejects.toThrow('Failed to load team');
  });
});
