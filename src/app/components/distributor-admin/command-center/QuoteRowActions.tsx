// QuoteRowActions — View (PDF) + Edit (flow) + Archive affordances for
// quote-kind rows in RoutingTable / CCQuotesPage. Used in the Actions column.
//
// View    → fetches the quote PDF with an authed Bearer request, creates a
//           blob URL, and opens it in a new tab. Revokes the URL after 30s.
//           Shows a brief "Loading…" state during fetch and an "Error" state
//           if the request fails.
// Edit    → calls the onEdit callback (caller navigates to rep build flow).
// Archive → dispatch item 5 (2026-07-28). Trashcan control, only rendered
//           when the caller passes onArchived. Confirms (window.confirm,
//           matching the codebase's existing destructive-action pattern —
//           no themed confirm dialog exists on this surface), POSTs the
//           archive endpoint, then calls onArchived() so the caller removes
//           the row from the visible list. Archive is reversible server-side
//           (BE also exposes /unarchive) so this stays a light confirm, not
//           a two-step destructive flow.
//
// Icons: Eye for View, SquarePen for Edit, Trash2 for Archive (all already
// in lucide-react). No new colors — uses existing C tokens from cc-atoms.

import React, { useState } from 'react';
import { Eye, SquarePen, Trash2 } from 'lucide-react';
import { sans, C, CC_ACK_NAVY } from './cc-atoms';
import { downloadQuotePdf, archiveQuote } from '../../../services/api';

export interface QuoteRowActionsProps {
  quoteId: string;
  onEdit: () => void;
  /** When provided, renders the Archive (trashcan) control. Called after a
   * successful archive so the caller can remove the row from its list
   * (archived quotes are hidden server-side and simply stop appearing on
   * refetch, so optimistic local removal is the only client-side change
   * needed). */
  onArchived?: () => void;
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

export function QuoteRowActions({ quoteId, onEdit, onArchived }: QuoteRowActionsProps) {
  const [viewState, setViewState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [archiveState, setArchiveState] = useState<'idle' | 'loading' | 'error'>('idle');

  async function handleView() {
    if (viewState === 'loading') return;
    setViewState('loading');
    const result = await downloadQuotePdf(quoteId);
    if (result.error || !result.blob) {
      // B-118 fix: error persists (no auto-reset) so user sees "Couldn't generate PDF"
      // instead of the button silently reverting to idle after 3 s, looking dead.
      setViewState('error');
      return;
    }
    const blobUrl = URL.createObjectURL(result.blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
    setViewState('idle');
  }

  async function handleArchive() {
    if (archiveState === 'loading') return;
    // Light confirm: archive hides the quote from the ledger/board but is
    // reversible server-side (BE keeps an /unarchive endpoint), so a single
    // window.confirm matches the weight of the action.
    const confirmed = window.confirm(
      'Archive this quote? It will be hidden from the board and ledger. This does not delete it, and it can be restored.'
    );
    if (!confirmed) return;

    setArchiveState('loading');
    const res = await archiveQuote(quoteId);
    if (res.error) {
      setArchiveState('error');
      return;
    }
    setArchiveState('idle');
    onArchived?.();
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button
        type="button"
        title={viewState === 'error' ? "Couldn't generate PDF, click to retry" : 'View quote PDF'}
        onClick={handleView}
        disabled={viewState === 'loading'}
        style={{
          ...BTN,
          opacity: viewState === 'loading' ? 0.65 : 1,
          cursor: viewState === 'loading' ? 'wait' : 'pointer',
          color: viewState === 'error' ? '#B91C1C' : CC_ACK_NAVY,
          borderColor: viewState === 'error' ? '#FECACA' : '#E5E7EB',
        }}
      >
        <Eye size={12} strokeWidth={1.8} />
        {viewState === 'loading' ? 'Loading…' : viewState === 'error' ? 'PDF unavailable' : 'View'}
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
      {onArchived && (
        <button
          type="button"
          title={
            archiveState === 'error'
              ? "Couldn't archive, click to retry"
              : 'Archive quote (hide, not delete)'
          }
          onClick={handleArchive}
          disabled={archiveState === 'loading'}
          style={{
            ...BTN,
            opacity: archiveState === 'loading' ? 0.65 : 1,
            cursor: archiveState === 'loading' ? 'wait' : 'pointer',
            color: archiveState === 'error' ? '#B91C1C' : C.gray700,
            borderColor: archiveState === 'error' ? '#FECACA' : '#E5E7EB',
          }}
        >
          <Trash2 size={12} strokeWidth={1.8} />
          {archiveState === 'loading' ? 'Archiving…' : archiveState === 'error' ? 'Retry' : ''}
        </button>
      )}
    </div>
  );
}
