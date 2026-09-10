// @vitest-environment jsdom
//
// MapComponentDrawer.unmatch.test.tsx
//
// This is the drawer an unmatched row actually opens, from QuoteBuilderPage.
// MatchDrawer is mounted only from MapIngredientsPage. So putting Unmatch in
// MatchDrawer alone would put the undo where the miss is not, and the rep who
// just said "we don't carry this" would open this drawer and be told:
//
//     "No catalog match was found automatically. Search below to find and
//      assign a product."
//
// That sentence is the loop. It is true of an engine miss and false of a
// rep-authored one, and these tests hold the difference.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../components/CatalogProductSearch', () => ({
  CatalogProductSearch: ({ initialQuery }: { initialQuery?: string }) => (
    <div data-testid="search-seed">{initialQuery ?? '__EMPTY__'}</div>
  ),
}));

import { MapComponentDrawer } from './MapComponentDrawer';

// This harness has no global cleanup (vitest runs without `globals`).
afterEach(cleanup);

function renderDrawer(overrides: Record<string, unknown> = {}) {
  return render(
    <MapComponentDrawer
      open
      onOpenChange={() => {}}
      componentName="guanciale"
      candidates={[]}
      isUnmatched
      onReplaceMatch={() => {}}
      onAddToQuote={() => {}}
      {...overrides}
    />,
  );
}

describe('MapComponentDrawer - an engine miss is unchanged', () => {
  it('still tells the rep no match was found and invites a search', () => {
    renderDrawer();
    expect(screen.getByText(/No catalog match was found automatically/i)).toBeInTheDocument();
    expect(screen.queryByTestId('map-drawer-not-carried')).toBeNull();
  });
});

describe('MapComponentDrawer - a rep-authored miss states itself', () => {
  it('replaces the search prompt rather than sitting alongside it', () => {
    renderDrawer({ repUnmatched: true });
    expect(screen.getByTestId('map-drawer-not-carried')).toBeInTheDocument();
    expect(screen.queryByText(/No catalog match was found automatically/i)).toBeNull();
  });

  it('says the component is not carried and that the claim expires', () => {
    renderDrawer({ repUnmatched: true });
    const card = screen.getByTestId('map-drawer-not-carried');
    expect(card).toHaveTextContent(/Marked not carried/i);
    expect(card).toHaveTextContent(/on your future quotes/i);
    expect(card).toHaveTextContent(/expires on its own/i);
  });

  it('never tells a rep who just unmatched that the line awaits their review', () => {
    renderDrawer({ repUnmatched: true });
    expect(screen.getByTestId('map-drawer-not-carried')).not.toHaveTextContent(/awaiting rep review/i);
  });
});

describe('MapComponentDrawer - the undo affordance', () => {
  it('renders no undo without a handler, since this drawer cannot write on its own', () => {
    renderDrawer({ repUnmatched: true });
    expect(screen.queryByTestId('map-drawer-undo-unmatch')).toBeNull();
  });

  it('renders no undo on a read-only surface even with a handler', () => {
    renderDrawer({ repUnmatched: true, onUndoUnmatch: () => {}, readOnly: true });
    expect(screen.queryByTestId('map-drawer-undo-unmatch')).toBeNull();
  });

  it('names the action and the target', () => {
    renderDrawer({ repUnmatched: true, onUndoUnmatch: () => {} });
    const btn = screen.getByTestId('map-drawer-undo-unmatch');
    expect(btn).toHaveAttribute('aria-label', 'Undo unmatch for Guanciale');
    expect(btn.getAttribute('title')).toBe(btn.getAttribute('aria-label'));
  });

  it('fires the handler on click', () => {
    const onUndoUnmatch = vi.fn();
    renderDrawer({ repUnmatched: true, onUndoUnmatch });
    fireEvent.click(screen.getByTestId('map-drawer-undo-unmatch'));
    expect(onUndoUnmatch).toHaveBeenCalledTimes(1);
  });

  it("surfaces the server's own words verbatim when the undo failed", () => {
    renderDrawer({
      repUnmatched: true,
      onUndoUnmatch: () => {},
      undoError: 'Quote has no catalog version',
    });
    expect(screen.getByTestId('map-drawer-undo-error')).toHaveTextContent('Quote has no catalog version');
  });
});
