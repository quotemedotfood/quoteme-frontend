// QuoteBuilderPage.writeBeltDirectInvoke.test.tsx
//
// L5 round 4. The round-3 read-only tests all asserted a control was ABSENT
// from the DOM, which means the render gate alone satisfied them and the
// CALL-SITE BELTS were never exercised. Deleting a belt left every test green.
//
// This test closes that gap for the belt that matters most on this page:
// handleReplaceMatchInBuilder's `if (quoteLocked) return;`. The technique is to
// stub MapComponentDrawer with a bare button wired straight to its
// `onReplaceMatch` prop. The stub has no readOnly gate of its own, so the
// trigger EXISTS no matter what the real drawer's render gates do, and the belt
// is then the only thing that can refuse the write.
//
// That makes this a true direct invocation of the handler with a live lock:
// remove the belt and this test fails with a real updateQuote call.
//
// Note the stub is captured fresh on every render, so the handler it holds
// closes over the CURRENT quoteLocked, not the value from when the drawer
// opened. That is what makes the post-flip invocation meaningful.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

const { getQuote, updateQuote, navigateMock, setQuoteLockedOnNextLoad } = vi.hoisted(() => {
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
    alignment_candidates: [
      {
        id: 'cand-2',
        position: 2,
        tier: 'B',
        score: 0.35,
        product: { id: 'product-2', item_number: 'CAL-FRY-1', brand: 'SeaCo', product: 'Fried Calamari Rings', pack_size: '5lb', category: 'Seafood' },
      },
    ],
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
    updateQuote: vi.fn(async () => ({ data: {} })),
    navigateMock: vi.fn(),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getQuote, updateQuote };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../components/QuoteReviewBar', () => ({
  QuoteReviewBar: ({ onMatchesUpdated }: { onMatchesUpdated: () => void }) => (
    <button onClick={onMatchesUpdated}>Simulate External Update</button>
  ),
}));

// The stub that makes the belt reachable. It ignores `open` and every gate the
// real drawer applies, and renders an unconditional trigger. Mounted for as
// long as QuoteBuilderPage renders it, which the page does whenever
// matchDrawerItem is set.
vi.mock('../components/MapComponentDrawer', () => ({
  MapComponentDrawer: ({
    onReplaceMatch,
    componentName,
  }: {
    onReplaceMatch?: (c: string, p: string, prod?: any) => void;
    componentName: string;
  }) => (
    <button
      data-testid="ungated-replace-trigger"
      onClick={() =>
        onReplaceMatch?.(componentName, 'product-2', {
          id: 'product-2',
          item_number: 'CAL-FRY-1',
          brand: 'SeaCo',
          product: 'Fried Calamari Rings',
          pack_size: '5lb',
          category: 'Seafood',
        })
      }
    >
      ungated replace
    </button>
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

describe('QuoteBuilderPage - the replace-match BELT refuses a write on a locked quote', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    updateQuote.mockClear();
    navigateMock.mockClear();
    setQuoteLockedOnNextLoad(false);
  });
  afterEach(cleanup);

  it('positive control: on an UNLOCKED quote the same trigger does persist', async () => {
    renderPage();
    await screen.findByRole('spinbutton');

    fireEvent.click(screen.getAllByText('SQ-INK-1')[0]);
    const trigger = await screen.findByTestId('ungated-replace-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(updateQuote).toHaveBeenCalled();
    });
  });

  it('never calls updateQuote when the handler is invoked directly on a locked quote', async () => {
    renderPage();
    await screen.findByRole('spinbutton');

    // Open the drawer while the quote is still a mutable draft.
    fireEvent.click(screen.getAllByText('SQ-INK-1')[0]);
    await screen.findByTestId('ungated-replace-trigger');

    // The quote locks out from under it, via the page's own refetch path.
    setQuoteLockedOnNextLoad(true);
    fireEvent.click(screen.getByText('Simulate External Update'));
    await waitFor(() => {
      expect(getQuote).toHaveBeenCalledTimes(2);
    });

    // The match drawer is deliberately left mounted on a lock flip (it renders
    // read-only instead), so the stub is still here, still holding a trigger
    // that no render gate touches. This is the belt's moment: unconditionally
    // present control, live lock.
    const trigger = screen.getByTestId('ungated-replace-trigger');
    fireEvent.click(trigger);

    // Give any un-guarded persist a chance to land before asserting absence.
    await new Promise(r => setTimeout(r, 0));
    expect(updateQuote).not.toHaveBeenCalled();
  });
});
