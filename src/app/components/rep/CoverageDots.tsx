// CoverageDots — per-line coverage strength indicators.
//
// LineCoverageDot: tiny peripheral dot that signals match strength on a
// single item row (strong / partial / thin).
//
// CoverageDot: general-purpose single-pixel coverage indicator used in
// inline contexts (e.g. bullet lists, enrollment ribbon).
//
// Constraint: coverage/trust dots use var(--accent) — NEVER var(--primary)
// (orange). The accent color (#7FAEC2 by default) is the "connected / trusted"
// signal. Orange is reserved for primary call-to-action only.
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · LineCoverageDot

import React from 'react';

export type CoverageStrength = 'strong' | 'partial' | 'thin';

export interface LineCoverageDotProps {
  strength: CoverageStrength;
}

const STRENGTH_COLORS: Record<CoverageStrength, string> = {
  strong: 'var(--accent)',
  partial: '#C99A3F', // qm-amber
  thin: '#9E9E9E',   // qm-gray-500
};

const STRENGTH_LABELS: Record<CoverageStrength, string> = {
  strong: 'Strong match',
  partial: 'Partial match',
  thin: 'Thin match',
};

/** Per-line dot. Sits at the leading edge of each item row. */
export function LineCoverageDot({ strength }: LineCoverageDotProps) {
  return (
    <span
      title={STRENGTH_LABELS[strength]}
      aria-label={STRENGTH_LABELS[strength]}
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: STRENGTH_COLORS[strength],
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

export interface CoverageDotProps {
  /** Dot color — defaults to var(--accent). Pass a hex or CSS var override. */
  color?: string;
  /** Diameter in px (default 6) */
  size?: number;
  label?: string;
}

/** General-purpose inline coverage dot. */
export function CoverageDot({ color = 'var(--accent)', size = 6, label }: CoverageDotProps) {
  return (
    <span
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}
