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
});
