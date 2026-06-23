// QuoteRowActions — View (PDF) + Edit (flow) affordances for quote-kind rows
// in RoutingTable. Used in the Actions column.
//
// View  → fetches the quote PDF with an authed Bearer request, creates a
//         blob URL, and opens it in a new tab. Revokes the URL after 30s.
//         Shows a brief "Loading…" state during fetch and an "Error" state
//         if the request fails.
// Edit  → calls the onEdit callback (caller navigates to rep build flow).
//
// Icons: Eye for View, SquarePen for Edit (both already in lucide-react).
// No new colors — uses existing C tokens from cc-atoms.

import React, { useState } from 'react';
import { Eye, SquarePen } from 'lucide-react';
import { sans, C, CC_ACK_NAVY } from './cc-atoms';
import { downloadQuotePdf } from '../../../services/api';

export interface QuoteRowActionsProps {
  quoteId: string;
  onEdit: () => void;
}

const BTN: React.CSSProperties = {
  ...sans,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 11.5,
  background: 'none',
  border: `1px solid #E5E7EB`,
  borderRadius: 5,
  padding: '4px 8px',
  cursor: 'pointer',
  color: CC_ACK_NAVY,
  lineHeight: 1,
  transition: 'border-color 120ms',
  whiteSpace: 'nowrap',
};

export function QuoteRowActions({ quoteId, onEdit }: QuoteRowActionsProps) {
  const [viewState, setViewState] = useState<'idle' | 'loading' | 'error'>('idle');

  async function handleView() {
    if (viewState === 'loading') return;
    setViewState('loading');
    const result = await downloadQuotePdf(quoteId);
    if (result.error || !result.blob) {
      setViewState('error');
      setTimeout(() => setViewState('idle'), 3000);
      return;
    }
    const blobUrl = URL.createObjectURL(result.blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
    setViewState('idle');
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button
        type="button"
        title={viewState === 'error' ? 'Failed to load PDF' : 'View quote PDF'}
        onClick={handleView}
        disabled={viewState === 'loading'}
        style={{
          ...BTN,
          opacity: viewState === 'loading' ? 0.65 : 1,
          cursor: viewState === 'loading' ? 'wait' : 'pointer',
          color: viewState === 'error' ? '#B91C1C' : CC_ACK_NAVY,
        }}
      >
        <Eye size={12} strokeWidth={1.8} />
        {viewState === 'loading' ? 'Loading…' : viewState === 'error' ? 'Error' : 'View'}
      </button>
      <button
        type="button"
        title="Edit quote"
        onClick={onEdit}
        style={{ ...BTN, color: C.gray700 }}
      >
        <SquarePen size={12} strokeWidth={1.8} />
        Edit
      </button>
    </div>
  );
}
