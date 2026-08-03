// ChefBadgePill — replaces the top-right initials circle in ChefTopbar.
//
// Three states:
//   single   — Chef [First Name] ▾
//   multi    — Chef [First Name] · [Current Location] ▾
//   group    — Chef [First Name] ▾  (role === 'group_admin')
//
// Clicking opens ChefAccountDrawer.
// Desktop and mobile share the same pill; desktop shows full label,
// mobile collapses to initials-only when screen < 400px (very narrow).

import React from 'react';
import { ChevronDown } from 'lucide-react';

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray500: '#6B7280',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export type ChefType = 'single' | 'multi' | 'group';

export interface ChefBadgePillProps {
  firstName: string;
  chefType: ChefType;
  currentLocationName?: string;
  onClick: () => void;
}

export function ChefBadgePill({
  firstName,
  chefType,
  currentLocationName,
  onClick,
}: ChefBadgePillProps) {
  // Chef-header regression: this component always prepends its own "Chef "
  // honorific below, so `firstName` must never itself already carry one.
  // ChefTopbar's fallback chain (firstName || email-local-part || 'Chef')
  // can resolve to the bare literal "Chef" when a session has neither a
  // first name nor a usable email, which used to render as "Chef Chef".
  // Strip any leading "Chef" defensively so the label can never double up.
  // C3 (Justin, 2026-07-31): when stripping leaves NO real name, degrade to
  // NO "Chef" prefix rather than to a fabricated word. The old fallback made
  // this render "Chef there" (or "Chef Chef"), a bogus name and the first
  // thing a chef reads. With no name we show the location (multi) or a neutral
  // "Account" label, never "Chef <fallback-word>".
  const cleaned = firstName.trim().replace(/^chef\s*/i, '');
  const label = cleaned
    ? (chefType === 'multi' && currentLocationName
        ? `Chef ${cleaned} · ${currentLocationName}`
        : `Chef ${cleaned}`)
    : (chefType === 'multi' && currentLocationName ? currentLocationName : 'Account');

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Account menu"
      style={{
        ...sans,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 34,
        padding: '0 10px 0 12px',
        background: C.warmPaper,
        border: `1px solid ${C.softLine}`,
        borderRadius: 20,
        cursor: 'pointer',
        color: C.charcoal,
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        maxWidth: 260,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
      }}
      onMouseEnter={(e) => {
        const btn = e.currentTarget;
        btn.style.borderColor = '#D0CFCC';
        btn.style.boxShadow = '0 1px 3px rgba(43,43,43,.08)';
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget;
        btn.style.borderColor = C.softLine;
        btn.style.boxShadow = 'none';
      }}
    >
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <ChevronDown size={14} strokeWidth={2} color={C.gray500} style={{ flexShrink: 0 }} />
    </button>
  );
}
