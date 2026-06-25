// ExportFinalizePage.test.ts
// Pure-function tests for ExportFinalizePage exported logic.
// Node-mode only — no jsdom, no @testing-library/react.
// Pattern matches /src/app/pages/QuotesPage.test.ts

import { describe, it, expect } from 'vitest';
import { FROM_DISPLAY_ADDRESS } from './ExportFinalizePage';

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
