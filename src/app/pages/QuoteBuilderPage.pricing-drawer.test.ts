// Ticket #6: rows rendering the "Awaiting rep review" (unmatched) label and
// the low-confidence "Review Suggested" pill must be drawer-openable — i.e.
// getItemMatchStatus must classify them as non-null so the row's onClick
// (openMatchDrawer) affordance renders. A regression here would silently
// make the match drawer unreachable again from those rows.
import { describe, it, expect } from 'vitest';
import { getItemMatchStatus } from './QuoteBuilderPage';

function makeItem(overrides: Partial<Parameters<typeof getItemMatchStatus>[0]> = {}) {
  return {
    id: '1',
    dish: 'Test Dish',
    component: 'onion',
    sku: 'SKU-1',
    brand: 'Acme',
    product: 'Diced Onion',
    pack: '10lb',
    category: 'produce',
    basePrice: 10,
    currentPrice: 10,
    percentChange: 0,
    ...overrides,
  };
}

describe('getItemMatchStatus — drawer-openable rows (ticket #6)', () => {
  it('flags unmatched items ("Awaiting rep review" rows) as Needs Your Pick', () => {
    const item = makeItem({ unmatched: true, resolution_label: null });
    expect(getItemMatchStatus(item)).toBe('Needs Your Pick');
  });

  it('flags unmatched items with a resolution_label as Needs Your Pick too', () => {
    const item = makeItem({ unmatched: true, resolution_label: 'Pending distributor match' });
    expect(getItemMatchStatus(item)).toBe('Needs Your Pick');
  });

  it('flags low-confidence matches (<50) as Needs Your Pick', () => {
    const item = makeItem({ unmatched: false, matchScore: 0.4 });
    expect(getItemMatchStatus(item)).toBe('Needs Your Pick');
  });

  it('flags medium-confidence matches (50-69) as Review Suggested', () => {
    const item = makeItem({ unmatched: false, matchScore: 0.6 });
    expect(getItemMatchStatus(item)).toBe('Review Suggested');
  });

  it('returns null (not drawer-openable) for a confident, resolved match', () => {
    const item = makeItem({ unmatched: false, matchScore: 0.95 });
    expect(getItemMatchStatus(item)).toBeNull();
  });
});
