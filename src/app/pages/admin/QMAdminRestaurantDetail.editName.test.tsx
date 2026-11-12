// RENAME (Moose 11-12): the QM admin restaurant detail page has an inline
// Edit name control. WRITER: PATCH /api/v1/admin/restaurants/:id/name via
// renameAdminRestaurant. READER: this page's title (the h1).
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({ getAdminRestaurant: vi.fn(), renameAdminRestaurant: vi.fn() }));
vi.mock('../../services/adminApi', () => ({
  getAdminRestaurant: m.getAdminRestaurant,
  renameAdminRestaurant: m.renameAdminRestaurant,
  getAdminRestaurantGroups: vi.fn().mockResolvedValue({ data: [] }),
  impersonateUser: vi.fn(), resendInvite: vi.fn(), resendWelcome: vi.fn(), addRestaurantToGroup: vi.fn(),
  removeRestaurantFromGroup: vi.fn(), createAdminRestaurantContact: vi.fn(), ensureRestaurantSignInAdmin: vi.fn(),
}));
vi.mock('../../services/api', () => ({ impersonateChef: vi.fn() }));
vi.mock('./_pairmeSection', () => ({ PairmeSection: () => null }));
vi.mock('./_manageAdminDrawer', () => ({ ManageAdminDrawer: () => null }));
vi.mock('./_pairmeInfoSent', () => ({ PairmeInfoSent: () => null }));

import { QMAdminRestaurantDetailPage as Page } from './QMAdminRestaurantDetail';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderPage() {
  m.getAdminRestaurant.mockResolvedValue({ data: {
    id: 'r1', name: 'CHEF ZORBAS CUISINE INC.', address_line_1: null, address_line_2: null, city: 'Denver', state: 'CO', zip: null,
    phone: null, website: null, status: 'active', created_at: '2026-10-01', google_place_id: null, address_verified: false,
    restaurant_group: null, recent_quotes: [], contacts: [], pairme_flow: null,
    restaurant_admin_id: null, restaurant_admin_name: null, restaurant_admin_placeholder: false,
  } });
  render(<MemoryRouter initialEntries={['/admin/restaurants/r1']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
  await screen.findByRole('heading', { level: 1, name: 'CHEF ZORBAS CUISINE INC.' });
  fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
  return screen.getByLabelText('Restaurant name') as HTMLInputElement;
}

it('saves the trimmed name and shows the stored name as the page title', async () => {
  m.renameAdminRestaurant.mockResolvedValue({ data: { id: 'r1', name: "Chef Zorba's" } });
  const input = await renderPage();

  fireEvent.change(input, { target: { value: "  Chef Zorba's  " } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => expect(m.renameAdminRestaurant).toHaveBeenCalledWith('r1', "Chef Zorba's"));
  expect(await screen.findByRole('heading', { level: 1, name: "Chef Zorba's" })).toBeTruthy();
  expect(screen.queryByLabelText('Restaurant name')).toBeNull();
});

it('refuses an empty name without calling the server', async () => {
  const input = await renderPage();

  fireEvent.change(input, { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect((await screen.findByRole('alert')).textContent).toBe('Name cannot be empty.');
  expect(m.renameAdminRestaurant).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Restaurant name')).toBeTruthy();
});

it('shows the server error and keeps the old title', async () => {
  m.renameAdminRestaurant.mockResolvedValue({
    error: 'Another restaurant at this address already has that name', error_code: 'NAME_TAKEN', status: 422,
  });
  const input = await renderPage();

  fireEvent.change(input, { target: { value: "Chef Zorba's" } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect((await screen.findByRole('alert')).textContent).toBe('Another restaurant at this address already has that name');
  expect(screen.getByLabelText('Restaurant name')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('heading', { level: 1, name: 'CHEF ZORBAS CUISINE INC.' })).toBeTruthy();
});
