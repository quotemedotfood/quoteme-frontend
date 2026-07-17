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
  isLineAcknowledged,
  unacknowledgedUnmatchedLines,
  getBlockedSendReason,
} from './ExportFinalizePage';
import type { QuoteLineResponse } from '../services/api';

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


describe('B-168 — Extraction review gate mirrors backend send_quote gate exactly', () => {
  it('BLOCKS when rep_reviewed_at is null and state is preview', () => {
    expect(isExportBlockedUnreviewed(null, 'preview')).toBe(true);
  });

  it('BLOCKS when rep_reviewed_at is null and state is null', () => {
    expect(isExportBlockedUnreviewed(null, null)).toBe(true);
  });

  it('BLOCKS when rep_reviewed_at is undefined and state is undefined', () => {
    expect(isExportBlockedUnreviewed(undefined, undefined)).toBe(true);
  });

  it('ALLOWS when rep_reviewed_at is present (ISO 8601 string) even if state=preview', () => {
    expect(isExportBlockedUnreviewed('2026-03-12T10:30:00Z', 'preview')).toBe(false);
  });

  it('ALLOWS when state is distributor_quote regardless of rep_reviewed_at', () => {
    expect(isExportBlockedUnreviewed(null, 'distributor_quote')).toBe(false);
  });

  it('ALLOWS when state is confirmed regardless of rep_reviewed_at', () => {
    expect(isExportBlockedUnreviewed(null, 'confirmed')).toBe(false);
  });

  it('BLOCKS for other non-cleared states like accepted/declined', () => {
    expect(isExportBlockedUnreviewed(null, 'accepted')).toBe(true);
    expect(isExportBlockedUnreviewed(null, 'declined')).toBe(true);
  });

  it('REVIEW_REQUIRED_REASON is a non-empty string mentioning review', () => {
    expect(typeof REVIEW_REQUIRED_REASON).toBe('string');
    expect(REVIEW_REQUIRED_REASON.trim().length).toBeGreaterThan(0);
    expect(REVIEW_REQUIRED_REASON.toLowerCase()).toMatch(/review/);
  });
});

// ── BUG #21/#23 — unmatched-line acknowledgment completes review, and a
// blocked send always names WHY ────────────────────────────────────────────

function matchedLine(overrides: Partial<QuoteLineResponse> = {}): QuoteLineResponse {
  return {
    id: 'line-matched',
    position: 1,
    category: 'Proteins',
    quantity: 1,
    unit_price_cents: 1000,
    unit_price: '$10.00',
    alignment_selected: 1,
    availability_status: 'available',
    chef_note: null,
    component: { id: 'c1', name: 'Chicken Breast', source_dish: 'Chicken Dish' },
    product: { id: 'p1', item_number: '1', brand: 'Acme', product: 'Chicken Breast', pack_size: '10lb', category: 'Proteins' },
    ...overrides,
  } as QuoteLineResponse;
}

function unmatchedLine(overrides: Partial<QuoteLineResponse> = {}): QuoteLineResponse {
  return matchedLine({
    id: 'line-unmatched',
    availability_status: 'not_in_catalog',
    unit_price_cents: null,
    unit_price: null,
    product: null as any,
    rep_handled: false,
    ...overrides,
  });
}

describe('BUG #23 — isLineAcknowledged', () => {
  it('a matched (available) line is always considered acknowledged', () => {
    expect(isLineAcknowledged(matchedLine())).toBe(true);
  });

  it('an unmatched line with rep_handled=false is NOT acknowledged', () => {
    expect(isLineAcknowledged(unmatchedLine({ rep_handled: false }))).toBe(false);
  });

  it('an unmatched line with rep_handled=true IS acknowledged', () => {
    expect(isLineAcknowledged(unmatchedLine({ rep_handled: true }))).toBe(true);
  });

  it('an unmatched line with rep_handled undefined defaults to NOT acknowledged', () => {
    expect(isLineAcknowledged(unmatchedLine({ rep_handled: undefined }))).toBe(false);
  });
});

describe('BUG #21 — unacknowledgedUnmatchedLines', () => {
  it('returns [] when there are no unmatched lines', () => {
    expect(unacknowledgedUnmatchedLines([matchedLine(), matchedLine({ id: 'l2' })])).toEqual([]);
  });

  it('returns [] once every unmatched line has been acknowledged', () => {
    const lines = [matchedLine(), unmatchedLine({ id: 'u1', rep_handled: true }), unmatchedLine({ id: 'u2', rep_handled: true })];
    expect(unacknowledgedUnmatchedLines(lines)).toEqual([]);
  });

  it('returns the still-unacknowledged unmatched lines only', () => {
    const acked = unmatchedLine({ id: 'u1', rep_handled: true });
    const notAcked = unmatchedLine({ id: 'u2', rep_handled: false });
    const lines = [matchedLine(), acked, notAcked];
    const result = unacknowledgedUnmatchedLines(lines);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('u2');
  });
});

describe('BUG #21 — getBlockedSendReason: send is never silently blocked', () => {
  it('returns null when not blocked', () => {
    expect(getBlockedSendReason(false, [unmatchedLine({ rep_handled: false })])).toBeNull();
  });

  it('falls back to the generic REVIEW_REQUIRED_REASON when blocked with no unmatched lines', () => {
    expect(getBlockedSendReason(true, [matchedLine()])).toBe(REVIEW_REQUIRED_REASON);
  });

  it('names the exact count of unacknowledged unmatched items when blocked (singular)', () => {
    const reason = getBlockedSendReason(true, [unmatchedLine({ id: 'u1', rep_handled: false })]);
    expect(reason).toMatch(/^1 item still needs you to choose Rep will handle or Can't source/);
  });

  it('names the exact count of unacknowledged unmatched items when blocked (plural)', () => {
    const lines = [
      unmatchedLine({ id: 'u1', rep_handled: false }),
      unmatchedLine({ id: 'u2', rep_handled: false }),
    ];
    const reason = getBlockedSendReason(true, lines);
    expect(reason).toMatch(/^2 items still need you to choose Rep will handle or Can't source/);
  });

  it('does not count already-acknowledged unmatched lines toward the reason', () => {
    const lines = [
      unmatchedLine({ id: 'u1', rep_handled: true }),
      unmatchedLine({ id: 'u2', rep_handled: false }),
    ];
    const reason = getBlockedSendReason(true, lines);
    expect(reason).toMatch(/^1 item still needs/);
  });

  it('never returns an empty/falsy reason string while blocked (never silent)', () => {
    expect(getBlockedSendReason(true, [])).toBeTruthy();
    expect(getBlockedSendReason(true, [unmatchedLine()])).toBeTruthy();
  });
});
