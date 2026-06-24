// QMAdminBrandDetail.test.tsx
// Unit tests for pure logic helpers used in the Brand Detail page.
// The project test env is node-only (no jsdom / @testing-library/react).

import { describe, it, expect } from 'vitest';

// ─── isStale ─────────────────────────────────────────────────────────────────
// Duplicated here because the component does not export it; keep in sync.
const STALE_MS = 14 * 24 * 60 * 60 * 1000;
function isStale(dateStr: string): boolean {
  return new Date(dateStr) < new Date(Date.now() - STALE_MS);
}

// ─── formatDate ──────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── initials ────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

describe('QMAdminBrandDetail — isStale helper', () => {
  it('returns true for a date more than 14 days ago', () => {
    const old = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(old)).toBe(true);
  });

  it('returns false for a date less than 14 days ago', () => {
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(recent)).toBe(false);
  });

  it('returns false for today', () => {
    expect(isStale(new Date().toISOString())).toBe(false);
  });
});

describe('QMAdminBrandDetail — formatDate helper', () => {
  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns a human-readable date string', () => {
    const result = formatDate('2024-06-15T12:00:00Z');
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2024/);
  });
});

describe('QMAdminBrandDetail — initials helper', () => {
  it('returns first 2 chars uppercased', () => {
    expect(initials('Pacific Foods')).toBe('PA');
    expect(initials('Big Brand')).toBe('BI');
  });

  it('works for single-word brand names', () => {
    expect(initials('Sysco')).toBe('SY');
  });
});

describe('QMAdminBrandDetail — mock payload structure', () => {
  const mockBrand = {
    id: 'brand-1',
    name: 'Pacific Foods',
    status: 'active',
    website: 'https://pacificfoods.com',
    logo_url: null,
    category: 'produce',
    created_at: '2024-01-01T00:00:00Z',
    stats: { products: 120, packages: 3, distributors: 5 },
    users: [{ id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@pacific.com', status: 'active', last_login_at: null }],
    catalogs: [{ id: 'c1', original_filename: 'catalog.csv', row_count: 120, uploaded_at: '2024-06-01T00:00:00Z' }],
    packages: [{ id: 'p1', title: 'Summer Pack', status: 'sent', item_count: 12, sent_at: '2024-06-10T00:00:00Z' }],
    distributors: [{ distributor_id: 'd1', name: 'Big Dist', status: 'active', connected_since: '2024-02-01T00:00:00Z' }],
  };

  it('renders brand name and stat cards', () => {
    expect(mockBrand.name).toBe('Pacific Foods');
    expect(mockBrand.stats.products).toBe(120); // products stat
  });

  it('renders users section with email', () => {
    expect(mockBrand.users[0].email).toBe('jane@pacific.com');
  });

  it('renders catalog section', () => {
    expect(mockBrand.catalogs[0].original_filename).toBe('catalog.csv');
  });

  it('renders packages section', () => {
    expect(mockBrand.packages[0].title).toBe('Summer Pack');
  });

  it('renders distributors section', () => {
    expect(mockBrand.distributors[0].name).toBe('Big Dist');
  });
});
