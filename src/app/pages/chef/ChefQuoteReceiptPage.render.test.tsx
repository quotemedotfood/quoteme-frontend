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
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
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

  it('A2: returning with ?intent=accept opens the confirmation and does NOT auto-accept; confirming fires acceptChefQuote exactly once even on a racing double-click', async () => {
    const gate = deferred<{ data?: { order_guide_id: string }; error?: string }>();
    acceptChefQuote.mockImplementation(() => gate.promise);

    renderPage('?intent=accept');

    // A2 safety: coming back from the capture flow must surface the confirmation,
    // never fire accept on its own. The confirm button is present; accept is not called.
    const confirm = await screen.findByRole('button', { name: /accept and start order guide/i });
    expect(acceptChefQuote).not.toHaveBeenCalled();

    // BUG #28: a racing double-click on the confirm button shares one inFlightRef,
    // so the underlying POST fires exactly once.
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(acceptChefQuote).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve({ data: { order_guide_id: 'og-1' } });
    });

    expect(acceptChefQuote).toHaveBeenCalledTimes(1);
  });

  it('A2: "Looks good" opens the confirmation without accepting (one tap never accepts); a double-click on the confirm button fires acceptChefQuote exactly once', async () => {
    const gate = deferred<{ data?: { order_guide_id: string }; error?: string }>();
    acceptChefQuote.mockImplementation(() => gate.promise);

    renderPage();

    const looksGood = await screen.findByRole('button', { name: 'Looks good' });
    fireEvent.click(looksGood);
    // A2: the first tap only opens the confirmation; accept has not fired.
    expect(acceptChefQuote).not.toHaveBeenCalled();

    const confirm = screen.getByRole('button', { name: /accept and start order guide/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(acceptChefQuote).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve({ data: { order_guide_id: 'og-1' } });
    });

    expect(acceptChefQuote).toHaveBeenCalledTimes(1);
  });

  it('A3: the confirmation names an unanswered chef question and does NOT block accept (warn, not block)', async () => {
    getChefQuote.mockResolvedValueOnce({
      data: {
        ...baseQuote,
        has_unanswered_chef_question: true,
        chef_questions: [
          { id: 'q1', body: 'Can you match last month price on the salmon?', created_at: '2026-01-02T00:00:00Z', read: false },
        ],
      },
    });

    renderPage();

    const looksGood = await screen.findByRole('button', { name: 'Looks good' });
    fireEvent.click(looksGood);

    // Warn: the open question is surfaced in the confirmation (getByText throws if absent).
    screen.getByText(/Can you match last month price on the salmon\?/);
    // Not block: the confirm button is present and enabled.
    const confirm = screen.getByRole('button', { name: /accept and start order guide/i }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
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

describe('ChefQuoteReceiptPage - price_needs_confirmation renders "confirm with rep"', () => {
  beforeEach(() => {
    localStorage.clear();
    getChefQuote.mockClear();
    acceptChefQuote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('a line flagged price_needs_confirmation shows "confirm with rep" instead of its unit price, while a non-flagged line shows the price', async () => {
    getChefQuote.mockImplementationOnce(async () => ({
      data: {
        ...baseQuote,
        lines: [
          {
            id: 'line-1',
            position: 1,
            category: 'seafood',
            quantity: 2,
            unit_price_cents: 1,
            unit_price: '0.01',
            price_needs_confirmation: true,
            alignment_selected: 1,
            availability_status: 'available',
            chef_note: null,
            component: null,
            product: {
              id: 'prod-1',
              item_number: '001',
              brand: 'Acme',
              product: 'Salmon Fillet',
              pack_size: '10lb',
              category: 'seafood',
            },
          },
          {
            id: 'line-2',
            position: 2,
            category: 'produce',
            quantity: 3,
            unit_price_cents: 1000,
            unit_price: '10.00',
            alignment_selected: 1,
            availability_status: 'available',
            chef_note: null,
            component: null,
            product: {
              id: 'prod-2',
              item_number: '002',
              brand: 'Acme',
              product: 'Roma Tomato',
              pack_size: '25lb',
              category: 'produce',
            },
          },
        ],
      },
    }));

    renderPage();

    await screen.findByText('confirm with rep');
    expect(screen.queryByText('$0.01')).toBeNull();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });

  it('when the flag is absent, a line renders its price exactly as before', async () => {
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
              product: 'Salmon Fillet',
              pack_size: '10lb',
              category: 'seafood',
            },
          },
        ],
      },
    }));

    renderPage();

    await screen.findByText('$10.00');
    expect(screen.queryByText('confirm with rep')).toBeNull();
  });
});

describe('ChefQuoteReceiptPage - decision panel in normal flow (Moose ruling 2026-08-05)', () => {
  // Supersedes the old "pinned mobile CTA footer" tests. The panel is no longer
  // position:fixed at any breakpoint: it sits in scroll flow at the bottom of the
  // document, so nothing covers the quote and asking a question costs no screen.
  beforeEach(() => {
    localStorage.clear();
    getChefQuote.mockClear();
    getGuestQuote.mockClear();
    acceptChefQuote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('authenticated chef: the decision panel is NOT pinned (no fixed element over the quote)', async () => {
    const { container } = renderPage(); // seeds quoteme_token → chef shell
    const button = await screen.findByRole('button', { name: 'Looks good' });
    expect(button.closest('div.fixed')).toBeNull();
    expect(container.querySelector('[class*="fixed"]')).toBeNull();
  });

  it('guest (magic-link, no bearer token): decision panel is likewise in flow, not pinned', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/chef/quotes/quote-1']}>
        <Routes>
          <Route path="/chef/quotes/:id" element={<ChefQuoteReceiptPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(getGuestQuote).toHaveBeenCalledTimes(1);
    const button = await screen.findByRole('button', { name: 'Looks good' });
    expect(button.closest('div.fixed')).toBeNull();
    expect(container.querySelector('[class*="fixed"]')).toBeNull();
  });
});
