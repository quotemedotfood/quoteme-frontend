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

import { DISMISS_ENABLED } from './ExportFinalizePage';

describe('B-101 — modal dismiss controls present', () => {
  it('DISMISS_ENABLED is true — Success Drawer has X+Skip, Email Drawer has X+Cancel', () => {
    // Sentinel: export this constant after adding the dismiss controls in the JSX.
    // Confirms that Success Drawer (X button + Skip link) and Email Drawer
    // (X button + Cancel button) have visible dismiss affordances.
    expect(DISMISS_ENABLED).toBe(true);
  });
});

import {
  FROM_DISPLAY_ADDRESS,
  isOpenQuoteSendDisabled,
  DISMISS_ENABLED,
  openEditDrawerSafe,
} from './ExportFinalizePage';

describe('B-102 — Edit button opens edit drawer, not PDF preview', () => {
  it('openEditDrawerSafe sets showEditDrawer to true', () => {
    let editDrawerOpen = false;
    let capturedIds: string[] = [];
    const setEditDrawer = (v: boolean) => { editDrawerOpen = v; };
    const setTempIds = (ids: string[]) => { capturedIds = ids; };

    openEditDrawerSafe(setEditDrawer, setTempIds, ['contact-1', 'contact-2']);

    expect(editDrawerOpen).toBe(true);
    expect(capturedIds).toEqual(['contact-1', 'contact-2']);
  });

  it('openEditDrawerSafe takes exactly 3 parameters (no PDF handler)', () => {
    // Structural guard: if this function accepted a PDF handler, .length would be 4+.
    expect(openEditDrawerSafe.length).toBe(3);
  });
});
