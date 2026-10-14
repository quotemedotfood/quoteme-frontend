// The learning sheet download goes out as the restaurant admin, even while a
// QM admin is signed in as them, and gets the slow-endpoint time budget: its
// first download waits on the server drafting tasting notes.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadRestaurantAdminLearningSheet } from './api';
import { timeoutForEndpoint, SLOW_TIMEOUT_MS, DEFAULT_TIMEOUT_MS } from './requestPolicy';

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

describe('downloadRestaurantAdminLearningSheet', () => {
  it('asks for this restaurant’s sheet with the restaurant admin token and returns the PDF', async () => {
    fetchMock.mockResolvedValue(new Response('%PDF-1.4', { status: 200, headers: { 'Content-Type': 'application/pdf' } }));
    const res = await downloadRestaurantAdminLearningSheet('r1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/restaurant_admin/restaurants/r1/learning_sheet');
    expect((fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> }).headers.Authorization).toBe('Bearer ALEXA-JWT');
    expect(res.error).toBeUndefined();
    expect(res.blob!.size).toBe('%PDF-1.4'.length);
  });

  it('passes the server’s refusal back as an error, with no file', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Restaurant not found' }), { status: 404 }));
    expect(await downloadRestaurantAdminLearningSheet('r1')).toEqual({ error: 'Restaurant not found' });
  });

  it('waits the slow-endpoint two minutes, not the default thirty seconds', () => {
    expect(timeoutForEndpoint('https://api.example/api/v1/restaurant_admin/restaurants/r1/learning_sheet')).toBe(SLOW_TIMEOUT_MS);
    expect(timeoutForEndpoint('https://api.example/api/v1/restaurant_admin/restaurants/r1/cheat_sheet')).toBe(DEFAULT_TIMEOUT_MS);
  });
});
