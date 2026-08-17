// @vitest-environment jsdom
//
// MatchDrawer.sentImmutabilityGuard.test.tsx — L5 sent immutability, round 3.
//
// Round 2 added call-site guards to the write handlers that live on the PAGES,
// but MatchDrawer owns two writes of its own and was never given the gate:
//
//   - submitYourCallSelection  (Replace Match / Add to Quote footer buttons)
//   - toggleRepMemoryLock      (the ChainToggle beside each product)
//
// MapIngredientsPage renders <MatchDrawer /> UNCONDITIONALLY -- it is not
// wrapped in a `!readOnly &&` the way QuoteReviewBar is -- so hiding the
// "Add Match" button that opens it does NOT unmount a drawer that is already
// open. A rep holding the drawer open when the quote goes out could still
// press Replace Match and rewrite a sent quote's match.
//
// These tests drive the component directly, which is where the hole was. Both
// read-only tests FAIL on the pre-fix component (the chain-toggle one proves a
// real toggleRepMemoryLock call landed with a full payload).
//
// Style follows MatchDrawer.test.tsx: this project's vitest config does not set
// `globals: true`, so afterEach(cleanup) is registered explicitly, and the
// drawer renders synchronously in jsdom so queries are sync. Deliberately no
// long findBy/waitFor windows -- the global testTimeout is 5s, so an inner wait
// larger than that kills the test before it can ever resolve.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MatchDrawer } from './MatchDrawer';
import {
  submitYourCallSelection,
  toggleRepMemoryLock,
  type AlignmentCandidateResponse,
} from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    searchCatalogProducts: vi.fn().mockResolvedValue({ data: [] }),
    submitYourCallSelection: vi.fn().mockResolvedValue({ data: { quote_line_id: 'line-1', applied: [] } }),
    toggleRepMemoryLock: vi.fn().mockResolvedValue({ data: { locked: true } }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const CANDIDATE = {
  id: 'prod-alt',
  position: 2,
  tier: 'alternate',
  score: 0.8,
  rep_memory: false,
  distributor_memory: false,
  distributor_name: null,
  product: {
    id: 'prod-alt',
    item_number: '2001',
    brand: 'Acme',
    product: 'Fried Calamari Rings',
    pack_size: '10 lb',
    category: 'protein',
  },
} as AlignmentCandidateResponse;

function renderDrawer(readOnly: boolean) {
  return render(
    <MatchDrawer
      open={true}
      onOpenChange={() => {}}
      ingredientName="fried calamari"
      currentProduct={null}
      candidates={[CANDIDATE]}
      quoteId="q-1"
      quoteLineId="line-1"
      canonicalKey="calamari"
      readOnly={readOnly}
      readOnlyMarker="Sent (read-only)"
    />,
  );
}

/** The candidate row is a role=button wrapper; clicking it registers a pick. */
function candidateRow() {
  return screen.getByText('Acme Fried Calamari Rings').closest('[role="button"]') as HTMLElement;
}

describe('MatchDrawer sent immutability', () => {
  it('positive control: a WRITABLE drawer still submits the your-call selection', async () => {
    renderDrawer(false);
    fireEvent.click(candidateRow());

    const replace = screen.getByRole('button', { name: /Replace Match/i });
    expect(replace).not.toBeDisabled();
    fireEvent.click(replace);

    await vi.waitFor(() => {
      expect(submitYourCallSelection).toHaveBeenCalledTimes(1);
    });
    expect(submitYourCallSelection).toHaveBeenCalledWith(
      'q-1',
      expect.objectContaining({ quote_line_id: 'line-1' }),
    );
  });

  it('a READ-ONLY drawer offers no write action and never submits a selection', () => {
    renderDrawer(true);

    // The footer write buttons are gone, replaced by a marker naming why.
    expect(screen.queryByRole('button', { name: /Replace Match/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add to Quote/i })).toBeNull();
    expect(screen.getByTestId('match-drawer-read-only')).toHaveTextContent(
      /Sent \(read-only\): matches are locked\./i,
    );

    // Picking a candidate is still harmless, but nothing can persist it.
    fireEvent.click(candidateRow());
    expect(submitYourCallSelection).not.toHaveBeenCalled();
  });

  it('a READ-ONLY drawer renders no chain toggle and never writes rep memory', () => {
    renderDrawer(true);

    // ChainToggle is the only control that calls toggleRepMemoryLock, and it is
    // the element carrying aria-pressed (see MatchDrawer.test.tsx).
    expect(candidateRow().querySelector('[aria-pressed]')).toBeNull();
    expect(toggleRepMemoryLock).not.toHaveBeenCalled();
  });

  it('positive control: a WRITABLE drawer DOES render a chain toggle that writes', async () => {
    renderDrawer(false);

    const toggle = candidateRow().querySelector('[aria-pressed]') as HTMLElement;
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle);

    await vi.waitFor(() => {
      expect(toggleRepMemoryLock).toHaveBeenCalledTimes(1);
    });
  });
});
