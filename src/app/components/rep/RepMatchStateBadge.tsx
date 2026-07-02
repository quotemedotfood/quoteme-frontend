// RepMatchStateBadge — match-state axis badge for the rep surface.
//
// Vocabulary flip per Moose lock May 26 Q2:
//   Chef side: "Ready for Review / Needs Rep Review / Partial Catalog Coverage"
//   Rep side:  "Ready to price / Needs my review / Coverage gaps"
//
// This is the MATCH-STATE axis — entirely separate from QuoteStatusPill
// (lifecycle: received → opened → replied → converted). Do NOT merge.
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · RepMatchStateBadge
//
// Constraint: coverage dot uses var(--accent), NOT var(--primary) / orange.
// The coverage/gaps dot uses charcoal for "ready" and "review" states;
// orange (var(--primary)) would mix coverage-signal with action-signal, which
// doctrine disallows. Only the "coverage" state may deviate — it signals a
// genuine problem state with var(--primary) per Moose lock.

import React from 'react';
// B-45: RepMatchState is the canonical type — imported from repCoverageState util
// which added 'empty' (fewer than MIN_COMPONENTS_FOR_COVERAGE lines extracted).
// Imported for local use below, and re-exported so existing importers continue
// to resolve RepMatchState from this file.
import type { RepMatchState } from '../../utils/repCoverageState';
export type { RepMatchState } from '../../utils/repCoverageState';

export interface RepMatchStateBadgeProps {
  state: RepMatchState;
  /** Number of missing or flagged items (appended to label when present) */
  missingCount?: number;
}

const STATE_MAP: Record<
  RepMatchState,
  { label: string; dotColor: string; ring: string }
> = {
  ready: {
    label: 'Ready to price',
    dotColor: 'var(--accent)',
    ring: '#E8E8E8',
  },
  review: {
    label: 'Needs my review',
    dotColor: '#2B2B2B',
    ring: '#E8E8E8',
  },
  coverage: {
    label: 'Coverage gaps',
    dotColor: 'var(--primary)',
    ring: 'rgba(217,119,87,.35)',
  },
  // B-45: 'empty' — zero or below-threshold extraction. Badge is suppressed at the
  // call site; this entry is a safety net for any direct RepMatchStateBadge renders.
  empty: {
    label: 'No items extracted',
    dotColor: '#9E9E9E',
    ring: '#E8E8E8',
  },
};

export function RepMatchStateBadge({ state, missingCount }: RepMatchStateBadgeProps) {
  const spec = STATE_MAP[state] ?? {
    label: state,
    dotColor: '#9E9E9E',
    ring: '#E8E8E8',
  };

  const suffix =
    state === 'coverage' && missingCount
      ? ` · ${missingCount} missing`
      : state === 'review' && missingCount
        ? ` · ${missingCount} flagged`
        : '';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 9px 2px 8px',
        borderRadius: 999,
        border: `1px solid ${spec.ring}`,
        background: 'transparent',
        fontSize: 11,
        color: '#2B2B2B',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: spec.dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {spec.label}{suffix}
    </span>
  );
}
