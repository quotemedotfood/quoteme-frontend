// QuotesPage.test.ts
// Pure-function tests for the isClosedQuote guard that hides the Requote button
// on closed quotes (Justin lock R3 [44]).
//
// Axis: QuoteListItem.status (the only field exposed by the index endpoint).
// Closed statuses: won (legacy) | confirmed | accepted | declined (J1 axis)

import { describe, it, expect } from 'vitest';
import { isClosedQuote, CLOSED_STATUSES } from './QuotesPage';

describe('isClosedQuote — hides Requote button for closed quotes', () => {
  it('returns true for legacy "won"', () => {
    expect(isClosedQuote('won')).toBe(true);
  });

  it('returns true for J1 "confirmed"', () => {
    expect(isClosedQuote('confirmed')).toBe(true);
  });

  it('returns true for J1 "accepted"', () => {
    expect(isClosedQuote('accepted')).toBe(true);
  });

  it('returns true for J1 "declined"', () => {
    expect(isClosedQuote('declined')).toBe(true);
  });

  it('returns false for "draft" (open quote)', () => {
    expect(isClosedQuote('draft')).toBe(false);
  });

  it('returns false for "sent" (open quote)', () => {
    expect(isClosedQuote('sent')).toBe(false);
  });

  it('returns false for unknown status (fail-open — do not hide button)', () => {
    expect(isClosedQuote('pending')).toBe(false);
  });
});

describe('CLOSED_STATUSES — exhaustive list matches spec', () => {
  it('contains exactly the 4 closed states (won + 3 J1)', () => {
    expect([...CLOSED_STATUSES].sort()).toEqual(['accepted', 'confirmed', 'declined', 'won']);
  });
});
