// ExportFinalizePage.render.test.tsx
//
// Real-render coverage for BUG #31 (status badge staying stale after a
// successful send) and BUG #33 (duplicate "Send Quote" / "Email Quote to
// Chef" buttons that both opened the same email drawer). Drives the actual
// component through @testing-library/react instead of a reimplemented copy
// of its logic (see ExportFinalizePage.test.ts for the pure-function tests,
// and QuoteReviewBar.render.test.tsx for the pattern this follows).
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { getQuote, sendQuote, baseQuote, setBackendSent } = vi.hoisted(() => {
  const baseQuote: any = {
    id: 'quote-1',
    status: 'draft',
    quote_status_label: 'Draft',
    state: 'confirmed',
    rep_reviewed_at: '2026-01-01T00:00:00Z',
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

  // Mirrors a real backend: sendQuote flips the quote's persisted status, so
  // the NEXT getQuote (the resync fetch, BUG #31) reflects it. A getQuote
  // mock that always returned the same object regardless of send would mask
  // exactly the bug this test exists to catch.
  let backendSent = false;

  return {
    baseQuote,
    setBackendSent: (v: boolean) => {
      backendSent = v;
    },
    getQuote: vi.fn(async () => ({
      data: backendSent
        ? { ...baseQuote, status: 'sent', quote_status_label: 'Sent' }
        : { ...baseQuote },
    })),
    sendQuote: vi.fn(async () => {
      backendSent = true;
      return { data: { ...baseQuote, status: 'sent', quote_status_label: 'Sent' } };
    }),
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

import { ExportFinalizePage } from './ExportFinalizePage';

function renderPage() {
  localStorage.setItem('quoteme_token', 'test-token');
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/export-finalize', state: { quoteId: 'quote-1' } }]}>
      <UserProvider>
        <Routes>
          <Route path="/export-finalize" element={<ExportFinalizePage />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  );
}

describe('ExportFinalizePage - real render', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    sendQuote.mockClear();
    setBackendSent(false);
  });

  afterEach(() => {
    cleanup();
  });

  describe('BUG #33 - one-button consolidation', () => {
    it('renders exactly one "Email Quote to Chef" button (no duplicate "Send Quote" CTA)', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Status: Draft/)).toBeInTheDocument();
      });

      const emailButtons = screen.getAllByRole('button', { name: 'Email Quote to Chef' });
      expect(emailButtons).toHaveLength(1);

      // The old duplicate label must be gone entirely, not just renamed once.
      expect(screen.queryByRole('button', { name: 'Send Quote' })).not.toBeInTheDocument();
    });
  });

  describe('BUG #31 - status badge resyncs after a successful send', () => {
    it('shows the stale "Draft" status before sending and "Sent" after a successful send', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Status: Draft/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Email Quote to Chef' }));

      const drawerSendButton = await screen.findByRole('button', { name: /Send Email/i });
      fireEvent.click(drawerSendButton);

      // Post-success: quoteData was resynced (BUG #31) and the drawer closed
      // (BUG #32/#33), together, from the hook's single onSuccess callback.
      await waitFor(() => {
        expect(screen.getByText(/Status: Sent/)).toBeInTheDocument();
      });

      expect(sendQuote).toHaveBeenCalledTimes(1);
      // Initial load + the post-send resync fetch.
      expect(getQuote).toHaveBeenCalledTimes(2);
    });
  });

  describe('BUG #32 - email drawer closes on successful send', () => {
    it('closes the "Email Quote to Chef" drawer once the send succeeds', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Status: Draft/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Email Quote to Chef' }));

      // Drawer content is portalled; find it and confirm it's open before send.
      const drawerDescription = await screen.findByText('Send the quote PDF via email');
      const drawerContent = drawerDescription.closest('[data-slot="drawer-content"]') as HTMLElement;
      expect(drawerContent).not.toBeNull();
      expect(drawerContent).toHaveAttribute('data-state', 'open');

      fireEvent.click(screen.getByRole('button', { name: /Send Email/i }));

      // Radix/vaul leaves the drawer content mounted in jsdom (no real CSS
      // animation events fire to trigger unmount), so assert on the
      // underlying open/closed state rather than DOM removal.
      await waitFor(() => {
        expect(drawerContent).toHaveAttribute('data-state', 'closed');
      });
    });
  });
});
