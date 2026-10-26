// RESTAURANT LOAD BATCHES: the requests the backend reads (QuoteMe #588,
// Api::V1::Admin::RestaurantLoadBatchesController).
//
//   create reads params.require(:file) as an uploaded file, so the CSV has to
//   go as multipart in `file`, with the browser's own boundary (no JSON
//   Content-Type forced on it).
//   apply reads params[:pair_after_apply] and defaults it to false, so the
//   key goes only when the operator ticked the box.
//   A 409 is { error, error_code: "REFUSED" }; the page shows `error`.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  uploadRestaurantLoadBatch,
  getRestaurantLoadBatches,
  applyRestaurantLoadBatch,
  revertRestaurantLoadBatch,
} from './adminApi';

type Sent = { url: string; method?: string; body: unknown; headers: Record<string, string> };
const sent: Sent[] = [];
afterEach(() => { vi.unstubAllGlobals(); sent.length = 0; localStorage.clear(); });

function stubFetch(status = 202, payload: unknown = { restaurant_load_batch: { id: 'b1', status: 'uploaded' } }) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    sent.push({ url, method: init.method, body: init.body, headers: (init.headers as Record<string, string>) || {} });
    return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
  }));
}

describe('restaurant load batch requests', () => {
  it('upload sends the CSV as multipart in `file`, with the bearer token and no JSON content type', async () => {
    localStorage.setItem('quoteme_token', 'jwt-1');
    stubFetch();
    const file = new File(['name,city\nFoo,Boston\n'], 'crawl.csv', { type: 'text/csv' });
    const res = await uploadRestaurantLoadBatch(file);

    expect(sent[0].method).toBe('POST');
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/restaurant_load_batches$/);
    expect(sent[0].body).toBeInstanceOf(FormData);
    const sentFile = (sent[0].body as FormData).get('file') as File;
    expect(sentFile).toBeInstanceOf(File);
    expect(sentFile.name).toBe('crawl.csv');
    expect(sent[0].headers['Authorization']).toBe('Bearer jwt-1');
    expect(Object.keys(sent[0].headers).map((k) => k.toLowerCase())).not.toContain('content-type');
    expect(res.data?.restaurant_load_batch.id).toBe('b1');
  });

  it('upload hands back the HTTP status so the page can tell a 413 apart', async () => {
    stubFetch(413, {});
    const res = await uploadRestaurantLoadBatch(new File(['x'], 'big.csv'));
    expect(res.status).toBe(413);
    expect(res.error).toBeTruthy();
  });

  it('list sends page and per_page', async () => {
    stubFetch(200, { restaurant_load_batches: [], page: 2, per_page: 25, total_count: 0, total_pages: 1 });
    await getRestaurantLoadBatches({ page: 2, per_page: 25 });
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/restaurant_load_batches\?page=2&per_page=25$/);
  });

  it('apply sends pair_after_apply only when it is checked', async () => {
    stubFetch();
    await applyRestaurantLoadBatch('b1', { pairAfterApply: false });
    await applyRestaurantLoadBatch('b1');
    await applyRestaurantLoadBatch('b1', { pairAfterApply: true });

    for (const s of sent) {
      expect(s.method).toBe('POST');
      expect(s.url).toMatch(/\/api\/v1\/admin\/restaurant_load_batches\/b1\/apply$/);
    }
    expect(JSON.parse(String(sent[0].body))).toEqual({});
    expect(JSON.parse(String(sent[1].body))).toEqual({});
    expect(JSON.parse(String(sent[2].body))).toEqual({ pair_after_apply: true });
  });

  it('a 409 REFUSED comes back with the server sentence and code', async () => {
    stubFetch(409, { error: 'Batch b0 is applying. One batch writes at a time.', error_code: 'REFUSED' });
    const res = await applyRestaurantLoadBatch('b1');
    expect(res.status).toBe(409);
    expect(res.error_code).toBe('REFUSED');
    expect(res.error).toBe('Batch b0 is applying. One batch writes at a time.');
  });

  it('revert posts to the member route', async () => {
    stubFetch();
    await revertRestaurantLoadBatch('b1');
    expect(sent[0].method).toBe('POST');
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/restaurant_load_batches\/b1\/revert$/);
  });
});
