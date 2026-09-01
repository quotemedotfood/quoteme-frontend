// @vitest-environment jsdom
//
// W2 — the chain toggle looked like a dead button.
//
// MatchDrawer#handleToggleLock used to end with:
//
//   if (!res.error) { setLockOverrides(...) }
//   // Errors are swallowed quietly here by design -- no modal, no toast.
//   // The chain simply stays in its prior state if the call failed.
//
// So a rejected write reverted the chain with no feedback of any kind. From
// where the operator sits that is indistinguishable from an unwired control,
// which is exactly how it was reported.
//
// The server was never silent. POST /api/v1/quotes/:id/rep_memory_lock rejects
// with copy written for a person: "Missing canonical_key for this component",
// "Quote has no assigned rep", "Quote has no catalog version", and a catch-all
// "Could not update the lock. Please try again." All four were discarded here.
//
// This matters more than a UI nicety because of WHICH rejection is likeliest.
// resolved_canonical_key falls back to target_line.dish_component&.canonical_key,
// and this drawer exists for components the engine could NOT resolve, which is
// the population most likely to lack a canonical key. The control fails exactly
// where it is most needed, and said nothing while doing it.
//
// Style follows the sibling guard spec: no `globals: true` in this project's
// vitest config, so afterEach(cleanup) is registered explicitly.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MatchDrawer } from './MatchDrawer';
import { toggleRepMemoryLock, type AlignmentCandidateResponse } from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    searchCatalogProducts: vi.fn().mockResolvedValue({ data: [] }),
    submitYourCallSelection: vi.fn().mockResolvedValue({ data: { quote_line_id: 'line-1', applied: [] } }),
    toggleRepMemoryLock: vi.fn(),
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

function renderDrawer() {
  return render(
    <MatchDrawer
      open={true}
      onOpenChange={() => {}}
      ingredientName="fried calamari"
      currentProduct={null}
      candidates={[CANDIDATE]}
      onFindMoreMatches={vi.fn(async () => [] as AlignmentCandidateResponse[])}
      quoteId="q-1"
      quoteLineId="line-1"
      canonicalKey={null}
      readOnly={false}
      readOnlyMarker="Sent (read-only)"
    />,
  );
}

function chainToggle() {
  return screen
    .getByText('Acme Fried Calamari Rings')
    .closest('[role="button"]')!
    .querySelector('[aria-pressed]') as HTMLElement;
}

describe('MatchDrawer chain toggle: a rejected lock tells the rep why', () => {
  // THE REGRESSION GUARD. Fails on the pre-fix component, which rendered
  // nothing at all on a rejection.
  it('renders the server message when the lock is rejected', async () => {
    vi.mocked(toggleRepMemoryLock).mockResolvedValue({
      error: 'Missing canonical_key for this component',
    });

    renderDrawer();
    fireEvent.click(chainToggle());

    await vi.waitFor(() => {
      expect(screen.getByText('Missing canonical_key for this component')).toBeTruthy();
    });
  });

  it('surfaces the catch-all message too, not only the named rejections', async () => {
    vi.mocked(toggleRepMemoryLock).mockResolvedValue({
      error: 'Could not update the lock. Please try again.',
    });

    renderDrawer();
    fireEvent.click(chainToggle());

    await vi.waitFor(() => {
      expect(screen.getByText('Could not update the lock. Please try again.')).toBeTruthy();
    });
  });

  // A rejected write must not leave the chain looking locked. The optimistic
  // override is applied only on success.
  it('does not flip the chain to locked when the write was rejected', async () => {
    vi.mocked(toggleRepMemoryLock).mockResolvedValue({ error: 'Quote has no assigned rep' });

    renderDrawer();
    const toggle = chainToggle();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);

    await vi.waitFor(() => {
      expect(screen.getByText('Quote has no assigned rep')).toBeTruthy();
    });
    expect(chainToggle().getAttribute('aria-pressed')).toBe('false');
  });

  it('shows no error and locks the chain when the write succeeds', async () => {
    vi.mocked(toggleRepMemoryLock).mockResolvedValue({ data: { locked: true } });

    renderDrawer();
    fireEvent.click(chainToggle());

    await vi.waitFor(() => {
      expect(chainToggle().getAttribute('aria-pressed')).toBe('true');
    });
    expect(screen.queryByText(/Missing canonical_key/)).toBeNull();
    expect(screen.queryByText(/Could not update the lock/)).toBeNull();
  });
});
