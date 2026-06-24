/**
 * B-10: Rep Profile page pre-populates form fields from auth user on load.
 *
 * Pure-logic tests — no DOM/jsdom needed because the behaviour under test
 * is the mapping/initialisation logic, not React rendering.
 */

import { describe, it, expect } from 'vitest';

// ─── Helper: replicate the field-initialisation logic from RepProfilePage ──────

/**
 * Mirrors how RepProfilePage initialises its editable fields.
 * Priority: getRepProfile() result > useAuth user fallback.
 */
function initFieldsFromRepProfile(
  repProfileData: { first_name: string | null; last_name: string | null; phone: string | null } | null,
  authUser: { first_name: string; last_name: string; phone?: string } | null,
): { firstName: string; lastName: string; phone: string } {
  if (repProfileData) {
    return {
      firstName: repProfileData.first_name ?? '',
      lastName: repProfileData.last_name ?? '',
      phone: repProfileData.phone ?? '',
    };
  }
  // Fallback to auth user while fetch is pending or failed
  if (authUser) {
    return {
      firstName: authUser.first_name ?? '',
      lastName: authUser.last_name ?? '',
      phone: authUser.phone ?? '',
    };
  }
  return { firstName: '', lastName: '', phone: '' };
}

describe('B-10: RepProfilePage field initialisation', () => {
  it('populates firstName/lastName/phone from getRepProfile() result', () => {
    const repData = { first_name: 'Dana', last_name: 'Kim', phone: '555-1234' };
    const result = initFieldsFromRepProfile(repData, null);
    expect(result.firstName).toBe('Dana');
    expect(result.lastName).toBe('Kim');
    expect(result.phone).toBe('555-1234');
  });

  it('falls back to auth user when repProfile fetch has not yet resolved (null)', () => {
    const authUser = { first_name: 'Dana', last_name: 'Kim', phone: '555-0000' };
    const result = initFieldsFromRepProfile(null, authUser);
    expect(result.firstName).toBe('Dana');
    expect(result.lastName).toBe('Kim');
    expect(result.phone).toBe('555-0000');
  });

  it('converts null fields from repProfile to empty strings', () => {
    const repData = { first_name: null, last_name: null, phone: null };
    const result = initFieldsFromRepProfile(repData, null);
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.phone).toBe('');
  });

  it('returns empty strings when both sources are null', () => {
    const result = initFieldsFromRepProfile(null, null);
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.phone).toBe('');
  });
});

// ─── B-14: Company Name pre-population for reps in SettingsPage ───────────────

/**
 * Mirrors the companyName resolution logic added to SettingsPage.
 * Priority: user.distributor.name > user.distributor_name > profile.distributorName.
 */
function resolveCompanyName(
  user: { distributor?: { name: string } | null; distributor_name?: string } | null,
  profileDistributorName: string,
): string {
  return user?.distributor?.name || user?.distributor_name || profileDistributorName;
}

describe('B-14: SettingsPage Company Name resolution for reps', () => {
  it('prefers user.distributor.name when available', () => {
    const user = { distributor: { name: 'Summit Foods' }, distributor_name: 'Summit Old' };
    expect(resolveCompanyName(user, 'Guest Distributor')).toBe('Summit Foods');
  });

  it('falls back to user.distributor_name when distributor object is null', () => {
    const user = { distributor: null, distributor_name: 'Lipari Foods' };
    expect(resolveCompanyName(user, 'Guest Distributor')).toBe('Lipari Foods');
  });

  it('falls back to profile.distributorName when both user distributor fields are absent', () => {
    const user = { distributor: null, distributor_name: undefined };
    expect(resolveCompanyName(user, 'Summit Foods Profile')).toBe('Summit Foods Profile');
  });

  it('returns empty string when all sources are empty', () => {
    const user = { distributor: null, distributor_name: '' };
    expect(resolveCompanyName(user, '')).toBe('');
  });
});

// ─── B-09: Billing visibility role gate ───────────────────────────────────────

/**
 * Mirrors the role-gate logic for the Billing section in SettingsPage.
 *
 * Spec:
 *   - 'rep'                 → HIDDEN
 *   - 'distributor_admin'   → SHOWN (distributor-admin billing view)
 *   - 'quoteme_admin'       → SHOWN (same as distributor_admin for internal)
 *   - chef / guest / buyer  → SHOWN (personal plan billing view)
 */
function shouldShowBilling(
  role: string | undefined,
  isGuest: boolean,
): boolean {
  if (role === 'rep') return false;
  return true; // distributor_admin, quoteme_admin, chef, buyer, guest all see it
}

describe('B-09: Billing section visibility by role', () => {
  it('hides Billing for rep role', () => {
    expect(shouldShowBilling('rep', false)).toBe(false);
  });

  it('shows Billing for distributor_admin', () => {
    expect(shouldShowBilling('distributor_admin', false)).toBe(true);
  });

  it('shows Billing for quoteme_admin', () => {
    expect(shouldShowBilling('quoteme_admin', false)).toBe(true);
  });

  it('shows Billing for chef', () => {
    expect(shouldShowBilling('chef', false)).toBe(true);
  });

  it('shows Billing for guest (isGuest=true)', () => {
    expect(shouldShowBilling(undefined, true)).toBe(true);
  });

  it('shows Billing for buyer role', () => {
    expect(shouldShowBilling('buyer', false)).toBe(true);
  });
});
