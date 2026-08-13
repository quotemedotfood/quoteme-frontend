import { describe, it, expect } from 'vitest';
import { stripSeedPrefix, formatColdLandingArtifact, stripBracketWrap, formatStructuredEntry } from './format';

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

describe('stripBracketWrap', () => {
  // Chef quote header regression: restaurant name rendering as "[Name]"
  // instead of "Name".
  it('strips a full "[" "]" wrap around the name', () => {
    expect(stripBracketWrap('[The Grove]')).toBe('The Grove');
  });

  it('leaves a name with no bracket wrap unchanged', () => {
    expect(stripBracketWrap('The Grove')).toBe('The Grove');
  });

  it('leaves a name that only contains brackets partway through unchanged', () => {
    expect(stripBracketWrap('The Grove [Downtown]')).toBe('The Grove [Downtown]');
  });

  it('trims surrounding whitespace before checking for a bracket wrap', () => {
    expect(stripBracketWrap('  [The Grove]  ')).toBe('The Grove');
  });

  it('is null/undefined-safe', () => {
    expect(stripBracketWrap(null)).toBe('');
    expect(stripBracketWrap(undefined)).toBe('');
  });

  it('returns empty string for an empty input', () => {
    expect(stripBracketWrap('')).toBe('');
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

describe('formatStructuredEntry', () => {
  it('passes plain strings through untouched', () => {
    expect(formatStructuredEntry('rocket = arugula')).toBe('rocket = arugula');
  });

  it('renders empty string for null and undefined', () => {
    expect(formatStructuredEntry(null)).toBe('');
    expect(formatStructuredEntry(undefined)).toBe('');
  });

  it('renders non-string primitives via String()', () => {
    expect(formatStructuredEntry(42)).toBe('42');
    expect(formatStructuredEntry(true)).toBe('true');
  });

  it('renders a rule object as "type: ingredient_pattern"', () => {
    expect(formatStructuredEntry({ type: 'synonym', ingredient_pattern: 'rocket' })).toBe('synonym: rocket');
  });

  it('falls back through canonical_name then sauce_name for the label', () => {
    expect(formatStructuredEntry({ type: 'canonical', canonical_name: 'arugula' })).toBe('canonical: arugula');
    expect(formatStructuredEntry({ type: 'sauce', sauce_name: 'romesco' })).toBe('sauce: romesco');
  });

  it('falls back to JSON.stringify when no known label field exists', () => {
    expect(formatStructuredEntry({ type: 'pin', product_id: 'abc' })).toBe('pin: {"type":"pin","product_id":"abc"}');
    expect(formatStructuredEntry({ product_id: 'abc' })).toBe('{"product_id":"abc"}');
  });

  it('never renders raw [object Object]', () => {
    expect(formatStructuredEntry({ anything: { nested: true } })).not.toContain('[object Object]');
  });

  it('degrades a single malformed entry locally instead of throwing', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(formatStructuredEntry(circular)).toBe('(unrenderable entry)');
    expect(() => formatStructuredEntry(circular)).not.toThrow();
  });
});
