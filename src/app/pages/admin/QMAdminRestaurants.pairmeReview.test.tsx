// QMAdminRestaurants.pairmeReview.test.tsx
//
// The PairMe review flag (Moose, 2026-09-30): an auto-paired restaurant goes
// live flagged, the flag is clickable, and the list filters by it. The
// backend half is pinned by QuoteMe's restaurants_pairme_review_spec.rb.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { getAdminRestaurants, setAdminPairmeReview } = vi.hoisted(() => {
  const base = {
    city: 'Boston', state: 'MA', status: 'active', contact_count: 0, restaurant_group: null,
    created_at: '2026-09-01T00:00:00Z', admin_user_id: null, admin_user_name: null, restaurant_admin_id: null,
    restaurant_admin_name: null, address_line_1: null, address_line_2: null, zip: null, website: null,
    google_place_id: null, source_state: null, data_flags: null, menu_coverage: [],
  };
  const rows = [
    { ...base, id: 'r-auto', name: 'Auto Bistro', pairme_review: { state: 'needs_review', authored_by: 'auto', reviewed_at: null, reviewed_by_name: null } },
    { ...base, id: 'r-hand', name: 'Hand Bistro', pairme_review: { state: null, authored_by: 'hand', reviewed_at: null, reviewed_by_name: null } },
    { ...base, id: 'r-none', name: 'No PairMe', pairme_review: null },
  ];
  return {
    getAdminRestaurants: vi.fn(async () => ({ data: { restaurants: rows, meta: { page: 1, per_page: 50, total_count: 3, total_pages: 1 } } })),
    setAdminPairmeReview: vi.fn(async (_id: string, reviewed: boolean) => ({
      data: { pairme_review: { state: reviewed ? 'reviewed' : 'needs_review', authored_by: 'auto', reviewed_at: reviewed ? '2026-09-30T16:00:00Z' : null, reviewed_by_name: reviewed ? 'Moose M' : null } },
    })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminRestaurants, setAdminPairmeReview };
});

import { QMAdminRestaurants } from './QMAdminRestaurants';

async function renderPage() {
  render(<MemoryRouter><QMAdminRestaurants /></MemoryRouter>);
  await screen.findByText('Auto Bistro');
}
const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

afterEach(() => { cleanup(); getAdminRestaurants.mockClear(); setAdminPairmeReview.mockClear(); });

describe('QMAdminRestaurants: the PairMe review flag', () => {
  it('shows Needs review, Hand-paired, and a dash for no PairMe', async () => {
    await renderPage();
    expect(within(rowOf('Auto Bistro')).getByTestId('pairme-review-flag')).toHaveTextContent('Needs review');
    expect(within(rowOf('Hand Bistro')).getByTestId('pairme-review-flag')).toHaveTextContent('Hand-paired');
    expect(within(rowOf('No PairMe')).queryByTestId('pairme-review-flag')).toBeNull();
  });

  it('marks it reviewed on click, and flags it again on a second click', async () => {
    await renderPage();
    fireEvent.click(within(rowOf('Auto Bistro')).getByTestId('pairme-review-flag'));
    await waitFor(() => expect(within(rowOf('Auto Bistro')).getByTestId('pairme-review-flag')).toHaveTextContent('Reviewed'));
    expect(setAdminPairmeReview).toHaveBeenLastCalledWith('r-auto', true);
    fireEvent.click(within(rowOf('Auto Bistro')).getByTestId('pairme-review-flag'));
    await waitFor(() => expect(within(rowOf('Auto Bistro')).getByTestId('pairme-review-flag')).toHaveTextContent('Needs review'));
    expect(setAdminPairmeReview).toHaveBeenLastCalledWith('r-auto', false);
  });

  it('does not make a hand-authored venue clickable', async () => {
    await renderPage();
    expect(within(rowOf('Hand Bistro')).getByTestId('pairme-review-flag').tagName).not.toBe('BUTTON');
  });

  it('asks the server for the filtered list when a filter is chosen', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('pairme-review-filter'), { target: { value: 'needs_review' } });
    await waitFor(() => expect(getAdminRestaurants).toHaveBeenLastCalledWith(expect.objectContaining({ pairme_review: 'needs_review', page: 1 })));
  });
});
