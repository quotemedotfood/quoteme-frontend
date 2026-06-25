// QuoteCoverageLabelRep — quote-level coverage signal (doctrine 9.6).
//
// Typography weight + color only, no chrome. Sits below the document masthead.
// Justin May 27 Q8: small uppercase serif label next to a faint blurb phrase.
// No border, no background — the typography IS the signal.
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · QuoteCoverageLabelRep

import React from 'react';
import type { RepMatchState } from './RepMatchStateBadge';

export interface QuoteCoverageLabelRepProps {
  state: RepMatchState;
}

// B-45: 'empty' is intentionally excluded from the positive coverage signals.
// When state === 'empty' (fewer than MIN_COMPONENTS_FOR_COVERAGE lines) the
// component returns null so no misleading coverage text is shown.
const COVERAGE_MAP: Record<Exclude<RepMatchState, 'empty'>, { label: string; color: string; blurb: string }> = {
  ready: {
    label: 'STRONG COVERAGE',
    color: '#2B2B2B',
    blurb: 'every line aligned to a catalog SKU',
  },
  review: {
    label: 'PARTIAL COVERAGE',
    color: '#C99A3F', // qm-amber
    blurb: 'a few lines need your eye',
  },
  coverage: {
    label: 'THIN COVERAGE',
    color: '#9E9E9E',
    blurb: 'several lines are not in your catalog yet',
  },
};

export function QuoteCoverageLabelRep({ state }: QuoteCoverageLabelRepProps) {
  // B-45: suppress ALL coverage signals (positive or negative) when extraction
  // returned too few items. Never show "STRONG COVERAGE · every line aligned"
  // on a 0-component or near-empty result.
  if (state === 'empty') return null;

  const entry = COVERAGE_MAP[state as Exclude<RepMatchState, 'empty'>];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
          fontSize: 10.5,
          letterSpacing: '0.16em',
          fontWeight: 600,
          color: entry.color,
        }}
      >
        {entry.label}
      </span>
      <span
        style={{
          fontSize: 11,
          color: '#9E9E9E',
          lineHeight: 1.4,
        }}
      >
        · {entry.blurb}
      </span>
    </div>
  );
}
