// BUG #24 (P0 send-blocker): the rep Send button must POST to the working
// /api/v1/quotes/:id/send_quote endpoint, never a bare /send path. The old
// rep-only repSendQuote() helper targeted POST /api/v1/rep/quotes/:id/send,
// which backed the now-deleted post-confirm affordance on RepIncomingQuotePage
// (removed in the "P0: delete old /rep/quotes/:id triage view" commit). That
// left repSendQuote with zero callers but still exported and still pointed at
// the stale endpoint - a trap for a future caller to wire up by mistake and
// silently reintroduce the send-blocker. This is a contract test pinning the
// endpoint path used by the live Send button (ExportFinalizePage /
// QuoteReviewPage handleSendEmail -> sendQuote) and asserting the dead
// rep-only helper stays deleted.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  fetchSpy.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ id: 'quote-123', status: 'sent' }),
    headers: { get: () => null },
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

describe('sendQuote (BUG #24) - the rep/chef Send button hits the working endpoint', () => {
  it('POSTs to /api/v1/quotes/:id/send_quote', async () => {
    const { sendQuote } = await import('./api');
    await sendQuote('quote-123');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
    expect(calledUrl).toContain('/api/v1/quotes/quote-123/send_quote');
    expect(calledOptions.method).toBe('POST');
  });

  it('does NOT hit a bare /send path (the BUG #24 defect shape)', async () => {
    const { sendQuote } = await import('./api');
    await sendQuote('quote-123');

    const [calledUrl] = fetchSpy.mock.calls[0];
    // A bare "/send" suffix (not "/send_quote") is exactly the broken shape;
    // guard with a trailing-boundary check so "/send_quote" doesn't false-match.
    expect(calledUrl).not.toMatch(/\/send($|[/?])/);
    expect(calledUrl).not.toContain('/rep/quotes/');
  });

  it('forwards recipientEmail and note in the POST body', async () => {
    const { sendQuote } = await import('./api');
    await sendQuote('quote-123', 'chef@place.com', 'thanks!');

    const [, calledOptions] = fetchSpy.mock.calls[0];
    expect(JSON.parse(calledOptions.body)).toEqual({
      recipient_email: 'chef@place.com',
      note: 'thanks!',
    });
  });

  it('attaches the Bearer auth token', async () => {
    const { sendQuote } = await import('./api');
    await sendQuote('quote-123');

    const [, calledOptions] = fetchSpy.mock.calls[0];
    expect(calledOptions.headers['Authorization']).toBe('Bearer test-jwt-token');
  });
});

describe('repSendQuote (BUG #24) - the dead /rep/quotes/:id/send helper stays removed', () => {
  it('is not exported from api.ts', async () => {
    const api: Record<string, unknown> = await import('./api');
    expect(api.repSendQuote).toBeUndefined();
  });
});
