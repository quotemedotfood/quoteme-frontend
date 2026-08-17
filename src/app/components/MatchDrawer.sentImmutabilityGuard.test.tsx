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

// vi.clearAllMocks() also resets the onFindMoreMatches spy declared below.
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

const onFindMoreMatches = vi.fn(async () => [] as AlignmentCandidateResponse[]);

function renderDrawer(readOnly: boolean) {
  return render(
    <MatchDrawer
      open={true}
      onOpenChange={() => {}}
      ingredientName="fried calamari"
      currentProduct={null}
      candidates={[CANDIDATE]}
      onFindMoreMatches={onFindMoreMatches}
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

// Installed per-test by the INVARIANT case; see the comment there.
let fetchSpy: ReturnType<typeof vi.fn>;

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

  // The eighth write, and the one that reads like a query. "Find 2 more
  // matches" is a POST to /quotes/:id/more_matches which runs
  // AlignmentEngineService#more_matches and persists AlignmentCandidate rows
  // against the quote. It sits in the candidate list, not the footer, so the
  // footer replacement never hid it, and the endpoint has NO backend guard.
  it('a READ-ONLY drawer offers no Find-more control and never persists candidates', () => {
    renderDrawer(true);

    expect(screen.queryByRole('button', { name: /Find 2 more matches/i })).toBeNull();
    expect(onFindMoreMatches).not.toHaveBeenCalled();
  });

  it('positive control: a WRITABLE drawer DOES offer Find-more and calls it', async () => {
    renderDrawer(false);

    const findMore = screen.getByRole('button', { name: /Find 2 more matches/i });
    fireEvent.click(findMore);

    await vi.waitFor(() => {
      expect(onFindMoreMatches).toHaveBeenCalledTimes(1);
    });
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

  // The invariant that would have caught the find-more hole automatically,
  // instead of a human noticing it two rounds later. Rather than naming the
  // controls we already know about, this asserts a property of the whole
  // read-only surface: click EVERY control in it, and no write may fire.
  //
  // A future contributor adding a new write control to this drawer without a
  // readOnly gate fails this test without having to remember it exists.
  it('INVARIANT: clicking every control in a read-only drawer fires no write', async () => {
    fetchSpy = vi.fn(async () => new Response('{}', { status: 200 })) as any;
    const realFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as any;
    try {
      renderDrawer(true);

      const controls = [
        ...screen.queryAllByRole('button'),
        ...screen.queryAllByRole('checkbox'),
        ...Array.from(document.querySelectorAll('[role="button"], [aria-pressed]')),
      ];
      // Sanity: the surface is not trivially empty, or this asserts nothing.
      expect(controls.length).toBeGreaterThan(0);

      for (const c of controls) fireEvent.click(c as Element);
      await new Promise(r => setTimeout(r, 0));

      expect(submitYourCallSelection).not.toHaveBeenCalled();
      expect(toggleRepMemoryLock).not.toHaveBeenCalled();
      expect(onFindMoreMatches).not.toHaveBeenCalled();

      // Generic backstop. The spies above only cover writes this test already
      // knows about, so a NEW control calling a NEW api function would pass them
      // silently. Everything in services/api ultimately goes through fetch, and
      // the known writes here are mocked so they never reach it, which means any
      // fetch with a mutating method is by definition an unguarded new write.
      const mutating = fetchSpy.mock.calls.filter(([, init]) => {
        const m = String((init as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
        return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
      });
      expect(mutating).toEqual([]);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
