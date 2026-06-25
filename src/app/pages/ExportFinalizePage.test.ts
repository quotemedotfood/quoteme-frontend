// ExportFinalizePage.test.ts
// Pure-function tests for ExportFinalizePage exported logic.
// Node-mode only — no jsdom, no @testing-library/react.
// Pattern matches /src/app/pages/QuotesPage.test.ts

import { describe, it, expect } from 'vitest';
import { FROM_DISPLAY_ADDRESS, isOpenQuoteSendDisabled } from './ExportFinalizePage';

describe('B-104 — from-address display string', () => {
  it('shows quotes@quoteme.food (correct domain)', () => {
    expect(FROM_DISPLAY_ADDRESS).toBe('quotes@quoteme.food');
  });

  it('has no uppercase letters and no hyphen (not the old wrong domain)', () => {
    expect(FROM_DISPLAY_ADDRESS).not.toMatch(/[A-Z]/);
    expect(FROM_DISPLAY_ADDRESS).not.toMatch(/quote-me/);
    expect(FROM_DISPLAY_ADDRESS).not.toMatch(/Quote-me/);
  });
});

describe('B-109a — Open Quote send button disabled until recipient selected', () => {
  it('disabled when open quote and no email at all', () => {
    expect(isOpenQuoteSendDisabled(true, '', null)).toBe(true);
  });

  it('disabled when open quote and empty string manual email', () => {
    expect(isOpenQuoteSendDisabled(true, '', '')).toBe(true);
  });

  it('disabled when open quote and whitespace-only manual email', () => {
    expect(isOpenQuoteSendDisabled(true, '   ', null)).toBe(true);
  });

  it('enabled when open quote and manual email entered', () => {
    expect(isOpenQuoteSendDisabled(true, 'chef@place.com', null)).toBe(false);
  });

  it('enabled when open quote and contactEmail present', () => {
    expect(isOpenQuoteSendDisabled(true, '', 'chef@place.com')).toBe(false);
  });

  it('always enabled when not an open quote (restaurant attached)', () => {
    expect(isOpenQuoteSendDisabled(false, '', null)).toBe(false);
  });
});
