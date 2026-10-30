// The PairMe link and QR code on the admin restaurant page (Moose,
// 2026-10-13: "when the pairings have been made, i need to see the URL of
// their flow and their QR code in the restaurant view").
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({ getAdminRestaurant: vi.fn() }));
vi.mock('../../services/adminApi', () => ({
  getAdminRestaurant: m.getAdminRestaurant,
  getAdminRestaurantGroups: vi.fn().mockResolvedValue({ data: [] }),
  impersonateUser: vi.fn(), resendInvite: vi.fn(), resendWelcome: vi.fn(), addRestaurantToGroup: vi.fn(), createAdminRestaurantContact: vi.fn(),
}));
vi.mock('../../services/api', () => ({ impersonateChef: vi.fn() }));
vi.mock('./_pairmeSection', () => ({ PairmeSection: () => null }));
vi.mock('./_manageAdminDrawer', () => ({ ManageAdminDrawer: () => null }));
vi.mock('./_pairmeInfoSent', () => ({ PairmeInfoSent: () => null }));

import { QMAdminRestaurantDetailPage as Page } from './QMAdminRestaurantDetail';

const URL_ = 'https://app.pairme.wine/v/ultreia-denver';
const QR = 'data:image/png;base64,iVBORw0KGgo=';
const base = {
  id: 'r1', name: 'Ultreia', address_line_1: null, address_line_2: null, city: 'Denver', state: 'CO', zip: null, phone: null, website: null,
  status: 'active', created_at: '2026-10-01', google_place_id: null, address_verified: false, restaurant_admin_id: null, restaurant_admin_name: null,
  restaurant_group: null, recent_quotes: [], contacts: [],
};

beforeEach(() => { localStorage.clear(); localStorage.setItem('quoteme_token', 'ADMIN'); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderWith(pairme_flow: unknown) {
  m.getAdminRestaurant.mockResolvedValue({ data: { ...base, pairme_flow } });
  render(<MemoryRouter initialEntries={['/admin/restaurants/r1']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ultreia' });
}

describe('admin restaurant page: PairMe link and QR code', () => {
  it('shows the link, the QR code from the server, and a download of that same code', async () => {
    await renderWith({ url: URL_, qr_png: QR });
    expect(screen.getByTestId('pairme-flow-url')).toHaveAttribute('href', URL_);
    expect(screen.getByTestId('pairme-flow-url')).toHaveTextContent(URL_);
    expect(screen.getByTestId('pairme-flow-qr')).toHaveAttribute('src', QR);
    const dl = screen.getByTestId('pairme-flow-download');
    expect(dl).toHaveAttribute('href', QR);
    expect(dl).toHaveAttribute('download', 'ultreia-denver-qr.png');
  });

  it('shows nothing while the pairings are not made', async () => {
    await renderWith(null);
    expect(screen.queryByTestId('pairme-flow-card')).toBeNull();
  });
});
