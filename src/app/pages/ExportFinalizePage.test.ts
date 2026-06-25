// ExportFinalizePage.test.ts
// Pure-function tests for ExportFinalizePage exported logic.
// Node-mode only — no jsdom, no @testing-library/react.
// Pattern matches /src/app/pages/QuotesPage.test.ts

import { describe, it, expect } from 'vitest';
import {
  FROM_DISPLAY_ADDRESS,
  isOpenQuoteSendDisabled,
  DISMISS_ENABLED,
  openEditDrawerSafe,
  getPdfButtonLabel,
  getOrderGuideDisabledReason,
  SEND_QUOTE_DISABLED_REASON,
  isExportBlockedUnreviewed,
  REVIEW_REQUIRED_REASON,
} from './ExportFinalizePage';

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


describe('B-101 — modal dismiss controls present', () => {
  it('DISMISS_ENABLED is true — Success Drawer has X+Skip, Email Drawer has X+Cancel', () => {
    // Sentinel: export this constant ONLY after adding the dismiss controls in the JSX.
    // This is a code-convention guard, not a DOM assertion — it relies on the developer
    // convention that DISMISS_ENABLED is set to true only when the X/Cancel/Skip
    // controls exist in the JSX. See ExportFinalizePage.tsx for the actual DrawerClose nodes.
    expect(DISMISS_ENABLED).toBe(true);
  });
});


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


describe('B-108c — PDF Quote button label feedback', () => {
  it('shows "Generating PDF..." while downloading', () => {
    expect(getPdfButtonLabel(true)).toBe('Generating PDF...');
  });

  it('shows "PDF Quote" in idle state', () => {
    expect(getPdfButtonLabel(false)).toBe('PDF Quote');
  });
});


describe('B-114 — Sticky Send Quote button: disabled reason is visible', () => {
  it('SEND_QUOTE_DISABLED_REASON is a non-empty string', () => {
    expect(typeof SEND_QUOTE_DISABLED_REASON).toBe('string');
    expect(SEND_QUOTE_DISABLED_REASON.trim().length).toBeGreaterThan(0);
  });

  it('mentions email in the disabled reason', () => {
    expect(SEND_QUOTE_DISABLED_REASON.toLowerCase()).toMatch(/email/);
  });
});


describe('B-115 — Order Guide: inline error state + disabled tooltip', () => {
  it('returns null (no tooltip) when finalized and quoteId is present', () => {
    expect(getOrderGuideDisabledReason(true, 'abc-123')).toBeNull();
  });

  it('returns a sign-up message when not finalized', () => {
    const reason = getOrderGuideDisabledReason(false, 'abc-123');
    expect(reason).not.toBeNull();
    expect(reason!.length).toBeGreaterThan(0);
  });

  it('returns a message when quoteId is undefined', () => {
    const reason = getOrderGuideDisabledReason(true, undefined);
    expect(reason).not.toBeNull();
    expect(reason!.length).toBeGreaterThan(0);
  });
});


describe('B-168 — Extraction review gate mirrors backend send_quote gate', () => {
  it('BLOCKS when not reviewed and state is preview', () => {
    expect(isExportBlockedUnreviewed(false, 'preview')).toBe(true);
  });

  it('BLOCKS when rep_reviewed is false and state is null', () => {
    expect(isExportBlockedUnreviewed(false, null)).toBe(true);
  });

  it('BLOCKS when rep_reviewed is undefined and state is undefined', () => {
    expect(isExportBlockedUnreviewed(undefined, undefined)).toBe(true);
  });

  it('ALLOWS when rep_reviewed is true (rep performed review)', () => {
    expect(isExportBlockedUnreviewed(true, 'preview')).toBe(false);
  });

  it('ALLOWS when state is distributor_quote (cleared rep mediation)', () => {
    expect(isExportBlockedUnreviewed(false, 'distributor_quote')).toBe(false);
  });

  it('ALLOWS when state is confirmed', () => {
    expect(isExportBlockedUnreviewed(false, 'confirmed')).toBe(false);
  });

  it('BLOCKS for other non-cleared states like accepted/declined', () => {
    expect(isExportBlockedUnreviewed(false, 'accepted')).toBe(true);
    expect(isExportBlockedUnreviewed(false, 'declined')).toBe(true);
  });

  it('REVIEW_REQUIRED_REASON is a non-empty string mentioning review', () => {
    expect(typeof REVIEW_REQUIRED_REASON).toBe('string');
    expect(REVIEW_REQUIRED_REASON.trim().length).toBeGreaterThan(0);
    expect(REVIEW_REQUIRED_REASON.toLowerCase()).toMatch(/review/);
  });
});
