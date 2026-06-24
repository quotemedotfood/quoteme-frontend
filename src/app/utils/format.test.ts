import { describe, it, expect } from 'vitest';
import { stripSeedPrefix } from './format';

describe('stripSeedPrefix', () => {
  it('strips the "[SEED] " prefix from a seed label', () => {
    expect(stripSeedPrefix('[SEED] Q-1067')).toBe('Q-1067');
  });

  it('leaves a normal label unchanged', () => {
    expect(stripSeedPrefix('Q-1067')).toBe('Q-1067');
  });

  it('returns empty string for null', () => {
    expect(stripSeedPrefix(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(stripSeedPrefix(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(stripSeedPrefix('')).toBe('');
  });

  it('does NOT strip "[SEED]" that appears mid-string (only leading prefix)', () => {
    expect(stripSeedPrefix('Q-1067 [SEED] note')).toBe('Q-1067 [SEED] note');
  });

  it('strips only the exact prefix "[SEED] " (with trailing space)', () => {
    // "[SEED]" without trailing space is NOT stripped
    expect(stripSeedPrefix('[SEED]Q-1067')).toBe('[SEED]Q-1067');
  });
});
