// BEVERAGES > REVIEW MATCHES: the wine match queue (Moose, 2026-10-27).
// Approve keeps the link, Relink moves the row to a beverage picked here,
// Reject unlinks it and only after a confirm. Writer of QuoteMe
// Api::V1::Admin::WineMatchSubmissionsController.
//
// This project's vitest config does not set `globals: true`, so
// afterEach(cleanup) is declared explicitly.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

function submission(over: Record<string, unknown> = {}) {
  return {
    id: 'sub-1', status: 'pending', submitted_at: '2026-10-27T00:00:00Z', reviewed_at: null,
    reviewed_by_user_id: null, review_notes: null,
    source_data: {
      source_table: 'pairme_capture_rows', source_id: 'row-2', beverage_id: 'bev-1', outcome: 'linked',
      reasons: ['loose match: same producer and name, colour missing on one side'],
      raw: { producer: 'Domaine X', wine_name: 'Cuvee A', vintage: '2021', list_section: 'Reds' },
    },
    resolved_data: null,
    beverage: { id: 'bev-1', name: 'Cuvee A', kind: 'wine', color: 'red', brand: { id: 'brand-1', name: 'Domaine X' } },
    ...over,
  };
}

const { getWineMatchSubmissions, approveWineMatch, relinkWineMatch, rejectWineMatch, getAdminBeverages } = vi.hoisted(() => ({
  getWineMatchSubmissions: vi.fn(async (_q: unknown) => ({
    data: { rows: [submission()], page: 1, per_page: 50, total_count: 1, total_pages: 1 } as unknown,
  })),
  approveWineMatch: vi.fn(async (_id: string) => ({ data: {} as unknown })),
  relinkWineMatch: vi.fn(async (_id: string, _bev: string) => ({ data: {} as unknown })),
  rejectWineMatch: vi.fn(async (_id: string) => ({ data: {} as unknown })),
  getAdminBeverages: vi.fn(async (_q: unknown) => ({
    data: {
      rows: [
        { id: 'bev-1', name: 'Cuvee A', brand: { id: 'brand-1', name: 'Domaine X' }, color: 'red', region: null, country: null },
        { id: 'bev-2', name: 'Cuvee A Rose', brand: { id: 'brand-1', name: 'Domaine X' }, color: 'rose', region: null, country: null },
      ],
      page: 1, per_page: 10, total_count: 2, total_pages: 1,
    } as unknown,
  })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getWineMatchSubmissions, approveWineMatch, relinkWineMatch, rejectWineMatch, getAdminBeverages };
});

import { QMAdminWineMatches, sourceSummary } from './QMAdminWineMatches';

afterEach(() => {
  cleanup();
  for (const m of [getWineMatchSubmissions, approveWineMatch, relinkWineMatch, rejectWineMatch, getAdminBeverages]) m.mockClear();
});

async function renderPage() {
  render(<MemoryRouter><QMAdminWineMatches /></MemoryRouter>);
  await screen.findByTestId('wine-match-row-sub-1');
}

describe('QMAdminWineMatches', () => {
  it('lists pending matches with what the row said and why it was flagged', async () => {
    await renderPage();
    expect(getWineMatchSubmissions).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', page: 1 }));
    const row = screen.getByTestId('wine-match-row-sub-1');
    expect(row.textContent).toContain('Domaine X Cuvee A 2021');
    expect(row.textContent).toContain('colour missing on one side');
    expect(screen.getByRole('link', { name: 'Cuvee A' }).getAttribute('href')).toBe('/qm-admin/beverages/wines/bev-1');
  });

  it('approve posts and the row leaves the queue', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('wine-match-approve-sub-1'));
    await waitFor(() => expect(approveWineMatch).toHaveBeenCalledWith('sub-1'));
    await waitFor(() => expect(screen.queryByTestId('wine-match-row-sub-1')).toBeNull());
  });

  it('relink searches the corpus and moves the row to the picked beverage, never the current one', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('wine-match-relink-sub-1'));
    expect(screen.getByTestId('wine-match-relink-panel-sub-1')).toBeTruthy();
    await waitFor(() => expect(getAdminBeverages).toHaveBeenCalledWith(expect.objectContaining({ q: 'Cuvee A' })));
    const moveTo = await screen.findByTestId('wine-match-relink-to-bev-2');
    expect(screen.queryByTestId('wine-match-relink-to-bev-1')).toBeNull();
    fireEvent.click(moveTo);
    await waitFor(() => expect(relinkWineMatch).toHaveBeenCalledWith('sub-1', 'bev-2'));
    await waitFor(() => expect(screen.queryByTestId('wine-match-row-sub-1')).toBeNull());
  });

  it('reject waits for the confirm', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('wine-match-reject-sub-1'));
    expect(rejectWineMatch).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId('wine-match-reject-confirm'));
    await waitFor(() => expect(rejectWineMatch).toHaveBeenCalledWith('sub-1'));
  });

  it('keeps the row and says so when the server refuses', async () => {
    approveWineMatch.mockResolvedValueOnce({ error: 'Already reviewed' } as never);
    await renderPage();
    fireEvent.click(screen.getByTestId('wine-match-approve-sub-1'));
    expect(await screen.findByText('Already reviewed')).toBeTruthy();
    expect(screen.getByTestId('wine-match-row-sub-1')).toBeTruthy();
  });

  it('the Rejected tab asks for archived matches and shows no actions', async () => {
    await renderPage();
    getWineMatchSubmissions.mockResolvedValueOnce({
      data: { rows: [submission({ status: 'archived', reviewed_at: '2026-10-27T00:00:00Z' })], page: 1, per_page: 50, total_count: 1, total_pages: 1 },
    });
    fireEvent.click(screen.getByTestId('wine-match-tab-archived'));
    await waitFor(() => expect(getWineMatchSubmissions).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'archived' })));
    await waitFor(() => expect(screen.getByTestId('wine-match-row-sub-1').textContent).toContain('Rejected'));
    expect(screen.queryByTestId('wine-match-approve-sub-1')).toBeNull();
  });
});

describe('sourceSummary', () => {
  it('reads a catalog product by name and item number', () => {
    const s = submission({
      source_data: { source_table: 'products', raw: { product_name: 'Domaine X Cuvee A', item_number: 'EB-12', unit_size: '750ml' } },
    });
    expect(sourceSummary(s as never)).toEqual({ line: 'Domaine X Cuvee A', detail: 'Catalog, item EB-12, 750ml' });
  });
});
