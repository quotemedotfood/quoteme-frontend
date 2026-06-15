// B-01: "Match to Catalog" must not fire a request that 422s silently when a rep
// is in customer mode but hasn't picked a customer. Pure-function test for the
// inline-validation guard (mirrors QuotesPage.test.ts style).
import { describe, it, expect } from 'vitest';
import { customerSelectionError } from './StartNewQuotePage';

describe('customerSelectionError — B-01 inline validation', () => {
  const base = { isAuthedRep: true, isQuoteOpened: false, isBuyerRole: false, hasCustomer: false };

  it('blocks an authed rep in customer mode with no customer selected', () => {
    expect(customerSelectionError(base)).toBe('Select or add a customer to begin matching.');
  });

  it('allows once a customer is selected', () => {
    expect(customerSelectionError({ ...base, hasCustomer: true })).toBeNull();
  });

  it('allows an Open Quote (no customer needed by design)', () => {
    expect(customerSelectionError({ ...base, isQuoteOpened: true })).toBeNull();
  });

  it('does not apply to the guest/demo flow', () => {
    expect(customerSelectionError({ ...base, isAuthedRep: false })).toBeNull();
  });

  it('does not apply to buyer role (location-scoped, not customer-scoped)', () => {
    expect(customerSelectionError({ ...base, isBuyerRole: true })).toBeNull();
  });
});
