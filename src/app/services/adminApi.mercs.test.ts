// MERCS: the requests the QM admin Mercs page sends. The send is a POST to
// the merc's own id, with no body; the list is a plain GET.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAdminMercs, sendMercSignInLink } from './adminApi';

const sent: Array<{ url: string; method?: string; body: unknown }> = [];
afterEach(() => { vi.unstubAllGlobals(); sent.length = 0; });

function stubFetch(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    sent.push({ url, method: init.method, body: init.body ?? null });
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }));
}

describe('merc requests', () => {
  it('lists mercs with a GET', async () => {
    stubFetch([{ id: 'm1', name: 'Kirk Jorgensen', email: 'k@example.com', status: 'active', last_login_at: null }]);
    const res = await getAdminMercs();
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/mercs$/);
    expect(sent[0].method).toBeUndefined();
    expect(res.data?.[0].name).toBe('Kirk Jorgensen');
  });

  it('sends the sign-in link with a POST to that merc, no body', async () => {
    stubFetch({ sent: true, email: 'k@example.com', expires_at: '2026-11-17T00:00:00Z' });
    await sendMercSignInLink('m1');
    expect(sent[0].method).toBe('POST');
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/mercs\/m1\/send_sign_in_link$/);
    expect(sent[0].body).toBeNull();
  });
});
