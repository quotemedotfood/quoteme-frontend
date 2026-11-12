// MENU UPLOADS: what uploadRestaurantMenuFiles puts in the multipart body.
// replace=1 is NEW MENU (Moose, 2026-11-12); pages=1 is one list in pages.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { uploadRestaurantMenuFiles } from './adminApi';

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
