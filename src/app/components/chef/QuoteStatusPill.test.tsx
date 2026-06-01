// QuoteStatusPill.test.tsx
// Unit tests for the J1 state-machine pill helper.
// Pure-function tests only — no DOM/React rendering needed.
//
// Justin-locked mapping (do NOT change labels):
//   preview           → "Awaiting rep"
//   distributor_quote → "Rep pricing"
//   confirmed         → "Ready"
//   accepted          → "Accepted"
//   declined          → "Closed"
//   expired           → "Expired"

import { describe, it, expect } from 'vitest';
import {
  getQuoteStatusPillProps,
  getQuoteStatusPillPropsLegacy,
  legacyStatusToState,
} from './QuoteStatusPill';

// ─── J1 state → label mapping (Justin-locked) ─────────────────────────────────

describe('getQuoteStatusPillProps — J1 state machine', () => {
  it('preview → "Awaiting rep"', () => {
    expect(getQuoteStatusPillProps('preview').label).toBe('Awaiting rep');
  });

  it('distributor_quote → "Rep pricing"', () => {
    expect(getQuoteStatusPillProps('distributor_quote').label).toBe('Rep pricing');
  });

  it('confirmed → "Ready"', () => {
    expect(getQuoteStatusPillProps('confirmed').label).toBe('Ready');
  });

  it('accepted → "Accepted"', () => {
    expect(getQuoteStatusPillProps('accepted').label).toBe('Accepted');
  });

  it('declined → "Closed"', () => {
    expect(getQuoteStatusPillProps('declined').label).toBe('Closed');
  });

  it('expired → "Expired"', () => {
    expect(getQuoteStatusPillProps('expired').label).toBe('Expired');
  });

  it('unknown state renders the raw value (no crash)', () => {
    expect(getQuoteStatusPillProps('some_unknown_future_state').label).toBe('some_unknown_future_state');
  });
});

// ─── Banned labels — Justin Q1 lock ───────────────────────────────────────────

describe('banned labels — "Ordered" and "Used" must NEVER appear', () => {
  const allStates = ['preview', 'distributor_quote', 'confirmed', 'accepted', 'declined', 'expired'];

  allStates.forEach((state) => {
    it(`state "${state}" does not produce "Ordered" or "Used"`, () => {
      const { label } = getQuoteStatusPillProps(state);
      expect(label).not.toMatch(/ordered/i);
      expect(label).not.toMatch(/used/i);
    });
  });
});

// ─── Legacy status → state bridge ─────────────────────────────────────────────

describe('legacyStatusToState', () => {
  it('draft → preview', () => expect(legacyStatusToState('draft')).toBe('preview'));
  it('sent → distributor_quote', () => expect(legacyStatusToState('sent')).toBe('distributor_quote'));
  it('pending → confirmed', () => expect(legacyStatusToState('pending')).toBe('confirmed'));
  it('assigned → confirmed', () => expect(legacyStatusToState('assigned')).toBe('confirmed'));
  it('won → accepted', () => expect(legacyStatusToState('won')).toBe('accepted'));
  it('lost → declined', () => expect(legacyStatusToState('lost')).toBe('declined'));
  it('expired → expired', () => expect(legacyStatusToState('expired')).toBe('expired'));
  it('unknown legacy status passes through', () => expect(legacyStatusToState('mystery')).toBe('mystery'));
});

// ─── Legacy shim (getQuoteStatusPillPropsLegacy) ──────────────────────────────

describe('getQuoteStatusPillPropsLegacy — legacy fallback via shim', () => {
  it('legacy "won" renders "Accepted"', () => {
    expect(getQuoteStatusPillPropsLegacy('won').label).toBe('Accepted');
  });

  it('legacy "lost" renders "Closed"', () => {
    expect(getQuoteStatusPillPropsLegacy('lost').label).toBe('Closed');
  });

  it('legacy "pending" renders "Ready"', () => {
    expect(getQuoteStatusPillPropsLegacy('pending').label).toBe('Ready');
  });

  it('legacy "won" does not produce "Ordered"', () => {
    expect(getQuoteStatusPillPropsLegacy('won').label).not.toMatch(/ordered/i);
  });
});
