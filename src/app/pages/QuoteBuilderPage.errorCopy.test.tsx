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
const REMOVE_BACKEND_STRING =
  'PG::ForeignKeyViolation: update or delete on table "quote_lines" violates foreign key constraint';

const { getQuote, updateQuote, removeQuoteLine, navigateMock } = vi.hoisted(() => ({
  getQuote: vi.fn(),
  updateQuote: vi.fn(),
  removeQuoteLine: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getQuote, updateQuote, removeQuoteLine };
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
    removeQuoteLine.mockReset();
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

// Delete-persistence regression (2026-08-14).
//
// handleRemoveItem removed the row from local state and, on the authenticated
// path, made no request at all: the body was guarded by `if (isGuest)` with a
// stale "TODO: add authenticated remove endpoint when needed" beside it. The
// endpoint had existed since 2026-03-13. Every export and send path renders
// server-side from the database, so a line the rep believed they deleted still
// shipped in the PDF, the CSV, the xlsx order guide and the chef's emailed
// attachment.
//
// Acceptance as a sentence about a person: "a rep who deletes a line either
// sees it gone for good, or is told plainly that it is still on the quote."
describe('QuoteBuilderPage - removing a line persists, and says so when it does not', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockReset();
    updateQuote.mockReset();
    removeQuoteLine.mockReset();
    navigateMock.mockReset();
  });
  afterEach(cleanup);

  async function enterEditModeAndRemove() {
    renderPage();
    await screen.findAllByText('SKU-1');
    fireEvent.click(screen.getByRole('button', { name: /edit price/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /^remove$/i })[0]);
  }

  it('a failed remove puts the row back and says the item is still on the quote', async () => {
    getQuote.mockResolvedValue(okQuote);
    removeQuoteLine.mockResolvedValue({ error: REMOVE_BACKEND_STRING });

    await enterEditModeAndRemove();

    // The authenticated path has to actually call the endpoint.
    await waitFor(() => expect(removeQuoteLine).toHaveBeenCalledWith('quote-1', 'line-1'));

    // The guidance renders...
    await waitFor(() =>
      expect(screen.getByText(/could not remove that item/i)).toBeTruthy()
    );
    // ...and it says the thing this bug exists to communicate.
    expect(screen.getByText(/still on the quote/i)).toBeTruthy();

    // The revert actually happened: the row is back on screen. A copy-only
    // assertion would pass against the broken version of this page.
    expect(screen.getAllByText('SKU-1').length).toBeGreaterThan(0);

    // No backend string, no status code, no error code reaches the DOM.
    expect(screen.queryByText(new RegExp('PG::', 'i'))).toBeNull();
    expect(screen.queryByText(/ForeignKeyViolation/i)).toBeNull();
  });

  it('a 204 no-content success removes the row and shows no error banner', async () => {
    getQuote.mockResolvedValue(okQuote);
    // What removeQuoteLine resolves to for `head :no_content`: no data, no
    // error. The trap this guards is the shared fetch helper's unconditional
    // response.json(), which turns an empty 204 body into a SyntaxError and
    // then into { error: 'Unexpected end of JSON input' }, i.e. a false error
    // banner on every successful delete.
    removeQuoteLine.mockResolvedValue({ data: null, status: 204 });

    await enterEditModeAndRemove();

    await waitFor(() => expect(removeQuoteLine).toHaveBeenCalledWith('quote-1', 'line-1'));
    await waitFor(() => expect(screen.queryAllByText('SKU-1').length).toBe(0));
    expect(screen.queryByText(/could not remove that item/i)).toBeNull();
    expect(screen.queryByText(/unexpected end of json input/i)).toBeNull();
  });
});
