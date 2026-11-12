// MENU UPLOADS: what uploadRestaurantMenuFiles puts in the multipart body.
// replace=1 is NEW MENU (Moose, 2026-11-12); pages=1 is one list in pages.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { uploadRestaurantMenuFiles, submitRestaurantMenuSource } from './adminApi';

const sent: FormData[] = [];
afterEach(() => { vi.unstubAllGlobals(); sent.length = 0; });

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit = {}) => {
    sent.push(init.body as FormData);
    return new Response(JSON.stringify({ uploads: [{ filename: 'a.jpg', menu_id: 'm1', status: 'extracting' }] }), {
      status: 202, headers: { 'Content-Type': 'application/json' },
    });
  }));
}

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

describe('uploadRestaurantMenuFiles', () => {
  it('a plain upload sends neither pages nor replace', async () => {
    stubFetch();
    await uploadRestaurantMenuFiles('r1', 'menu', [file('a.jpg')]);
    expect(sent[0].get('kind')).toBe('menu');
    expect(sent[0].get('pages')).toBeNull();
    expect(sent[0].get('replace')).toBeNull();
  });

  it('replace sends replace=1, alongside pages=1 when both are asked', async () => {
    stubFetch();
    await uploadRestaurantMenuFiles('r1', 'menu', [file('a.jpg')], { replace: true });
    expect(sent[0].get('replace')).toBe('1');
    expect(sent[0].get('pages')).toBeNull();
    await uploadRestaurantMenuFiles('r1', 'menu', [file('a.jpg'), file('b.jpg')], { pages: true, replace: true });
    expect(sent[1].get('replace')).toBe('1');
    expect(sent[1].get('pages')).toBe('1');
    expect(sent[1].getAll('files[]')).toHaveLength(2);
  });
});

// THE "+ MENU" DRAWER (Moose, 2026-11-12): Text and URL go as JSON, with
// exactly one of text or url, and replace=1 only for New menu.
describe('submitRestaurantMenuSource', () => {
  const bodies: Array<{ url: string; init: RequestInit }> = [];
  afterEach(() => { bodies.length = 0; });
  function stubJson() {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
      bodies.push({ url, init });
      return new Response(JSON.stringify({ uploads: [{ menu_id: 'm1', status: 'extracting' }] }), {
        status: 202, headers: { 'Content-Type': 'application/json' },
      });
    }));
  }

  it('text, url, and replace for a new menu', async () => {
    stubJson();
    const r = await submitRestaurantMenuSource('r1', 'cocktail_list', { text: 'Negroni 14' });
    expect(r.data?.uploads[0].menu_id).toBe('m1');
    await submitRestaurantMenuSource('r1', 'wine_list', { url: 'https://a.com/list.pdf' });
    await submitRestaurantMenuSource('r1', 'menu', { url: 'https://a.com/menu' }, { replace: true });
    expect(bodies[0].url).toContain('/api/v1/admin/restaurants/r1/menu_uploads');
    expect(bodies[0].init.method).toBe('POST');
    expect(JSON.parse(bodies[0].init.body as string)).toEqual({ kind: 'cocktail_list', text: 'Negroni 14' });
    expect(JSON.parse(bodies[1].init.body as string)).toEqual({ kind: 'wine_list', url: 'https://a.com/list.pdf' });
    expect(JSON.parse(bodies[2].init.body as string)).toEqual({ kind: 'menu', url: 'https://a.com/menu', replace: 1 });
  });

  it('a 422 comes back with its error and code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'That link could not be read.', error_code: 'URL_UNREADABLE' }), {
      status: 422, headers: { 'Content-Type': 'application/json' },
    })));
    const r = await submitRestaurantMenuSource('r1', 'menu', { url: 'https://a.com/x' });
    expect(r).toMatchObject({ error: 'That link could not be read.', error_code: 'URL_UNREADABLE', status: 422 });
  });
});
