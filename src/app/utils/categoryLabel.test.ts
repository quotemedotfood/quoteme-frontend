// categoryLabel.test.ts — M-5: verify "protein" → "Proteins" (and related)
//
// categoryLabel is the single source of truth for human-readable category names.
// This test guards the PROTEIN/Proteins normalisation so no display site can
// silently regress to the raw token.

import { describe, it, expect } from 'vitest';
import { categoryLabel, CATEGORY_DISPLAY_LABELS } from './categoryLabel';

describe('M-5: categoryLabel — protein/proteins normalisation', () => {
  it('maps raw "protein" token to "Proteins" (not "Protein")', () => {
    expect(categoryLabel('protein')).toBe('Proteins');
  });

  it('maps raw "proteins" token to "Proteins"', () => {
    expect(categoryLabel('proteins')).toBe('Proteins');
  });

  it('is case-insensitive on input', () => {
    expect(categoryLabel('PROTEIN')).toBe('Proteins');
    expect(categoryLabel('Protein')).toBe('Proteins');
  });

  it('trims whitespace around the raw token before lookup', () => {
    expect(categoryLabel(' protein ')).toBe('Proteins');
  });

  it('maps produce → Produce (smoke-test a stable non-protein category)', () => {
    expect(categoryLabel('produce')).toBe('Produce');
  });

  it('returns empty string for an empty input', () => {
    expect(categoryLabel('')).toBe('');
  });

  it('prettifies unknown tokens instead of returning raw snake_case', () => {
    expect(categoryLabel('some_unknown_category')).toBe('Some Unknown Category');
  });
});

describe('M-5: CATEGORY_DISPLAY_LABELS map includes protein → Proteins', () => {
  it('the static map has protein key', () => {
    expect(CATEGORY_DISPLAY_LABELS['protein']).toBe('Proteins');
  });

  it('the static map has proteins key', () => {
    expect(CATEGORY_DISPLAY_LABELS['proteins']).toBe('Proteins');
  });
});
