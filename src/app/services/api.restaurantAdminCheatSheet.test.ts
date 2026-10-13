// The cheat sheet download goes out as the restaurant admin, even while a QM
// admin is signed in as them (the same Forbidden Moose hit on 2026-10-13).
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadRestaurantAdminCheatSheet } from './api';

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

describe('downloadRestaurantAdminCheatSheet', () => {
  it('asks for this restaurant’s sheet with the restaurant admin token and returns the PDF', async () => {
    fetchMock.mockResolvedValue(new Response('%PDF-1.4', { status: 200, headers: { 'Content-Type': 'application/pdf' } }));
    const res = await downloadRestaurantAdminCheatSheet('r1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/restaurant_admin/restaurants/r1/cheat_sheet');
    expect((fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> }).headers.Authorization).toBe('Bearer ALEXA-JWT');
    expect(res.error).toBeUndefined();
    expect(res.blob!.size).toBe('%PDF-1.4'.length);
  });

  it('passes the server’s refusal back as an error, with no file', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Restaurant not found' }), { status: 404 }));
    const res = await downloadRestaurantAdminCheatSheet('r1');
    expect(res).toEqual({ error: 'Restaurant not found' });
  });
});
