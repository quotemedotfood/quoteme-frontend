// QuotesPage.test.ts
// Pure-function tests for the isClosedQuote guard that hides the Requote button
// on closed quotes (Justin lock R3 [44]).
//
// Axis: QuoteListItem.status (the only field exposed by the index endpoint).
// Closed statuses: won (legacy) | confirmed | accepted | declined (J1 axis)

import { describe, it, expect } from 'vitest';
import { isClosedQuote, CLOSED_STATUSES, getStatusDisplayLabel } from './QuotesPage';

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

// ─── getStatusDisplayLabel — maps stored values to J1 display labels ──────────
//
// Hard constraint: 'won'/'lost' are the stored values; they must NEVER render
// as "Won"/"Lost" to the user. They must map through legacyStatusToState →
// quoteStatusLabel per the J1 locked label spec.

describe('getStatusDisplayLabel — display mapping for badge labels', () => {
  it('won → "Accepted" (never "Won")', () => {
    expect(getStatusDisplayLabel('won')).toBe('Accepted');
  });

  it('lost → "Closed" (never "Lost"; declined state maps to "Closed" per J1 spec)', () => {
    expect(getStatusDisplayLabel('lost')).toBe('Closed');
  });

  it('draft → "Awaiting rep" (maps through legacyStatusToState)', () => {
    expect(getStatusDisplayLabel('draft')).toBe('Awaiting rep');
  });

  it('sent → "Rep pricing" (maps through legacyStatusToState)', () => {
    expect(getStatusDisplayLabel('sent')).toBe('Rep pricing');
  });

  it('accepted → "Accepted" (J1 state passes through unchanged)', () => {
    expect(getStatusDisplayLabel('accepted')).toBe('Accepted');
  });

  it('declined → "Closed" (J1 state passes through unchanged)', () => {
    expect(getStatusDisplayLabel('declined')).toBe('Closed');
  });
});
