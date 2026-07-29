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

const { getChefQuote, getGuestQuote, acceptChefQuote, baseQuote } = vi.hoisted(() => {
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
    getGuestQuote: vi.fn(async () => ({ data: { ...baseQuote } })),
    acceptChefQuote: vi.fn(async (): Promise<{ data?: { order_guide_id: string }; error?: string }> => ({ data: { order_guide_id: 'og-1' } })),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    getChefQuote,
    getGuestQuote,
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

    // Asterisk-wrapped warehouse token stripped; case is otherwise untouched
    // (no title-case transform on chef-facing product names, see Ch XXI).
    await screen.findByText('SALMON FILLET');
    expect(screen.queryByText(/DEAD/i)).toBeNull();
  });

  it('Ch XXI: does NOT title-case chef-facing product names or brands (EVOO/IQF/Caplansky\'s stay intact)', async () => {
    getChefQuote.mockImplementationOnce(async () => ({
      data: {
        ...baseQuote,
        lines: [
          {
            id: 'line-1',
            position: 1,
            category: 'dry',
            quantity: 1,
            unit_price_cents: 500,
            unit_price: '5.00',
            alignment_selected: 1,
            availability_status: 'available',
            chef_note: null,
            component: null,
            product: {
              id: 'prod-1',
              item_number: '001',
              brand: "Caplansky's",
              product: 'EVOO IQF Q&A Blend',
              pack_size: '1L',
              category: 'dry',
            },
          },
        ],
      },
    }));

    renderPage();

    await screen.findByText('EVOO IQF Q&A Blend');
    // Brand renders alongside the pack size in one combined text node
    // ("1L · Caplansky's"), so match on substring rather than exact text.
    expect(screen.getByText((_, el) => el?.textContent === "1L · Caplansky's")).toBeInTheDocument();
    // Regression guards: the old toTitleCase wrapper mangled these exact tokens
    // (title-casing + apostrophe word-split: "Caplansky's" -> "Caplansky S").
    expect(screen.queryByText('Evoo Iqf Q&a Blend')).toBeNull();
    expect(screen.queryByText((_, el) => el?.textContent === "1L · Caplansky S")).toBeNull();
    expect(screen.queryByText((_, el) => el?.textContent === '1L · Caplansky')).toBeNull();
  });
});

describe('ChefQuoteReceiptPage - pinned mobile CTA footer (Justin mobile ruling)', () => {
  beforeEach(() => {
    localStorage.clear();
    getChefQuote.mockClear();
    getGuestQuote.mockClear();
    acceptChefQuote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  function ctaFooterOf(button: HTMLElement): HTMLElement {
    const footer = button.closest('div.fixed');
    expect(footer).not.toBeNull();
    return footer as HTMLElement;
  }

  it('authenticated chef: CTA footer is fixed at bottom-0 with 68px reserved for the ChefTabBar, reverting to static flow at md', async () => {
    renderPage(); // renderPage seeds quoteme_token → chef shell → tab bar present
    const button = await screen.findByRole('button', { name: 'Looks good' });
    const footer = ctaFooterOf(button);
    expect(footer.className).toContain('bottom-0');
    expect(footer.className).toContain('pb-[68px]');
    expect(footer.className).toContain('md:static');
  });

  it('guest (magic-link, no bearer token): no tab bar exists, so the CTA footer pins flush to the viewport bottom', async () => {
    // No quoteme_token → the page fetches via getGuestQuote and
    // ChefShellLayout would render no tab bar for a guest.
    render(
      <MemoryRouter initialEntries={['/chef/quotes/quote-1']}>
        <Routes>
          <Route path="/chef/quotes/:id" element={<ChefQuoteReceiptPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(getGuestQuote).toHaveBeenCalledTimes(1);
    const button = await screen.findByRole('button', { name: 'Looks good' });
    const footer = ctaFooterOf(button);
    expect(footer.className).toContain('bottom-0');
    expect(footer.className).not.toContain('pb-[68px]');
  });
});
