// QuoteStatusPill — shared lifecycle pill for chef quote history.
// Used by ChefQuotesPage and ChefDashboardPage.
//
// IMPORTANT: 'won' always renders 'Accepted'.
// The hasOG / 'Ordered' branch was deliberately removed — Order Guide is a
// downstream document; chefs do not order through QuoteMe.

import React from 'react';

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const GRAY500 = '#6B7280';
const GRAY700 = '#4F4F4F';

export interface QuoteStatusPillProps {
  status: string;
}

export function getQuoteStatusPillProps(status: string): { label: string; bg: string; color: string } {
  if (status === 'won')      return { label: 'Accepted',         bg: '#DCFCE7',                                          color: '#166534' };
  if (status === 'pending')  return { label: 'Ready',            bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: '#2A5F6F' };
  if (status === 'sent')     return { label: 'Sent',             bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: '#2A5F6F' };
  if (status === 'draft')    return { label: 'Processing',       bg: '#FEF3C7',                                          color: '#92400E' };
  if (status === 'expired')  return { label: 'Refresh available', bg: '#FEF3C7',                                         color: '#92400E' };
  if (status === 'lost')     return { label: 'Closed',           bg: '#F3F4F6',                                          color: GRAY500   };
  return                            { label: status,             bg: '#F3F4F6',                                          color: GRAY700   };
}

export function QuoteStatusPill({ status }: QuoteStatusPillProps) {
  const { label, bg, color } = getQuoteStatusPillProps(status);
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
