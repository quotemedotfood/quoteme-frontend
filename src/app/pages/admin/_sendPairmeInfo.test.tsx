// SEND PAIRME INFO on the QM admin restaurant page: the recipient is always
// picked or typed by the QM admin, nothing is preselected, and the server's
// answer (sent or refused) is shown as it came back.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({ sendPairmeInfo: vi.fn(), getAdminRestaurant: vi.fn() }));
vi.mock('../../services/adminApi', () => ({
  sendPairmeInfo: m.sendPairmeInfo,
  getAdminRestaurant: m.getAdminRestaurant,
  resendWelcome: vi.fn(),
  getAdminRestaurantGroups: vi.fn().mockResolvedValue({ data: [] }),
  impersonateUser: vi.fn(), resendInvite: vi.fn(), addRestaurantToGroup: vi.fn(), createAdminRestaurantContact: vi.fn(), ensureRestaurantSignInAdmin: vi.fn(),
}));
vi.mock('../../services/api', () => ({ impersonateChef: vi.fn() }));
vi.mock('./_pairmeSection', () => ({ PairmeSection: () => null }));
vi.mock('./_manageAdminDrawer', () => ({ ManageAdminDrawer: () => null }));
vi.mock('./_pairmeInfoSent', () => ({ PairmeInfoSent: () => null }));
vi.mock('./_launchChecklistSection', () => ({ LaunchChecklistSection: () => null }));

import { SendPairmeInfo } from './_sendPairmeInfo';
import { QMAdminRestaurantDetailPage as Page } from './QMAdminRestaurantDetail';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const contacts = [
  { id: 'c-first', first_name: 'Fallback', last_name: 'First', email: 'first@ultreia.example' },
  { id: 'c-holly', first_name: 'Holly', last_name: 'Gm', email: 'holly@ultreia.example' },
  { id: 'c-noemail', first_name: 'No', last_name: 'Email', email: null },
];

function openForm() {
  render(<SendPairmeInfo restaurantId="r1" contacts={contacts} />);
  fireEvent.click(screen.getByText('Send PairMe info'));
}

const sendButton = () => screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement;

describe('Send PairMe info', () => {
  it('preselects nothing: no option chosen and Send stays off', () => {
    openForm();
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios).toHaveLength(2);
    expect(radios.every((r) => !r.checked)).toBe(true);
    expect(sendButton().disabled).toBe(true);
    fireEvent.click(sendButton());
    expect(m.sendPairmeInfo).not.toHaveBeenCalled();
  });

  it('choosing "contact" still preselects no contact, and lists only contacts with an email', () => {
    openForm();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    const select = screen.getByLabelText('Contact') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(sendButton().disabled).toBe(true);
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['', 'c-first', 'c-holly']);
  });

  it('sends the picked contact by id only', async () => {
    m.sendPairmeInfo.mockResolvedValue({ data: { recipient_email: 'holly@ultreia.example' } });
    openForm();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.change(screen.getByLabelText('Contact'), { target: { value: 'c-holly' } });
    fireEvent.click(sendButton());
    await waitFor(() => expect(m.sendPairmeInfo).toHaveBeenCalledWith('r1', { restaurant_contact_id: 'c-holly' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Sent to holly@ultreia.example.');
  });

  it('sends a typed name and email', async () => {
    m.sendPairmeInfo.mockResolvedValue({ data: { recipient_email: 'alexa@example.com' } });
    openForm();
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' Alexa Chestnut ' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alexa@example.com' } });
    fireEvent.click(sendButton());
    await waitFor(() =>
      expect(m.sendPairmeInfo).toHaveBeenCalledWith('r1', { recipient_name: 'Alexa Chestnut', recipient_email: 'alexa@example.com' })
    );
  });

  it("shows the server's error message on failure, and no sent confirmation", async () => {
    m.sendPairmeInfo.mockResolvedValue({ error: 'That contact is not on this restaurant.', error_code: 'CONTACT_NOT_FOUND', status: 404 });
    openForm();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.change(screen.getByLabelText('Contact'), { target: { value: 'c-first' } });
    fireEvent.click(sendButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('That contact is not on this restaurant.');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('is on the QM admin restaurant page with that restaurant\'s contacts', async () => {
    m.getAdminRestaurant.mockResolvedValue({ data: {
      id: 'r1', name: 'Ultreia', address_line_1: null, address_line_2: null, city: 'Denver', state: 'CO', zip: null, phone: null, website: null,
      status: 'active', created_at: '2026-10-01', google_place_id: null, address_verified: false, restaurant_group: null, recent_quotes: [],
      contacts: [{ id: 'c-holly', first_name: 'Holly', last_name: 'Gm', role: null, email: 'holly@ultreia.example', phone: null, is_primary: true }],
      pairme_flow: null, restaurant_admin_id: null, restaurant_admin_name: null, restaurant_admin_placeholder: false,
    } });
    render(<MemoryRouter initialEntries={['/admin/restaurants/r1']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByText('Send PairMe info'));
    fireEvent.click(screen.getAllByRole('radio')[0]);
    const values = Array.from((screen.getByLabelText('Contact') as HTMLSelectElement).options).map((o) => o.value);
    expect(values).toEqual(['', 'c-holly']);
  });
});
