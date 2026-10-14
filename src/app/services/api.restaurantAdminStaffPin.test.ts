// The staff PIN goes out as the restaurant admin (quoteme_token), even while a
// QM admin is signed in as them, as text so a leading zero survives.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setRestaurantAdminStaffPin } from './api';

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.setItem('quoteme_admin_token', 'QM-ADMIN-JWT');
  localStorage.setItem('quoteme_token', 'ALEXA-JWT');
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('setRestaurantAdminStaffPin', () => {
  it('PATCHes this restaurant\'s PIN as text with the restaurant admin token', async () => {
    const tablet = { url: 'https://app.pairme.wine/v/x/staff', pin_set: true, pin_set_at: '2026-10-14T16:00:00Z' };
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ staff_tablet: tablet }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const res = await setRestaurantAdminStaffPin('r1', '0482');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(String(url)).toContain('/api/v1/restaurant_admin/restaurants/r1/staff_pin');
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBe('Bearer ALEXA-JWT');
    expect(JSON.parse(String(init.body))).toEqual({ pin: '0482' });
    expect(res.data).toEqual({ staff_tablet: tablet });
  });

  it('passes the server\'s refusal back as an error', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'The PIN must be 4 to 8 digits.' }), { status: 422 }));
    const res = await setRestaurantAdminStaffPin('r1', '12');
    expect(res.error).toBe('The PIN must be 4 to 8 digits.');
  });
});
