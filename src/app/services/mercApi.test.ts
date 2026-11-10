// MERC sign-in: the merc JWT is kept under its own key, never quoteme_token,
// and an expired JWT is renewed once with the kept keep-signed-in token.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { consumeMercLink, loadMercMe, MERC_TOKEN_KEY, MERC_SESSION_KEY } from './mercApi';

const calls: Array<{ url: string; auth?: string; body: unknown }> = [];
beforeEach(() => localStorage.clear());
afterEach(() => { vi.unstubAllGlobals(); calls.length = 0; });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('merc sign-in', () => {
  it('stores the JWT and keep-signed-in token under the merc keys only', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
      return json({ jwt: 'jwt-1', user: { id: 'm1' }, session: { token: 'keep-1', expires_at: 'x' } });
    }));
    const res = await consumeMercLink('link-token');
    expect(calls[0].url).toMatch(/\/api\/v1\/merc\/sign_in_links\/consume$/);
    expect(calls[0].body).toEqual({ token: 'link-token' });
    expect(res.data?.jwt).toBe('jwt-1');
    expect(localStorage.getItem(MERC_TOKEN_KEY)).toBe('jwt-1');
    expect(localStorage.getItem(MERC_SESSION_KEY)).toBe('keep-1');
    expect(localStorage.getItem('quoteme_token')).toBeNull();
  });

  it('renews an expired JWT once with the keep-signed-in token', async () => {
    localStorage.setItem(MERC_TOKEN_KEY, 'old-jwt');
    localStorage.setItem(MERC_SESSION_KEY, 'keep-1');
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
      const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
      calls.push({ url, auth, body: init.body ? JSON.parse(String(init.body)) : null });
      if (url.endsWith('/consume')) return json({ jwt: 'new-jwt', user: { id: 'm1' }, session: { token: 'keep-2', expires_at: 'x' } });
      if (auth === 'Bearer new-jwt') return json({ name: 'Chris Rowe', email: 'c@example.com' });
      return json({ error: 'expired' }, 401);
    }));
    const res = await loadMercMe();
    expect(res.data).toEqual({ name: 'Chris Rowe', email: 'c@example.com' });
    expect(calls.map((c) => c.url.replace(/^.*\/api\/v1/, ''))).toEqual(['/merc/me', '/merc/sign_in_links/consume', '/merc/me']);
    expect(calls[1].body).toEqual({ token: 'keep-1' });
    expect(localStorage.getItem(MERC_SESSION_KEY)).toBe('keep-2');
  });
});
