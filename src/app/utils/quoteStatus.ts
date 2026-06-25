/**
 * B-140: A quote is "priced" when it has a non-zero total OR its status
 * indicates it has moved past the unpriced draft/pending/processing stage.
 * Returns false (not priced) only when total_cents is 0/null/undefined AND
 * status is still in an early un-priced state.
 * Use this guard at every render site that shows a monetary total so that
 * pending/draft quotes never display "$0.00".
 */
export function isPricedQuote(quote: {
  total_cents?: number | null;
  status?: string | null;
}): boolean {
  const UNPRICED_STATUSES = new Set(['pending', 'draft', 'processing']);
  const hasTotal =
    typeof quote.total_cents === 'number' && quote.total_cents > 0;
  if (hasTotal) return true;
  // Zero/null total — only call it "not priced" if status is also unpriced.
  const status = (quote.status ?? '').toLowerCase();
  return !UNPRICED_STATUSES.has(status);
}

// Whether a quote has finished processing (ready to view as a receipt).
// Mirrors ChefStatusPage's completion semantics in one testable place:
//   - Track 22 async flow: processing_stage === 'complete'
//   - Revisit: lines or terminal status mean complete even if stage is stale
//   - Legacy/direct: no stage → complete when lines exist OR status is terminal
//     (anything other than draft/processing).
export function isQuoteComplete(quote: {
  processing_stage?: string | null;
  lines?: unknown[] | null;
  status?: string | null;
}): boolean {
  if (quote.processing_stage === 'failed') return false;
  if (quote.processing_stage === 'complete') return true;

  const hasLines = Array.isArray(quote.lines) && quote.lines.length > 0;
  const terminalStatus =
    !!quote.status && quote.status !== 'draft' && quote.status !== 'processing';

  // Backend may retain an in-progress stage label after work finished.
  if (hasLines || terminalStatus) return true;

  return false;
}
