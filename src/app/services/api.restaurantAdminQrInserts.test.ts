// The inserts download goes out as the restaurant admin, even while a QM admin
// is signed in as them, and asks for the chosen layout.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadRestaurantAdminQrInserts } from './api';

const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.setItem('quoteme_admin_token', 'QM-ADMIN-JWT');
  localStorage.setItem('quoteme_token', 'ALEXA-JWT');
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); fetchMock.mockReset(); });

describe('downloadRestaurantAdminQrInserts', () => {
  it.each(['vertical', 'horizontal'] as const)('asks for the %s sheet with the restaurant admin token', async (layout) => {
    fetchMock.mockResolvedValue(new Response('%PDF-1.4', { status: 200, headers: { 'Content-Type': 'application/pdf' } }));
    const res = await downloadRestaurantAdminQrInserts('r1', layout);
    expect(String(fetchMock.mock.calls[0][0])).toContain(`/api/v1/restaurant_admin/restaurants/r1/qr_inserts?layout=${layout}`);
    expect((fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> }).headers.Authorization).toBe('Bearer ALEXA-JWT');
    expect(res.blob!.size).toBe('%PDF-1.4'.length);
  });

  it('passes the server refusal back as an error, with no file', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Restaurant not found' }), { status: 404 }));
    expect(await downloadRestaurantAdminQrInserts('r1', 'vertical')).toEqual({ error: 'Restaurant not found' });
  });
});
