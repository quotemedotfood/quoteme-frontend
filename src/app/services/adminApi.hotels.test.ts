// HOTELS: the requests the QM admin Hotels pages send. Fields go at the top
// level (HotelsController reads params[:name], params[:google_place_id]), and
// an outlet is attached and detached by restaurant id only.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAdminHotels, createAdminHotel, updateAdminHotel, attachHotelOutlet, detachHotelOutlet } from './adminApi';

const sent: Array<{ url: string; method?: string; body: any }> = [];
afterEach(() => { vi.unstubAllGlobals(); sent.length = 0; });

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    sent.push({ url, method: init.method, body: init.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ id: 'h1', name: 'The Crawford', outlets: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }));
}

describe('hotel requests', () => {
  it('index searches with q, and sends none when blank', async () => {
    stubFetch();
    await getAdminHotels('  denver ');
    await getAdminHotels('');
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/hotels\?q=denver$/);
    expect(sent[1].url).toMatch(/\/api\/v1\/admin\/hotels$/);
  });

  it('create sends name and Place ID at the top level', async () => {
    stubFetch();
    await createAdminHotel({ name: 'The Crawford', google_place_id: 'ChIJ-1' });
    expect(sent[0].method).toBe('POST');
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/hotels$/);
    expect(sent[0].body).toEqual({ name: 'The Crawford', google_place_id: 'ChIJ-1' });
  });

  it('update can set room service back to unknown (null)', async () => {
    stubFetch();
    await updateAdminHotel('h1', { has_room_service: null });
    expect(sent[0].method).toBe('PATCH');
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/hotels\/h1$/);
    expect(sent[0].body).toEqual({ has_room_service: null });
  });

  it('attach and detach send the restaurant id', async () => {
    stubFetch();
    await attachHotelOutlet('h1', 'r1');
    await detachHotelOutlet('h1', 'r1');
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/hotels\/h1\/attach_outlet$/);
    expect(sent[1].url).toMatch(/\/api\/v1\/admin\/hotels\/h1\/detach_outlet$/);
    expect(sent[0].body).toEqual({ restaurant_id: 'r1' });
    expect(sent[1].body).toEqual({ restaurant_id: 'r1' });
  });
});
