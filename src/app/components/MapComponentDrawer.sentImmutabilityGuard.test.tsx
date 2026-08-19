// @vitest-environment jsdom
//
// MapComponentDrawer.sentImmutabilityGuard.test.tsx — L5 sent immutability, round 3.
//
// The same find-more hole that existed in MatchDrawer existed here, and this
// drawer had no `readOnly` prop AT ALL. QuoteBuilderPage passed it an unguarded
// `onFindMoreMatches`, which reaches POST /quotes/:id/more_matches ->
// AlignmentEngineService#more_matches -> AlignmentCandidate.create!, persisting
// rows against the quote. That endpoint has no backend guard either, so the
// frontend gate is the only gate.
//
// This drawer's other writes (replace / add / manual select) arrive as callbacks
// that QuoteBuilderPage already guards at its own call sites, so find-more was
// the sole leak. It is now gated on both sides here too, and the footer actions
// are hidden on a read-only render for consistency with MatchDrawer.
//
// Sync queries: the drawer renders synchronously in jsdom, and the global
// testTimeout is 5s, so long findBy windows must be avoided.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MapComponentDrawer } from './MapComponentDrawer';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    searchCatalogProducts: vi.fn().mockResolvedValue({ data: [] }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const CANDIDATE = {
  id: 'cand-1',
  position: 2,
  tier: 'alternate',
  score: 0.8,
  product: {
    id: 'prod-alt',
    item_number: '2001',
    brand: 'Acme',
    product: 'Fried Calamari Rings',
    pack_size: '10 lb',
    category: 'protein',
  },
} as any;

const onFindMoreMatches = vi.fn(async () => [] as any[]);
const onReplaceMatch = vi.fn();
const onAddToQuote = vi.fn();

function renderDrawer(readOnly: boolean) {
  return render(
    <MapComponentDrawer
      open={true}
      onOpenChange={() => {}}
      componentName="fried calamari"
      candidates={[CANDIDATE]}
      onFindMoreMatches={onFindMoreMatches}
      onReplaceMatch={onReplaceMatch}
      onAddToQuote={onAddToQuote}
      quoteId="q-1"
      readOnly={readOnly}
      readOnlyMarker="Sent (read-only)"
    />,
  );
}

const findMoreName = /find (2 )?more/i;

// Installed per-test by the INVARIANT case; see the comment there.
let fetchSpy: ReturnType<typeof vi.fn>;

describe('MapComponentDrawer sent immutability', () => {
  it('positive control: a WRITABLE drawer DOES offer Find-more and calls it', async () => {
    renderDrawer(false);

    const findMore = screen.getByRole('button', { name: findMoreName });
    fireEvent.click(findMore);

    await vi.waitFor(() => {
      expect(onFindMoreMatches).toHaveBeenCalledTimes(1);
    });
  });

  it('a READ-ONLY drawer offers no Find-more control and never persists candidates', () => {
    renderDrawer(true);

    expect(screen.queryByRole('button', { name: findMoreName })).toBeNull();
    expect(onFindMoreMatches).not.toHaveBeenCalled();
  });

  it('a READ-ONLY drawer offers no match-write actions, and names why', () => {
    renderDrawer(true);

    expect(screen.queryByRole('button', { name: /Replace Match/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add to Quote/i })).toBeNull();
    expect(screen.getByTestId('map-component-drawer-read-only')).toHaveTextContent(
      /Sent \(read-only\): matches are locked\./i,
    );
    expect(onReplaceMatch).not.toHaveBeenCalled();
    expect(onAddToQuote).not.toHaveBeenCalled();
  });

  it('positive control: a WRITABLE drawer DOES offer the match-write actions', () => {
    renderDrawer(false);

    expect(screen.getByRole('button', { name: /Replace Match/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add to Quote/i })).toBeTruthy();
    expect(screen.queryByTestId('map-component-drawer-read-only')).toBeNull();
  });

  // Same whole-surface invariant as MatchDrawer: any future write control added
  // here without a readOnly gate fails this test automatically.
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
      expect(controls.length).toBeGreaterThan(0);

      for (const c of controls) fireEvent.click(c as Element);
      await new Promise(r => setTimeout(r, 0));

      expect(onFindMoreMatches).not.toHaveBeenCalled();
      expect(onReplaceMatch).not.toHaveBeenCalled();
      expect(onAddToQuote).not.toHaveBeenCalled();

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
