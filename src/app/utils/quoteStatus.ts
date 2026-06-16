// Whether a quote has finished processing (ready to view as a receipt).
// Mirrors ChefStatusPage's completion semantics in one testable place:
//   - Track 22 async flow: processing_stage === 'complete' (any other stage = in progress)
//   - Legacy/direct: no stage → complete when lines exist OR status is terminal
//     (anything other than draft/processing).
export function isQuoteComplete(quote: {
  processing_stage?: string | null;
  lines?: unknown[] | null;
  status?: string | null;
}): boolean {
  if (quote.processing_stage) return quote.processing_stage === 'complete';
  const hasLines = Array.isArray(quote.lines) && quote.lines.length > 0;
  const terminalStatus = !!quote.status && quote.status !== 'draft' && quote.status !== 'processing';
  return hasLines || terminalStatus;
}
