// Ticket #7: authenticated "Add Product" on the Quote Builder page was a
// stub (`{ data: null, error: 'Not implemented for authenticated users' }`)
// even though the backend already exposes POST /api/v1/quotes/:id/add_line
// (Api::V1::QuotesController#add_line). addQuoteLine is the authed
// counterpart to addGuestQuoteLine — verify it hits the authed path with
// the Bearer token and the { product_id } body, mirroring the guest call.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  fetchSpy.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ id: 'line-1', product: { id: 'prod-1', product: 'Diced Onion', brand: 'Acme', item_number: 'SKU-1', pack_size: '10lb' }, unit_price_cents: 1299, category: 'produce' }),
    headers: { get: () => 'application/json' },
  });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'quoteme_token' ? 'test-jwt-token' : null),
    setItem: () => undefined,
    removeItem: () => undefined,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('addQuoteLine — authenticated add_line wiring (ticket #7)', () => {
  it('POSTs to /api/v1/quotes/:id/add_line', async () => {
    const { addQuoteLine } = await import('./api');
    await addQuoteLine('quote-123', 'prod-1');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
    expect(calledUrl).toContain('/api/v1/quotes/quote-123/add_line');
    expect(calledOptions.method).toBe('POST');
  });

  it('sends product_id in the request body', async () => {
    const { addQuoteLine } = await import('./api');
    await addQuoteLine('quote-123', 'prod-1');

    const [, calledOptions] = fetchSpy.mock.calls[0];
    expect(JSON.parse(calledOptions.body)).toEqual({ product_id: 'prod-1' });
  });

  it('attaches the Bearer auth token (authed path, not guest)', async () => {
    const { addQuoteLine } = await import('./api');
    await addQuoteLine('quote-123', 'prod-1');

    const [, calledOptions] = fetchSpy.mock.calls[0];
    expect(calledOptions.headers['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('does not hit the guest add_line path', async () => {
    const { addQuoteLine } = await import('./api');
    await addQuoteLine('quote-123', 'prod-1');

    const [calledUrl] = fetchSpy.mock.calls[0];
    expect(calledUrl).not.toContain('/guest/');
  });

  it('resolves with the created line as data', async () => {
    const { addQuoteLine } = await import('./api');
    const res = await addQuoteLine('quote-123', 'prod-1');

    expect(res.error).toBeUndefined();
    expect(res.data).toMatchObject({ id: 'line-1', product: { id: 'prod-1' } });
  });
});
