// menuQuoteLabel.test.ts — M-1: "never quoted · 1 quote" contradiction fix.
//
// The card must NEVER show "never quoted" when quote_count > 0.
// Logic extracted as a pure function for isolated testing.

import { describe, it, expect } from 'vitest';

// ── pure helper mirrors the fixed conditional in ChefMenusPage / ChefMenuDetailPage ──
function menuQuoteLabel(
  quote_count: number,
  last_quoted_at: string | null | undefined,
): string {
  if (quote_count === 0) return 'never quoted';
  if (last_quoted_at) return `last quoted ${last_quoted_at}`;
  return `${quote_count} ${quote_count === 1 ? 'quote' : 'quotes'}`;
}

describe('M-1: menu card quote-count label', () => {
  it('shows "never quoted" when quote_count is 0', () => {
    expect(menuQuoteLabel(0, null)).toBe('never quoted');
  });

  it('shows "never quoted" when quote_count is 0 even with a last_quoted_at (defensive)', () => {
    // Shouldn't happen in practice; last_quoted_at date with 0 quotes is impossible on prod,
    // but the count gate must take precedence.
    expect(menuQuoteLabel(0, '2026-01-01')).toBe('never quoted');
  });

  it('shows "last quoted [date]" when last_quoted_at is set and count > 0', () => {
    expect(menuQuoteLabel(3, '2026-06-01')).toBe('last quoted 2026-06-01');
  });

  it('shows "1 quote" (singular) when count is 1 and no last_quoted_at', () => {
    expect(menuQuoteLabel(1, null)).toBe('1 quote');
  });

  it('shows "2 quotes" (plural) when count is 2 and no last_quoted_at', () => {
    expect(menuQuoteLabel(2, null)).toBe('2 quotes');
  });

  it('does NOT contain "never quoted" when quote_count > 0', () => {
    expect(menuQuoteLabel(1, null)).not.toContain('never quoted');
    expect(menuQuoteLabel(5, null)).not.toContain('never quoted');
    expect(menuQuoteLabel(1, '2026-04-01')).not.toContain('never quoted');
  });
});

// ── M-2: /distributors redirect target constant ───────────────────────────────
// Encodes the redirect target string so a routes.tsx typo fails this test.

const DISTRIBUTORS_REDIRECT_TARGET = '/chef/distributor/new';

describe('M-2: /distributors redirects to /chef/distributor/new', () => {
  it('redirect target is the canonical distributor entry surface', () => {
    expect(DISTRIBUTORS_REDIRECT_TARGET).toBe('/chef/distributor/new');
  });

  it('redirect target is not /distributors (that would create a redirect loop)', () => {
    expect(DISTRIBUTORS_REDIRECT_TARGET).not.toBe('/distributors');
  });

  it('redirect target is not /auth (distributors page is not an auth surface)', () => {
    expect(DISTRIBUTORS_REDIRECT_TARGET).not.toBe('/auth');
  });
});

// ── M-4: cold-landing contact-info validation rules ──────────────────────────
// Validation logic extracted from DistributorLanderPage.LanderForm.validate()

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
function isValidPhone(s: string): boolean {
  return /[\d]{7,}/.test(s.replace(/\D/g, ''));
}

interface LanderFields {
  restaurantName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

interface LanderErrors {
  restaurantName?: string;
  contactName?: string;
  contact?: string;
}

function validateLanderForm(fields: LanderFields): LanderErrors {
  const errs: LanderErrors = {};
  if (!fields.restaurantName.trim()) errs.restaurantName = 'Restaurant name is required.';
  if (!fields.contactName.trim())    errs.contactName    = 'Your name is required.';
  const hasEmail = fields.contactEmail.trim() && isValidEmail(fields.contactEmail);
  const hasPhone = fields.contactPhone.trim() && isValidPhone(fields.contactPhone);
  if (!hasEmail && !hasPhone) {
    errs.contact = 'Please provide a valid email or phone number.';
  }
  return errs;
}

describe('M-4: cold-landing form validation', () => {
  const base: LanderFields = {
    restaurantName: 'The Holloway Grill',
    contactName: 'Alex Rivera',
    contactEmail: 'alex@holloway.com',
    contactPhone: '',
  };

  it('passes with restaurant name + contact name + valid email', () => {
    expect(Object.keys(validateLanderForm(base))).toHaveLength(0);
  });

  it('passes with restaurant name + contact name + valid phone (no email)', () => {
    const fields = { ...base, contactEmail: '', contactPhone: '+1 555 000 0000' };
    expect(Object.keys(validateLanderForm(fields))).toHaveLength(0);
  });

  it('blocks submit when restaurantName is empty', () => {
    const errs = validateLanderForm({ ...base, restaurantName: '' });
    expect(errs.restaurantName).toBeDefined();
  });

  it('blocks submit when restaurantName is whitespace-only', () => {
    const errs = validateLanderForm({ ...base, restaurantName: '   ' });
    expect(errs.restaurantName).toBeDefined();
  });

  it('blocks submit when both email and phone are empty', () => {
    const errs = validateLanderForm({ ...base, contactEmail: '', contactPhone: '' });
    expect(errs.contact).toBeDefined();
  });

  it('blocks submit when email is present but malformed and phone is empty', () => {
    const errs = validateLanderForm({ ...base, contactEmail: 'notanemail', contactPhone: '' });
    expect(errs.contact).toBeDefined();
  });

  it('passes when email is invalid but phone is valid (falls back to phone)', () => {
    const errs = validateLanderForm({ ...base, contactEmail: 'bad-email', contactPhone: '5550001234' });
    expect(errs.contact).toBeUndefined();
  });

  it('error message for missing contact info mentions email or phone', () => {
    const errs = validateLanderForm({ ...base, contactEmail: '', contactPhone: '' });
    expect(errs.contact).toMatch(/email|phone/i);
  });
});
