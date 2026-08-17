// Delete-persistence regression (2026-08-14): QuoteBuilderPage's
// handleRemoveItem made no request at all on the authenticated path, so a
// line the rep deleted stayed in the database and kept shipping in the PDF,
// the CSV, the order guide and the chef's emailed attachment.
// removeQuoteLine is the authed counterpart to removeGuestQuoteLine, hitting
// DELETE /api/v1/quotes/:id/lines/:line_id (Api::V1::QuotesController
// #remove_line), which has existed since 2026-03-13.
//
// The load-bearing case here is the SECOND one. That endpoint answers with
// `head :no_content`, and the shared fetch helpers call response.json()
// unconditionally once response.ok is true. An empty body makes that throw a
// SyntaxError, which the helper turns into
// { error: 'Unexpected end of JSON input' }, so a naive wiring would report
// every successful delete as a failure. removeQuoteLine deliberately does not
// route through fetchWithAuth for exactly this reason; this test is what
// proves the guard, since a mock at the page level cannot see it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchSpy = vi.fn();

// A faithful stand-in for a real 204 Response: reading the empty body as
// JSON rejects with a SyntaxError, exactly as the browser does.
function noContentResponse() {
  return {
    ok: true,
    status: 204,
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
    text: async () => '',
    headers: { get: () => null },
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  fetchSpy.mockResolvedValue(noContentResponse());
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

describe('removeQuoteLine, authenticated remove_line wiring', () => {
  it('DELETEs to /api/v1/quotes/:id/lines/:line_id', async () => {
    const { removeQuoteLine } = await import('./api');
    await removeQuoteLine('quote-123', 'line-9');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
    expect(calledUrl).toContain('/api/v1/quotes/quote-123/lines/line-9');
    expect(calledOptions.method).toBe('DELETE');
  });

  it('attaches the Bearer auth token and does not hit the guest path', async () => {
    const { removeQuoteLine } = await import('./api');
    await removeQuoteLine('quote-123', 'line-9');

    const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
    expect(calledOptions.headers['Authorization']).toBe('Bearer test-jwt-token');
    expect(calledUrl).not.toContain('/guest/');
  });

  it('treats a 204 empty body as success, not as a JSON parse failure', async () => {
    const { removeQuoteLine } = await import('./api');
    const res = await removeQuoteLine('quote-123', 'line-9');

    expect(res.error).toBeUndefined();
    expect(res.status).toBe(204);
    // The exact regression this guards. Without the guard the helper's
    // unconditional response.json() surfaces this string as an error and the
    // rep sees a false failure banner on a delete that actually worked.
    expect(JSON.stringify(res)).not.toContain('Unexpected end of JSON input');
  });

  it('surfaces a real failure as an error with its status', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Cannot modify a sent quote' }),
      headers: { get: () => null },
    });

    const { removeQuoteLine } = await import('./api');
    const res = await removeQuoteLine('quote-123', 'line-9');

    expect(res.status).toBe(422);
    expect(res.error).toBe('Cannot modify a sent quote');
    expect(res.data).toBeUndefined();
  });

  it('does not retry a failed DELETE (non-idempotent verb)', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    const { removeQuoteLine } = await import('./api');
    const res = await removeQuoteLine('quote-123', 'line-9');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res.error).toBeTruthy();
    expect(res.data).toBeUndefined();
  });
});
