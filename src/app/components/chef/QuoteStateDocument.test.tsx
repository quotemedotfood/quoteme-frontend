// QuoteStateDocument.test.tsx
//
// Regression coverage for two chef-facing header bugs found in the
// 2026-07-29 batch (fix/chef-quote-regressions):
//
//   1. Category header item count showed "1 items" for a single-item
//      category (DAIRY, PRODUCE, POULTRY on real quotes). The 14-file
//      pluralization batch (commit 257aa90) fixed this pattern everywhere
//      EXCEPT this component, because QuoteStateDocument.tsx is a shared
//      component, not one of the page-level render sites the batch swept.
//   2. The "confirmed" document eyebrow read "CONFIRMED QUOTE · LOCKED" —
//      an internal/rep document-state term leaking to the chef. Chef copy
//      should read "CONFIRMED QUOTE" / "ACCEPTED" only.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QuoteStateDocument, stateFromQuoteState, type QuoteDocGroup } from './QuoteStateDocument';

afterEach(() => {
  cleanup();
});

const baseProps = {
  restaurant: 'Test Kitchen',
  quoteDate: 'Jul 29, 2026',
  rep: 'Alex Rep',
  confirmedAt: 'Jul 29, 2026',
};

function oneItemGroup(cat: string): QuoteDocGroup[] {
  return [{ cat, items: [{ name: 'Whole Milk', pack: '1 gal', qty: 1, unit: 4.5 }] }];
}

function twoItemGroup(cat: string): QuoteDocGroup[] {
  return [
    {
      cat,
      items: [
        { name: 'Whole Milk', pack: '1 gal', qty: 1, unit: 4.5 },
        { name: 'Heavy Cream', pack: '1 qt', qty: 1, unit: 6.0 },
      ],
    },
  ];
}

describe('QuoteStateDocument - category item count pluralization', () => {
  it('renders "1 item" (singular) for a category with exactly one item', () => {
    render(
      <QuoteStateDocument
        {...baseProps}
        state="confirmed"
        groups={oneItemGroup('DAIRY')}
        totalCount={1}
        pricedCount={1}
      />,
    );
    expect(screen.getByText('1 item')).toBeInTheDocument();
    expect(screen.queryByText('1 items')).toBeNull();
  });

  it('renders "N items" (plural) for a category with more than one item', () => {
    render(
      <QuoteStateDocument
        {...baseProps}
        state="confirmed"
        groups={twoItemGroup('DAIRY')}
        totalCount={2}
        pricedCount={2}
      />,
    );
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });
});

describe('QuoteStateDocument - restaurant name bracket strip', () => {
  it('strips a full "[" "]" wrap around the restaurant name', () => {
    render(
      <QuoteStateDocument
        {...baseProps}
        restaurant="[The Grove]"
        state="confirmed"
        groups={oneItemGroup('DAIRY')}
        totalCount={1}
        pricedCount={1}
      />,
    );
    expect(screen.getByText('The Grove')).toBeInTheDocument();
    expect(screen.queryByText('[The Grove]')).toBeNull();
  });
});

describe('QuoteStateDocument - confirmed-state eyebrow copy (chef-facing)', () => {
  it('does not leak the internal "LOCKED" document-state term to the chef', () => {
    render(
      <QuoteStateDocument
        {...baseProps}
        state="confirmed"
        groups={oneItemGroup('DAIRY')}
        totalCount={1}
        pricedCount={1}
      />,
    );
    expect(screen.queryByText(/LOCKED/i)).toBeNull();
    expect(screen.getByText('CONFIRMED QUOTE')).toBeInTheDocument();
  });

  it('reads "ACCEPTED" (no LOCKED suffix) once the chef has accepted', () => {
    render(
      <QuoteStateDocument
        {...baseProps}
        state="confirmed"
        accepted
        groups={oneItemGroup('DAIRY')}
        totalCount={1}
        pricedCount={1}
      />,
    );
    expect(screen.queryByText(/LOCKED/i)).toBeNull();
    // "ACCEPTED" legitimately renders twice — once in the eyebrow, once on
    // the seal badge — so assert on the count rather than a single match.
    expect(screen.getAllByText('ACCEPTED').length).toBeGreaterThanOrEqual(2);
  });
});

describe('QuoteStateDocument - Constitution XI state mapping (BE PR #318 lockstep)', () => {
  it('maps a pre-terminal XI state (ready_to_send) to the non-final preview chrome, not confirmed', () => {
    expect(stateFromQuoteState('ready_to_send')).toBe('preview');

    render(
      <QuoteStateDocument
        {...baseProps}
        state={stateFromQuoteState('ready_to_send')}
        quoteState="ready_to_send"
        groups={oneItemGroup('DAIRY')}
        totalCount={1}
        pricedCount={0}
      />,
    );
    expect(screen.queryByText('CONFIRMED QUOTE')).toBeNull();
    expect(screen.queryByText(/CONFIRMED/i)).toBeNull();
    expect(screen.getByText('PREVIEW QUOTE · NOT YET PRICED')).toBeInTheDocument();
  });

  it('maps every other XI in-progress state to the non-final preview chrome as well', () => {
    const inProgressStates = [
      'received',
      'preparing',
      'validating',
      'ready_for_review',
      'needs_rep_decision',
      'sending',
    ];
    for (const s of inProgressStates) {
      expect(stateFromQuoteState(s)).toBe('preview');
    }
  });

  it('defaults an unknown/future state to the safe non-final preview chrome, not confirmed', () => {
    expect(stateFromQuoteState('some_future_state_318b')).toBe('preview');

    render(
      <QuoteStateDocument
        {...baseProps}
        state={stateFromQuoteState('some_future_state_318b')}
        quoteState="some_future_state_318b"
        groups={oneItemGroup('DAIRY')}
        totalCount={1}
        pricedCount={0}
      />,
    );
    expect(screen.queryByText('CONFIRMED QUOTE')).toBeNull();
    expect(screen.getByText('PREVIEW QUOTE · NOT YET PRICED')).toBeInTheDocument();
  });

  it('maps XI "sent" to the confirmed/locked document chrome, reading CONFIRMED QUOTE (not ACCEPTED)', () => {
    expect(stateFromQuoteState('sent')).toBe('confirmed');

    render(
      <QuoteStateDocument
        {...baseProps}
        state={stateFromQuoteState('sent')}
        quoteState="sent"
        groups={oneItemGroup('DAIRY')}
        totalCount={1}
        pricedCount={1}
      />,
    );
    expect(screen.getByText('CONFIRMED QUOTE')).toBeInTheDocument();
    expect(screen.queryByText('ACCEPTED')).toBeNull();
  });

  it('maps XI "accepted" to the confirmed document chrome reading ACCEPTED', () => {
    expect(stateFromQuoteState('accepted')).toBe('confirmed');

    render(
      <QuoteStateDocument
        {...baseProps}
        state={stateFromQuoteState('accepted')}
        quoteState="accepted"
        groups={oneItemGroup('DAIRY')}
        totalCount={1}
        pricedCount={1}
      />,
    );
    expect(screen.queryByText(/LOCKED/i)).toBeNull();
    expect(screen.getAllByText('ACCEPTED').length).toBeGreaterThanOrEqual(2);
  });
});
