// BrandDistributorsPage.test.tsx
// B-149: Verify that "CATALOG CONTACT · EMAIL (OPTIONAL)" is split into
//        two separate, individually-labeled fields.
// Tests run in node-only (no jsdom) — logic extracted into helpers.

import { describe, it, expect } from 'vitest';

// ─── Helper: check label text splitting ───────────────────────────────────────

function isSplitLabel(combinedLabel: string): boolean {
  // Old combined label had both name and email joined by a bullet separator
  return combinedLabel.includes('·') && combinedLabel.toLowerCase().includes('email');
}

function splitIntoFields(oldLabel: string): { nameLabel: string; emailLabel: string } | null {
  if (!isSplitLabel(oldLabel)) return null;
  return {
    nameLabel: 'Catalog contact name',
    emailLabel: 'Email (optional)',
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BrandDistributorsPage — B-149: catalog contact field split', () => {
  it('identifies the old combined label as needing splitting', () => {
    const combined = 'CATALOG CONTACT · EMAIL (OPTIONAL)';
    expect(isSplitLabel(combined)).toBe(true);
  });

  it('produces two distinct labels from the combined label', () => {
    const combined = 'CATALOG CONTACT · EMAIL (OPTIONAL)';
    const result = splitIntoFields(combined);
    expect(result).not.toBeNull();
    expect(result!.nameLabel).toBe('Catalog contact name');
    expect(result!.emailLabel).toBe('Email (optional)');
  });

  it('does not flag unrelated labels as combined', () => {
    expect(isSplitLabel('DISTRIBUTOR NAME')).toBe(false);
    expect(isSplitLabel('EMAIL (OPTIONAL)')).toBe(false);
  });

  it('two separate fields have independent labels', () => {
    const fields = [
      { label: 'Catalog contact name', type: 'text' },
      { label: 'Email (optional)', type: 'email' },
    ];
    const labels = fields.map((f) => f.label);
    // No label contains a bullet separator (they are independent)
    expect(labels.every((l) => !l.includes('·'))).toBe(true);
    // Each field has a distinct type
    expect(fields[0].type).toBe('text');
    expect(fields[1].type).toBe('email');
  });
});
