// @vitest-environment jsdom
//
// ExportFinalizePage.render.test.tsx — FE-TESTING epic slice 3 (3e).
//
// Real render smoke tests for the final step of the quoting flow. Mounts the
// REAL component inside a real MemoryRouter, mocking only the
// `../services/api` network calls it fires.
//
// Test 2 (feedback drawer refire) was written FIRST against the unpatched
// component and confirmed RED: today `setShowSuccessDrawer(true)` is called
// unconditionally at all four success sites (CSV download, PDF download,
// sendQuote, sendQuoteSms — see ExportFinalizePage.tsx), so the drawer WOULD
// reopen on every successful export in a session. A minimal
// "once per page session" gate (`feedbackShownOnce` + `triggerSuccessFeedback`)
// was then added to ExportFinalizePage.tsx to make it GREEN.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ExportFinalizePage } from './ExportFinalizePage';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  getQuote: vi.fn(),
  getGuestQuote: vi.fn(),
  downloadQuotePdf: vi.fn(),
  downloadOrderGuide: vi.fn().mockResolvedValue({ blob: undefined, error: undefined }),
  sendQuote: vi.fn().mockResolvedValue({ data: {} }),
  sendQuoteSms: vi.fn().mockResolvedValue({ data: {} }),
}));

const SYNTHETIC_QUOTE = {
  id: 'quote-1',
  status: 'confirmed',
  working_label: 'Test Quote',
  restaurant: null,
  rep: 'rep-1',
  rep_reviewed: false,
  rep_reviewed_at: null,
  state: 'confirmed', // bypasses the B-168 review gate regardless of rep_reviewed_at
  sent_at: null,
  pdf_url: null,
  total_cents: 0,
  total: '$0.00',
  created_at: new Date().toISOString(),
  contacts: [],
  lines: [
    {
      id: 'line-1',
      position: 1,
      category: 'Produce',
      quantity: 1,
      unit_price_cents: 500,
      unit_price: '5.00',
      alignment_selected: 1,
      availability_status: 'available' as const,
      chef_note: null,
      component: { id: 'comp-1', name: 'Tomato', source_dish: 'Dish' },
      product: {
        id: 'prod-1',
        item_number: '1',
        brand: 'Brand',
        product: 'Roma Tomato',
        pack_size: '1 case',
        category: 'Produce',
      },
    },
  ],
};

// jsdom applies vaul/Tailwind's real "animate-out" CSS classes (this repo's
// tailwindcss vite plugin runs even under the vitest transform), but jsdom
// never actually runs CSS animations, so Radix Presence never receives the
// real `animationend` event it needs to finish unmounting a closed
// Drawer/Dialog. Firing it manually is the standard workaround for this
// jsdom+Radix-Presence combination — not a product behavior; a real browser
// fires this event natively as soon as the CSS animation completes.
function flushClosedRadixAnimations() {
  document.querySelectorAll('[data-state="closed"]').forEach((el) => {
    const animationName = getComputedStyle(el).animationName || 'none';
    const evt = new Event('animationend', { bubbles: true }) as unknown as AnimationEvent;
    Object.defineProperty(evt, 'animationName', { value: animationName });
    el.dispatchEvent(evt);
  });
}

function renderPage(stateOverrides: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/export-finalize', state: { quoteId: 'quote-1', isOpenQuote: true, ...stateOverrides } },
      ]}
    >
      <ExportFinalizePage />
    </MemoryRouter>,
  );
}

describe('ExportFinalizePage — real render smoke tests (quoting flow)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('quoteme_token', 'fake-token'); // authenticated -> isFinalized true
    vi.clearAllMocks();
    vi.mocked(api.getQuote).mockResolvedValue({ data: SYNTHETIC_QUOTE } as any);
    vi.mocked(api.downloadQuotePdf).mockResolvedValue({ blob: new Blob(['pdf-bytes'], { type: 'application/pdf' }) });
  });

  it('Send Quote is disabled with no recipient email and enables once one is entered (B-114 recipient-required gate)', async () => {
    renderPage();

    // Real "Send Quote" sticky-footer button, gated by
    // isOpenQuoteSendDisabled(effectiveOpenQuote, manualEmail, contactEmail).
    const sendButton = await screen.findByRole('button', { name: 'Send Quote' });
    expect(sendButton).toBeDisabled();

    const emailInput = screen.getByPlaceholderText('customer@example.com');
    fireEvent.change(emailInput, { target: { value: 'chef@place.com' } });

    expect(sendButton).toBeEnabled();
  });

  it('shows the feedback drawer once after a successful export, but does not refire on a second export in the same session', async () => {
    renderPage();

    const pdfButton = await screen.findByRole('button', { name: /PDF Quote/i });
    fireEvent.click(pdfButton);

    // First success -> feedback drawer opens.
    expect(await screen.findByText(/We'd love your feedback!/i)).toBeInTheDocument();

    // Dismiss it via the real "Submit Feedback" button (component's own
    // setShowSuccessDrawer(false) call), so this exercises a genuinely
    // closed drawer.
    fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));
    flushClosedRadixAnimations();

    await waitFor(() => {
      expect(screen.queryByText(/We'd love your feedback!/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Second success (CSV export) in the same page session — needs quoteData
    // loaded (CSV button is disabled until `!quoteData` clears).
    const csvButton = screen.getByRole('button', { name: /CSV Export/i });
    await waitFor(() => expect(csvButton).toBeEnabled());
    fireEvent.click(csvButton);

    // The gap this test caught: with no dedupe, this second success would
    // reopen the drawer. It must NOT.
    await waitFor(() => {
      expect(screen.queryByText(/We'd love your feedback!/i)).not.toBeInTheDocument();
    });
  });
});
