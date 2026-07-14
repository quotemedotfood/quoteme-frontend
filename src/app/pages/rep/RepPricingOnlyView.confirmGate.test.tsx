// @vitest-environment jsdom
//
// RepPricingOnlyView.confirmGate.test.tsx — FE-TESTING epic slice 3 (3d).
//
// Naming correction: the task brief that generated this test named
// "QuoteReviewBar" as the target for the "Confirm & send back" 0-priced gate.
// QuoteReviewBar (src/app/components/QuoteReviewBar.tsx) has no such button —
// it is the thumbs-up/down match-feedback bar, already covered by
// QuoteReviewBar.render.test.tsx from slice 1. The real "Confirm & send back"
// CTA lives on RepPricingOnlyView (mobile rep pricing surface, ?mode=pricing),
// which is the actual target of this test.
//
// Justin's P0: today a rep CAN click "Confirm & send back" with 0 priced
// lines — `disabled={saving}` does not check `pricedCount`. This test was
// written FIRST against the unpatched component (confirmed RED), then the
// fix (`disabled={saving || pricedCount === 0}`) was applied to make it GREEN.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { RepPricingOnlyView } from './RepPricingOnlyView';
import { getRepQuote } from '../../services/api';
import type { QuoteResponse } from '../../services/api';

vi.mock('../../services/api', () => ({
  getRepQuote: vi.fn(),
  repPriceQuote: vi.fn().mockResolvedValue({ data: {} }),
  repConfirmQuote: vi.fn().mockResolvedValue({ data: {} }),
}));

function makeQuote(unitPrices: (number | null)[]): QuoteResponse {
  return {
    id: 'quote-1',
    status: 'preview',
    working_label: 'Test Quote',
    restaurant: 'Test Restaurant',
    rep: 'rep-1',
    rep_reviewed: false,
    sent_at: null,
    pdf_url: null,
    total_cents: 0,
    total: '$0.00',
    created_at: new Date().toISOString(),
    lines: unitPrices.map((price, i) => ({
      id: `line-${i}`,
      position: i,
      category: 'Produce',
      quantity: 1,
      unit_price_cents: price,
      unit_price: price != null ? (price / 100).toFixed(2) : null,
      alignment_selected: 0,
      availability_status: 'available' as const,
      chef_note: null,
      component: { id: `comp-${i}`, name: `Ingredient ${i}`, source_dish: 'Dish' },
      product: {
        id: `prod-${i}`,
        item_number: '123',
        brand: 'Brand',
        product: 'Product',
        pack_size: '1 case',
        category: 'Produce',
      },
    })),
  } as QuoteResponse;
}

describe('RepPricingOnlyView — Confirm & send back 0-priced gate', () => {
  it('disables Confirm & send back when every line has 0/null priced (pricedCount === 0)', async () => {
    vi.mocked(getRepQuote).mockResolvedValue({ data: makeQuote([null, 0]) });

    render(
      <MemoryRouter>
        <RepPricingOnlyView quoteId="quote-1" />
      </MemoryRouter>,
    );

    const confirmButton = await screen.findByRole('button', { name: /Confirm & send back/i });
    expect(confirmButton).toBeDisabled();
  });

  it('enables Confirm & send back once at least one line has a nonzero price (pricedCount > 0)', async () => {
    vi.mocked(getRepQuote).mockResolvedValue({ data: makeQuote([500, null]) });

    render(
      <MemoryRouter>
        <RepPricingOnlyView quoteId="quote-1" />
      </MemoryRouter>,
    );

    const confirmButton = await screen.findByRole('button', { name: /Confirm & send back/i });
    expect(confirmButton).toBeEnabled();
  });
});
