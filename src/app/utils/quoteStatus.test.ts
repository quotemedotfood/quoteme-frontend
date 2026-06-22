// C-03: a guest revisiting /chef/status/:uuid for an already-finished quote saw a
// blank Step 1 (currentStep=0) before the delayed navigate. The fix navigates to the
// receipt immediately on the first poll when the quote is already complete.
import { describe, it, expect } from 'vitest';
import { isQuoteComplete } from './quoteStatus';

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
