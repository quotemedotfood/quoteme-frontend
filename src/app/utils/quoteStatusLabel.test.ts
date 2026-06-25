// Tests for the shared quoteStatusLabel helper (H-3 fix).
//
// Verifies:
//   - 'pill' context produces J1-locked labels (must match QuoteStatusPill).
//   - 'header' context produces the longer document labels.
//   - isLockedQuoteState covers all terminal-state conditions (H-2/H-5 gate).
//   - isAcceptedQuoteState identifies accepted/won quotes.

import { describe, it, expect } from 'vitest';
import { quoteStatusLabel, isLockedQuoteState, isAcceptedQuoteState } from './quoteStatusLabel';
import { legacyStatusToState } from '../components/chef/QuoteStatusPill';

// ─── quoteStatusLabel — pill context (J1 lock) ────────────────────────────────

describe('quoteStatusLabel — pill context (default, J1-locked)', () => {
  it('preview → "Awaiting rep"', () => {
    expect(quoteStatusLabel('preview')).toBe('Awaiting rep');
  });

  it('distributor_quote → "Rep pricing"', () => {
    expect(quoteStatusLabel('distributor_quote')).toBe('Rep pricing');
  });

  it('confirmed → "Ready" (list / pill)', () => {
    expect(quoteStatusLabel('confirmed')).toBe('Ready');
  });

  it('confirmed → "Ready" when context is explicitly "pill"', () => {
    expect(quoteStatusLabel('confirmed', 'pill')).toBe('Ready');
  });

  it('accepted → "Accepted"', () => {
    expect(quoteStatusLabel('accepted')).toBe('Accepted');
  });

  it('declined → "Closed"', () => {
    expect(quoteStatusLabel('declined')).toBe('Closed');
  });

  it('expired → "Expired"', () => {
    expect(quoteStatusLabel('expired')).toBe('Expired');
  });

  it('unknown state passes through raw value', () => {
    expect(quoteStatusLabel('some_future_state')).toBe('some_future_state');
  });
});

// ─── quoteStatusLabel — header context ────────────────────────────────────────

describe('quoteStatusLabel — header context', () => {
  it('confirmed → "Confirmed Quote" in header context', () => {
    expect(quoteStatusLabel('confirmed', 'header')).toBe('Confirmed Quote');
  });

  it('preview → same label in header context', () => {
    expect(quoteStatusLabel('preview', 'header')).toBe('Awaiting rep');
  });

  it('accepted → same label in header context', () => {
    expect(quoteStatusLabel('accepted', 'header')).toBe('Accepted');
  });
});

// ─── Banned labels ─────────────────────────────────────────────────────────────

describe('banned labels — "Ordered" and "Used" must NEVER appear', () => {
  const allStates = ['preview', 'distributor_quote', 'confirmed', 'accepted', 'declined', 'expired'];
  for (const state of allStates) {
    it(`state "${state}" pill does not produce "Ordered" or "Used"`, () => {
      expect(quoteStatusLabel(state)).not.toMatch(/ordered/i);
      expect(quoteStatusLabel(state)).not.toMatch(/used/i);
    });
  }
});

// ─── isLockedQuoteState (H-2 / H-5 gate) ─────────────────────────────────────

describe('isLockedQuoteState', () => {
  it('won status is locked', () => {
    expect(isLockedQuoteState({ status: 'won' })).toBe(true);
  });

  it('lost status is locked', () => {
    expect(isLockedQuoteState({ status: 'lost' })).toBe(true);
  });

  it('J1 accepted state is locked', () => {
    expect(isLockedQuoteState({ state: 'accepted' })).toBe(true);
  });

  it('J1 declined state is locked', () => {
    expect(isLockedQuoteState({ state: 'declined' })).toBe(true);
  });

  it('J1 expired state is locked', () => {
    expect(isLockedQuoteState({ state: 'expired' })).toBe(true);
  });

  it('J1 confirmed state is locked (H-2: no pending badge on confirmed quote)', () => {
    expect(isLockedQuoteState({ state: 'confirmed' })).toBe(true);
  });

  it('confirmed quote_type is locked', () => {
    expect(isLockedQuoteState({ quote_type: 'confirmed' })).toBe(true);
  });

  it('draft status is NOT locked', () => {
    expect(isLockedQuoteState({ status: 'draft' })).toBe(false);
  });

  it('preview state is NOT locked', () => {
    expect(isLockedQuoteState({ state: 'preview' })).toBe(false);
  });

  it('distributor_quote state is NOT locked', () => {
    expect(isLockedQuoteState({ state: 'distributor_quote' })).toBe(false);
  });

  it('empty object is NOT locked', () => {
    expect(isLockedQuoteState({})).toBe(false);
  });
});

// ─── legacyStatusToState + quoteStatusLabel end-to-end ───────────────────────
//
// Verifies the full display pipeline used by QuotesPage badge rendering:
//   legacyStatusToState('won') → 'accepted' → quoteStatusLabel → 'Accepted'
//   legacyStatusToState('lost') → 'declined' → quoteStatusLabel → 'Closed'

describe('legacyStatusToState — legacy storage values map to J1 states', () => {
  it('won → accepted', () => {
    expect(legacyStatusToState('won')).toBe('accepted');
  });

  it('lost → declined', () => {
    expect(legacyStatusToState('lost')).toBe('declined');
  });
});

describe('full pipeline: legacyStatusToState + quoteStatusLabel', () => {
  it('won → accepted → "Accepted"', () => {
    expect(quoteStatusLabel(legacyStatusToState('won'))).toBe('Accepted');
  });

  it('lost → declined → "Closed"', () => {
    expect(quoteStatusLabel(legacyStatusToState('lost'))).toBe('Closed');
  });
});

// ─── isAcceptedQuoteState ──────────────────────────────────────────────────────

describe('isAcceptedQuoteState', () => {
  it('J1 "accepted" state is accepted', () => {
    expect(isAcceptedQuoteState('accepted')).toBe(true);
  });

  it('legacy "won" status is accepted', () => {
    expect(isAcceptedQuoteState('won')).toBe(true);
  });

  it('confirmed is NOT accepted (still awaiting chef)', () => {
    expect(isAcceptedQuoteState('confirmed')).toBe(false);
  });

  it('null/undefined is NOT accepted', () => {
    expect(isAcceptedQuoteState(null)).toBe(false);
    expect(isAcceptedQuoteState(undefined)).toBe(false);
  });
});
