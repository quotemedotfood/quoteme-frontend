// RepCtaStrip — state-aware CTA strip primitive.
//
// The action strip whose buttons change by quote state/flow:
//   'first-arrival': primary "Use my catalog prices" + two secondaries
//                    (Review the quote / Go straight to pricing)
//   'auto-fired':    primary "Send to chef" (disabled if unpricedCount > 0)
//                    + secondary "Review before sending"
//
// Justin May 27 Q3 lock: CTAs always both visible. Partial-coverage
// deemphasizes "Go straight to pricing" with microcopy below.
//
// Constraint: Sacred Orange = var(--primary). Never the #F9A64B literal.
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · CTA strip in
// RepIncomingQuotePage.

import React from 'react';
import { DollarSign, SquarePen, ArrowRight } from 'lucide-react';

const C = {
  charcoal: '#2B2B2B',
  accentBlue: 'var(--accent)',
  accentBlueBg: 'rgba(127,174,194,.14)',
  accentBlueBorder: 'rgba(127,174,194,.55)',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

export type RepCtaFlowState = 'first-arrival' | 'auto-fired';

export interface RepCtaStripProps {
  flowState?: RepCtaFlowState;
  /** Used in 'auto-fired' to enable/disable the send button */
  unpricedCount?: number;
  totalCount?: number;
  /** Whether coverage is partial — adds microcopy below the secondary CTA */
  partialCoverage?: boolean;
  /** Callbacks */
  onUseCatalogPrices?: () => void;
  onReview?: () => void;
  onGoPricing?: () => void;
  onSendToChef?: () => void;
}

export function RepCtaStrip({
  flowState = 'first-arrival',
  unpricedCount = 0,
  totalCount = 0,
  partialCoverage = false,
  onUseCatalogPrices,
  onReview,
  onGoPricing,
  onSendToChef,
}: RepCtaStripProps) {
  const primaryBtn: React.CSSProperties = {
    ...sans,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    padding: '11px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#fff',
    background: 'var(--primary)',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  };

  const reviewBtn: React.CSSProperties = {
    ...sans,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 12px',
    fontSize: 12,
    color: C.charcoal,
    background: C.accentBlueBg,
    border: `1px solid ${C.accentBlueBorder}`,
    borderRadius: 6,
    cursor: 'pointer',
    flex: 1,
  };

  const textBtn: React.CSSProperties = {
    ...sans,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 12px',
    fontSize: 12,
    color: C.gray700,
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    flex: 1,
  };

  const caption: React.CSSProperties = {
    ...serif,
    fontSize: 10.5,
    color: C.gray500,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 1.45,
    marginTop: 4,
  };

  if (flowState === 'first-arrival') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" style={primaryBtn} onClick={onUseCatalogPrices}>
          <DollarSign size={14} color="#fff" strokeWidth={1.8} />
          Use my catalog prices
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" style={reviewBtn} onClick={onReview}>
            <SquarePen size={12} color={C.charcoal} strokeWidth={1.8} />
            Review the quote
          </button>
          <button type="button" style={textBtn} onClick={onGoPricing}>
            Go straight to pricing
          </button>
        </div>
        {partialCoverage && (
          <p style={caption}>
            Coverage gaps — review recommended before sending.
          </p>
        )}
        {!partialCoverage && (
          <p style={caption}>
            Catalog prices populate every matched line in one click.
          </p>
        )}
      </div>
    );
  }

  if (flowState === 'auto-fired') {
    const allPriced = unpricedCount === 0;
    const remaining = unpricedCount;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          style={{
            ...primaryBtn,
            opacity: allPriced ? 1 : 0.55,
            cursor: allPriced ? 'pointer' : 'not-allowed',
          }}
          disabled={!allPriced}
          title={allPriced ? undefined : 'Price the remaining lines first'}
          onClick={onSendToChef}
        >
          <ArrowRight size={14} color="#fff" strokeWidth={1.8} />
          Send to chef
        </button>
        <button
          type="button"
          style={{ ...textBtn, flex: 'unset', width: '100%', color: C.charcoal }}
          onClick={onReview}
        >
          <SquarePen size={12} color={C.charcoal} strokeWidth={1.8} />
          Review before sending
        </button>
        {!allPriced && (
          <p style={caption}>
            {remaining} more {remaining === 1 ? 'line' : 'lines'} to go before this can ship.
          </p>
        )}
      </div>
    );
  }

  // Fallback — should not be reached with the two live branches above.
  return null;
}
