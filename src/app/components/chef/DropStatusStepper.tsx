// DropStatusStepper — reusable chef-facing catalog-drop status stepper.
//
// SU-FE-1 (Wave 3 · Secure Rep-Catalog Upload).
// Canonical spec: handoff/SECURE_REP_CATALOG_UPLOAD.md
// Status vocabulary: handoff/SECURE_DROP_ZONE_STATUS.md (verbatim key + label + sub-line)
// Source reference: handoff/source/screens-secure-catalog.jsx (`DROP_STATUS`, `DropStatusStepper`)
//
// Exported types/values:
//   DropStatusKey        — union of the four happy-path status keys
//   DropStatus           — one entry from DROP_STATUS array
//   DROP_STATUS          — ordered array (consumed by SU-FE-3 and status showcase)
//   DropStatusStepper    — compact horizontal stepper (mobile + desktop)
//
// Off-track states (`expired` / `stalled`) are documented in SECURE_DROP_ZONE_STATUS.md
// but are NOT rendered in this stepper — they live in their own surface-level callouts.

import React from 'react';

// ─── Color constants (matching ChefDistributorsTab convention) ────────────────
const C = {
  charcoal: '#2B2B2B',
  orange: '#F2993D',
  softLine: '#E8E8E8',
  // --accent maps to hoverBlue in this design system
  accent: '#7FAEC2',
  gray500: '#6B7280',
  gray700: '#4F4F4F',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Status vocabulary (verbatim from SECURE_DROP_ZONE_STATUS.md) ─────────────
// key         label               chef sub-line
// requested   Requested           Asked {rep} — he passes it to whoever keeps the catalog current.
// uploading   Coming In           {rep}'s team is sending the catalog over now.
// loading     Loading It In       Reading the catalog and matching it to your menu.
// live        Live In Your Stack  Updated and ready — your quotes price against it now.

export type DropStatusKey = 'requested' | 'uploading' | 'loading' | 'live';

export interface DropStatus {
  key: DropStatusKey;
  /** Display label (Title Case per project convention) */
  label: string;
  /** Short label for narrow contexts */
  short: string;
  /** Chef-facing sub-line with rep name interpolated */
  chefSub: (repFirst: string) => string;
}

export const DROP_STATUS: DropStatus[] = [
  {
    key: 'requested',
    label: 'Requested',
    short: 'Requested',
    chefSub: (rep) => `Asked ${rep} — he passes it to whoever keeps the catalog current.`,
  },
  {
    key: 'uploading',
    label: 'Coming In',
    short: 'Coming In',
    chefSub: (rep) => `${rep}'s team is sending the catalog over now.`,
  },
  {
    key: 'loading',
    label: 'Loading It In',
    short: 'Loading',
    chefSub: () => 'Reading the catalog and matching it to your menu.',
  },
  {
    key: 'live',
    label: 'Live In Your Stack',
    short: 'Live',
    chefSub: () => 'Updated and ready — your quotes price against it now.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface DropStatusStepperProps {
  /** Current drop-zone status key (from SECURE_DROP_ZONE_STATUS.md happy path) */
  status: DropStatusKey;
  /** Rep first name for sub-line interpolation (e.g. "Marcus") */
  repFirst?: string;
  desktop?: boolean;
}

export function DropStatusStepper({
  status = 'requested',
  repFirst = 'your rep',
  desktop = false,
}: DropStatusStepperProps) {
  const at = Math.max(0, DROP_STATUS.findIndex((s) => s.key === status));
  const cur = DROP_STATUS[at];

  return (
    <div style={sans}>
      {/* Dot + connector row */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {DROP_STATUS.map((s, i) => {
          const complete = i < at;
          const active = i === at;
          const dotBg = complete ? C.accent : active ? C.orange : '#fff';
          const dotBorder = complete ? C.accent : active ? C.orange : C.softLine;
          return (
            <React.Fragment key={s.key}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: 13,
                  height: 13,
                  borderRadius: 999,
                  background: dotBg,
                  border: `1.5px solid ${dotBorder}`,
                  boxSizing: 'border-box',
                }}
              >
                {complete && (
                  // Checkmark SVG (no lucide-react import needed here to keep it self-contained)
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <polyline
                      points="2,6 5,9 10,3"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {active && (
                  <span
                    style={{
                      display: 'block',
                      width: 4,
                      height: 4,
                      borderRadius: 999,
                      background: '#fff',
                    }}
                  />
                )}
              </span>
              {i < DROP_STATUS.length - 1 && (
                <span
                  style={{
                    flex: 1,
                    height: 1.5,
                    background: complete ? C.accent : C.softLine,
                    margin: '0 5px',
                    display: 'block',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Label + step count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginTop: 8,
        }}
      >
        <span
          style={{
            fontSize: desktop ? 12 : 11.5,
            fontWeight: 600,
            color: C.charcoal,
            lineHeight: 1.3,
          }}
        >
          {cur.label}
        </span>
        <span
          style={{
            fontSize: desktop ? 10.5 : 10,
            color: C.gray500,
            lineHeight: 1.3,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          step {at + 1} of {DROP_STATUS.length}
        </span>
      </div>

      {/* Chef sub-line */}
      <div
        style={{
          fontSize: desktop ? 11.5 : 11,
          color: C.gray700,
          lineHeight: 1.5,
          marginTop: 2,
        }}
      >
        {cur.chefSub(repFirst)}
      </div>
    </div>
  );
}
