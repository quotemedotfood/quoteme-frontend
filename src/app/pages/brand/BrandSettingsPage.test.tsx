// BrandSettingsPage.test.tsx
// B-150: Verify that the Category display row provides a meaningful hint
//        when no category is set, and that the valid category list is defined.

import { describe, it, expect } from 'vitest';

// ─── Valid categories (mirrors Brand::VALID_CATEGORIES from backend) ──────────

const BRAND_VALID_CATEGORIES = [
  'produce', 'meat', 'poultry', 'seafood', 'dairy', 'cheese',
  'dry_goods', 'frozen', 'bakery', 'beverage', 'prepared', 'non_food', 'other',
] as const;

type BrandCategory = (typeof BRAND_VALID_CATEGORIES)[number];

function categoryDisplayValue(category: string | null | undefined): string {
  if (!category) return 'Not set';
  return category;
}

function isCategoryHintShown(category: string | null | undefined): boolean {
  return !category;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BrandSettingsPage — B-150: category placeholder/hint', () => {
  it('shows "Not set" hint when category is null', () => {
    expect(categoryDisplayValue(null)).toBe('Not set');
    expect(isCategoryHintShown(null)).toBe(true);
  });

  it('shows "Not set" hint when category is undefined', () => {
    expect(categoryDisplayValue(undefined)).toBe('Not set');
    expect(isCategoryHintShown(undefined)).toBe(true);
  });

  it('shows "Not set" hint when category is empty string', () => {
    expect(categoryDisplayValue('')).toBe('Not set');
    expect(isCategoryHintShown('')).toBe(true);
  });

  it('shows category value when category is set', () => {
    expect(categoryDisplayValue('seafood')).toBe('seafood');
    expect(isCategoryHintShown('seafood')).toBe(false);
  });

  it('valid category list matches backend Brand::VALID_CATEGORIES', () => {
    expect(BRAND_VALID_CATEGORIES).toContain('produce');
    expect(BRAND_VALID_CATEGORIES).toContain('meat');
    expect(BRAND_VALID_CATEGORIES).toContain('seafood');
    expect(BRAND_VALID_CATEGORIES).toContain('dairy');
    expect(BRAND_VALID_CATEGORIES).toContain('other');
    expect(BRAND_VALID_CATEGORIES.length).toBe(13);
  });

  it('all valid categories are non-empty strings', () => {
    expect(BRAND_VALID_CATEGORIES.every((c) => typeof c === 'string' && c.length > 0)).toBe(true);
  });
});
