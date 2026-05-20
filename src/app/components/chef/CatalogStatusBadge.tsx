// CatalogStatusBadge — three-state status pill for distributor rows.
//
// Ported verbatim from source/screens-tabs.jsx (Desi V2 handoff, 2026-05-19).
// CSS vars (--qm-*) and prototype classes (qm-pill, etc.) not present in this
// repo; translated to inline styles matching FE convention in ChefDashboardPage.
//
// Intended for: /dashboard/distributors (route wire-up pending A3 promotion).

import React from 'react';

export type CatalogStatus = 'connected' | 'uploaded' | 'unaffiliated';

export interface CatalogStatusBadgeProps {
  status: CatalogStatus;
  withText?: boolean;
}

// Verbatim color values from screens-tabs.jsx.
const STATUS_MAP: Record<
  CatalogStatus,
  { label: string; bg: string; fg: string; dot: string }
> = {
  connected: {
    label: 'Connected',
    bg: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    fg: '#2A5F6F',
    dot: 'var(--accent)', // --qm-hover-blue
  },
  uploaded: {
    label: 'Uploaded',
    bg: '#F3F4F6',
    fg: '#4F4F4F', // --qm-gray-700
    dot: '#2B2B2B', // --qm-charcoal
  },
  unaffiliated: {
    // label filled dynamically below via withText
    label: 'Unaffiliated',
    bg: '#FFF9F3',
    fg: '#4F4F4F', // --qm-gray-700
    dot: '#D97706', // --qm-warning
  },
};

export function CatalogStatusBadge({ status, withText = false }: CatalogStatusBadgeProps) {
  const m = STATUS_MAP[status] ?? STATUS_MAP.connected;
  const label =
    status === 'unaffiliated' && withText
      ? 'Unaffiliated · no rep yet on QuoteMe'
      : m.label;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: m.bg,
        color: m.fg,
        border: status === 'unaffiliated' ? '1px solid #E8E8E8' : 'none',
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 999,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: m.dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
