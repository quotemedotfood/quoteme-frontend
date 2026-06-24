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
import { shouldShowUpdateCatalogButton } from './CatalogManagePage';

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
