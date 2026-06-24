// ChefOrderGuidePage.test.ts
// Unit tests for C-1 (save handler result detection) and H-6 (UTC date off-by-one).
//
// C-1: "saving..." hung forever because:
//   (a) debounceRef was a plain object (not useRef), losing timer IDs across renders
//   (b) no error handling — if the API response contained {error: ...}, saving state
//       was never cleared to false; now uses try/finally to guarantee clearing.
//
// H-6: effective date showed June 23 when it was June 24 because
//   new Date("2026-06-24T00:00:00.000Z") is UTC midnight = June 23 local in US timezones.
//   Fix: parse date parts directly into local calendar via new Date(year, month-1, day).

import { describe, it, expect } from 'vitest';
import { isSaveFailure, parseEffectiveDate } from './ChefOrderGuidePage';

// ─── C-1: isSaveFailure ──────────────────────────────────────────────────────────

describe('isSaveFailure — detects API error responses from updateOrderGuideItem', () => {
  it('returns false when the response has data (success)', () => {
    expect(isSaveFailure({ data: { id: 'abc', quantity: 3, par: 5 } })).toBe(false);
  });

  it('returns true when the response has an error field (non-200)', () => {
    expect(isSaveFailure({ error: 'HTTP 401' })).toBe(true);
  });

  it('returns true for a 404 error', () => {
    expect(isSaveFailure({ error: 'Not found' })).toBe(true);
  });

  it('returns true for a network error', () => {
    expect(isSaveFailure({ error: 'Network error' })).toBe(true);
  });

  it('returns false when both error and data are absent (empty object = treat as ok)', () => {
    expect(isSaveFailure({})).toBe(false);
  });
});

// ─── H-6: parseEffectiveDate ─────────────────────────────────────────────────────

describe('parseEffectiveDate — renders correct local date, no UTC shift', () => {
  it('renders June 24 for "2026-06-24T00:00:00.000Z" (UTC midnight must not shift to June 23)', () => {
    const result = parseEffectiveDate('2026-06-24T00:00:00.000Z');
    expect(result).toContain('June 24');
    expect(result).not.toContain('June 23');
  });

  it('renders June 24 for plain "2026-06-24" date string', () => {
    const result = parseEffectiveDate('2026-06-24');
    expect(result).toContain('June 24');
  });

  it('renders June 23 correctly for "2026-06-23"', () => {
    const result = parseEffectiveDate('2026-06-23');
    expect(result).toContain('June 23');
  });

  it('renders January 1 correctly for "2026-01-01T00:00:00.000Z"', () => {
    const result = parseEffectiveDate('2026-01-01T00:00:00.000Z');
    expect(result).toContain('January 1');
    expect(result).toContain('2026');
  });

  it('renders December 31 correctly for "2025-12-31T00:00:00.000Z"', () => {
    const result = parseEffectiveDate('2025-12-31T00:00:00.000Z');
    expect(result).toContain('December 31');
    expect(result).toContain('2025');
  });

  it('returns null for empty string', () => {
    expect(parseEffectiveDate('')).toBeNull();
  });

  it('returns null for a malformed string', () => {
    expect(parseEffectiveDate('not-a-date')).toBeNull();
  });
});
