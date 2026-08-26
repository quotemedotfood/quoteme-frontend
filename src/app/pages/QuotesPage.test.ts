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
import { isClosedQuote, CLOSED_STATUSES, getStatusDisplayLabel } from './QuotesPage';

describe('isClosedQuote — hides Requote button for closed quotes', () => {
  it('returns true for "won", the one status that closes a quote today', () => {
    expect(isClosedQuote('won')).toBe(true);
  });

  it('returns false for "draft" (open quote)', () => {
    expect(isClosedQuote('draft')).toBe(false);
  });

  it('returns false for "sent" (open quote)', () => {
    expect(isClosedQuote('sent')).toBe(false);
  });

  it('returns false for "pending" (fail-open — do not hide button)', () => {
    expect(isClosedQuote('pending')).toBe(false);
  });

  // Behaviour-preserving record of the two open questions. 'lost' is terminal
  // backend-side (VALID_TRANSITIONS maps it to []) yet Requote is still offered
  // on it; 'expired' correctly stays open because it transitions back to
  // 'draft'. Asserting today's behaviour so a deliberate change trips here
  // rather than passing silently.
  it('currently returns false for "lost" — OPEN QUESTION, see CLOSED_STATUSES', () => {
    expect(isClosedQuote('lost')).toBe(false);
  });

  it('returns false for "expired", which is requotable by design', () => {
    expect(isClosedQuote('expired')).toBe(false);
  });
});

describe('CLOSED_STATUSES — contains only reachable STATUS values', () => {
  it('is exactly ["won"]', () => {
    expect([...CLOSED_STATUSES]).toEqual(['won']);
  });

  it('holds no J1 state tokens, which can never arrive on `status`', () => {
    // These three are `state` values. A regression that puts them back here
    // would be dead weight at best and a silent widening at worst.
    expect(CLOSED_STATUSES as readonly string[]).not.toContain('confirmed');
    expect(CLOSED_STATUSES as readonly string[]).not.toContain('accepted');
    expect(CLOSED_STATUSES as readonly string[]).not.toContain('declined');
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
