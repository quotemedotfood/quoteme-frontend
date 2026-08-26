// QuotesPage.test.ts
// Pure-function tests for the isClosedQuote guard that hides the Requote button
// on closed quotes (Justin lock R3 [44]).
//
// Axis: QuoteListItem.status. The header here used to add "(the only field
// exposed by the index endpoint)" and to list the closed set as
// "won (legacy) | confirmed | accepted | declined (J1 axis)". Both halves were
// wrong, and this suite locked the wrong half in:
//
//   * The index endpoint exposes `state` as well as `status`.
//   * 'confirmed' / 'accepted' / 'declined' are J1 `state` values, NOT statuses.
//     Quote::VALID_STATUSES is
//     [processing draft pending assigned sent won lost expired] and the backend
//     validates inclusion, so none of the three can ever reach `status`.
//
// So the old assertions below drove isClosedQuote with inputs production cannot
// produce, and the CLOSED_STATUSES assertion pinned a list where 3 of 4 entries
// were unreachable. Rewritten to assert the reachable contract, plus explicit
// negative assertions that the chef-flow tokens are not statuses (mirroring
// the Ruby side in spec/models/quote_spec.rb).

import { describe, it, expect } from 'vitest';
import { isClosedQuote, CLOSED_STATUSES, CLOSED_STATES, getStatusDisplayLabel } from './QuotesPage';

describe('isClosedQuote — hides Requote on quotes that cannot move again', () => {
  // ── status axis ──────────────────────────────────────────────────────────
  it('closes on status "won"', () => {
    expect(isClosedQuote({ status: 'won' })).toBe(true);
  });

  // MOOSE RULING 2026-08-26: Requote must not be offered on lost quotes.
  // 'lost' is terminal server-side (VALID_TRANSITIONS maps it to []).
  it('closes on status "lost" (ruling 2026-08-26)', () => {
    expect(isClosedQuote({ status: 'lost' })).toBe(true);
  });

  // ── state axis, honoured per the same ruling ─────────────────────────────
  it('closes on state "accepted" even while status is still open', () => {
    expect(isClosedQuote({ status: 'draft', state: 'accepted' })).toBe(true);
  });

  it('closes on state "declined" even while status is still open', () => {
    expect(isClosedQuote({ status: 'pending', state: 'declined' })).toBe(true);
  });

  // ── deliberately still open ──────────────────────────────────────────────
  it('stays open on status "expired" — requotable by design (expired -> draft)', () => {
    expect(isClosedQuote({ status: 'expired' })).toBe(false);
  });

  it('stays open on state "expired" — a new quote is the remedy', () => {
    expect(isClosedQuote({ status: 'sent', state: 'expired' })).toBe(false);
  });

  // UNDECIDED, asserted at today's behaviour so a ruling trips this test
  // rather than passing silently. The rep has sent a priced quote back and the
  // chef has not answered; isLockedQuoteState calls that locked for DISPLAY,
  // which is a different question from whether fresh pricing may be requested.
  it('currently stays open on state "confirmed" — OPEN QUESTION', () => {
    expect(isClosedQuote({ status: 'sent', state: 'confirmed' })).toBe(false);
  });

  it('stays open for "draft" / "sent" / "pending" with no state', () => {
    expect(isClosedQuote({ status: 'draft' })).toBe(false);
    expect(isClosedQuote({ status: 'sent' })).toBe(false);
    expect(isClosedQuote({ status: 'pending' })).toBe(false);
  });

  it('stays open on an empty signal set (fail-open — do not hide the button)', () => {
    expect(isClosedQuote({})).toBe(false);
    expect(isClosedQuote({ status: null, state: null })).toBe(false);
  });
});

describe('CLOSED_STATUSES / CLOSED_STATES — each axis holds only its own vocabulary', () => {
  it('CLOSED_STATUSES is exactly the terminal STATUS values', () => {
    expect([...CLOSED_STATUSES].sort()).toEqual(['lost', 'won']);
  });

  it('CLOSED_STATES is exactly the chef-acted STATE values', () => {
    expect([...CLOSED_STATES].sort()).toEqual(['accepted', 'declined']);
  });

  it('holds no state tokens on the status axis, and vice versa', () => {
    // The two-vocabulary trap: Quote::VALID_STATUSES is
    // [processing draft pending assigned sent won lost expired], so a state
    // token on the status axis is unreachable code, and a status token on the
    // state axis is the mirror error.
    for (const stateToken of ['accepted', 'declined', 'confirmed', 'preview', 'distributor_quote']) {
      expect(CLOSED_STATUSES as readonly string[]).not.toContain(stateToken);
    }
    for (const statusToken of ['won', 'lost', 'draft', 'sent', 'pending']) {
      expect(CLOSED_STATES as readonly string[]).not.toContain(statusToken);
    }
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

  it('accepted → "Accepted" (J1 state passes through unchanged)', () => {
    expect(getStatusDisplayLabel('accepted')).toBe('Accepted');
  });

  it('declined → "Closed" (J1 state passes through unchanged)', () => {
    expect(getStatusDisplayLabel('declined')).toBe('Closed');
  });
});

// ─── INTERIM P1-3 (2026-07): quote-status-display patch ──────────────────────
//
// Bug: `status` is frozen at 'sent' for the entire post-send resting period
// (waiting on a rep, rep actively pricing, and rep-priced-and-ready are all
// the same stored value), so every sent quote rendered "Rep pricing" forever
// -- even once it was ready or resolved. Fixed locally in QuotesPage (NOT in
// the shared legacyStatusToState, which stays correct for the chef-facing
// QuoteStatusPill where "Rep pricing" while status is 'sent' is accurate
// copy). A genuine sent/won signal on `status` now drives the label
// directly; a row that is genuinely still in rep pricing (a real `state` of
// 'distributor_quote' from BE) still reads "Rep pricing".

describe('getStatusDisplayLabel - INTERIM P1-3 sent/state precedence', () => {
  it('sent → "Sent" (not "Rep pricing" -- the P1-3 bug)', () => {
    expect(getStatusDisplayLabel('sent')).toBe('Sent');
  });

  it('won → "Accepted" even when a stale BE `state` still says distributor_quote', () => {
    expect(getStatusDisplayLabel('won', 'distributor_quote')).toBe('Accepted');
  });

  it('a genuinely-still-pricing row (real state distributor_quote, non-sent status) still reads "Rep pricing"', () => {
    expect(getStatusDisplayLabel('pending', 'distributor_quote')).toBe('Rep pricing');
  });

  it('draft is unaffected by a present state override', () => {
    expect(getStatusDisplayLabel('draft', 'preview')).toBe('Awaiting rep');
  });
});
