// QuoteStatusPill — chef quote-history lifecycle pill (single source of truth).
//
// Shared by ChefQuotesPage + ChefDashboardPage row renderers. Previously each
// page carried a duplicated local `StatusPill` function; that drift produced
// the "Ordered" copy bug (won + hasOG → Ordered) that conflated "chef built
// an Order Guide" with "chef ordered through QuoteMe" — chefs do NOT order
// through QuoteMe. The hasOG branch is gone; `won` always renders `Accepted`.
//
// J1 state machine (Justin-locked strings — do NOT modify labels):
//   preview           → "Awaiting rep"
//   distributor_quote → "Rep pricing"
//   confirmed         → "Ready"
//   accepted          → "Accepted"
//   declined          → "Closed"
//   expired           → "Expired"
//
// Legacy status fallback: callers should pass `quote.state ?? legacyStatusToState(quote.status)`.
// `getQuoteStatusPillPropsLegacy` maps the old `status` string to a `state` value so
// this component stays single-purpose / state-driven.

import React from 'react';

const sans: React.CSSProperties = { fontFamily: 'var(--qm-sans, "DM Sans", sans-serif)' };

export interface QuoteStatusPillProps {
  state: string;
}

/** Map J1 state → display props. Labels are Justin-locked — do not change. */
export function getQuoteStatusPillProps(state: string): { label: string; bg: string; color: string } {
  switch (state) {
    case 'preview':
      // Waiting / pending-rep — warm orange
      return { label: 'Awaiting rep', bg: '#FEF3C7', color: '#92400E' };
    case 'distributor_quote':
      // Rep has it, pricing in progress — warm orange
      return { label: 'Rep pricing', bg: '#FEF3C7', color: '#92400E' };
    case 'confirmed':
      // Quote is ready for the chef — accent blue
      return { label: 'Ready', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: '#2A5F6F' };
    case 'accepted':
      // Chef accepted — green
      return { label: 'Accepted', bg: '#DCFCE7', color: '#166534' };
    case 'declined':
      // Chef declined — neutral
      return { label: 'Closed', bg: '#F3F4F6', color: '#6B7280' };
    case 'expired':
      // Quote expired — neutral
      return { label: 'Expired', bg: '#F3F4F6', color: '#6B7280' };
    default:
      // Unknown state: render raw value with neutral styling — never crash.
      return { label: state, bg: '#F3F4F6', color: '#4F4F4F' };
  }
}

/**
 * Convert a legacy `status` string to the nearest J1 `state` value.
 * Use at call sites as: `quote.state ?? legacyStatusToState(quote.status)`
 */
export function legacyStatusToState(status: string): string {
  switch (status) {
    case 'draft':    return 'preview';
    case 'sent':     return 'distributor_quote';
    case 'pending':  return 'confirmed';
    case 'assigned': return 'confirmed';
    case 'won':      return 'accepted';
    case 'lost':     return 'declined';
    case 'expired':  return 'expired';
    default:         return status;
  }
}

/**
 * Legacy shim — accepts an old `status` value and returns pill props.
 * Exported for direct use in rare legacy contexts; prefer the state-driven path.
 */
export function getQuoteStatusPillPropsLegacy(status: string): { label: string; bg: string; color: string } {
  return getQuoteStatusPillProps(legacyStatusToState(status));
}

export function QuoteStatusPill({ state }: QuoteStatusPillProps) {
  const { label, bg, color } = getQuoteStatusPillProps(state);
  return (
    <span
      className="inline-flex items-center"
      style={{
        ...sans,
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}
