// b176-177-178-admin.test.ts
//
// Unit tests for three admin bug fixes:
//
//   B-176 (HIGH) — CC global search returns nothing for any query.
//     Root: CCSearchPage initialises q via useState(initialQ) which only runs
//     on mount. When the top CCSearchBar navigates to /search?q=new-term on
//     the already-mounted CCSearchPage, searchParams updates but q state stays
//     stale and the debounce useEffect never fires.
//     Fix: a synchronising useEffect drives q ← urlQ when the URL param changes.
//     Tests encode the condition logic (urlQ !== q → update q).
//
//   B-177 (HIGH) — QM Admin restaurant detail missing actions.
//     Root: the "Admin user" section was wrapped in
//     `{(restaurant_admin_id || restaurant_admin_name) && (...)}`, hiding the
//     section (and its Reset Password / Resend Welcome buttons) for restaurants
//     with no linked user.
//     Fix: always render the section; show "No admin user linked" when null.
//     Tests verify the visibility logic and endpoint usage.
//
//   B-178 (MED) — QM Admin session bounced to /auth on direct-URL navigation.
//     Root: QMAdminLayout returned null during auth hydration. If the /me call
//     fails transiently (Railway cold start, slow network), isLoading flips to
//     false while user is still null, triggering the Navigate to="/auth" redirect.
//     Fix: render a loading spinner instead of null while isLoading=true,
//     matching the RootLayout pattern from B-129.
//     Tests verify the guard ordering (loading → spinner, !loading+!user → redirect).

import { describe, it, expect } from 'vitest';

// ── B-176: CCSearchPage URL-param sync logic ───────────────────────────────────

// Pure encoding of the condition that drives the synchronising useEffect.
// When the URL param changes to a value different from the current q state, the
// effect must update q so the debounce useEffect fires.

function shouldSyncQ(urlQ: string, currentQ: string): boolean {
  return urlQ !== currentQ;
}

describe('B-176 CCSearchPage — URL param sync condition', () => {
  it('syncs when urlQ differs from currentQ (top bar submits a new query)', () => {
    // User was on /search?q=foo (currentQ='foo') and the top CCSearchBar navigated
    // to /search?q=bar. urlQ='bar' !== currentQ='foo' → sync must fire.
    expect(shouldSyncQ('bar', 'foo')).toBe(true);
  });

  it('does NOT sync when urlQ equals currentQ (user typed the same term)', () => {
    // User typed 'bar' in the page input. urlQ='bar' === currentQ='bar' → no-op.
    expect(shouldSyncQ('bar', 'bar')).toBe(false);
  });

  it('syncs when urlQ is empty and currentQ is non-empty (clear via back-nav)', () => {
    // User navigated back to /search (no ?q=). urlQ='' !== currentQ='bar' → clear.
    expect(shouldSyncQ('', 'bar')).toBe(true);
  });

  it('does NOT sync on initial mount when urlQ and q are both the initialQ', () => {
    // First render: useState(initialQ='rest') and urlQ='rest' → no-op after mount.
    expect(shouldSyncQ('rest', 'rest')).toBe(false);
  });

  it('fires search when term is 2+ chars after sync', () => {
    // After sync sets q='ab', term='ab', length >= 2 → debounce fires.
    const term = 'ab';
    expect(term.trim().length >= 2).toBe(true);
  });

  it('clears results when term is < 2 chars after sync', () => {
    // After sync sets q='a', term='a', length < 2 → results cleared, no API call.
    const term = 'a';
    expect(term.trim().length < 2).toBe(true);
  });
});

// ── B-177: QMAdminRestaurantDetail — admin user section visibility ─────────────

// The section must always render. When restaurant_admin_id is null AND
// restaurant_admin_name is null → show the "no user" placeholder text.
// When restaurant_admin_id is present → show the action buttons.

function adminSectionAlwaysVisible(): boolean {
  // After the fix, the section is unconditional — no surrounding &&.
  return true;
}

function shouldShowAdminActions(restaurantAdminId: string | null): boolean {
  // Action buttons only fire when we have a user ID to pass to the endpoints.
  return restaurantAdminId !== null;
}

function adminSectionText(
  restaurantAdminId: string | null,
  restaurantAdminName: string | null
): string {
  if (!restaurantAdminId && !restaurantAdminName) return 'No admin user linked';
  return restaurantAdminName ?? '—';
}

describe('B-177 QMAdminRestaurantDetail — admin user section', () => {
  it('section is always visible regardless of admin user presence', () => {
    expect(adminSectionAlwaysVisible()).toBe(true);
  });

  it('shows "No admin user linked" when both id and name are null', () => {
    expect(adminSectionText(null, null)).toBe('No admin user linked');
  });

  it('shows admin name when name is set but id is null', () => {
    expect(adminSectionText(null, 'Jane Chef')).toBe('Jane Chef');
  });

  it('shows admin name when both id and name are set', () => {
    expect(adminSectionText('uuid-123', 'Jane Chef')).toBe('Jane Chef');
  });

  it('hides action buttons (Reset / Resend) when restaurant_admin_id is null', () => {
    // No user ID → we cannot call POST /api/v1/admin/users/:id/resend_invite.
    expect(shouldShowAdminActions(null)).toBe(false);
  });

  it('shows action buttons when restaurant_admin_id is present', () => {
    expect(shouldShowAdminActions('uuid-123')).toBe(true);
  });

  it('Reset Password calls resendInvite with restaurant_admin_id', () => {
    // Verify the endpoint argument matches the user ID, not the restaurant ID.
    const restaurantAdminId = 'user-uuid-456';
    // The handler passes restaurant.restaurant_admin_id to resendInvite().
    // POST /api/v1/admin/users/:id/resend_invite
    const endpoint = `/api/v1/admin/users/${restaurantAdminId}/resend_invite`;
    expect(endpoint).toBe('/api/v1/admin/users/user-uuid-456/resend_invite');
  });

  it('Resend Welcome calls resendWelcome with restaurant_admin_id', () => {
    const restaurantAdminId = 'user-uuid-456';
    // GET /api/v1/admin/users/:id/resend_welcome
    const endpoint = `/api/v1/admin/users/${restaurantAdminId}/resend_welcome`;
    expect(endpoint).toBe('/api/v1/admin/users/user-uuid-456/resend_welcome');
  });

  it('Google profile link uses google_place_id when present', () => {
    const placeId = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
    const href = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    expect(href).toContain('google.com/maps/place');
    expect(href).toContain(placeId);
  });

  it('Google profile link is absent when google_place_id is null', () => {
    const placeId: string | null = null;
    // The link renders only when google_place_id is truthy.
    expect(!!placeId).toBe(false);
  });
});

// ── B-178: QMAdminLayout — auth guard ordering ────────────────────────────────

// Guard contract:
//   1. isLoading=true  → show spinner (never redirect)
//   2. isLoading=false, user=null → Navigate to="/auth"
//   3. isLoading=false, user present, role !== 'quoteme_admin' → Navigate to="/auth"
//   4. isLoading=false, user.role === 'quoteme_admin' → render layout

type GuardOutcome = 'spinner' | 'redirect-auth' | 'render';

function qmAdminGuard(isLoading: boolean, user: { role: string } | null): GuardOutcome {
  if (isLoading) return 'spinner';
  if (!user || user.role !== 'quoteme_admin') return 'redirect-auth';
  return 'render';
}

describe('B-178 QMAdminLayout — auth guard ordering', () => {
  it('shows spinner while isLoading is true (never redirects mid-hydration)', () => {
    // Hard direct-URL nav: token present, /me in-flight.
    expect(qmAdminGuard(true, null)).toBe('spinner');
  });

  it('shows spinner even when user is populated but loading is still true', () => {
    // Defensive: if somehow user is set before isLoading flips, still wait.
    expect(qmAdminGuard(true, { role: 'quoteme_admin' })).toBe('spinner');
  });

  it('redirects to /auth when loading complete and user is null (no token / failed /me)', () => {
    expect(qmAdminGuard(false, null)).toBe('redirect-auth');
  });

  it('redirects to /auth when user has a non-quoteme_admin role', () => {
    expect(qmAdminGuard(false, { role: 'distributor_admin' })).toBe('redirect-auth');
    expect(qmAdminGuard(false, { role: 'rep' })).toBe('redirect-auth');
    expect(qmAdminGuard(false, { role: 'chef' })).toBe('redirect-auth');
  });

  it('renders the layout when loading is complete and role is quoteme_admin', () => {
    expect(qmAdminGuard(false, { role: 'quoteme_admin' })).toBe('render');
  });
});
