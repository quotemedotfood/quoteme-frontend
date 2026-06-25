// repCoverageState.test.ts — B-45
//
// Verifies that the coverage badge never fires a positive signal when the
// quote has 0 or fewer than MIN_COMPONENTS_FOR_COVERAGE (3) components.
//
// Spec:
//   • 0 components → 'empty' (never 'ready' / STRONG COVERAGE)
//   • 1 component  → 'empty' (below threshold)
//   • 2 components → 'empty' (below threshold)
//   • 3 components, fully aligned  → 'ready' (STRONG COVERAGE — threshold met)
//   • 3 components, some misses    → 'coverage' (THIN)
//   • 3 components, some flagged   → 'review' (PARTIAL)
//   • Any count ≥ 3 with all aligned → 'ready'

import { describe, it, expect } from 'vitest';
import { deriveRepMatchState, MIN_COMPONENTS_FOR_COVERAGE } from './repCoverageState';
import type { QuoteLineResponse } from '../services/api';

// ── Helpers to build minimal QuoteLineResponse stubs ─────────────────────────

function aligned(overrides: Partial<QuoteLineResponse> = {}): QuoteLineResponse {
  return {
    id: 'line-1',
    availability_status: 'in_catalog',
    product: { product: 'Chicken Breast', brand: 'Acme', pack_size: '10lb', id: 'p1' } as any,
    alignment_selected: 1,
    alignment_candidates: [],
    category: 'Proteins',
    component: null,
    unit_price_cents: 1000,
    ...overrides,
  } as QuoteLineResponse;
}

function missed(overrides: Partial<QuoteLineResponse> = {}): QuoteLineResponse {
  return aligned({
    availability_status: 'not_in_catalog',
    product: null,
    ...overrides,
  });
}

function flagged(overrides: Partial<QuoteLineResponse> = {}): QuoteLineResponse {
  return aligned({
    alignment_selected: 0,
    ...overrides,
  });
}

function makeLines(count: number, factory = aligned): QuoteLineResponse[] {
  return Array.from({ length: count }, (_, i) =>
    factory({ id: `line-${i}` } as Partial<QuoteLineResponse>),
  );
}

// ── Threshold constant ────────────────────────────────────────────────────────

describe('MIN_COMPONENTS_FOR_COVERAGE', () => {
  it('is 3', () => {
    expect(MIN_COMPONENTS_FOR_COVERAGE).toBe(3);
  });
});

// ── Below-threshold cases (B-45 core) ────────────────────────────────────────

describe('deriveRepMatchState — below threshold → never a positive signal', () => {
  it('returns "empty" for 0 components (0/0 must never be STRONG COVERAGE)', () => {
    expect(deriveRepMatchState([])).toBe('empty');
  });

  it('returns "empty" for 1 component', () => {
    expect(deriveRepMatchState(makeLines(1))).toBe('empty');
  });

  it('returns "empty" for 2 components', () => {
    expect(deriveRepMatchState(makeLines(2))).toBe('empty');
  });

  it('returns "empty" even when 1 component is a miss (still below threshold)', () => {
    expect(deriveRepMatchState([missed()])).toBe('empty');
  });

  it('returns "empty" even when 2 components are all misses (still below threshold)', () => {
    expect(deriveRepMatchState([missed(), missed()])).toBe('empty');
  });
});

// ── At-threshold cases — positive signals only when count ≥ 3 ────────────────

describe('deriveRepMatchState — at threshold (3 components)', () => {
  it('returns "ready" (STRONG COVERAGE) when all 3 lines are aligned', () => {
    expect(deriveRepMatchState(makeLines(3))).toBe('ready');
  });

  it('returns "coverage" (THIN) when any line is a miss', () => {
    expect(deriveRepMatchState([aligned(), aligned(), missed()])).toBe('coverage');
  });

  it('returns "review" (PARTIAL) when no misses but some lines are flagged', () => {
    expect(deriveRepMatchState([aligned(), aligned(), flagged()])).toBe('review');
  });
});

// ── Above-threshold cases ─────────────────────────────────────────────────────

describe('deriveRepMatchState — above threshold', () => {
  it('returns "ready" for a full aligned quote with many lines', () => {
    expect(deriveRepMatchState(makeLines(10))).toBe('ready');
  });

  it('returns "coverage" when any line is not_in_catalog', () => {
    const lines = [...makeLines(9), missed()];
    expect(deriveRepMatchState(lines)).toBe('coverage');
  });

  it('returns "coverage" when any line has no product', () => {
    const lines = [...makeLines(9), missed({ availability_status: 'in_catalog' as any })];
    // no product still triggers 'coverage'
    expect(deriveRepMatchState(lines)).toBe('coverage');
  });

  it('returns "review" when all lines have products but some are flagged (alignment_selected=0)', () => {
    const lines = [...makeLines(9), flagged()];
    expect(deriveRepMatchState(lines)).toBe('review');
  });

  it('misses take priority over flagged lines', () => {
    // Even when flagged lines exist, a miss should win → 'coverage' not 'review'
    const lines = [aligned(), flagged(), missed()];
    expect(deriveRepMatchState(lines)).toBe('coverage');
  });
});
