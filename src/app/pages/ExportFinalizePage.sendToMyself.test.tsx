// ExportFinalizePage.sendToMyself.test.tsx
//
// Audit follow-up (1a class): the "Send to myself" control (open-quote path) was
// disabled only on !isFinalized/loading, omitting the review gate that every
// send hits on the backend. So an unreviewed quote showed it enabled and the
// click round-tripped to a 422 instead of being disabled with a reason up front.
//
// Correction to the earlier 1c note: this control is NOT silent — a failed send
// already surfaces in the same "Send to Customer" card (sendEmailMutation.error),
// and useAsyncMutation sets that error from a returned {error}. So the fix is the
// missing UP-FRONT gate, matching the sticky control, not an error surface.
//
// Acceptance as a sentence about a person: a rep looking at an unreviewed quote
// sees "Send to myself" disabled with the reason, not enabled-then-rejected.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

const { getQuote, sendQuote, setReviewed } = vi.hoisted(() => {
  let reviewed = false;
  const build = () => ({
    id: 'quote-1',
    status: 'draft',
    quote_status_label: 'Draft',
    state: reviewed ? 'confirmed' : 'draft',
    rep_reviewed_at: reviewed ? '2026-01-01T00:00:00Z' : null,
    restaurant: null,
    rep: 'Rep Person',
    sent_at: null,
    total_cents: 0,
    total: '$0.00',
    created_at: '2026-01-01T00:00:00Z',
    contacts: [],
    lines: [],
  });
  return {
    setReviewed: (v: boolean) => { reviewed = v; },
    getQuote: vi.fn(async () => ({ data: build() })),
    sendQuote: vi.fn(async () => ({ data: build() })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getQuote, sendQuote };
});

import { ExportFinalizePage } from './ExportFinalizePage';

function renderOpenQuote() {
  localStorage.setItem('quoteme_token', 'test-token');
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/export-finalize', state: { quoteId: 'quote-1', isOpenQuote: true } }]}>
      <UserProvider>
        <Routes>
          <Route path="/export-finalize" element={<ExportFinalizePage />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>
  );
}

describe('ExportFinalizePage - "Send to myself" review gate (audit 1a)', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    sendQuote.mockClear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('disables "Send to myself" with a reason when the quote is unreviewed', async () => {
    setReviewed(false);
    renderOpenQuote();
    const btn = await screen.findByRole('button', { name: /send to myself/i });
    expect(btn).toBeDisabled();
    expect(screen.getByTestId('send-to-myself-review-required')).toBeTruthy();
  });

  it('enables "Send to myself" once the quote has cleared review', async () => {
    setReviewed(true);
    renderOpenQuote();
    const btn = await screen.findByRole('button', { name: /send to myself/i });
    expect(btn).not.toBeDisabled();
    expect(screen.queryByTestId('send-to-myself-review-required')).toBeNull();
  });
});
