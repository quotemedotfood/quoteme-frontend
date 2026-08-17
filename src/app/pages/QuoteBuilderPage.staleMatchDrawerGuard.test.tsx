// QuoteBuilderPage.staleMatchDrawerGuard.test.tsx
//
// P0 route/shell guard fix round 2, work item 2: `handleReplaceMatchInBuilder`
// (the write behind Replace Match / Add to Quote / manual-select in the
// match drawer) had no quoteLocked re-check of its own. `openMatchDrawer`
// already refuses to OPEN the drawer on a locked quote, but the drawer's
// own open/closed state (`matchDrawerOpen`/`matchDrawerItem`) is independent
// of `quoteLocked` -- nothing closes the drawer if the quote becomes locked
// while it is already open (e.g. a rep leaves a match drawer open, and in
// the meantime the quote goes out, discovered here via the same
// QuoteReviewBar-driven refetch that flips quoteLocked elsewhere on this
// page). The drawer's "Replace Match" button is gated only by
// `!hasSelection` inside MapComponentDrawer, which has no idea the outer
// quote is now locked -- so without a call-site guard in the handler
// itself, picking a candidate and pressing Replace Match still persists.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
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
        id: 'cand-1',
        position: 1,
        tier: 'A',
        score: 0.42,
        product: { id: 'product-1', item_number: 'SQ-INK-1', brand: 'Acme', product: 'Squid Ink Pasta', pack_size: '10lb', category: 'Seafood' },
      },
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
    setQuoteLockedOnNextLoad: (v: boolean) => {
      lockedOnNextLoad = v;
    },
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

// QuoteReviewBar is the page's only OTHER trigger for reloading quote data
// (besides initial mount). Real QuoteReviewBar is a full review-feedback
// widget; stubbed here to a single button that calls its onMatchesUpdated
// prop directly, so the test can drive "the quote data was refetched and
// came back locked" without needing to drive the real widget's own network
// calls end to end.
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
    </MemoryRouter>
  );
}

describe('QuoteBuilderPage - match drawer left open refuses to persist once the quote locks (P0 round 2, item 2)', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    updateQuote.mockClear();
    navigateMock.mockClear();
    setQuoteLockedOnNextLoad(false);
  });
  afterEach(cleanup);

  it('never calls updateQuote from Replace Match if the quote locks while the drawer is still open', async () => {
    renderPage();

    // Quote loaded, unlocked: the matched row opens the drawer normally.
    await screen.findByRole('spinbutton');
    fireEvent.click(screen.getAllByText('SQ-INK-1')[0]);
    expect(await screen.findByText(/select match for fried calamari/i)).toBeTruthy();

    // Pick the alternate candidate inside the (still open) drawer.
    fireEvent.click(screen.getByText(/fried calamari rings/i));
    const replaceButton = screen.getByRole('button', { name: /replace match/i });
    expect(replaceButton).not.toBeDisabled();

    // The quote locks out from under the still-open drawer: next getQuote
    // resolves Sent. Driven through the same QuoteReviewBar-triggered
    // refetch (handleMatchesUpdated -> loadQuote) the real page already
    // uses elsewhere -- not a fabricated back door.
    setQuoteLockedOnNextLoad(true);
    fireEvent.click(screen.getByText('Simulate External Update'));

    // Confirm the reload actually landed (quoteLocked flipped).
    await waitFor(() => {
      expect(getQuote).toHaveBeenCalledTimes(2);
    });

    // ROUND 4 CHANGE OF MECHANISM, same guarantee. This test used to click a
    // still-live Replace Match button and prove the handler's belt refused the
    // write. Round 4 adds a render gate in front of that button: the drawer is
    // deliberately left OPEN (so the rep sees why it went inert rather than
    // having it vanish), but MapComponentDrawer now receives readOnly and
    // replaces its write actions with a marker. So there is no longer a button
    // to click here, and what this test proves is the render gate.
    //
    // The BELT itself (handleReplaceMatchInBuilder's quoteLocked re-check) is
    // covered directly by QuoteBuilderPage.writeBeltDirectInvoke.test.tsx,
    // which stubs the drawer so no render gate can hide the trigger and then
    // invokes the handler with a live lock. Removing the belt fails that test.
    // The two files together cover both layers; neither covers both alone.
    await waitFor(() => {
      expect(screen.getByTestId('map-component-drawer-read-only')).toBeTruthy();
    });
    // Drawer still open, write action gone.
    expect(screen.getByText(/select match for fried calamari/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /replace match/i })).toBeNull();

    // Click every control still in the read-only drawer, so the assertion below
    // is load-bearing rather than vacuous: without something being clicked,
    // "updateQuote was not called" would hold trivially.
    const drawerControls = [
      ...screen.queryAllByRole('button'),
      ...Array.from(document.querySelectorAll('[role="button"]')),
    ];
    expect(drawerControls.length).toBeGreaterThan(0);
    for (const c of drawerControls) fireEvent.click(c as Element);
    await new Promise(r => setTimeout(r, 0));

    expect(updateQuote).not.toHaveBeenCalled();
  });
});
