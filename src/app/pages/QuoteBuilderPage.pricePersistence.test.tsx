// QuoteBuilderPage.pricePersistence.test.tsx
//
// Justin audit item 1 (2026-08-04): the lost pricing adjustment. The only
// invisible, money-costing defect in the audit. Proven on prod: a rep types a
// % adjustment, clicks Apply (every row visibly updates), clicks Finish Quote,
// and the server total never moved -- the markup never left the browser.
//
// Two halves, both required:
//   a. Apply writes through to the server immediately (Apply means done).
//   b. Finish Quote persists pending prices before it navigates.
//
// The pricing math is verified correct to the cent elsewhere; this is purely a
// persistence guarantee, so these tests assert the write happens, not the math.
//
// Acceptance stated as a sentence about a person: "a rep who marks a quote up
// 10% and sends it must not send it at cost." Applies-then-navigates without a
// server write fails that sentence, so we assert the server write.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
          component: { name: 'tuna', source_dish: 'Test Dish' },
          category: 'Seafood',
          unit_price_cents: 686, // $6.86, the audit's tuna line
          availability_status: 'available',
          rep_handled: false,
          product: {
            id: 'product-1',
            item_number: 'SKU-1',
            brand: 'Acme',
            product: 'Yellowfin Tuna',
            pack_size: '10lb',
          },
          alignment_candidates: [],
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

// Pull the unit_price_cents that a given line id was persisted with across all
// updateQuote calls (last write wins).
function lastPersistedPrice(lineId: string): number | undefined {
  let price: number | undefined;
  for (const call of updateQuote.mock.calls as any[]) {
    const lines = call?.[1]?.lines;
    if (!Array.isArray(lines)) continue;
    const hit = lines.find((l: any) => l.id === lineId);
    if (hit && typeof hit.unit_price_cents === 'number') price = hit.unit_price_cents;
  }
  return price;
}

describe('QuoteBuilderPage - pricing adjustment persistence (audit item 1)', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    updateQuote.mockClear();
    navigateMock.mockClear();
  });
  afterEach(cleanup);

  it('a. Apply writes the adjusted price through to the server immediately', async () => {
    renderPage();

    const input = await screen.findByRole('spinbutton');
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    // 686 * 1.10 = 754.6 -> rounds to 755 cents.
    await waitFor(() => expect(updateQuote).toHaveBeenCalled());
    expect(lastPersistedPrice('line-1')).toBe(755);
  });

  it('b. Finish Quote persists prices before navigating to export-finalize', async () => {
    renderPage();

    // Wait for the quote to load (the tuna line renders).
    await screen.findByRole('spinbutton');

    fireEvent.click(screen.getByRole('button', { name: /finish quote/i }));

    // Persist must have fired, and navigation must go to export-finalize.
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/export-finalize?quoteId=quote-1')
    );
    expect(updateQuote).toHaveBeenCalled();
    // Persist happened before the navigate (handleFinish awaits the write).
    const firstPersist = (updateQuote.mock.invocationCallOrder as number[])[0] ?? Infinity;
    const firstNav = (navigateMock.mock.invocationCallOrder as number[])[0] ?? -Infinity;
    expect(firstPersist).toBeLessThan(firstNav);
  });
});
