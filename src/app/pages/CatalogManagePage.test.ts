// CatalogManagePage.test.ts
// Unit tests for the "Update Catalog" button visibility logic on the CC catalog page.
//
// The distributor_admin catalog page (route /distributor-admin/catalog) must
// surface an "Update Catalog" button that opens the CatalogUploadDrawer when
// a catalog is already loaded. This ensures the same upload/replace flow
// available on DistributorHomePage is also reachable from the CC shell.
//
// Tests use a pure-function helper extracted from the component so they run
// without jsdom or @testing-library/react (the project's test environment is
// currently node-only).

import { describe, it, expect } from 'vitest';
import { shouldShowUpdateCatalogButton, categoryColor } from './CatalogManagePage';

describe('shouldShowUpdateCatalogButton — CC catalog page update button visibility', () => {
  it('returns true when a catalog is loaded (catalogId is set)', () => {
    expect(shouldShowUpdateCatalogButton('abc-123')).toBe(true);
  });

  it('returns false when no catalog is loaded (catalogId is null)', () => {
    expect(shouldShowUpdateCatalogButton(null)).toBe(false);
  });

  it('returns false for empty string (guards against accidental empty ID)', () => {
    expect(shouldShowUpdateCatalogButton('')).toBe(false);
  });
});

describe('categoryColor — category chip color resolution (fix for "all blue" chips)', () => {
  it('is deterministic: the same raw category string always resolves to the same class', () => {
    const inputs = ['SPICES', 'ASIAN FOODS', 'VINEGARS', 'produce', 'random_distributor_bucket'];
    for (const raw of inputs) {
      const first = categoryColor(raw);
      const second = categoryColor(raw);
      const third = categoryColor(raw);
      expect(second).toBe(first);
      expect(third).toBe(first);
    }
  });

  it('gives different raw distributor categories different colors (not all falling to one default)', () => {
    const colors = new Set(
      ['SPICES', 'ASIAN FOODS', 'VINEGARS', 'CANNED GOODS', 'DAIRY & EGGS'].map((raw) => categoryColor(raw))
    );
    // With a 14-color palette and 5 distinct inputs it would be extraordinarily
    // unlikely (and a sign of a hashing bug) for them to all collide on one color.
    expect(colors.size).toBeGreaterThan(1);
  });

  it('still uses the curated canonical color for known categories, case-insensitively', () => {
    expect(categoryColor('produce')).toBe('bg-green-100 text-green-700');
    expect(categoryColor('PRODUCE')).toBe('bg-green-100 text-green-700');
    expect(categoryColor('  produce  ')).toBe('bg-green-100 text-green-700');
  });

  it('handles null/undefined/empty input without throwing', () => {
    expect(() => categoryColor(null)).not.toThrow();
    expect(() => categoryColor(undefined)).not.toThrow();
    expect(() => categoryColor('')).not.toThrow();
  });
});
