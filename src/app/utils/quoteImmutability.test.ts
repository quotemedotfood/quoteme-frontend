// P0 route/shell guard: pins isSentImmutableQuote's boundary. The Sent
// immutability lock (item 3) and the admin-viewer read-only render (item 1)
// both hang off these predicates, so the boundary must not drift:
// Sent + Accepted records are immutable; confirmed-but-unsent and draft
// quotes stay writable (see ExportFinalizePage.render.test.tsx, whose
// send-flow fixture is a draft with state 'confirmed').
import { describe, it, expect } from 'vitest';
import {
  isSentImmutableQuote,
  isAdminViewerRole,
  quoteReadOnlyMarker,
  SENT_READ_ONLY_MARKER,
  ADMIN_READ_ONLY_MARKER,
} from './quoteImmutability';

describe('isSentImmutableQuote', () => {
  it('is true once sent_at is set, regardless of frozen status/state', () => {
    expect(
      isSentImmutableQuote({ status: 'sent', state: 'distributor_quote', sent_at: '2026-07-20T00:00:00Z' }),
    ).toBe(true);
    // sent_at alone is enough (status/state frozen through the resting period).
    expect(isSentImmutableQuote({ status: 'draft', state: null, sent_at: '2026-07-20T00:00:00Z' })).toBe(true);
  });

  it('is true for the Sent and Accepted statuses (incl. legacy won)', () => {
    expect(isSentImmutableQuote({ status: 'sent', state: null, sent_at: null })).toBe(true);
    expect(isSentImmutableQuote({ status: 'accepted', state: null, sent_at: null })).toBe(true);
    expect(isSentImmutableQuote({ status: 'won', state: null, sent_at: null })).toBe(true);
    expect(isSentImmutableQuote({ status: 'draft', state: 'accepted', sent_at: null })).toBe(true);
  });

  it('is false for a confirmed-but-unsent quote (still writable)', () => {
    expect(isSentImmutableQuote({ status: 'draft', state: 'confirmed', sent_at: null })).toBe(false);
  });

  it('is false for a draft quote', () => {
    expect(isSentImmutableQuote({ status: 'draft', state: null, sent_at: null })).toBe(false);
    expect(isSentImmutableQuote({})).toBe(false);
  });
});

describe('isAdminViewerRole', () => {
  it('is true only for quoteme_admin', () => {
    expect(isAdminViewerRole('quoteme_admin')).toBe(true);
    expect(isAdminViewerRole('rep')).toBe(false);
    expect(isAdminViewerRole('distributor_admin')).toBe(false);
    expect(isAdminViewerRole(undefined)).toBe(false);
    expect(isAdminViewerRole(null)).toBe(false);
  });
});

describe('quoteReadOnlyMarker', () => {
  it('prefers the Sent marker, falls back to the admin marker, else null', () => {
    expect(quoteReadOnlyMarker(true, true)).toBe(SENT_READ_ONLY_MARKER);
    expect(quoteReadOnlyMarker(false, true)).toBe(SENT_READ_ONLY_MARKER);
    expect(quoteReadOnlyMarker(true, false)).toBe(ADMIN_READ_ONLY_MARKER);
    expect(quoteReadOnlyMarker(false, false)).toBeNull();
  });
});
