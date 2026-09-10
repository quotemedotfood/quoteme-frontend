// @vitest-environment jsdom
//
// MatchDrawer.unmatch.test.tsx
//
// Unmatch: a rep's claim that a COMPONENT has no answer in this catalog.
// Moose's definition settles the semantics -- "NOT match this component with
// ANYTHING in my catalog because I don't carry it" -- so this is component
// level suppression, not the rejection of one product.
//
// These tests exist mostly to hold four lines that were drawn before any of it
// was written, each of which is a defect this codebase has already shipped
// once:
//
//   1. It must not render for a role the endpoint refuses. That is the live
//      ChainToggle defect: it renders on `!readOnly`, but rep_memory_lock
//      resolves to rep-only, so a distributor_admin sees the control and gets
//      a 403. The endpoint's guard for Unmatch is still with Moose, so
//      `canUnmatch` defaults to FALSE and the control renders nowhere until
//      someone wires it deliberately. The first test pins that default.
//   2. It must not swallow the error. handleFindMore in this same file still
//      catches and discards while the server writes real copy.
//   3. The confirm must state scope honestly, and may only promise a recovery
//      that exists. It does here, so it says so.
//   4. The accessible name must carry the action AND the target.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MatchDrawer } from './MatchDrawer';
import { setComponentUnmatched } from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    searchCatalogProducts: vi.fn().mockResolvedValue({ data: [] }),
    submitYourCallSelection: vi.fn().mockResolvedValue({ data: { quote_line_id: 'line-1', applied: [] } }),
    toggleRepMemoryLock: vi.fn().mockResolvedValue({ data: { locked: true } }),
    setComponentUnmatched: vi.fn().mockResolvedValue({ data: { unmatched: true } }),
  };
});

// No global cleanup in this harness: vitest runs without `globals`, so
// @testing-library/react never registers its automatic afterEach.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const CURRENT_PRODUCT = {
  id: 'prod-1',
  item_number: '1000',
  brand: 'Acme',
  product: 'Guanciale',
  pack_size: '5 lb',
  category: 'protein',
};

function renderDrawer(overrides: Record<string, unknown> = {}) {
  return render(
    <MatchDrawer
      open
      onOpenChange={() => {}}
      ingredientName="guanciale"
      currentProduct={CURRENT_PRODUCT}
      candidates={[]}
      quoteId="quote-1"
      quoteLineId="line-1"
      canonicalKey="guanciale"
      dishComponentId="comp-1"
      {...overrides}
    />,
  );
}

describe('MatchDrawer - Unmatch does not render until the gate is written', () => {
  it('renders no Unmatch control by default, because the endpoint guard is unruled', () => {
    renderDrawer();
    expect(screen.queryByTestId('match-drawer-unmatch')).toBeNull();
  });

  it('renders no Unmatch control on a read-only surface even once permitted', () => {
    renderDrawer({ canUnmatch: true, readOnly: true, readOnlyMarker: 'Sent' });
    expect(screen.queryByTestId('match-drawer-unmatch')).toBeNull();
  });

  it('renders no Undo control by default when the component is already unmatched', () => {
    renderDrawer({ isUnmatched: true });
    expect(screen.queryByTestId('match-drawer-undo-unmatch')).toBeNull();
  });

  it('renders the Unmatch control once permitted', () => {
    renderDrawer({ canUnmatch: true });
    expect(screen.getByTestId('match-drawer-unmatch')).toBeInTheDocument();
  });
});

describe('MatchDrawer - Unmatch accessible name', () => {
  it('names the action and the target, not the bare verb', () => {
    renderDrawer({ canUnmatch: true });
    const btn = screen.getByTestId('match-drawer-unmatch');
    expect(btn).toHaveAttribute('aria-label', 'Unmatch Guanciale');
    // Hover text and accessible name must not drift apart.
    expect(btn.getAttribute('title')).toBe(btn.getAttribute('aria-label'));
    // The bare verb alone is the shape that caught Moose on the Team page.
    expect(btn.getAttribute('aria-label')).not.toBe('Unmatch');
  });

  it('names the target on the Undo control too', () => {
    renderDrawer({ canUnmatch: true, isUnmatched: true });
    const btn = screen.getByTestId('match-drawer-undo-unmatch');
    expect(btn).toHaveAttribute('aria-label', 'Undo unmatch for Guanciale');
    expect(btn.getAttribute('title')).toBe(btn.getAttribute('aria-label'));
  });
});

describe('MatchDrawer - the confirm is the load-bearing part', () => {
  it('writes nothing on the first click: the control only opens the confirm', () => {
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    expect(setComponentUnmatched).not.toHaveBeenCalled();
  });

  it('states that the claim covers the component, not just this product', () => {
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/applies to the component, not just the product/i);
  });

  it('states the scope as the rep\'s own future quotes, which is what rep-tier memory means', () => {
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/on your future quotes/i);
    // Rep A unmatching does not change what rep B at the same distributor is
    // matched, so the confirm must not claim a distributor-wide effect.
    expect(dialog).not.toHaveTextContent(/every future quote for this distributor/i);
  });

  it('states that the claim is bounded by catalog version and expires on its own', () => {
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/current catalog version/i);
    expect(dialog).toHaveTextContent(/expires on its own/i);
    expect(dialog).toHaveTextContent(/price changes do not affect it/i);
    // It is not permanent, and the copy must not imply that it is.
    expect(dialog).not.toHaveTextContent(/permanent/i);
    expect(dialog).not.toHaveTextContent(/cannot be undone/i);
  });

  it('promises a recovery, which is only honest because Undo ships with it', () => {
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/you can undo this/i);
  });

  it('does not claim to clear a match on this quote when there is no match to clear', () => {
    renderDrawer({ canUnmatch: true, currentProduct: null });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    expect(screen.getByRole('alertdialog')).not.toHaveTextContent(/match on this quote is cleared/i);
  });

  it('says the match on this quote is cleared when there actually is one', () => {
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/match on this quote is cleared/i);
  });

  it('writes the claim when the confirm is accepted', async () => {
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    fireEvent.click(screen.getByRole('button', { name: 'Unmatch' }));
    await waitFor(() => expect(setComponentUnmatched).toHaveBeenCalledTimes(1));
    expect(setComponentUnmatched).toHaveBeenCalledWith('quote-1', {
      quote_line_id: 'line-1',
      canonical_key: 'guanciale',
      dish_component_id: 'comp-1',
      unmatched: true,
    });
  });

  it('writes nothing when the confirm is declined', () => {
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    fireEvent.click(screen.getByRole('button', { name: 'Keep the match' }));
    expect(setComponentUnmatched).not.toHaveBeenCalled();
  });
});

describe('MatchDrawer - the error is not swallowed', () => {
  it("shows the server's own message verbatim when the write fails", async () => {
    vi.mocked(setComponentUnmatched).mockResolvedValueOnce({
      error: 'Quote has no assigned rep',
      status: 422,
    } as never);
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    fireEvent.click(screen.getByRole('button', { name: 'Unmatch' }));
    const err = await screen.findByTestId('match-drawer-unmatch-error');
    expect(err).toHaveTextContent('Quote has no assigned rep');
  });

  it('does not move to the unmatched state when the write failed', async () => {
    vi.mocked(setComponentUnmatched).mockResolvedValueOnce({
      error: 'Missing canonical_key for this component',
      status: 422,
    } as never);
    renderDrawer({ canUnmatch: true });
    fireEvent.click(screen.getByTestId('match-drawer-unmatch'));
    fireEvent.click(screen.getByRole('button', { name: 'Unmatch' }));
    await screen.findByTestId('match-drawer-unmatch-error');
    expect(screen.queryByTestId('match-drawer-not-carried')).toBeNull();
    expect(screen.getByTestId('match-drawer-unmatch')).toBeInTheDocument();
  });
});

describe('MatchDrawer - the states the drawer never had', () => {
  it('renders a not-carried state instead of the current match once unmatched', () => {
    renderDrawer({ canUnmatch: true, isUnmatched: true });
    expect(screen.getByTestId('match-drawer-not-carried')).toBeInTheDocument();
    expect(screen.queryByText('Current Match')).toBeNull();
  });

  it('tells the rep the claim expires rather than pushing them back to search', () => {
    renderDrawer({ canUnmatch: true, isUnmatched: true });
    const card = screen.getByTestId('match-drawer-not-carried');
    expect(card).toHaveTextContent(/Marked not carried/i);
    expect(card).toHaveTextContent(/expires on its own/i);
  });

  it('withholds Replace and Add while the claim stands, so the two cannot contradict', () => {
    renderDrawer({ canUnmatch: true, isUnmatched: true });
    expect(screen.queryByText('Replace Match')).toBeNull();
    expect(screen.queryByTestId('match-drawer-unmatch')).toBeNull();
    expect(screen.getByTestId('match-drawer-undo-unmatch')).toBeInTheDocument();
  });

  it('names the empty state when there is simply no match yet, which had no branch at all before', () => {
    renderDrawer({ currentProduct: null });
    expect(screen.getByTestId('match-drawer-no-current-match')).toBeInTheDocument();
  });

  it('undoes the claim without a second confirm, because undoing is the safe direction', async () => {
    vi.mocked(setComponentUnmatched).mockResolvedValueOnce({ data: { unmatched: false } } as never);
    renderDrawer({ canUnmatch: true, isUnmatched: true });
    fireEvent.click(screen.getByTestId('match-drawer-undo-unmatch'));
    await waitFor(() => expect(setComponentUnmatched).toHaveBeenCalledTimes(1));
    expect(setComponentUnmatched).toHaveBeenCalledWith('quote-1', {
      quote_line_id: 'line-1',
      canonical_key: 'guanciale',
      dish_component_id: 'comp-1',
      unmatched: false,
    });
  });
});
