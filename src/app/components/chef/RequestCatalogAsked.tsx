// RequestCatalogAsked — the post-ask confirmation panel that replaces
// RequestCatalogCallout once the chef taps "Ask {rep}".
// Renders DropStatusStepper starting at "requested".
//
// SU-FE-1 (Wave 3 · Secure Rep-Catalog Upload).
// Canonical spec: handoff/SECURE_REP_CATALOG_UPLOAD.md
// Source reference: handoff/source/screens-secure-catalog.jsx (`RequestCatalogAsked`)
//
// Engineering feeds the live `status` key from the backend drop-zone state.
// On initial ask the status will always be "requested".

import React from 'react';
import { DropStatusStepper, type DropStatusKey } from './DropStatusStepper';

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  accent: '#7FAEC2',
  accentBg: 'rgba(127,174,194,0.06)',
  gray500: '#6B7280',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

export interface RequestCatalogAskedProps {
  /** Rep first name (e.g. "Marcus") */
  repFirst: string;
  /** Short distributor name (e.g. "D'Lisius") */
  distributorName: string;
  /** Current drop-zone status key (from SECURE_DROP_ZONE_STATUS.md) */
  status?: DropStatusKey;
  desktop?: boolean;
  /** Relative time string shown in the footnote (e.g. "Asked just now") */
  askedLabel?: string;
}

export function RequestCatalogAsked({
  repFirst,
  distributorName,
  status = 'requested',
  desktop = false,
  askedLabel = 'Asked just now',
}: RequestCatalogAskedProps) {
  return (
    <div
      style={{
        marginTop: 12,
        background: C.accentBg,
        border: `1px solid ${C.accent}`,
        borderRadius: 8,
        padding: desktop ? '14px 16px' : '12px 13px',
      }}
    >
      {/* Header: check + "{rep} is on it." */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: '#fff',
            border: `1px solid ${C.accent}`,
            boxSizing: 'border-box',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <polyline
              points="2,6 5,9 10,3"
              stroke={C.accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div
          style={{
            ...serif,
            fontSize: desktop ? 15 : 14,
            fontWeight: 500,
            color: C.charcoal,
          }}
        >
          {repFirst} is on it.
        </div>
      </div>

      {/* Confirmation copy */}
      <div
        style={{
          ...sans,
          fontSize: desktop ? 12.5 : 11.5,
          color: C.charcoal,
          lineHeight: 1.5,
          marginTop: 8,
          opacity: 0.75,
        }}
      >
        We sent {repFirst} a link for {distributorName}'s latest catalog. You'll get one note
        from us when it's loaded and ready to quote against.
      </div>

      {/* Drop-zone status stepper */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px solid ${C.softLine}`,
        }}
      >
        <DropStatusStepper status={status} repFirst={repFirst} desktop={desktop} />
      </div>

      {/* Footnote */}
      <div
        style={{
          ...sans,
          fontSize: desktop ? 11 : 10.5,
          color: C.gray500,
          lineHeight: 1.4,
          marginTop: 12,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {askedLabel} · {distributorName}
      </div>
    </div>
  );
}
