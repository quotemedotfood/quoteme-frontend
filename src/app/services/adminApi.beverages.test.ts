// BEVERAGE CORPUS: the query strings and bodies QuoteMe reads.
// Api::V1::Admin::BeveragesController#index and
// Api::V1::Admin::WineMatchSubmissionsController (QuoteMe PR #613).
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAdminBeverages, getWineMatchSubmissions, relinkWineMatch, rejectWineMatch } from './adminApi';

const sent: Array<{ url: string; init?: RequestInit }> = [];
afterEach(() => { vi.unstubAllGlobals(); sent.length = 0; });

function stubFetch(body: unknown = { rows: [], page: 1, per_page: 50, total_count: 0, total_pages: 1 }) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    sent.push({ url, init });
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }));
}

describe('getAdminBeverages', () => {
  it('sends every filter the server reads', async () => {
    stubFetch();
    await getAdminBeverages({
      page: 2, per_page: 50, q: 'cuvee', kind: 'wine', color: 'red', grape: 'Syrah', country: 'France',
      region: 'Rhone', brand_id: 'b1', brand_q: 'domaine', distributor_id: 'd1', min_restaurants: 0, max_restaurants: 3,
      needs_review: false, sort: 'restaurant_count', dir: 'desc',
    });
    const params = new URL(sent[0].url, 'http://x').searchParams;
    expect(new URL(sent[0].url, 'http://x').pathname).toBe('/api/v1/admin/beverages');
    expect(Object.fromEntries(params)).toEqual({
      page: '2', per_page: '50', q: 'cuvee', kind: 'wine', color: 'red', grape: 'Syrah', country: 'France',
      region: 'Rhone', brand_id: 'b1', brand_q: 'domaine', distributor_id: 'd1', min_restaurants: '0', max_restaurants: '3',
      needs_review: 'false', sort: 'restaurant_count', dir: 'desc',
    });
  });

  it('sends only paging when nothing is set', async () => {
    stubFetch();
    await getAdminBeverages({ page: 1, per_page: 50, q: '  ' });
    const params = new URL(sent[0].url, 'http://x').searchParams;
    expect([...params.keys()].sort()).toEqual(['page', 'per_page']);
  });
});

describe('wine match submissions', () => {
  it('lists pending by default', async () => {
    stubFetch();
    await getWineMatchSubmissions({ page: 1, per_page: 50 });
    const url = new URL(sent[0].url, 'http://x');
    expect(url.pathname).toBe('/api/v1/admin/wine_match_submissions');
    expect(url.searchParams.get('status')).toBe('pending');
  });

  it('relink posts the target beverage id', async () => {
    stubFetch({});
    await relinkWineMatch('s1', 'bev-2');
    expect(new URL(sent[0].url, 'http://x').pathname).toBe('/api/v1/admin/wine_match_submissions/s1/relink');
    expect(sent[0].init?.method).toBe('POST');
    expect(JSON.parse(String(sent[0].init?.body))).toEqual({ beverage_id: 'bev-2' });
  });

  it('reject posts to reject', async () => {
    stubFetch({});
    await rejectWineMatch('s1');
    expect(new URL(sent[0].url, 'http://x').pathname).toBe('/api/v1/admin/wine_match_submissions/s1/reject');
    expect(sent[0].init?.method).toBe('POST');
  });
});
