// A QM admin takes a restaurant out of its group from the restaurant page
// (Moose, 2026-10-15: restaurant groups, so one payment covers them all).
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({ getAdminRestaurant: vi.fn(), removeRestaurantFromGroup: vi.fn() }));
vi.mock('../../services/adminApi', () => ({
  getAdminRestaurant: m.getAdminRestaurant,
  removeRestaurantFromGroup: m.removeRestaurantFromGroup,
  getAdminRestaurantGroups: vi.fn().mockResolvedValue({ data: [] }),
  resendWelcome: vi.fn(), impersonateUser: vi.fn(), resendInvite: vi.fn(), addRestaurantToGroup: vi.fn(), createAdminRestaurantContact: vi.fn(), ensureRestaurantSignInAdmin: vi.fn(),
}));
vi.mock('../../services/api', () => ({ impersonateChef: vi.fn() }));
vi.mock('./_pairmeSection', () => ({ PairmeSection: () => null }));
vi.mock('./_manageAdminDrawer', () => ({ ManageAdminDrawer: () => null }));
vi.mock('./_pairmeInfoSent', () => ({ PairmeInfoSent: () => null }));

import { QMAdminRestaurantDetailPage as Page } from './QMAdminRestaurantDetail';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const base = {
  id: 'r2', name: 'Aquitaine', address_line_1: null, address_line_2: null, city: 'Boston', state: 'MA', zip: null, phone: null, website: null,
  status: 'active', created_at: '2026-10-01', google_place_id: null, address_verified: false, recent_quotes: [], contacts: [],
  pairme_flow: null, restaurant_admin_id: null, restaurant_admin_name: null, restaurant_admin_placeholder: false,
};

function renderPage() {
  render(<MemoryRouter initialEntries={['/admin/restaurants/r2']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
}

it('removes the restaurant from its group by the group and restaurant ids', async () => {
  m.getAdminRestaurant
    .mockResolvedValueOnce({ data: { ...base, restaurant_group: { id: 'g1', name: "Seth's Restaurants" } } })
    .mockResolvedValueOnce({ data: { ...base, restaurant_group: null } });
  m.removeRestaurantFromGroup.mockResolvedValue({ data: { id: 'r2', name: 'Aquitaine', restaurant_group_id: null } });
  renderPage();
  fireEvent.click(await screen.findByText('Remove from group'));
  await waitFor(() => expect(m.removeRestaurantFromGroup).toHaveBeenCalledWith('g1', 'r2'));
  expect(await screen.findByText('Not assigned to any group.')).toBeTruthy();
  expect(screen.queryByText('Remove from group')).toBeNull();
});

it('offers no remove when the restaurant is in no group', async () => {
  m.getAdminRestaurant.mockResolvedValue({ data: { ...base, restaurant_group: null } });
  renderPage();
  expect(await screen.findByText('Not assigned to any group.')).toBeTruthy();
  expect(screen.queryByText('Remove from group')).toBeNull();
});
