// repCoverageState — pure coverage-state derivation for rep quote views.
//
// B-45: "STRONG COVERAGE" badge must NOT fire when there are 0 (or fewer than
//       MIN_COMPONENTS_FOR_COVERAGE) components. 0/0 = 100% is semantically
//       wrong — an empty extraction has zero coverage, not strong coverage.
//
// Threshold: a quote must have at least 3 components before any positive
// coverage signal (STRONG or PARTIAL) can be displayed. Below the threshold
// the state is 'empty', which callers must render as "No items extracted"
// or suppress the badge entirely.

import type { QuoteLineResponse } from '../services/api';

/** Minimum number of components required before any positive coverage signal. */
export const MIN_COMPONENTS_FOR_COVERAGE = 3;

/**
 * Coverage state for the rep quote surface.
 *
 *   ready    → STRONG COVERAGE — all lines aligned, count ≥ threshold
 *   review   → PARTIAL COVERAGE — some lines flagged, count ≥ threshold
 *   coverage → THIN COVERAGE — one or more misses, count ≥ threshold
 *   empty    → no items extracted (count < threshold) — show nothing positive
 */
export type RepMatchState = 'ready' | 'review' | 'coverage' | 'empty';

/**
 * Derives the rep coverage state from a list of quote lines.
 *
 * Returns 'empty' when lines.length < MIN_COMPONENTS_FOR_COVERAGE so that
 * STRONG COVERAGE is never shown on a near-empty or zero-component extraction.
 */
export function deriveRepMatchState(lines: QuoteLineResponse[]): RepMatchState {
  if (lines.length < MIN_COMPONENTS_FOR_COVERAGE) return 'empty';

  const misses = lines.filter(
    (l) => l.availability_status === 'not_in_catalog' || !l.product,
  ).length;
  if (misses > 0) return 'coverage';

  const flagged = lines.filter(
    (l) => l.alignment_selected === 0 && l.product,
  ).length;
  if (flagged > 0) return 'review';

  return 'ready';
}
