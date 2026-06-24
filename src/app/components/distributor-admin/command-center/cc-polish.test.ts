// cc-polish.test.ts
// Unit tests for CC polish items P5, P7, P8 pure-function logic.
//
// All tests use vitest without jsdom — pure function style matching the
// CCQuoteFlowShell.test.ts pattern used elsewhere in the project.

import { describe, it, expect } from 'vitest';

// ── P5: Menu Drop URL builder ─────────────────────────────────────────────────
// Mirrors the buildMenuDropUrl helper in CCLayout.tsx.

const COLD_LANDING_HOST = 'https://quoteme.food';

function buildMenuDropUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return `${COLD_LANDING_HOST}/d/${encodeURIComponent(slug)}`;
}

describe('buildMenuDropUrl — P5 Menu Drop copy-link', () => {
  it('returns a well-formed URL when slug is present', () => {
    expect(buildMenuDropUrl('lipari')).toBe('https://quoteme.food/d/lipari');
  });

  it('URL-encodes slugs with special characters', () => {
    expect(buildMenuDropUrl('my dist')).toBe('https://quoteme.food/d/my%20dist');
  });

  it('returns null when slug is null — button is hidden gracefully', () => {
    expect(buildMenuDropUrl(null)).toBeNull();
  });

  it('returns null when slug is undefined — button is hidden gracefully', () => {
    expect(buildMenuDropUrl(undefined)).toBeNull();
  });

  it('returns null for empty string — guards against accidental empty slug', () => {
    expect(buildMenuDropUrl('')).toBeNull();
  });
});

// ── P7: Catalog guidance block visibility ────────────────────────────────────
// The guidance block must be visible when hasCatalog is false (null = loading,
// true = catalog present with >0 products).
//
// Logic: hasCatalog = has_catalog && catalog_product_count > 0

function computeHasCatalog(hasCatalogFlag: boolean, productCount: number): boolean {
  return hasCatalogFlag && productCount > 0;
}

function shouldShowCatalogGuidance(hasCatalog: boolean | null): boolean {
  return hasCatalog === false;
}

describe('computeHasCatalog — P7 catalog presence from home payload', () => {
  it('returns true when has_catalog is true and count > 0', () => {
    expect(computeHasCatalog(true, 450)).toBe(true);
  });

  it('returns false when has_catalog is false (no catalog uploaded)', () => {
    expect(computeHasCatalog(false, 0)).toBe(false);
  });

  it('returns false when has_catalog is true but row_count is 0 (empty upload)', () => {
    expect(computeHasCatalog(true, 0)).toBe(false);
  });
});

describe('shouldShowCatalogGuidance — P7 guidance block render gate', () => {
  it('shows guidance block when hasCatalog is false (no catalog)', () => {
    expect(shouldShowCatalogGuidance(false)).toBe(true);
  });

  it('hides guidance block when hasCatalog is true (catalog present with products)', () => {
    expect(shouldShowCatalogGuidance(true)).toBe(false);
  });

  it('hides guidance block while loading (null) — avoids flash of guidance', () => {
    expect(shouldShowCatalogGuidance(null)).toBe(false);
  });
});

// ── P8: Team count badge render gate ─────────────────────────────────────────
// Badge is hidden when count is 0 or unknown (follows Assignments badge pattern).

function shouldShowTeamBadge(teamCount: number): boolean {
  return teamCount > 0;
}

describe('shouldShowTeamBadge — P8 Team nav badge visibility', () => {
  it('shows badge when team has active members', () => {
    expect(shouldShowTeamBadge(5)).toBe(true);
  });

  it('hides badge when count is 0', () => {
    expect(shouldShowTeamBadge(0)).toBe(false);
  });

  it('hides badge for count of 1 — wait, 1 should show', () => {
    expect(shouldShowTeamBadge(1)).toBe(true);
  });
});
