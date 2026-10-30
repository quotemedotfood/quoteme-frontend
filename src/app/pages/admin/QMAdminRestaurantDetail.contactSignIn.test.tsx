// Sign in as a contact from the admin restaurant page (Moose, 2026-10-02:
// "i don't have an impersonate button here in the qmadmin view").
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({
  getAdminRestaurant: vi.fn(),
  getAdminRestaurantGroups: vi.fn(),
  impersonateUser: vi.fn(),
  impersonateChef: vi.fn(),
}));
vi.mock('../../services/adminApi', () => ({
  getAdminRestaurant: m.getAdminRestaurant,
  getAdminRestaurantGroups: m.getAdminRestaurantGroups,
  impersonateUser: m.impersonateUser,
  resendInvite: vi.fn(), resendWelcome: vi.fn(), addRestaurantToGroup: vi.fn(), createAdminRestaurantContact: vi.fn(),
}));
vi.mock('../../services/api', () => ({ impersonateChef: m.impersonateChef }));
vi.mock('./_pairmeSection', () => ({ PairmeSection: () => null }));
vi.mock('./_manageAdminDrawer', () => ({ ManageAdminDrawer: () => null }));
vi.mock('./_pairmeInfoSent', () => ({ PairmeInfoSent: () => null }));

import { QMAdminRestaurantDetailPage as Page } from './QMAdminRestaurantDetail';

const contact = (first: string, user: any) => ({ id: `c-${first}`, first_name: first, last_name: 'Test', role: 'chef', email: `${first}@x.com`, phone: null, is_primary: false, user });
const restaurant = {
  id: 'r1', name: 'Aquitaine Boston', address_line_1: null, address_line_2: null, city: 'Boston', state: 'MA', zip: null, phone: null, website: null,
  status: 'active', created_at: '2026-10-01', google_place_id: null, address_verified: false, restaurant_admin_id: null, restaurant_admin_name: null,
  restaurant_group: null, recent_quotes: [],
  contacts: [
    contact('Signed', { id: 'u-signed', role: 'chef', signed_in: true }),
    contact('Never', { id: 'u-never', role: 'chef', signed_in: false }),
    contact('Rep', { id: 'u-rep', role: 'rep', signed_in: true }),
    contact('Nobody', null),
  ],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('quoteme_token', 'ADMIN');
  m.getAdminRestaurant.mockResolvedValue({ data: restaurant });
  m.getAdminRestaurantGroups.mockResolvedValue({ data: [] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderPage() {
  render(<MemoryRouter initialEntries={['/admin/restaurants/r1']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
  await screen.findByText('Signed Test');
  const cell = (first: string) => within(screen.getByText(`${first} Test`).closest('tr')!).getByTestId('contact-sign-in');
  return cell;
}

describe('contacts: Sign in as', () => {
  it('signs in as a chef contact through the chef path, by the contact user id, and swaps the token', async () => {
    m.impersonateChef.mockResolvedValue({ data: { token: 'CHEF', event_id: 'e1', chef: { id: 'u-signed', first_name: 'Signed', last_name: 'Test', email: '', role: 'chef' } } });
    const cell = await renderPage();
    fireEvent.click(within(cell('Signed')).getByRole('button', { name: 'Sign in as Signed Test' }));
    await waitFor(() => expect(localStorage.getItem('quoteme_token')).toBe('CHEF'));
    expect(m.impersonateChef).toHaveBeenCalledWith('u-signed');
    expect(m.impersonateUser).not.toHaveBeenCalled();
    expect(localStorage.getItem('quoteme_admin_token')).toBe('ADMIN');
  });

  it('a rep contact goes through the user path', async () => {
    m.impersonateUser.mockResolvedValue({ data: { token: 'REP', user: { id: 'u-rep', email: '', first_name: 'Rep', last_name: 'Test', role: 'rep' } } });
    const cell = await renderPage();
    fireEvent.click(within(cell('Rep')).getByRole('button'));
    await waitFor(() => expect(localStorage.getItem('quoteme_token')).toBe('REP'));
    expect(m.impersonateUser).toHaveBeenCalledWith('u-rep');
  });

  it('refuses to switch when the server names a different chef', async () => {
    m.impersonateChef.mockResolvedValue({ data: { token: 'WRONG', event_id: 'e1', chef: { id: 'someone-else', first_name: 'X', last_name: 'Y', email: '', role: 'chef' } } });
    const cell = await renderPage();
    fireEvent.click(within(cell('Signed')).getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent('mismatch');
    expect(localStorage.getItem('quoteme_token')).toBe('ADMIN');
  });

  // CHANGED 2026-10-11 by Moose's ruling ("I need to be able to impersonate,
  // both the contact (me) or the admins"). This pinned a disabled "Not signed
  // in yet" for a chef who had never signed in; that gate is gone.
  it('signs in as a chef who has never signed in; no account still says so', async () => {
    m.impersonateChef.mockResolvedValue({ data: { token: 'NEVER', event_id: 'e2', chef: { id: 'u-never', first_name: 'Never', last_name: 'Test', email: '', role: 'chef' } } });
    const cell = await renderPage();
    const never = within(cell('Never')).getByRole('button');
    expect(never).toBeEnabled();
    expect(never).toHaveTextContent('Sign in as');
    fireEvent.click(never);
    await waitFor(() => expect(localStorage.getItem('quoteme_token')).toBe('NEVER'));
    expect(m.impersonateChef).toHaveBeenCalledWith('u-never');
    expect(cell('Nobody')).toHaveTextContent('No account');
    expect(within(cell('Nobody')).queryByRole('button')).toBeNull();
  });

  it('a restaurant admin contact goes through the user path', async () => {
    m.getAdminRestaurant.mockResolvedValue({ data: { ...restaurant, contacts: [contact('Boss', { id: 'u-boss', role: 'restaurant_admin', signed_in: false })] } });
    m.impersonateUser.mockResolvedValue({ data: { token: 'BOSS', user: { id: 'u-boss', email: '', first_name: 'Boss', last_name: 'Test', role: 'restaurant_admin' } } });
    render(<MemoryRouter initialEntries={['/admin/restaurants/r1']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in as Boss Test' }));
    await waitFor(() => expect(localStorage.getItem('quoteme_token')).toBe('BOSS'));
    expect(m.impersonateUser).toHaveBeenCalledWith('u-boss');
  });

  it("signs in as the restaurant's admin from the admin block", async () => {
    m.getAdminRestaurant.mockResolvedValue({ data: { ...restaurant, restaurant_admin_id: 'u-admin', restaurant_admin_name: 'Rita Admin' } });
    m.impersonateUser.mockResolvedValue({ data: { token: 'RITA', user: { id: 'u-admin', email: '', first_name: 'Rita', last_name: 'Admin', role: 'restaurant_admin' } } });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in as Rita Admin' }));
    await waitFor(() => expect(localStorage.getItem('quoteme_token')).toBe('RITA'));
    expect(m.impersonateUser).toHaveBeenCalledWith('u-admin');
  });

  it('shows no admin sign-in when the restaurant has no admin', async () => {
    await renderPage();
    expect(screen.queryByTestId('admin-sign-in')).toBeNull();
  });
});
