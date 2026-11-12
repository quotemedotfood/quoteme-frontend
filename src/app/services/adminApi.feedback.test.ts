// FEEDBACK: the requests the QM admin Feedback page and badge send.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAdminFeedbackMemos, getAdminFeedbackAttentionCount, reviewAdminFeedbackMemo, deleteAdminFeedbackAudio } from './adminApi';

const sent: Array<{ url: string; method?: string }> = [];
afterEach(() => { vi.unstubAllGlobals(); sent.length = 0; });

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    sent.push({ url, method: init.method });
    return new Response(JSON.stringify({ attention_count: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }));
}

describe('feedback requests', () => {
  it('lists, pages, counts, reviews and deletes audio at the right paths', async () => {
    stubFetch();
    await getAdminFeedbackMemos();
    await getAdminFeedbackMemos(2);
    await getAdminFeedbackAttentionCount();
    await reviewAdminFeedbackMemo('m1');
    await deleteAdminFeedbackAudio('m1');
    expect(sent[0].url).toMatch(/\/api\/v1\/admin\/feedback_memos$/);
    expect(sent[1].url).toMatch(/\/api\/v1\/admin\/feedback_memos\?page=2$/);
    expect(sent[2].url).toMatch(/\/api\/v1\/admin\/feedback_memos\/attention_count$/);
    expect(sent[3]).toMatchObject({ method: 'PATCH' });
    expect(sent[3].url).toMatch(/\/api\/v1\/admin\/feedback_memos\/m1\/review$/);
    expect(sent[4]).toMatchObject({ method: 'DELETE' });
    expect(sent[4].url).toMatch(/\/api\/v1\/admin\/feedback_memos\/m1\/audio$/);
  });
});
