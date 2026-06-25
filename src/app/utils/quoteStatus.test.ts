// C-03: a guest revisiting /chef/status/:uuid for an already-finished quote saw a
// blank Step 1 (currentStep=0) before the delayed navigate. The fix navigates to the
// receipt immediately on the first poll when the quote is already complete.
import { describe, it, expect } from 'vitest';
import { isQuoteComplete, isPricedQuote } from './quoteStatus';

// B-140: isPricedQuote guard — prevents "$0.00" on pending/draft quotes.
describe('isPricedQuote', () => {
  it('returns false for a pending quote with 0 total_cents', () => {
    expect(isPricedQuote({ total_cents: 0, status: 'pending' })).toBe(false);
  });

  it('returns false for a draft quote with null total_cents', () => {
    expect(isPricedQuote({ total_cents: null, status: 'draft' })).toBe(false);
  });

  it('returns true for a confirmed quote with 2500 total_cents', () => {
    expect(isPricedQuote({ total_cents: 2500, status: 'confirmed' })).toBe(true);
  });

  it('returns true for a pending quote with 2500 total_cents (edge: has total, still pending)', () => {
    expect(isPricedQuote({ total_cents: 2500, status: 'pending' })).toBe(true);
  });
});

describe('isQuoteComplete', () => {
  it('is complete when processing_stage is "complete"', () => {
    expect(isQuoteComplete({ processing_stage: 'complete' })).toBe(true);
  });

  it('is NOT complete while an active stage is in progress', () => {
    expect(isQuoteComplete({ processing_stage: 'aligning_products' })).toBe(false);
    expect(isQuoteComplete({ processing_stage: 'extracting_dishes' })).toBe(false);
  });

  it('falls back to lines when there is no stage (legacy/direct)', () => {
    expect(isQuoteComplete({ lines: [{}, {}] })).toBe(true);
    expect(isQuoteComplete({ lines: [] })).toBe(false);
  });

  it('falls back to a terminal status when there is no stage or lines', () => {
    expect(isQuoteComplete({ status: 'sent' })).toBe(true);
    expect(isQuoteComplete({ status: 'won' })).toBe(true);
    expect(isQuoteComplete({ status: 'draft' })).toBe(false);
    expect(isQuoteComplete({ status: 'processing' })).toBe(false);
  });

  it('is not complete for an empty/fresh quote', () => {
    expect(isQuoteComplete({})).toBe(false);
  });

  it('is complete when lines exist despite a stale in-progress stage (revisit)', () => {
    expect(
      isQuoteComplete({ processing_stage: 'extracting_dishes', lines: [{}, {}] }),
    ).toBe(true);
    expect(
      isQuoteComplete({ processing_stage: 'aligning_products', status: 'sent' }),
    ).toBe(true);
  });

  it('is not complete when stage is failed even with lines', () => {
    expect(isQuoteComplete({ processing_stage: 'failed', lines: [{}] })).toBe(false);
  });
});
