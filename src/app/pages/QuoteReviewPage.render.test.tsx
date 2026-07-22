// QuoteReviewPage.render.test.tsx
//
// Real-render coverage for BUG #32: after a successful send, the send
// drawer never closed because the success path only set sendSuccess and
// never called setSendDrawerOpen(false). Fixed by routing the send through
// useAsyncMutation, whose single onSuccess callback now does both together
// (mirrors the same fix already correct in ExportFinalizePage - see
// ExportFinalizePage.render.test.tsx).
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { getQuote, sendQuote } = vi.hoisted(() => {
  const baseQuote: any = {
    id: 'quote-1',
    status: 'draft',
    working_label: 'Quote for Test Kitchen',
    restaurant: 'Test Kitchen',
    rep: 'Rep Person',
    rep_reviewed: true,
    sent_at: null,
    pdf_url: null,
    total_cents: 0,
    total: '$0.00',
    created_at: '2026-01-01T00:00:00Z',
    contacts: [
      { id: 'contact-1', first_name: 'Chef', last_name: 'Jones', role: 'Chef', email: 'chef@example.com', phone: '555-1234', is_primary: true },
    ],
    lines: [],
  };

  return {
    getQuote: vi.fn(async () => ({ data: { ...baseQuote } })),
    sendQuote: vi.fn(async () => ({ data: { ...baseQuote } })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getQuote,
    sendQuote,
  };
});

import { QuoteReviewPage } from './QuoteReviewPage';

function renderPage() {
  localStorage.setItem('quoteme_token', 'test-token');
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/quote-review', state: { quoteId: 'quote-1' } }]}>
      <UserProvider>
        <Routes>
          <Route path="/quote-review" element={<QuoteReviewPage />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  );
}

describe('QuoteReviewPage - real render', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    sendQuote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('BUG #32 - send drawer closes on successful send', () => {
    it('closes the send drawer once the email send succeeds', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Send Quote/i }));

      // Drawer is open: the recipient email field is pre-filled from the
      // primary contact (only rendered while the drawer is mounted/open;
      // this drawer is a plain conditional render, `{sendDrawerOpen && (...)}`
      // in the component, not a portal, so DOM presence tracks open state
      // directly).
      const emailInput = await screen.findByPlaceholderText('chef@restaurant.com');
      expect(emailInput).toHaveValue('chef@example.com');

      fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));

      // Before the fix: success only set sendSuccess and never called
      // setSendDrawerOpen(false), so the drawer (and this input) stayed
      // mounted forever after a successful send. The fix's onSuccess sets
      // the success message AND closes the drawer in the same callback, so
      // both land in the same commit - the drawer's own success banner is
      // therefore not the observable signal here (it unmounts with the
      // drawer); the drawer actually closing is.
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('chef@restaurant.com')).not.toBeInTheDocument();
      });

      expect(sendQuote).toHaveBeenCalledTimes(1);
    });

    it('does not close the drawer when the send fails', async () => {
      sendQuote.mockResolvedValueOnce({ error: 'Recipient email bounced.' });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Send Quote/i }));
      await screen.findByPlaceholderText('chef@restaurant.com');

      fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));

      await waitFor(() => {
        expect(screen.getByText('Recipient email bounced.')).toBeInTheDocument();
      });

      // Drawer must stay open so the rep can see the error and retry.
      expect(screen.getByPlaceholderText('chef@restaurant.com')).toBeInTheDocument();
    });
  });
});
