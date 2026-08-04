// QuoteBuilderPage.errorCopy.test.tsx
//
// Justin audit follow-up (2026-08-04): the save-error banner rendered the raw
// backend string ("Failed to save: {res.error}") on the screen where money
// lives, and the load-failure screen rendered the raw error too. "No backend
// strings ever reach the screen" is a product requirement. Fix the class, not
// the instance: every raw-string surface in this file gets plain guidance that
// says what happened and what to do next, in a rep's voice.
//
// Acceptance as a sentence about a person: "a rep whose save or load fails reads
// what to do next, never the server's words or a code."
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

const BACKEND_STRING = 'PG::UniqueViolation: duplicate key value violates constraint';

const { getQuote, updateQuote, navigateMock } = vi.hoisted(() => ({
  getQuote: vi.fn(),
  updateQuote: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getQuote, updateQuote };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

import { QuoteBuilderPage } from './QuoteBuilderPage';

const okQuote = {
  data: {
    id: 'quote-1',
    sent_at: null,
    status: 'draft',
    state: 'preview',
    distributor: { currency: 'USD' },
    lines: [
      {
        id: 'line-1',
        component: { name: 'tuna', source_dish: 'Test Dish' },
        category: 'Seafood',
        unit_price_cents: 686,
        availability_status: 'available',
        rep_handled: false,
        product: { id: 'p1', item_number: 'SKU-1', brand: 'Acme', product: 'Tuna', pack_size: '10lb' },
        alignment_candidates: [],
      },
    ],
  },
};

function renderPage() {
  localStorage.setItem('quoteme_token', 'test-token');
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/quote-builder', state: { quoteId: 'quote-1' } }]}>
      <UserProvider>
        <Routes>
          <Route path="/quote-builder" element={<QuoteBuilderPage />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>
  );
}

describe('QuoteBuilderPage - no backend strings on screen (audit follow-up)', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockReset();
    updateQuote.mockReset();
    navigateMock.mockReset();
  });
  afterEach(cleanup);

  it('a save failure shows plain guidance, never the backend error string', async () => {
    getQuote.mockResolvedValue(okQuote);
    updateQuote.mockResolvedValue({ error: BACKEND_STRING });

    renderPage();
    const input = await screen.findByRole('spinbutton');
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    await waitFor(() =>
      expect(screen.getByText(/could not save your pricing/i)).toBeTruthy()
    );
    expect(screen.queryByText(new RegExp('PG::', 'i'))).toBeNull();
    expect(screen.queryByText(/failed to save:/i)).toBeNull();
  });

  it('a load failure shows plain guidance, never the backend error string', async () => {
    getQuote.mockResolvedValue({ error: BACKEND_STRING });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/could not load this quote/i)).toBeTruthy()
    );
    expect(screen.queryByText(new RegExp('PG::', 'i'))).toBeNull();
  });
});
