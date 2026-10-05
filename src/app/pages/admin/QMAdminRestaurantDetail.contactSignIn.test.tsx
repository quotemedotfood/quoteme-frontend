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

  it('a chef who has never signed in is shown but cannot be stepped into; no account says so', async () => {
    const cell = await renderPage();
    const never = within(cell('Never')).getByRole('button');
    expect(never).toBeDisabled();
    expect(never).toHaveTextContent('Not signed in yet');
    expect(cell('Nobody')).toHaveTextContent('No account');
    expect(within(cell('Nobody')).queryByRole('button')).toBeNull();
  });
});
