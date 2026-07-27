// ChefQuoteReceiptPage.render.test.tsx
//
// BUG #28 (chef accept dual path): handleAccept previously had NO internal
// guard of its own, unlike the other hand-rolled handlers in this PR (which
// at least checked a `busy`-style state before proceeding); this one just
// ran straight through. The auto-accept useEffect (fires once on return from
// the capture-auth flow, ?intent=accept) calls handleAccept() directly,
// racing any manual "Looks good" click that lands before the next render
// reflects the button's disabled state. Both triggers now share ONE
// useAsyncMutation instance (acceptMutation), whose inFlightRef is set
// synchronously as the first line of run(), before any state update or
// await, so whichever trigger fires second is rejected immediately.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const { getChefQuote, acceptChefQuote, baseQuote } = vi.hoisted(() => {
  const baseQuote: any = {
    id: 'quote-1',
    status: 'sent',
    state: 'distributor_quote',
    restaurant: 'Test Kitchen',
    rep: 'Rep Person',
    created_at: '2026-01-01T00:00:00Z',
    sent_at: '2026-01-01T00:00:00Z',
    contacts: [],
    lines: [],
  };
  return {
    baseQuote,
    getChefQuote: vi.fn(async () => ({ data: { ...baseQuote } })),
    acceptChefQuote: vi.fn(async (): Promise<{ data?: { order_guide_id: string }; error?: string }> => ({ data: { order_guide_id: 'og-1' } })),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    getChefQuote,
    acceptChefQuote,
  };
});

import { ChefQuoteReceiptPage } from './ChefQuoteReceiptPage';

function renderPage(searchSuffix = '') {
  localStorage.setItem('quoteme_token', 'test-token');
  return render(
    <MemoryRouter initialEntries={[`/chef/quotes/quote-1${searchSuffix}`]}>
      <Routes>
        <Route path="/chef/quotes/:id" element={<ChefQuoteReceiptPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChefQuoteReceiptPage - accept guard (BUG #28)', () => {
  beforeEach(() => {
    localStorage.clear();
    getChefQuote.mockClear();
    acceptChefQuote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('the auto-accept effect and a racing manual click share one guard: acceptChefQuote fires exactly once', async () => {
    const gate = deferred<{ data?: { order_guide_id: string }; error?: string }>();
    acceptChefQuote.mockImplementation(() => gate.promise);

    renderPage('?intent=accept');

    // The auto-accept effect fires as soon as the quote loads (?intent=accept).
    await waitFor(() => {
      expect(acceptChefQuote).toHaveBeenCalledTimes(1);
    });

    // Race a manual click against the still-in-flight auto-accept call.
    // Whether the button is already disabled or not, the underlying
    // acceptChefQuote() must not be invoked a second time for the same
    // accept action; the shared inFlightRef blocks it synchronously even
    // if the click somehow reaches the handler before re-render.
    const button = screen.getByRole('button', { name: /building your order guide|looks good/i });
    fireEvent.click(button);

    expect(acceptChefQuote).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve({ data: { order_guide_id: 'og-1' } });
    });

    expect(acceptChefQuote).toHaveBeenCalledTimes(1);
  });

  it('a synchronous double-click on "Looks good" (no auto-accept) fires acceptChefQuote exactly once', async () => {
    const gate = deferred<{ data?: { order_guide_id: string }; error?: string }>();
    acceptChefQuote.mockImplementation(() => gate.promise);

    renderPage();

    const button = await screen.findByRole('button', { name: 'Looks good' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(acceptChefQuote).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve({ data: { order_guide_id: 'og-1' } });
    });

    expect(acceptChefQuote).toHaveBeenCalledTimes(1);
  });
});

describe('ChefQuoteReceiptPage - chef-facing product name normalization', () => {
  beforeEach(() => {
    localStorage.clear();
    getChefQuote.mockClear();
    acceptChefQuote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('strips asterisk-wrapped warehouse tokens from the product name shown to the chef', async () => {
    getChefQuote.mockImplementationOnce(async () => ({
      data: {
        ...baseQuote,
        lines: [
          {
            id: 'line-1',
            position: 1,
            category: 'seafood',
            quantity: 2,
            unit_price_cents: 1000,
            unit_price: '10.00',
            alignment_selected: 1,
            availability_status: 'available',
            chef_note: null,
            component: null,
            product: {
              id: 'prod-1',
              item_number: '001',
              brand: 'Acme',
              product: 'SALMON *DEAD* FILLET',
              pack_size: '10lb',
              category: 'seafood',
            },
          },
        ],
      },
    }));

    renderPage();

    await screen.findByText('Salmon Fillet');
    expect(screen.queryByText(/DEAD/i)).toBeNull();
  });
});
