// QMAdminDistributorDetail: each rep row carries the Send tablet link control
// next to the rep's name, with the dates from the reps payload, and a send
// refetches the detail so the dates update.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const { dist, getAdminDistributor, sendRepTabletLink } = vi.hoisted(() => {
  const dist = {
    id: 'd1',
    name: 'Estate Brands',
    status: 'active',
    unclaimed: false,
    email_domain: 'estate.com',
    branding_slug: null,
    region: 'West',
    primary_state: 'CO',
    service_states: [],
    catalog: null,
    admins: [],
    reps: [
      {
        id: 'rp1',
        user_id: 'u-lexi',
        name: 'Lexi One',
        email: 'lexi@estate.com',
        phone: '3035550101',
        territory: 'Denver',
        is_active: true,
        tablet_link_last_sent_at: '2026-10-20T18:00:00Z',
        tablet_link_expires_at: null,
        signed_in_until: '2026-11-25T18:00:00Z',
      },
    ],
    restaurants: [],
    catalogs: [],
    logo_url: null,
    bonus_free_quotes: 0,
    effective_quota: 5,
  };
  return {
    dist,
    getAdminDistributor: vi.fn(async () => ({ data: dist })),
    sendRepTabletLink: vi.fn(async () => ({ data: { link_id: 'l1', via: 'email', expires_at: '2026-11-05T18:00:00Z' } })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminDistributor, sendRepTabletLink };
});

import { QMAdminDistributorDetailPage } from './QMAdminDistributorDetail';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/qm-admin/distributors/d1']}>
      <Routes>
        <Route path="/qm-admin/distributors/:id" element={<QMAdminDistributorDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QMAdminDistributorDetail - Send tablet link', () => {
  beforeEach(() => {
    getAdminDistributor.mockClear();
    sendRepTabletLink.mockClear();
  });
  afterEach(() => cleanup());

  it('shows the control and dates next to the rep name, and refetches after a send', async () => {
    renderPage();
    const control = await screen.findByTestId('tablet-link-u-lexi');
    const cell = control.closest('td') as HTMLElement;
    expect(within(cell).getByText('Lexi One')).toBeTruthy();
    expect(within(control).getByText(/Last sent Oct 20, 2026/)).toBeTruthy();
    expect(within(control).getByText(/Signed in until Nov 25, 2026/)).toBeTruthy();

    const before = getAdminDistributor.mock.calls.length;
    fireEvent.click(within(control).getByRole('button', { name: 'Email Lexi One their tablet link' }));
    await waitFor(() => expect(sendRepTabletLink).toHaveBeenCalledWith('u-lexi', 'email'));
    await waitFor(() => expect(getAdminDistributor.mock.calls.length).toBe(before + 1));
  });
});
