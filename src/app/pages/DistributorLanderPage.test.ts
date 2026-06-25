// Tests for DistributorLanderPage — pure-logic exports only (no DOM).
// formatOpportunityRef converts a UUID to a short QM-XXXXXXXX reference code.

import { describe, it, expect } from 'vitest';
import { formatOpportunityRef } from './DistributorLanderPage';

describe('formatOpportunityRef', () => {
  it('returns null for null input', () => {
    expect(formatOpportunityRef(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatOpportunityRef(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(formatOpportunityRef('')).toBeNull();
  });

  it('formats a UUID to QM-XXXXXXXX (last 8 hex chars, upper-cased)', () => {
    expect(formatOpportunityRef('550e8400-e29b-41d4-a716-446655440000'))
      .toBe('QM-55440000');
  });

  it('formats a UUID with no dashes', () => {
    expect(formatOpportunityRef('550e8400e29b41d4a716446655440000'))
      .toBe('QM-55440000');
  });
});
