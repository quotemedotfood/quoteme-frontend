// ItemsToConfirm — section component for unmatched/needs-confirm items.
//
// Appears BELOW the document body when there are missing or flagged lines.
// Justin May 27 Q5 lock: items the matcher could not fit are surfaced here
// (no silent drops). Distinct from inline flagged rows inside the quote body.
//
// Actions available per line state:
//   coverage (true miss): Search catalog · Mark unavailable · Flag for catalog manager
//   review (flagged):     Confirm match · Swap · Dismiss flag
//
// Source: designs/handoff/5272026/src/screens-rep.jsx — ItemsToConfirm section

import React from 'react';
import { Search, X, Flag, Check, RefreshCw } from 'lucide-react';

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray500: '#6B7280',
  gray700: '#4F4F4F',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export type ItemsToConfirmMode = 'coverage' | 'review';

export interface ItemsToConfirmProps {
  /** Number of items needing the rep's call */
  count: number;
  /** 'coverage' = true catalog miss; 'review' = matcher wasn't sure */
  mode?: ItemsToConfirmMode;
  /** Called when rep clicks "Search catalog" */
  onSearchCatalog?: () => void;
  /** Called when rep clicks "Mark unavailable" */
  onMarkUnavailable?: () => void;
  /** Called when rep clicks "Flag for catalog manager" */
  onFlagManager?: () => void;
}

const ACTION_BTN: React.CSSProperties = {
  ...sans,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 10px',
  fontSize: 11.5,
  color: C.charcoal,
  background: 'transparent',
  border: `1px solid ${C.softLine}`,
  borderRadius: 4,
  cursor: 'pointer',
};

export function ItemsToConfirm({
  count,
  mode = 'coverage',
  onSearchCatalog,
  onMarkUnavailable,
  onFlagManager,
}: ItemsToConfirmProps) {
  const isCoverage = mode === 'coverage';
  const itemWord = count === 1 ? 'item needs' : 'items need';
  const description = isCoverage
    ? 'Add to your catalog, swap to a substitute, or mark unavailable.'
    : 'Matcher was not sure — confirm or swap.';

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 6,
        background: C.warmPaper,
        border: `1px solid ${C.softLine}`,
      }}
    >
      {/* Eyebrow */}
      <div
        style={{
          ...sans,
          fontSize: 10,
          letterSpacing: '0.14em',
          color: C.gray500,
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        Items to Confirm
      </div>

      {/* Headline */}
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
          fontWeight: 500,
          fontSize: 14,
          color: C.charcoal,
          lineHeight: 1.35,
          marginTop: 4,
        }}
      >
        {count} {itemWord} your call.
      </div>

      {/* Body */}
      <div
        style={{
          ...sans,
          fontSize: 11.5,
          color: C.gray700,
          lineHeight: 1.55,
          marginTop: 4,
        }}
      >
        {description}
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 10,
        }}
      >
        <button type="button" style={ACTION_BTN} onClick={onSearchCatalog}>
          <Search size={11} color={C.charcoal} strokeWidth={1.8} />
          Search catalog
        </button>

        {isCoverage ? (
          <>
            <button type="button" style={ACTION_BTN} onClick={onMarkUnavailable}>
              <X size={11} color={C.charcoal} strokeWidth={1.8} />
              Mark unavailable
            </button>
            <button type="button" style={ACTION_BTN} onClick={onFlagManager}>
              <Flag size={11} color={C.charcoal} strokeWidth={1.8} />
              Flag for catalog manager
            </button>
          </>
        ) : (
          <>
            <button type="button" style={ACTION_BTN}>
              <Check size={11} color={C.charcoal} strokeWidth={1.8} />
              Confirm match
            </button>
            <button type="button" style={ACTION_BTN}>
              <RefreshCw size={11} color={C.charcoal} strokeWidth={1.8} />
              Swap
            </button>
          </>
        )}
      </div>
    </div>
  );
}
