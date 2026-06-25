import { describe, it, expect } from 'vitest';
import { billingPlanLabel } from './quotaGate';

// B-141 — billingPlanLabel drives the "current plan" display in ChefSettingsTab
// (mobile + desktop billing sections). Replaces hardcoded "Free".

describe('billingPlanLabel', () => {
  it('returns null when billing is null (not yet loaded)', () => {
    expect(billingPlanLabel(null)).toBeNull();
  });

  it('returns null when billing is undefined', () => {
    expect(billingPlanLabel(undefined)).toBeNull();
  });

  it('returns "Free" for a free-tier user', () => {
    expect(billingPlanLabel({ has_paid_subscription: false })).toBe('Free');
  });

  it('returns "Free" for a free-tier user with quota fields', () => {
    expect(billingPlanLabel({
      has_paid_subscription: false,
      quotes_used: 3,
      quotes_limit: 5,
    })).toBe('Free');
  });

  it('returns "Pro · $20/month" for a paid subscriber with full fields', () => {
    expect(billingPlanLabel({
      has_paid_subscription: true,
      plan_name: 'Pro',
      price_dollars: 20,
      interval: 'month',
    })).toBe('Pro · $20/month');
  });

  it('falls back to "Premium" when plan_name is absent', () => {
    expect(billingPlanLabel({
      has_paid_subscription: true,
      price_dollars: 20,
      interval: 'month',
    })).toBe('Premium · $20/month');
  });

  it('falls back to "month" when interval is absent', () => {
    expect(billingPlanLabel({
      has_paid_subscription: true,
      plan_name: 'Pro',
      price_dollars: 20,
    })).toBe('Pro · $20/month');
  });

  it('omits price segment when price_dollars is null', () => {
    expect(billingPlanLabel({
      has_paid_subscription: true,
      plan_name: 'Pro',
      price_dollars: null,
    })).toBe('Pro');
  });

  it('handles annual billing interval', () => {
    expect(billingPlanLabel({
      has_paid_subscription: true,
      plan_name: 'Pro',
      price_dollars: 200,
      interval: 'year',
    })).toBe('Pro · $200/year');
  });
});
