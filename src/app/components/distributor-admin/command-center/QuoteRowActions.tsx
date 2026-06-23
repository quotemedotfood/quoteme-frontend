// QuoteRowActions — View (PDF) + Edit (flow) affordances for quote-kind rows
// in RoutingTable. Used in the Actions column.
//
// View  → opens quote PDF in a new tab via API_BASE_URL/api/v1/quotes/:id/pdf.
//         Uses quotePdfUrl() helper from api.ts so the URL construction lives in
//         one place.
// Edit  → calls the onEdit callback (caller navigates to CCQuoteDetailPage).
//
// Icons: Eye for View, SquarePen for Edit (both already in lucide-react).
// No new colors — uses existing C tokens from cc-atoms.

import React from 'react';
import { Eye, SquarePen } from 'lucide-react';
import { sans, C, CC_ACK_NAVY } from './cc-atoms';
import { quotePdfUrl } from '../../../services/api';

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
  function handleView() {
    window.open(quotePdfUrl(quoteId), '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button
        type="button"
        title="View quote PDF"
        onClick={handleView}
        style={BTN}
      >
        <Eye size={12} strokeWidth={1.8} />
        View
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
