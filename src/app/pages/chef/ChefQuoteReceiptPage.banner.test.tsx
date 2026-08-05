// ChefQuoteReceiptPage.banner.test.tsx
//
// Moose ruling (2026-08-05): no panel pinned over the chef's quote. The decision
// actions live in normal scroll flow at the bottom of the document, so a chef
// reads every line with nothing covering it and finds the decision at the end.
// And asking a question must never cost the chef screen: the confirmation
// replaces the ask control in place, it does not add height above the buttons.
//
// Acceptance as a sentence about a person: a chef opens the link on his phone,
// reads every line with nothing over it, and finds the decision at the end;
// after asking a question the covered area does not grow.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const { getChefQuote, getGuestQuote, sendChefQuestion } = vi.hoisted(() => {
  const baseQuote: any = {
    id: 'quote-1',
    status: 'sent',
    state: 'distributor_quote',
    restaurant: 'Test Kitchen',
    rep: 'Rep Person',
    created_at: '2026-01-01T00:00:00Z',
    sent_at: '2026-01-01T00:00:00Z',
    contacts: [],
    chef_questions: [],
    lines: [],
  };
  return {
    getChefQuote: vi.fn(async () => ({ data: { ...baseQuote } })),
    getGuestQuote: vi.fn(async () => ({ data: { ...baseQuote } })),
    sendChefQuestion: vi.fn(async () => ({ data: { id: 'q1' } })),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return { ...actual, getChefQuote, getGuestQuote, sendChefQuestion };
});

import { ChefQuoteReceiptPage } from './ChefQuoteReceiptPage';

function renderPage() {
  localStorage.setItem('quoteme_token', 'test-token');
  return render(
    <MemoryRouter initialEntries={['/chef/quotes/quote-1']}>
      <Routes>
        <Route path="/chef/quotes/:id" element={<ChefQuoteReceiptPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ChefQuoteReceiptPage - decision panel in flow (Moose ruling)', () => {
  beforeEach(() => {
    localStorage.clear();
    getChefQuote.mockClear();
    sendChefQuestion.mockClear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('does not pin the decision panel to the viewport (nothing fixed over the quote)', async () => {
    const { container } = renderPage();
    await screen.findByRole('button', { name: /looks good/i });
    // The old defect was a `fixed inset-x-0 bottom-0` footer covering the list.
    expect(container.querySelector('[class*="fixed"]')).toBeNull();
  });

  it('replaces the ask control with the confirmation in place (never added height)', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /i have questions/i }));
    fireEvent.change(screen.getByPlaceholderText(/what would you like to ask/i), {
      target: { value: 'Do you carry branzino?' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    });

    // Confirmation shown, and the "I have questions" control is gone (replaced,
    // not stacked above the buttons).
    expect(await screen.findByTestId('chef-question-sent')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /i have questions/i })).toBeNull();
    // The primary decision is still present and in the same flow.
    expect(screen.getByRole('button', { name: /looks good/i })).toBeTruthy();
  });
});
