// P0-1: rep inbound rows must navigate to a real Quote id, never an
// InboundOpportunity id (which 404s against /rep/quotes/:id → Quote.find).
// resolveInboundNavQuoteId is the pure resolver behind that routing.

import { describe, it, expect } from 'vitest';
import { resolveInboundNavQuoteId } from './RepTriagePage';
import type { InboundRow } from '../../services/api';

const base = (over: Partial<InboundRow>): InboundRow =>
  ({
    id: 'row-id',
    kind: 'opportunity',
    status: 'new',
    source: null,
    source_label: null,
    restaurant_name: null,
    contact_name: null,
    age_days: null,
    assigned_rep: null,
    artifact: null,
    ...over,
  } as unknown as InboundRow);

describe('P0-1: resolveInboundNavQuoteId', () => {
  it('quote-kind row → its own id IS the quote id', () => {
    expect(resolveInboundNavQuoteId(base({ kind: 'quote', id: 'quote-123' }))).toBe('quote-123');
  });

  it('opportunity with a Quote artifact → the artifact id (NOT the opportunity id)', () => {
    expect(
      resolveInboundNavQuoteId(
        base({ kind: 'opportunity', id: 'opp-1', artifact: { type: 'Quote', id: 'quote-999', name: 'Spring' } }),
      ),
    ).toBe('quote-999');
  });

  it('opportunity with a Menu artifact → null (no quote yet; must not route to /rep/quotes)', () => {
    expect(
      resolveInboundNavQuoteId(base({ kind: 'opportunity', id: 'opp-2', artifact: { type: 'Menu', id: 'menu-1', name: 'Dinner' } })),
    ).toBeNull();
  });

  it('opportunity with a BrandPackage artifact → null', () => {
    expect(
      resolveInboundNavQuoteId(base({ kind: 'opportunity', id: 'opp-3', artifact: { type: 'BrandPackage', id: 'bp-1', name: 'Pack' } })),
    ).toBeNull();
  });

  it('opportunity with no artifact → null', () => {
    expect(resolveInboundNavQuoteId(base({ kind: 'opportunity', id: 'opp-4', artifact: null }))).toBeNull();
  });
});
