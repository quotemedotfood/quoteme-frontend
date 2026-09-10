// unmatch.test.ts
//
// Unit cover for the Unmatch helpers. These are a NEW module, so unlike the
// component tests in this feature they cannot fail against the pre-fix source
// (the module is itself part of the change). They are here to pin two things
// that are easy to get wrong later:
//
//   1. Reading safely against a backend that has not shipped the new
//      miss_reason value yet. Until Claudio's half lands, every line carries
//      an engine reason, and nothing here may change how those render.
//   2. Both candidate role rulings, so that landing the endpoint's guard is a
//      one-line change at the call site rather than a design pass.

import { describe, it, expect } from 'vitest';
import {
  isRepUnmatched,
  unresolvedChipLabel,
  canUnmatchRole,
  REP_UNMATCHED_MISS_REASON,
  REP_UNMATCHED_LABEL,
} from './unmatch';

describe('isRepUnmatched', () => {
  it('is true only for a not_in_catalog line carrying the rep-authored reason', () => {
    expect(
      isRepUnmatched({ availability_status: 'not_in_catalog', miss_reason: REP_UNMATCHED_MISS_REASON }),
    ).toBe(true);
  });

  it('is false for every engine miss reason', () => {
    for (const reason of [
      'no_retrieval',
      'gate_failure',
      'threshold_failure',
      'cross_family_block',
      'no_defensible_candidate',
    ]) {
      expect(isRepUnmatched({ availability_status: 'not_in_catalog', miss_reason: reason })).toBe(false);
    }
  });

  it('is false when the backend has not shipped the value yet (null or absent)', () => {
    expect(isRepUnmatched({ availability_status: 'not_in_catalog', miss_reason: null })).toBe(false);
    expect(isRepUnmatched({ availability_status: 'not_in_catalog' })).toBe(false);
  });

  it('is false for a matched line, whatever reason it somehow carries', () => {
    expect(
      isRepUnmatched({ availability_status: 'available', miss_reason: REP_UNMATCHED_MISS_REASON }),
    ).toBe(false);
  });

  it('is false for a missing line rather than throwing', () => {
    expect(isRepUnmatched(null)).toBe(false);
    expect(isRepUnmatched(undefined)).toBe(false);
  });
});

describe('unresolvedChipLabel', () => {
  it('says the component is not carried when the rep said so', () => {
    expect(
      unresolvedChipLabel(
        { availability_status: 'not_in_catalog', miss_reason: REP_UNMATCHED_MISS_REASON },
        'Awaiting rep review',
      ),
    ).toBe(REP_UNMATCHED_LABEL);
  });

  it('never tells a rep who just unmatched that the line awaits their review', () => {
    const label = unresolvedChipLabel(
      { availability_status: 'not_in_catalog', miss_reason: REP_UNMATCHED_MISS_REASON },
      'Awaiting rep review',
    );
    expect(label).not.toMatch(/awaiting/i);
    expect(label).not.toMatch(/review/i);
  });

  it("passes the server's own resolution_label straight through for an engine miss", () => {
    expect(
      unresolvedChipLabel(
        { availability_status: 'not_in_catalog', miss_reason: 'no_retrieval' },
        'Pending distributor confirmation',
      ),
    ).toBe('Pending distributor confirmation');
  });

  it('keeps the existing fallback when the server sends no label', () => {
    expect(
      unresolvedChipLabel({ availability_status: 'not_in_catalog', miss_reason: 'gate_failure' }, null),
    ).toBe('Awaiting rep review');
    expect(unresolvedChipLabel({ availability_status: 'not_in_catalog' })).toBe('Awaiting rep review');
  });
});

describe('canUnmatchRole', () => {
  it('admits a rep under either ruling', () => {
    expect(canUnmatchRole('rep', 'rep_only')).toBe(true);
    expect(canUnmatchRole('rep', 'rep_and_distributor_admin')).toBe(true);
  });

  it('refuses a distributor_admin under the rep-only ruling', () => {
    expect(canUnmatchRole('distributor_admin', 'rep_only')).toBe(false);
  });

  it('admits a distributor_admin only under the wider ruling', () => {
    expect(canUnmatchRole('distributor_admin', 'rep_and_distributor_admin')).toBe(true);
  });

  it('refuses quoteme_admin under BOTH rulings, because block_quoteme_admin_rep_write! does', () => {
    expect(canUnmatchRole('quoteme_admin', 'rep_only')).toBe(false);
    expect(canUnmatchRole('quoteme_admin', 'rep_and_distributor_admin')).toBe(false);
  });

  it('refuses restaurant-side roles and an absent role', () => {
    for (const ruling of ['rep_only', 'rep_and_distributor_admin'] as const) {
      expect(canUnmatchRole('chef', ruling)).toBe(false);
      expect(canUnmatchRole('restaurant_admin', ruling)).toBe(false);
      expect(canUnmatchRole(null, ruling)).toBe(false);
      expect(canUnmatchRole(undefined, ruling)).toBe(false);
    }
  });
});
