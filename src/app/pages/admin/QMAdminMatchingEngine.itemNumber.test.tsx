// @vitest-environment jsdom
//
// The Catalog Browser rendered Product, Brand, Pack, Category, Subcategory
// and a selection checkbox. None of those is unique per row, so genuinely
// distinct products presented as one repeated row while the operator ticked
// checkboxes that drive bulk category and subcategory writes.
//
// item_number was in the payload the whole time: serialized by
// matching_diagnostics_controller.rb:232, typed at adminApi.ts:1321, never
// read. Measured on the live Test backend: 50 of 50 rows carry it, and 10 of
// those 50 render identically without it, three at a time.
//
// This renders it exactly as the API returns it. The -2 / -3 / -8 suffix
// decode is deliberately NOT attempted here.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { getAdminCatalogs, getAdminCatalogStats, getAdminCatalogProducts } = vi.hoisted(() => ({
  getAdminCatalogs: vi.fn(async () => ({
    data: [{ id: 'cat-1', distributor_name: 'Fish Guys', product_count: 6246 }],
  })),
  getAdminCatalogStats: vi.fn(async () => ({
    data: {
      id: 'cat-1', distributor_name: 'Fish Guys', total_products: 3,
      by_category: { meat: 3 }, classification_status: 'complete',
      classification_progress: 3, classification_total: 3,
    },
  })),
  // Three real rows from the Fish Guys catalog that are identical on every
  // rendered column except the one that was missing.
  getAdminCatalogProducts: vi.fn(async () => ({
    data: {
      page: 1, per_page: 50, total: 3, total_pages: 1, brands: ['1855'],
      products: [
        { id: 'p1', item_number: '126110-2', brand: '1855', product_name: '1855 12oz Bnls Strip Steak 1.5"', pack_size: '12oz', category: 'meat', subcategory: null, standard_subcategory: 'beef', normalized_category: 'meat', category_source: 'regex_fallback', ai_confidence: null },
        { id: 'p2', item_number: '126110-8', brand: '1855', product_name: '1855 12oz Bnls Strip Steak 1.5"', pack_size: '12oz', category: 'meat', subcategory: null, standard_subcategory: 'beef', normalized_category: 'meat', category_source: 'regex_fallback', ai_confidence: null },
        { id: 'p3', item_number: '126110-3', brand: '1855', product_name: '1855 12oz Bnls Strip Steak 1.5"', pack_size: '12oz', category: 'meat', subcategory: null, standard_subcategory: 'beef', normalized_category: 'meat', category_source: 'regex_fallback', ai_confidence: null },
      ],
    },
  })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminCatalogs, getAdminCatalogStats, getAdminCatalogProducts };
});

import { CatalogsTab } from './QMAdminMatchingEngine';

afterEach(() => cleanup());

function renderTab() {
  render(
    <MemoryRouter initialEntries={['/qm-admin/matching-engine?catalog_id=cat-1']}>
      <CatalogsTab />
    </MemoryRouter>,
  );
}

describe('Catalog Browser - item number column', () => {
  it('renders an Item # header', async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Item #' })).toBeInTheDocument();
    });
  });

  it('tells three otherwise identical rows apart', async () => {
    renderTab();

    await waitFor(() => {
      expect(screen.getByText('126110-2')).toBeInTheDocument();
    });
    expect(screen.getByText('126110-8')).toBeInTheDocument();
    expect(screen.getByText('126110-3')).toBeInTheDocument();

    // The product name really is repeated three times: the item number is the
    // only thing separating these rows.
    expect(screen.getAllByText('1855 12oz Bnls Strip Steak 1.5"')).toHaveLength(3);
  });

  it('puts the item number in the same row as its product', async () => {
    renderTab();

    const cell = await screen.findByText('126110-8');
    const row = cell.closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('1855 12oz Bnls Strip Steak 1.5"')).toBeInTheDocument();
  });
});
