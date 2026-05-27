// CatalogConfirmBanner — prompts rep to confirm a chef-supplied catalog.
//
// Placement: dashboard + first quote receipt ONLY. Not shown everywhere —
// "banner everywhere reads as nag" per doctrine (Moose lock May 26).
// Dismissable; returns until catalog_state reaches :verified.
//
// NEVER shows catalog name — only distributor name carries the signal
// (doctrine constraint, locked).
//
// The existing CatalogStatusBadge (chef-side, 3-state: Connected/Uploaded/
// Unaffiliated) is a different component with a different surface + purpose.
// This banner is rep-specific and does not reuse CatalogStatusBadge.
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · CatalogConfirmBanner

import React from 'react';
import { ClipboardList, ArrowRight, X } from 'lucide-react';

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray500: '#6B7280',
} as const;

export type CatalogConfirmBannerVariant = 'ambient' | 'urgent';

export interface CatalogConfirmBannerProps {
  /** Called when rep clicks "Review catalog" */
  onReview?: () => void;
  /** Called when rep dismisses the banner */
  onDismiss?: () => void;
  /** 'ambient' (default) = standard tone; 'urgent' = stronger left-rule */
  variant?: CatalogConfirmBannerVariant;
  /** Distributor name. Shown when provided; banner never shows catalog name. */
  distributorName?: string;
}

export function CatalogConfirmBanner({
  onReview,
  onDismiss,
  variant = 'ambient',
  distributorName,
}: CatalogConfirmBannerProps) {
  const leftBorderColor = variant === 'urgent' ? 'var(--primary)' : C.charcoal;

  return (
    <div
      style={{
        borderRadius: 6,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        background: C.warmPaper,
        border: `1px solid ${C.softLine}`,
        borderLeft: `3px solid ${leftBorderColor}`,
      }}
    >
      {/* Icon badge */}
      <div
        style={{
          flexShrink: 0,
          marginTop: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          width: 24,
          height: 24,
          background: '#fff',
          border: `1px solid ${C.softLine}`,
        }}
      >
        <ClipboardList size={12} color={C.charcoal} strokeWidth={1.8} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
            fontWeight: 500,
            fontSize: 14,
            color: C.charcoal,
            lineHeight: 1.35,
          }}
        >
          Confirm your catalog
          {distributorName && (
            <span
              style={{
                fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: 400,
                fontSize: 12,
                color: '#4F4F4F',
                marginLeft: 6,
              }}
            >
              · {distributorName}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: '#4F4F4F',
            lineHeight: 1.55,
            marginTop: 2,
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          Your distributor record is set up. Take a look at the catalog when you have a moment.
          Pricing flows freely once it is confirmed.
        </div>
        <button
          type="button"
          onClick={onReview}
          style={{
            marginTop: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: C.charcoal,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          Review catalog
          <ArrowRight size={11} color={C.charcoal} strokeWidth={1.8} />
        </button>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        title="Dismiss"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: C.gray500,
        }}
      >
        <X size={13} color={C.gray500} strokeWidth={1.8} />
      </button>
    </div>
  );
}
