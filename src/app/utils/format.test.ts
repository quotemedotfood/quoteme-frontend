import { describe, it, expect } from 'vitest';
import { stripSeedPrefix, formatColdLandingArtifact } from './format';

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

describe('formatColdLandingArtifact', () => {
  // New-format names from BE (after B-43 BE fix)
  it('returns "Menu PDF" unchanged for cold-landing rows', () => {
    expect(formatColdLandingArtifact('standing_page', 'Menu PDF')).toBe('Menu PDF');
  });

  it('returns "Order Guide PDF" unchanged for cold-landing rows', () => {
    expect(formatColdLandingArtifact('standing_page', 'Order Guide PDF')).toBe('Order Guide PDF');
  });

  it('returns "Menu Text" unchanged for cold-landing text submissions', () => {
    expect(formatColdLandingArtifact('standing_page', 'Menu Text')).toBe('Menu Text');
  });

  // Legacy names from BE (old data before B-43 BE fix)
  it('converts legacy "Uploaded Menu" to "Menu" for cold-landing rows', () => {
    expect(formatColdLandingArtifact('standing_page', 'Uploaded Menu')).toBe('Menu');
  });

  it('converts legacy "Uploaded Order guide" to "Order Guide" for cold-landing rows', () => {
    expect(formatColdLandingArtifact('standing_page', 'Uploaded Order guide')).toBe('Order Guide');
  });

  // Non-cold-landing rows pass through unchanged
  it('returns artifact name unchanged for non-cold-landing rows', () => {
    expect(formatColdLandingArtifact('secured_link', 'Uploaded Menu')).toBe('Uploaded Menu');
  });

  it('returns artifact name unchanged for null source', () => {
    expect(formatColdLandingArtifact(null, 'Some Label')).toBe('Some Label');
  });

  it('returns empty string for null artifact name', () => {
    expect(formatColdLandingArtifact('standing_page', null)).toBe('');
  });

  it('returns empty string for undefined artifact name', () => {
    expect(formatColdLandingArtifact('standing_page', undefined)).toBe('');
  });
});
