// RESTAURANTS LIST FILTERS: the query string the backend reads.
// Api::V1::Admin::RestaurantsController#index takes params[:state] (exact,
// upcased, valid region only) and params[:crawled] == "true".
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAdminRestaurants } from './adminApi';

const sent: string[] = [];
afterEach(() => { vi.unstubAllGlobals(); sent.length = 0; });

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    sent.push(url);
    return new Response(JSON.stringify({ restaurants: [], meta: { page: 1, per_page: 50, total_count: 0, total_pages: 0 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }));
}

describe('getAdminRestaurants filters', () => {
  it('sends state and crawled=true when set', async () => {
    stubFetch();
    await getAdminRestaurants({ page: 1, per_page: 50, state: 'CO', crawled: true });
    const params = new URL(sent[0], 'http://x').searchParams;
    expect(params.get('state')).toBe('CO');
    expect(params.get('crawled')).toBe('true');
    expect(params.get('page')).toBe('1');
  });

  it('sends neither when unset', async () => {
    stubFetch();
    await getAdminRestaurants({ page: 1, per_page: 50 });
    const params = new URL(sent[0], 'http://x').searchParams;
    expect(params.has('state')).toBe(false);
    expect(params.has('crawled')).toBe(false);
  });
});
