// Tests for the shared userStatusPill helper (Feature 2 Slice 1).
//
// Verifies:
//   - display_status "invite_sent" always wins, regardless of raw status.
//   - Raw statuses (active/inactive/suspended/archived) render unchanged
//     when display_status isn't "invite_sent" (no regression for admin's
//     manually-set deactivated states).
//   - Unknown raw status falls back to a neutral pill instead of crashing.

import { describe, it, expect } from 'vitest';
import { userStatusPill } from './userDisplayStatus';

describe('userStatusPill', () => {
  it('a freshly invited user (status active, display_status invite_sent) shows "Invite sent"', () => {
    const pill = userStatusPill({ status: 'active', display_status: 'invite_sent' });
    expect(pill.label).toBe('Invite sent');
    expect(pill.className).toContain('blue');
  });

  it('an established user (display_status active) shows "Active"', () => {
    const pill = userStatusPill({ status: 'active', display_status: 'active' });
    expect(pill.label).toBe('Active');
    expect(pill.className).toContain('green');
  });

  it('an archived user shows "Archived" whether or not display_status is set', () => {
    expect(userStatusPill({ status: 'archived', display_status: 'archived' }).label).toBe('Archived');
    expect(userStatusPill({ status: 'archived' }).label).toBe('Archived');
  });

  it('a manually deactivated user (status inactive, has logged in before) still shows "Inactive", not "Active"', () => {
    // Backend display_status derivation conservatively returns "active" here
    // (the user HAS logged in before), but the raw "inactive" status was an
    // explicit admin action and must not be hidden behind a collapsed pill.
    const pill = userStatusPill({ status: 'inactive', display_status: 'active' });
    expect(pill.label).toBe('Inactive');
    expect(pill.className).toContain('yellow');
  });

  it('a suspended user shows "Suspended"', () => {
    const pill = userStatusPill({ status: 'suspended', display_status: 'active' });
    expect(pill.label).toBe('Suspended');
    expect(pill.className).toContain('red');
  });

  it('missing display_status (older payload) falls back to the raw status pill', () => {
    const pill = userStatusPill({ status: 'active' });
    expect(pill.label).toBe('Active');
  });

  it('unknown raw status falls back to a neutral pill using the raw value as label', () => {
    const pill = userStatusPill({ status: 'some_future_status' });
    expect(pill.label).toBe('some_future_status');
    expect(pill.className).toContain('gray');
  });

  // Feature 2 Slice 2: last_login_at is now stamped at every real auth
  // path (invite consume, magic-link consume, password reset), not just
  // the standard sign-in, so an "active" pill can safely be paired with a
  // truthful last-sign-in date.
  describe('lastSignInLabel (Feature 2 Slice 2)', () => {
    it('an active user with a last_login_at gets a formatted lastSignInLabel', () => {
      const pill = userStatusPill({
        status: 'active',
        display_status: 'active',
        last_login_at: '2026-07-10T12:00:00Z',
      });
      expect(pill.label).toBe('Active');
      expect(pill.lastSignInLabel).toBe('Last sign-in: Jul 10, 2026');
    });

    it('an invite_sent user (no last_login_at) has a null lastSignInLabel', () => {
      const pill = userStatusPill({
        status: 'active',
        display_status: 'invite_sent',
        last_login_at: null,
      });
      expect(pill.label).toBe('Invite sent');
      expect(pill.lastSignInLabel).toBeNull();
    });

    it('an archived user has a null lastSignInLabel even if last_login_at is present', () => {
      const pill = userStatusPill({
        status: 'archived',
        display_status: 'archived',
        last_login_at: '2026-07-10T12:00:00Z',
      });
      expect(pill.lastSignInLabel).toBeNull();
    });

    it('an active display_status with a missing last_login_at never fabricates a date', () => {
      const pill = userStatusPill({ status: 'active', display_status: 'active', last_login_at: null });
      expect(pill.lastSignInLabel).toBeNull();
    });

    it('a manually deactivated user (inactive) with a real last_login_at has a null lastSignInLabel (only pairs with the active pill)', () => {
      const pill = userStatusPill({
        status: 'inactive',
        display_status: 'active',
        last_login_at: '2026-07-10T12:00:00Z',
      });
      expect(pill.label).toBe('Inactive');
      expect(pill.lastSignInLabel).toBeNull();
    });
  });
});
