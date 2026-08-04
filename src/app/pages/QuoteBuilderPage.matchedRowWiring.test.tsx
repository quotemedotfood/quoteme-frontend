// QuoteBuilderPage.matchedRowWiring.test.tsx
//
// Justin audit item 2 (2026-08-04): the 25 matched rows advertise themselves as
// clickable (hover:bg-gray-50 cursor-pointer) but their onClick only set a
// cosmetic highlight -- no dialog, nothing. A row that looks alive and is dead
// is a lie about the product, and 10 of 25 matches are confidently wrong
// (fried calamari came back squid ink pasta). Ch. V: the system prepares, the
// rep decides. The rep must be able to decide on the matched rows too.
//
// The Select Match modal already exists and already persists on Replace; this is
// wiring, not building. Clicking a matched row must open that same modal, seeded
// with the component name (title) and the current product (Current Match).
//
// Acceptance as a sentence about a person: "a rep who sees a wrong match on a
// matched row can open the same picker they use on the rows the system flagged."
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

const { getQuote, updateQuote, navigateMock } = vi.hoisted(() => ({
  getQuote: vi.fn(async () => ({
    data: {
      id: 'quote-1',
      sent_at: null,
      status: 'draft',
      state: 'preview',
      distributor: { currency: 'USD' },
      lines: [
        {
          id: 'line-1',
          component: { name: 'fried calamari', source_dish: 'Test Dish' },
          category: 'Seafood',
          unit_price_cents: 5062,
          availability_status: 'available',
          rep_handled: false,
          product: {
            id: 'product-1',
            item_number: 'SQ-INK-1',
            brand: 'Acme',
            product: 'Squid Ink Pasta', // the confidently-wrong current match
            pack_size: '10lb',
          },
          alignment_candidates: [
            {
              id: 'cand-1',
              position: 1,
              tier: 'A',
              score: 0.42,
              product: {
                id: 'product-1',
                item_number: 'SQ-INK-1',
                brand: 'Acme',
                product: 'Squid Ink Pasta',
                pack_size: '10lb',
                category: 'Seafood',
              },
            },
          ],
        },
      ],
    },
  })),
  updateQuote: vi.fn(async () => ({ data: {} })),
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

describe('QuoteBuilderPage - matched row opens Select Match modal (audit item 2)', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    updateQuote.mockClear();
    navigateMock.mockClear();
  });
  afterEach(cleanup);

  it('opens the Select Match modal seeded with the component and current product when a matched row is clicked', async () => {
    renderPage();

    // Quote loaded.
    await screen.findByRole('spinbutton');
    // Modal is closed before any interaction.
    expect(screen.queryByText(/select match for/i)).toBeNull();

    // Click the matched row (the SKU cell is a plain cell that bubbles to the
    // row handler; it appears in both the table row and the mobile card).
    fireEvent.click(screen.getAllByText('SQ-INK-1')[0]);

    // The same modal Needs Your Call opens, titled with the component name...
    expect(await screen.findByText(/select match for fried calamari/i)).toBeTruthy();
    // ...and seeded with the current product (Current Match section).
    expect(screen.getByText(/current match/i)).toBeTruthy();
  });
});
