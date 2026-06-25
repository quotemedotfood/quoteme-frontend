// ccInboundAccess.test.ts — B-42
//
// Verifies role-based access control for the Command Center Inbound surface.
//
// Spec:
//   • HIDE the Inbound sidebar item (and its count) from rep accounts entirely.
//   • Guard/redirect: a rep who hits /distributor-admin/command-center/inbound
//     is redirected to /rep/quotes/inbound (the rep inbound route).
//   • distributor_admin accounts retain full CC Inbound access.
//   • Never show a count for a page the role can't access.

import { describe, it, expect } from 'vitest';
import { canAccessCCInbound, REP_INBOUND_REDIRECT } from './ccInboundAccess';

// ── canAccessCCInbound ────────────────────────────────────────────────────────

describe('canAccessCCInbound — CC Inbound page + count visibility', () => {
  it('returns true for distributor_admin — CC Inbound is their surface', () => {
    expect(canAccessCCInbound('distributor_admin')).toBe(true);
  });

  it('returns false for rep — reps must not see CC Inbound or its count', () => {
    expect(canAccessCCInbound('rep')).toBe(false);
  });

  it('returns false for chef', () => {
    expect(canAccessCCInbound('chef')).toBe(false);
  });

  it('returns false for quoteme_admin — has a different admin surface', () => {
    expect(canAccessCCInbound('quoteme_admin')).toBe(false);
  });

  it('returns false for buyer', () => {
    expect(canAccessCCInbound('buyer')).toBe(false);
  });

  it('returns false for group_admin', () => {
    expect(canAccessCCInbound('group_admin')).toBe(false);
  });

  it('returns false when role is null (unauthenticated)', () => {
    expect(canAccessCCInbound(null)).toBe(false);
  });

  it('returns false when role is undefined', () => {
    expect(canAccessCCInbound(undefined)).toBe(false);
  });
});

// ── REP_INBOUND_REDIRECT ──────────────────────────────────────────────────────

describe('REP_INBOUND_REDIRECT — redirect target for reps on CC Inbound', () => {
  it('points to the rep inbound route /rep/quotes/inbound', () => {
    // This route renders RepTriagePage — the rep's own triage queue.
    expect(REP_INBOUND_REDIRECT).toBe('/rep/quotes/inbound');
  });
});

// ── Interaction: sidebar count must be suppressed when access is denied ───────

describe('canAccessCCInbound — count suppression logic', () => {
  it('sidebar count should be shown only when canAccessCCInbound returns true', () => {
    // Simulate the gate: count is passed to the sidebar only when the role has access.
    function resolvedInboundCount(role: string | null | undefined, count: number): number {
      return canAccessCCInbound(role) ? count : 0;
    }

    // distributor_admin sees real count
    expect(resolvedInboundCount('distributor_admin', 7)).toBe(7);

    // rep sees 0 — count must never reach the sidebar item
    expect(resolvedInboundCount('rep', 7)).toBe(0);

    // null role sees 0
    expect(resolvedInboundCount(null, 7)).toBe(0);
  });
});
