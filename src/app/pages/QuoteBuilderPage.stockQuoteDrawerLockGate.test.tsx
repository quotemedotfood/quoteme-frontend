// QuoteBuilderPage.stockQuoteDrawerLockGate.test.tsx
//
// L5 round 5. Structurally identical to the QuoteReviewPage send-drawer
// exposure. The Stock Quote drawer's presence is keyed on stockQuoteDrawerOpen,
// NOT on quoteLocked, and the dismiss-on-flip effect covered only the Add
// Product drawer. Its Save Template button was
// `disabled={!stockQuoteName.trim() || savingStockQuote}` with no quoteLocked
// term, so once the drawer was open and the quote locked underneath it, the
// onClick belt was the SOLE protection against createStockQuote.
//
// The opener ("Save as Stock Quote") is correctly gated, which is exactly why
// this was reachable only mid-session: open while writable, lock afterwards.
// This test drives that asymmetry through the page's own refetch path.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

const { getQuote, createStockQuote, navigateMock, setQuoteLockedOnNextLoad } = vi.hoisted(() => {
  let lockedOnNextLoad = false;
  const line = {
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
      product: 'Squid Ink Pasta',
      pack_size: '10lb',
    },
    alignment_candidates: [],
  };
  return {
    setQuoteLockedOnNextLoad: (v: boolean) => { lockedOnNextLoad = v; },
    getQuote: vi.fn(async () => ({
      data: {
        id: 'quote-1',
        distributor: { currency: 'USD' },
        status: lockedOnNextLoad ? 'sent' : 'draft',
        state: 'preview',
        sent_at: lockedOnNextLoad ? '2026-08-13T00:00:00Z' : null,
        lines: [line],
      },
    })),
    createStockQuote: vi.fn(async () => ({ data: { id: 'sq-1' } })),
    navigateMock: vi.fn(),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getQuote, createStockQuote };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

// The page's only refetch trigger besides mount, stubbed to a bare button so the
// test can drive "the quote was refetched and came back Sent".
vi.mock('../components/QuoteReviewBar', () => ({
  QuoteReviewBar: ({ onMatchesUpdated }: { onMatchesUpdated: () => void }) => (
    <button onClick={onMatchesUpdated}>Simulate External Update</button>
  ),
}));

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
    </MemoryRouter>,
  );
}

async function openStockQuoteDrawer() {
  await screen.findByRole('spinbutton');
  fireEvent.click(screen.getByRole('button', { name: /save as stock quote/i }));
  const nameInput = await screen.findByPlaceholderText(/italian fine dining/i);
  fireEvent.change(nameInput, { target: { value: 'My Template' } });
  return screen.getByRole('button', { name: /save template/i });
}

describe('QuoteBuilderPage - the open Stock Quote drawer is gated when the quote locks mid-session', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    createStockQuote.mockClear();
    navigateMock.mockClear();
    setQuoteLockedOnNextLoad(false);
  });
  afterEach(cleanup);

  it('positive control: on a draft quote Save Template does create the stock quote', async () => {
    renderPage();
    const save = await openStockQuoteDrawer();

    expect(save).not.toBeDisabled();
    fireEvent.click(save);

    await waitFor(() => {
      expect(createStockQuote).toHaveBeenCalledTimes(1);
    });
  });

  it('never calls createStockQuote once the quote locks while the drawer is open', async () => {
    renderPage();
    const save = await openStockQuoteDrawer();
    // Writable at the moment the drawer opened: the state the exposure needed.
    expect(save).not.toBeDisabled();

    // The quote goes out from under the still-open drawer.
    setQuoteLockedOnNextLoad(true);
    fireEvent.click(screen.getByText('Simulate External Update'));
    await waitFor(() => {
      expect(getQuote).toHaveBeenCalledTimes(2);
    });

    // The drawer is deliberately left mounted (it has no read-only rendering,
    // so the Save control's disabled term is its render gate), and the control
    // is now gated and named.
    const gated = screen.getByRole('button', { name: /save template/i });
    await waitFor(() => {
      expect(gated).toBeDisabled();
    });
    expect(gated).toHaveAttribute('title', 'Sent (read-only)');

    fireEvent.click(gated);
    await new Promise(r => setTimeout(r, 0));

    expect(createStockQuote).not.toHaveBeenCalled();
  });
});
