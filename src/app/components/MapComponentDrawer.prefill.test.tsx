// MapComponentDrawer.prefill.test.tsx
//
// Justin audit item 3 (2026-08-04): the modal title already shows the component
// ("East Coast Oysters") and the search box is empty, so the rep types the word
// the dialog is already displaying, 22 times per quote. Prefill the box with the
// component name so it becomes a glance instead of a typing task.
//
// The box was already prefilled for unmatched items; this proves it is prefilled
// for matched items too (the ones reached by the newly wired matched rows).
//
// Acceptance as a sentence about a person: "a rep opening the picker sees the
// component name already in the search box, whether the row was flagged or not."
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Capture the initialQuery the drawer hands to the catalog search.
vi.mock('../components/CatalogProductSearch', () => ({
  CatalogProductSearch: ({ initialQuery }: { initialQuery?: string }) => (
    <div data-testid="search-seed">{initialQuery ?? '__EMPTY__'}</div>
  ),
}));

import { MapComponentDrawer } from './MapComponentDrawer';

function renderDrawer(isUnmatched: boolean) {
  return render(
    <MapComponentDrawer
      open
      onOpenChange={() => {}}
      componentName="East Coast Oysters"
      candidates={[]}
      isUnmatched={isUnmatched}
      onReplaceMatch={() => {}}
      onAddToQuote={() => {}}
    />
  );
}

describe('MapComponentDrawer - search box prefill (audit item 3)', () => {
  afterEach(cleanup);

  it('prefills the search box with the component name for a matched item', () => {
    renderDrawer(false);
    expect(screen.getByTestId('search-seed').textContent).toBe('East Coast Oysters');
  });

  it('still prefills the search box for an unmatched item (unchanged)', () => {
    renderDrawer(true);
    expect(screen.getByTestId('search-seed').textContent).toBe('East Coast Oysters');
  });
});
