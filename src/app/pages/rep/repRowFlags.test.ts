import { describe, it, expect } from 'vitest';
import { repRowFlags } from './repRowFlags';

describe('repRowFlags', () => {
  it('returns forwarded-to-you for an opportunity assigned to self', () => {
    const flags = repRowFlags({ kind: 'opportunity', assignedToSelf: true, status: null });
    expect(flags).toContain('forwarded-to-you');
  });

  it('returns new for an opportunity with status="new"', () => {
    const flags = repRowFlags({ kind: 'opportunity', status: 'new', assignedToSelf: false });
    expect(flags).toContain('new');
    expect(flags).not.toContain('forwarded-to-you');
  });

  it('returns needs-a-call for a cold_landing quote', () => {
    const flags = repRowFlags({ kind: 'quote', status: 'pending', source: 'cold_landing', waitingHours: 0 });
    expect(flags).toContain('needs-a-call');
  });

  it('returns needs-a-call for a quote waiting >= 48h', () => {
    const flags = repRowFlags({ kind: 'quote', status: 'open', waitingHours: 72, source: null });
    expect(flags).toContain('needs-a-call');
    expect(flags).not.toContain('forwarded-to-you');
    expect(flags).not.toContain('new');
  });

  it('returns empty array when no flags apply', () => {
    const flags = repRowFlags({ kind: 'quote', status: 'open', waitingHours: 10, source: 'website', assignedToSelf: false });
    expect(flags).toEqual([]);
  });

  it('stacks multiple flags on a single row', () => {
    // A new cold_landing opportunity assigned to this rep — all three flags.
    const flags = repRowFlags({
      kind: 'opportunity',
      status: 'new',
      assignedToSelf: true,
      waitingHours: 0,
      source: 'cold_landing',
    });
    expect(flags).toEqual(['forwarded-to-you', 'new', 'needs-a-call']);
  });

  it('preserves canonical order: forwarded-to-you → new → needs-a-call', () => {
    const flags = repRowFlags({
      kind: 'opportunity',
      status: 'new',
      assignedToSelf: true,
      waitingHours: 50,
      source: null,
    });
    expect(flags[0]).toBe('forwarded-to-you');
    expect(flags[1]).toBe('new');
    expect(flags[2]).toBe('needs-a-call');
  });

  it('returns new for a quote with status="pending"', () => {
    const flags = repRowFlags({ kind: 'quote', status: 'pending', waitingHours: 5, source: null });
    expect(flags).toContain('new');
  });
});
