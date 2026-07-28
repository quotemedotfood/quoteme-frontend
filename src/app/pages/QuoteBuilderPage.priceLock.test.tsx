// QuoteBuilderPage.priceLock.test.tsx
//
// P1 fix: on a SENT/locked quote, the price input fields were still
// rendered as editable while the BE rejects the PATCH with a 422. The
// constitutional fix is to LOCK the affordance (disable it) rather than
// let the edit round-trip and surface the error. This asserts:
//   - a sent/locked quote renders the price-edit toggle disabled ("Pricing
//     locked") and never exposes an editable price <input>, even after a
//     click attempt.
//   - a draft/unsent quote keeps the price-edit affordance fully enabled
//     and clicking it does expose editable price <input> fields.
//
// Follows the render-through-the-real-component pattern used by
// QuoteBuilderPage.unresolvedBadge.test.tsx.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { getQuote, updateQuote, setQuoteOverrides, navigateMock } = vi.hoisted(() => {
  let overrides: Record<string, any> = {};
  return {
    setQuoteOverrides: (o: Record<string, any>) => {
      overrides = o;
    },
    getQuote: vi.fn(async () => ({
      data: {
        id: 'quote-1',
        distributor: { currency: 'USD' },
        lines: [
          {
            id: 'line-1',
            component: { name: 'onion', source_dish: 'Test Dish' },
            category: 'Produce',
            unit_price_cents: 500,
            availability_status: 'available',
            rep_handled: false,
            product: {
              id: 'product-1',
              item_number: 'SKU-1',
              brand: 'Acme',
              product: 'Diced Onion',
              pack_size: '10lb',
            },
            alignment_candidates: [],
          },
        ],
        ...overrides,
      },
    })),
    updateQuote: vi.fn(async () => ({ data: {} })),
    navigateMock: vi.fn(),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getQuote,
    updateQuote,
  };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
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
    </MemoryRouter>,
  );
}

describe('QuoteBuilderPage - price inputs locked on sent quotes (P1)', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    updateQuote.mockClear();
    navigateMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('disables the price-edit affordance and never renders an editable price input for a sent quote', async () => {
    setQuoteOverrides({ sent_at: '2026-07-20T00:00:00Z', status: 'sent', state: 'confirmed' });

    renderPage();

    const toggle = await screen.findByRole('button', { name: /pricing locked/i });
    expect(toggle).toBeDisabled();

    // Attempting the click must be a no-op: no price <input> should appear.
    fireEvent.click(toggle);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // The bulk "Adjust Pricing" controls are replaced by the locked message,
    // not left live.
    expect(screen.getByText(/pricing is locked once a quote is sent/i)).toBeInTheDocument();
    expect(screen.queryByText(/% Adjustment/i)).not.toBeInTheDocument();

    // Guard: even if a save were attempted, no PATCH should ever be issued.
    expect(updateQuote).not.toHaveBeenCalled();
  });

  it('keeps the price-edit affordance fully editable for a draft/unsent quote', async () => {
    setQuoteOverrides({ sent_at: null, status: 'draft', state: 'preview' });

    renderPage();

    const toggle = await screen.findByRole('button', { name: /edit price/i });
    expect(toggle).not.toBeDisabled();

    fireEvent.click(toggle);

    // Entering edit mode must expose an editable price input.
    const priceInputs = await screen.findAllByRole('textbox');
    expect(priceInputs.length).toBeGreaterThan(0);
  });
});
