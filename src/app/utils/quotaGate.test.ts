import { describe, it, expect } from 'vitest';
import { shouldShowSubscribeCta, quotaDisplayText } from './quotaGate';

// C-2 / B-28 — subscribe CTA gating logic + quota display text

describe('shouldShowSubscribeCta', () => {
  it('returns false when billing is null (no data loaded yet)', () => {
    expect(shouldShowSubscribeCta(null)).toBe(false);
  });

  it('returns false when billing is undefined', () => {
    expect(shouldShowSubscribeCta(undefined)).toBe(false);
  });

  it('returns false when user has a paid subscription', () => {
    expect(shouldShowSubscribeCta({ has_paid_subscription: true })).toBe(false);
  });

  it('returns false when free quota has quotes remaining (used < limit)', () => {
    // User has used 0 of 5 — CTA must NOT show
    expect(shouldShowSubscribeCta({
      has_paid_subscription: false,
      quotes_used: 0,
      quotes_limit: 5,
    })).toBe(false);
  });

  it('returns false when used = 1 (still 4 remaining)', () => {
    expect(shouldShowSubscribeCta({
      has_paid_subscription: false,
      quotes_used: 1,
      quotes_limit: 5,
    })).toBe(false);
  });

  it('returns false when used = 4, limit = 5 (1 remaining)', () => {
    expect(shouldShowSubscribeCta({
      has_paid_subscription: false,
      quotes_used: 4,
      quotes_limit: 5,
    })).toBe(false);
  });

  it('returns true when used = 5, limit = 5 (quota exactly exhausted)', () => {
    expect(shouldShowSubscribeCta({
      has_paid_subscription: false,
      quotes_used: 5,
      quotes_limit: 5,
    })).toBe(true);
  });

  it('returns true when used > limit (over quota)', () => {
    expect(shouldShowSubscribeCta({
      has_paid_subscription: false,
      quotes_used: 7,
      quotes_limit: 5,
    })).toBe(true);
  });
});

describe('quotaDisplayText', () => {
  it('returns empty string for null billing', () => {
    expect(quotaDisplayText(null)).toBe('');
  });

  it('returns empty string for paid subscriber', () => {
    expect(quotaDisplayText({ has_paid_subscription: true })).toBe('');
  });

  it('shows "0 of 5 quotes used · 5 left" when unused', () => {
    expect(quotaDisplayText({
      has_paid_subscription: false,
      quotes_used: 0,
      quotes_limit: 5,
    })).toBe('0 of 5 quotes used · 5 left');
  });

  it('shows "3 of 5 quotes used · 2 left" for mid-use', () => {
    expect(quotaDisplayText({
      has_paid_subscription: false,
      quotes_used: 3,
      quotes_limit: 5,
    })).toBe('3 of 5 quotes used · 2 left');
  });

  it('shows "5 of 5 quotes used · 0 left" at exhaustion', () => {
    expect(quotaDisplayText({
      has_paid_subscription: false,
      quotes_used: 5,
      quotes_limit: 5,
    })).toBe('5 of 5 quotes used · 0 left');
  });

  it('uses defaults (0 used, 5 limit) when fields absent', () => {
    expect(quotaDisplayText({ has_paid_subscription: false })).toBe(
      '0 of 5 quotes used · 5 left'
    );
  });
});
