// QMAdminRestaurants.pairmeShared.test.tsx
//
// PAIRME SENT on the restaurants list (Moose, 2026-11-03): a "Sent" chip
// for a restaurant that had PairMe info emailed (by a QM admin or a rep) or a
// rep referral logged, and a filter for it. Reads pairme_shared from the
// list payload (QuoteMe Admin::RestaurantsController#pairme_shared_by_restaurant)
// and sends pairme_shared=yes|no.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { getAdminRestaurants } = vi.hoisted(() => {
  const base = {
    city: 'Boston', state: 'MA', status: 'active', contact_count: 0, restaurant_group: null,
    created_at: '2026-09-01T00:00:00Z', admin_user_id: null, admin_user_name: null, restaurant_admin_id: null,
    restaurant_admin_name: null, address_line_1: null, address_line_2: null, zip: null, website: null,
    google_place_id: null, source_state: null, data_flags: null, menu_coverage: [], pairme_review: null,
  };
  const rows = [
    { ...base, id: 'r-both', name: 'Both Bistro', pairme_shared: { last_at: '2026-11-03T16:00:00Z', info_emails: 2, referrals: 1 } },
    { ...base, id: 'r-ref', name: 'Referral Bistro', pairme_shared: { last_at: '2026-11-02T16:00:00Z', info_emails: 0, referrals: 1 } },
    { ...base, id: 'r-none', name: 'Quiet Bistro', pairme_shared: null },
    { ...base, id: 'r-old', name: 'Old Payload Bistro' },
  ];
  return {
    getAdminRestaurants: vi.fn(async () => ({ data: { restaurants: rows, meta: { page: 1, per_page: 50, total_count: 4, total_pages: 1 } } })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminRestaurants };
});

import { QMAdminRestaurants, pairmeSharedTitle } from './QMAdminRestaurants';

afterEach(() => { cleanup(); getAdminRestaurants.mockClear(); });

describe('QMAdminRestaurants: PairMe sent', () => {
  it('shows a Sent chip with what was sent, and a dash when nothing was', async () => {
    render(<MemoryRouter><QMAdminRestaurants /></MemoryRouter>);
    await screen.findByText('Both Bistro');
    expect(screen.getByRole('columnheader', { name: 'PairMe sent' })).toBeInTheDocument();

    const both = within(screen.getByTestId('restaurants-shared-r-both'));
    expect(both.getByText('Sent')).toHaveAttribute('title', expect.stringMatching(/^PairMe sent: 2 info emails, 1 rep referral, last Nov \d, 2026$/));
    expect(within(screen.getByTestId('restaurants-shared-r-ref')).getByText('Sent'))
      .toHaveAttribute('title', expect.stringMatching(/^PairMe sent: 1 rep referral, last/));

    expect(screen.getByTestId('restaurants-shared-r-none')).toHaveTextContent('-');
    expect(screen.getByTestId('restaurants-shared-r-none')).not.toHaveTextContent('Sent');
    expect(screen.getByTestId('restaurants-shared-r-old')).toHaveTextContent('-');
  });

  it('filters server-side with pairme_shared, and sends nothing when unset', async () => {
    render(<MemoryRouter><QMAdminRestaurants /></MemoryRouter>);
    await screen.findByText('Both Bistro');
    expect((getAdminRestaurants.mock.calls as unknown as Array<[{ pairme_shared?: string }]>)[0][0].pairme_shared).toBeUndefined();

    fireEvent.change(screen.getByTestId('pairme-shared-filter'), { target: { value: 'yes' } });
    await waitFor(() => expect(getAdminRestaurants).toHaveBeenLastCalledWith(expect.objectContaining({ pairme_shared: 'yes', page: 1 })));
    fireEvent.change(screen.getByTestId('pairme-shared-filter'), { target: { value: 'no' } });
    await waitFor(() => expect(getAdminRestaurants).toHaveBeenLastCalledWith(expect.objectContaining({ pairme_shared: 'no' })));
  });

  it('builds the title from the counts', () => {
    expect(pairmeSharedTitle({ last_at: null, info_emails: 1, referrals: 0 })).toBe('PairMe sent: 1 info email');
  });
});
