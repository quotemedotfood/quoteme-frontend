// Resend welcome from a restaurant page sends THAT restaurant's PairMe link
// and QR code (QuoteMe #493), so the page names the restaurant by id.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({ getAdminRestaurant: vi.fn(), resendWelcome: vi.fn() }));
vi.mock('../../services/adminApi', () => ({
  getAdminRestaurant: m.getAdminRestaurant,
  resendWelcome: m.resendWelcome,
  getAdminRestaurantGroups: vi.fn().mockResolvedValue({ data: [] }),
  impersonateUser: vi.fn(), resendInvite: vi.fn(), addRestaurantToGroup: vi.fn(), createAdminRestaurantContact: vi.fn(), ensureRestaurantSignInAdmin: vi.fn(),
}));
vi.mock('../../services/api', () => ({ impersonateChef: vi.fn() }));
vi.mock('./_pairmeSection', () => ({ PairmeSection: () => null }));
vi.mock('./_manageAdminDrawer', () => ({ ManageAdminDrawer: () => null }));

import { QMAdminRestaurantDetailPage as Page } from './QMAdminRestaurantDetail';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('Resend welcome names this restaurant', async () => {
  m.getAdminRestaurant.mockResolvedValue({ data: {
    id: 'r1', name: 'Ultreia', address_line_1: null, address_line_2: null, city: 'Denver', state: 'CO', zip: null, phone: null, website: null,
    status: 'active', created_at: '2026-10-01', google_place_id: null, address_verified: false, restaurant_group: null, recent_quotes: [], contacts: [],
    pairme_flow: null, restaurant_admin_id: 'u-real', restaurant_admin_name: 'Gina Manager', restaurant_admin_placeholder: false,
  } });
  m.resendWelcome.mockResolvedValue({ data: { ok: true, sent_to: 'gm@ultreia.example' } });
  render(<MemoryRouter initialEntries={['/admin/restaurants/r1']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByText('Resend welcome'));
  await waitFor(() => expect(m.resendWelcome).toHaveBeenCalledWith('u-real', 'r1'));
});
