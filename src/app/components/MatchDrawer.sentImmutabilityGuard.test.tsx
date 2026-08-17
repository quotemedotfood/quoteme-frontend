// MatchDrawer.sentImmutabilityGuard.test.tsx
//
// L5 sent-immutability, round 3. Round 2 added call-site guards to the write
// handlers that live on the PAGES, but MatchDrawer owns two writes of its own
// and was never given the gate:
//
//   - submitYourCallSelection  (Replace Match / Add to Quote footer buttons)
//   - toggleRepMemoryLock      (the ChainToggle next to each product)
//
// MapIngredientsPage renders <MatchDrawer /> UNCONDITIONALLY (it is not
// wrapped in a `!readOnly &&` like QuoteReviewBar is), so hiding the
// "Add Match" button that opens it does not unmount a drawer that is
// already open. A rep with the drawer open when the quote goes out could
// still press Replace Match and rewrite a sent quote's match.
//
// These tests drive the component directly, which is where the hole was.
// The first two fail on the pre-fix component: without the readOnly prop the
// footer buttons render and handleSubmit calls the API.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// The mock signatures mirror the real api.ts exports so `mock.calls[0][0]`
// is typed (a zero-arg vi.fn() gives calls an empty-tuple element type).
const { submitYourCallSelection, toggleRepMemoryLock } = vi.hoisted(() => ({
  submitYourCallSelection: vi.fn(async (_quoteId: string, _payload: unknown) => ({
    data: { ok: true },
    error: null,
  })),
  toggleRepMemoryLock: vi.fn(async (_quoteId: string, _payload: unknown) => ({
    data: { locked: true },
    error: null,
  })),
}));

vi.mock('../services/api', () => ({
  submitYourCallSelection,
  toggleRepMemoryLock,
  searchCatalogProducts: vi.fn(async () => ({ data: { products: [] }, error: null })),
  CORRECTION_TYPES: [
    'wrong_product',
    'wrong_form',
    'wrong_pack',
    'not_carried',
    'out_of_stock',
    'better_fit',
    'rep_preference',
    'distributor_preference',
  ],
}));

import { MatchDrawer } from './MatchDrawer';

const CURRENT_PRODUCT = {
  id: 'product-1',
  item_number: 'SQ-INK-1',
  brand: 'Acme',
  product: 'Squid Ink Pasta',
  pack_size: '10lb',
  category: 'Seafood',
};

const CANDIDATES = [
  {
    id: 'cand-1',
    position: 1,
    tier: 'A',
    score: 0.42,
    rep_memory: false,
    product: CURRENT_PRODUCT,
  },
  {
    id: 'cand-2',
    position: 2,
    tier: 'B',
    score: 0.35,
    rep_memory: false,
    product: {
      id: 'product-2',
      item_number: 'CAL-FRY-1',
      brand: 'SeaCo',
      product: 'Fried Calamari Rings',
      pack_size: '5lb',
      category: 'Seafood',
    },
  },
] as any;

function renderDrawer(readOnly: boolean) {
  return render(
    <MatchDrawer
      open
      onOpenChange={() => {}}
      ingredientName="fried calamari"
      currentProduct={CURRENT_PRODUCT}
      candidates={CANDIDATES}
      quoteId="quote-1"
      quoteLineId="line-1"
      dishComponentId="dc-1"
      canonicalKey="calamari"
      readOnly={readOnly}
      readOnlyMarker="Sent (read-only)"
    />,
  );
}

// vaul mounts the drawer through a portal with transition timing, so under a
// loaded full-suite run the default 1s findBy window is not always enough.
const FIND_TIMEOUT = { timeout: 10000 };

/** Pick the alternate candidate so the footer's Replace/Add become enabled. */
async function pickAlternate() {
  const row = await screen.findByText(/Fried Calamari Rings/i, {}, FIND_TIMEOUT);
  const clickable = row.closest('[role="button"]');
  expect(clickable).toBeTruthy();
  fireEvent.click(clickable as Element);
}

describe('MatchDrawer sent immutability', () => {
  beforeEach(() => {
    submitYourCallSelection.mockClear();
    toggleRepMemoryLock.mockClear();
  });
  afterEach(() => cleanup());

  it('positive control: a writable drawer DOES submit the your-call selection', async () => {
    renderDrawer(false);
    await pickAlternate();

    const replace = await screen.findByRole('button', { name: /Replace Match/i }, FIND_TIMEOUT);
    expect(replace).not.toBeDisabled();
    fireEvent.click(replace);

    await waitFor(() => expect(submitYourCallSelection).toHaveBeenCalledTimes(1), FIND_TIMEOUT);
    expect(submitYourCallSelection.mock.calls[0][0]).toBe('quote-1');
  });

  it('a read-only drawer offers no write action and never submits a selection', async () => {
    renderDrawer(true);

    // The footer write buttons are gone, replaced by the marker.
    expect(screen.queryByRole('button', { name: /Replace Match/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add to Quote/i })).toBeNull();
    expect(await screen.findByTestId('match-drawer-read-only', {}, FIND_TIMEOUT)).toHaveTextContent(
      /Sent \(read-only\): matches are locked\./i,
    );

    // Selecting a candidate is still harmless, but nothing can persist it.
    await pickAlternate();
    await new Promise(r => setTimeout(r, 0));
    expect(submitYourCallSelection).not.toHaveBeenCalled();
  });

  it('a read-only drawer renders no chain toggle and never writes rep memory', async () => {
    renderDrawer(true);
    await screen.findByText(/Fried Calamari Rings/i, {}, FIND_TIMEOUT);

    // ChainToggle is the only control that calls toggleRepMemoryLock.
    const toggles = screen.queryAllByRole('button', { name: /(lock|chain|memory)/i });
    for (const t of toggles) fireEvent.click(t);

    await new Promise(r => setTimeout(r, 0));
    expect(toggleRepMemoryLock).not.toHaveBeenCalled();
  });
});
