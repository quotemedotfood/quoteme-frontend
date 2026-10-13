// Sign in as a restaurant with no admin yet (Moose, 2026-10-13: "i want to
// make a blank user for every restaurant so i don't have to create an account
// in order to impersonate that restaurant").
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({
  getAdminRestaurant: vi.fn(),
  ensureRestaurantSignInAdmin: vi.fn(),
  impersonateUser: vi.fn(),
}));
vi.mock('../../services/adminApi', () => ({
  getAdminRestaurant: m.getAdminRestaurant,
  ensureRestaurantSignInAdmin: m.ensureRestaurantSignInAdmin,
  impersonateUser: m.impersonateUser,
  getAdminRestaurantGroups: vi.fn().mockResolvedValue({ data: [] }),
  resendInvite: vi.fn(), resendWelcome: vi.fn(), addRestaurantToGroup: vi.fn(), createAdminRestaurantContact: vi.fn(),
}));
vi.mock('../../services/api', () => ({ impersonateChef: vi.fn() }));
vi.mock('./_pairmeSection', () => ({ PairmeSection: () => null }));
vi.mock('./_manageAdminDrawer', () => ({ ManageAdminDrawer: () => null }));

import { QMAdminRestaurantDetailPage as Page } from './QMAdminRestaurantDetail';

const base = {
  id: 'r1', name: 'Ultreia', address_line_1: null, address_line_2: null, city: 'Denver', state: 'CO', zip: null, phone: null, website: null,
  status: 'active', created_at: '2026-10-01', google_place_id: null, address_verified: false,
  restaurant_group: null, recent_quotes: [], contacts: [], pairme_flow: null,
};

beforeEach(() => { localStorage.clear(); localStorage.setItem('quoteme_token', 'ADMIN'); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderWith(extra: Record<string, unknown>) {
  m.getAdminRestaurant.mockResolvedValue({ data: { ...base, ...extra } });
  render(<MemoryRouter initialEntries={['/admin/restaurants/r1']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ultreia' });
}

describe('admin restaurant page: Sign in as this restaurant', () => {
  it('with no admin, makes the blank account for THIS restaurant, then signs in as the id the server returned', async () => {
    await renderWith({ restaurant_admin_id: null, restaurant_admin_name: null });
    m.ensureRestaurantSignInAdmin.mockResolvedValue({ data: { restaurant_admin: { id: 'u-ph', name: 'Placeholder Ultreia', placeholder: true }, created: true } });
    m.impersonateUser.mockResolvedValue({ data: { token: 'RA', user: { id: 'u-ph', email: 'x', first_name: 'Placeholder', last_name: 'Ultreia', role: 'restaurant_admin' } } });

    fireEvent.click(screen.getByTestId('restaurant-sign-in'));
    await waitFor(() => expect(localStorage.getItem('quoteme_token')).toBe('RA'));
    expect(m.ensureRestaurantSignInAdmin).toHaveBeenCalledWith('r1');
    expect(m.impersonateUser).toHaveBeenCalledWith('u-ph');
    expect(localStorage.getItem('quoteme_admin_token')).toBe('ADMIN');
  });

  it('does not switch, and says why, when the account cannot be made', async () => {
    await renderWith({ restaurant_admin_id: null, restaurant_admin_name: null });
    m.ensureRestaurantSignInAdmin.mockResolvedValue({ error: 'Forbidden' });
    fireEvent.click(screen.getByTestId('restaurant-sign-in'));
    expect(await screen.findByTestId('restaurant-sign-in-error')).toHaveTextContent('Forbidden');
    expect(m.impersonateUser).not.toHaveBeenCalled();
    expect(localStorage.getItem('quoteme_token')).toBe('ADMIN');
  });

  it('labels the blank account and hides the password and welcome sends for it', async () => {
    await renderWith({ restaurant_admin_id: 'u-ph', restaurant_admin_name: 'Placeholder Ultreia', restaurant_admin_placeholder: true });
    expect(screen.getByTestId('admin-placeholder-note')).toBeInTheDocument();
    expect(screen.queryByText('Send password reset')).toBeNull();
    expect(screen.queryByText('Resend welcome')).toBeNull();
    expect(screen.getByTestId('admin-sign-in')).toBeInTheDocument();
    expect(screen.queryByTestId('restaurant-sign-in')).toBeNull();
  });

  it('a real admin keeps the sends, and there is no blank-account button', async () => {
    await renderWith({ restaurant_admin_id: 'u-real', restaurant_admin_name: 'Gina Manager', restaurant_admin_placeholder: false });
    expect(screen.getByText('Send password reset')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-placeholder-note')).toBeNull();
    expect(screen.queryByTestId('restaurant-sign-in')).toBeNull();
  });
});
