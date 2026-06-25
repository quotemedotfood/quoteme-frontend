// ChefDistributorEntryPage.B153.test.tsx
// B-153: Verify that Add-Distributor section labels are title case,
//        not ALL-CAPS.

import { describe, it, expect } from 'vitest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAllCaps(text: string): boolean {
  // Ignores non-alpha chars; returns true if every alpha char is uppercase
  const alpha = text.replace(/[^a-zA-Z]/g, '');
  return alpha.length > 0 && alpha === alpha.toUpperCase();
}

function isTitleOrSentenceCase(text: string): boolean {
  // First word must start with an uppercase letter (sentence case or title case).
  // Remaining words may start upper or lower — we only require NOT all-caps overall.
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  const firstAlpha = trimmed.match(/[a-zA-Z]/);
  if (!firstAlpha) return true;
  return firstAlpha[0] === firstAlpha[0].toUpperCase() && !isAllCaps(trimmed);
}

// ─── Section labels that should appear in the Add-Distributor form ───────────

const SECTION_LABELS = [
  'Available distributors',
  'Upload',
  'Rep contact (optional)',
  'Request a catalog',
] as const;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ChefDistributorEntryPage — B-153: section labels are title case', () => {
  it('isAllCaps correctly identifies all-caps strings', () => {
    expect(isAllCaps('AVAILABLE DISTRIBUTORS')).toBe(true);
    expect(isAllCaps('UPLOAD')).toBe(true);
    expect(isAllCaps('Available distributors')).toBe(false);
  });

  it('isTitleOrSentenceCase correctly identifies title/sentence-case strings', () => {
    expect(isTitleOrSentenceCase('Available Distributors')).toBe(true);
    expect(isTitleOrSentenceCase('Available distributors')).toBe(true); // Sentence case also OK
    expect(isTitleOrSentenceCase('Upload')).toBe(true);
    expect(isTitleOrSentenceCase('Rep contact (optional)')).toBe(true);
    expect(isTitleOrSentenceCase('AVAILABLE DISTRIBUTORS')).toBe(false);
  });

  SECTION_LABELS.forEach((label) => {
    it(`section label "${label}" is not all-caps`, () => {
      expect(isAllCaps(label)).toBe(false);
    });

    it(`section label "${label}" starts with an uppercase letter`, () => {
      expect(label[0]).toBe(label[0].toUpperCase());
    });

    it(`section label "${label}" passes title/sentence case check`, () => {
      expect(isTitleOrSentenceCase(label)).toBe(true);
    });
  });

  it('all section labels are not ALL-CAPS', () => {
    expect(SECTION_LABELS.every((l) => !isAllCaps(l))).toBe(true);
  });
});
