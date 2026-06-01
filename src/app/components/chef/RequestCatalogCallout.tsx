// RequestCatalogCallout — the pre-ask callout + orange CTA that attaches to a
// Connected but catalog-thin distributor row on the Distributors tab.
//
// SU-FE-1 (Wave 3 · Secure Rep-Catalog Upload).
// Canonical spec: handoff/SECURE_REP_CATALOG_UPLOAD.md
// Source reference: handoff/source/screens-secure-catalog.jsx (`RequestCatalogCallout`)
//
// Trigger condition: distributor.catalog_state ∈ {no_catalog, provisional, needs_confirmation}
// One Sacred Orange per tab: this button carries the tab's single orange CTA.
// "Ask {rep}" is the full chef interaction — the link is generated server-side.

import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';

const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export interface RequestCatalogCalloutProps {
  /** Short distributor name (e.g. "D'Lisius") */
  distributorName: string;
  /** Human-readable date the held catalog is from (e.g. "Feb 3, 2026") */
  catalogHeldFrom: string | null | undefined;
  /** Rep first name for copy (e.g. "Marcus") */
  repFirst: string;
  desktop?: boolean;
  /** Called when the chef taps "Ask {rep}" — caller fires the API and flips state */
  onAsk: () => void;
  /** Disabled while the API call is in flight */
  loading?: boolean;
}

export function RequestCatalogCallout({
  distributorName,
  catalogHeldFrom,
  repFirst,
  desktop = false,
  onAsk,
  loading = false,
}: RequestCatalogCalloutProps) {
  const heldCopy = catalogHeldFrom
    ? `The catalog we have for ${distributorName} is from ${catalogHeldFrom}. Prices have probably moved since.`
    : `We don't have a current catalog for ${distributorName} on file.`;

  return (
    <div
      style={{
        marginTop: 12,
        background: C.warmPaper,
        border: `1px solid ${C.softLine}`,
        borderLeft: `3px solid ${C.charcoal}`,
        borderRadius: 8,
        padding: desktop ? '14px 16px' : '12px 13px',
      }}
    >
      {/* Stale-catalog note */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Clock
          size={desktop ? 15 : 14}
          color={C.gray700}
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <div style={{ ...sans, fontSize: desktop ? 12.5 : 11.5, color: C.gray700, lineHeight: 1.5 }}>
          {heldCopy}
        </div>
      </div>

      {/* Sacred Orange CTA */}
      <button
        type="button"
        onClick={onAsk}
        disabled={loading}
        style={{
          ...sans,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          marginTop: 12,
          padding: desktop ? '12px 16px' : '11px 14px',
          fontSize: desktop ? 14 : 13,
          fontWeight: 600,
          background: loading ? '#F5C07A' : C.orange,
          color: C.charcoal,
          border: 'none',
          borderRadius: 7,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.8 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: `2px solid ${C.charcoal}`,
                borderTopColor: 'transparent',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            Sending…
          </>
        ) : (
          <>
            Ask {repFirst} for the latest catalog
            <ArrowRight size={14} color={C.charcoal} />
          </>
        )}
      </button>

      {/* Sub-copy */}
      <div
        style={{
          ...sans,
          fontSize: desktop ? 11.5 : 10.5,
          color: C.gray500,
          lineHeight: 1.5,
          marginTop: 8,
        }}
      >
        We'll send {repFirst} a link he can pass to whoever keeps {distributorName}'s catalog
        current. You'll hear from us once it's loaded — nothing to chase in the meantime.
      </div>
    </div>
  );
}
