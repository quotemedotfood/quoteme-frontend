// quoteStatusLabel — shared status label helper (H-3 fix).
//
// Single source of truth for how each J1 quote state maps to a human label
// across surfaces. Two rendering contexts:
//
//   'pill'   — short lifecycle pill in list/dashboard views (J1-locked by Justin).
//              confirmed → "Ready"  (matches QuoteStatusPill)
//
//   'header' — document header / detail-page context where "Confirmed Quote"
//              reads more naturally than "Ready" as a document type label.
//              confirmed → "Confirmed Quote"
//
// All other states have the same label in both contexts.
//
// The pill labels for preview/distributor_quote/accepted/declined/expired are
// Justin-locked — do NOT change them.

export type QuoteStatusContext = 'pill' | 'header';

/**
 * Returns a human-readable label for a J1 quote state.
 *
 * @param state   J1 state string: preview | distributor_quote | confirmed |
 *                accepted | declined | expired (or legacy status pass-through)
 * @param context 'pill' (list view, default) or 'header' (detail page heading)
 */
export function quoteStatusLabel(
  state: string,
  context: QuoteStatusContext = 'pill',
): string {
  switch (state) {
    case 'preview':
      return 'Awaiting rep';
    case 'distributor_quote':
      return 'Rep pricing';
    case 'confirmed':
      return context === 'header' ? 'Confirmed Quote' : 'Ready';
    case 'accepted':
      return 'Accepted';
    case 'declined':
      return 'Closed';
    case 'expired':
      return 'Expired';
    default:
      return state;
  }
}

/**
 * True when the J1 state or legacy status represents an accepted/won quote.
 * Used to gate CTAs (e.g. "Save for later") that are inappropriate once a
 * chef has already accepted.
 */
export function isAcceptedQuoteState(state: string | null | undefined): boolean {
  return state === 'accepted' || state === 'won';
}

/**
 * True when the J1 state or legacy status represents a quote the chef has
 * already acted on (accepted, declined, expired) OR that is locked for display
 * (confirmed, won, lost). Used to suppress action CTAs on terminal-state quotes.
 */
export function isLockedQuoteState({
  status,
  state,
  quote_type,
}: {
  status?: string | null;
  state?: string | null;
  quote_type?: string | null;
}): boolean {
  return (
    status === 'won' ||
    status === 'lost' ||
    state === 'accepted' ||
    state === 'declined' ||
    state === 'expired' ||
    state === 'confirmed' ||
    quote_type === 'confirmed'
  );
}
