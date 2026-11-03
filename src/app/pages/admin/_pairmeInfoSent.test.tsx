// "PAIRME INFO SENT" on the QM admin restaurant page: shows the server's
// pairme_info_sends rows for this restaurant in the order sent (newest
// first), and re-reads after a successful Send PairMe info.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({ sendPairmeInfo: vi.fn(), getAdminRestaurant: vi.fn(), getPairmeInfoSends: vi.fn() }));
vi.mock('../../services/adminApi', () => ({
  sendPairmeInfo: m.sendPairmeInfo,
  getAdminRestaurant: m.getAdminRestaurant,
  getPairmeInfoSends: m.getPairmeInfoSends,
  resendWelcome: vi.fn(),
  getAdminRestaurantGroups: vi.fn().mockResolvedValue({ data: [] }),
  impersonateUser: vi.fn(), resendInvite: vi.fn(), addRestaurantToGroup: vi.fn(), createAdminRestaurantContact: vi.fn(), ensureRestaurantSignInAdmin: vi.fn(),
}));
vi.mock('../../services/api', () => ({ impersonateChef: vi.fn() }));
vi.mock('./_pairmeSection', () => ({ PairmeSection: () => null }));
vi.mock('./_manageAdminDrawer', () => ({ ManageAdminDrawer: () => null }));
vi.mock('./_launchChecklistSection', () => ({ LaunchChecklistSection: () => null }));

import { PairmeInfoSent } from './_pairmeInfoSent';
import { QMAdminRestaurantDetailPage as Page } from './QMAdminRestaurantDetail';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const row = (over: Record<string, unknown>) => ({
  id: 's-1', sent_at: '2026-10-30T16:00:00Z', sent_by_name: 'Quinn Admin', recipient_name: null,
  recipient_email: 'x@example.com', restaurant_contact_id: null,
  pairings_link_included: false, deck_link_included: false, faq_link_included: false, ...over,
});

const listItems = () => within(screen.getByRole('region', { name: 'PairMe info sent' })).queryAllByRole('listitem');

describe('PairMe info sent', () => {
  it("reads this restaurant's log and shows the rows in the server's order", async () => {
    m.getPairmeInfoSends.mockResolvedValue({ data: { pairme_info_sends: [
      row({ id: 's-2', recipient_name: 'Holly Gm', recipient_email: 'holly@ultreia.example', restaurant_contact_id: 'c-holly', pairings_link_included: true, deck_link_included: true }),
      row({ id: 's-1', recipient_email: 'alexa@example.com', sent_at: '2026-10-29T16:00:00Z' }),
    ] } });
    render(<PairmeInfoSent restaurantId="r1" />);
    await waitFor(() => expect(listItems()).toHaveLength(2));
    expect(m.getPairmeInfoSends).toHaveBeenCalledWith('r1');
    const [first, second] = listItems();
    expect(first).toHaveTextContent('Holly Gm (holly@ultreia.example)');
    expect(first).toHaveTextContent('by Quinn Admin');
    expect(first).toHaveTextContent('a contact here');
    expect(first).toHaveTextContent('Links: pairings, deck.');
    expect(second).toHaveTextContent('alexa@example.com');
    expect(second).toHaveTextContent('typed');
    expect(second).toHaveTextContent('No links.');
  });

  it('says so when nothing has been sent', async () => {
    m.getPairmeInfoSends.mockResolvedValue({ data: { pairme_info_sends: [] } });
    render(<PairmeInfoSent restaurantId="r1" />);
    expect(await screen.findByText('Not sent to anyone yet.')).toBeInTheDocument();
  });

  it("shows the server's error instead of an empty list", async () => {
    m.getPairmeInfoSends.mockResolvedValue({ error: 'Forbidden', status: 403 });
    render(<PairmeInfoSent restaurantId="r1" />);
    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Not sent to anyone yet.')).toBeNull();
  });

  it('is under Send PairMe info on the restaurant page and refreshes after a send', async () => {
    m.getAdminRestaurant.mockResolvedValue({ data: {
      id: 'r1', name: 'Ultreia', address_line_1: null, address_line_2: null, city: 'Denver', state: 'CO', zip: null, phone: null, website: null,
      status: 'active', created_at: '2026-10-01', google_place_id: null, address_verified: false, restaurant_group: null, recent_quotes: [],
      contacts: [], pairme_flow: null, restaurant_admin_id: null, restaurant_admin_name: null, restaurant_admin_placeholder: false,
    } });
    m.getPairmeInfoSends
      .mockResolvedValueOnce({ data: { pairme_info_sends: [] } })
      .mockResolvedValue({ data: { pairme_info_sends: [row({ id: 's-9', recipient_email: 'alexa@example.com' })] } });
    m.sendPairmeInfo.mockResolvedValue({ data: { recipient_email: 'alexa@example.com' } });

    render(<MemoryRouter initialEntries={['/admin/restaurants/r1']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Not sent to anyone yet.')).toBeInTheDocument();
    expect(m.getPairmeInfoSends).toHaveBeenCalledTimes(1);
    expect(m.getPairmeInfoSends).toHaveBeenCalledWith('r1');

    fireEvent.click(screen.getByText('Send PairMe info'));
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alexa@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(listItems()).toHaveLength(1));
    expect(m.getPairmeInfoSends).toHaveBeenCalledTimes(2);
    expect(listItems()[0]).toHaveTextContent('alexa@example.com');
  });

  it('does not re-read after a refused send', async () => {
    m.getAdminRestaurant.mockResolvedValue({ data: {
      id: 'r1', name: 'Ultreia', address_line_1: null, address_line_2: null, city: 'Denver', state: 'CO', zip: null, phone: null, website: null,
      status: 'active', created_at: '2026-10-01', google_place_id: null, address_verified: false, restaurant_group: null, recent_quotes: [],
      contacts: [], pairme_flow: null, restaurant_admin_id: null, restaurant_admin_name: null, restaurant_admin_placeholder: false,
    } });
    m.getPairmeInfoSends.mockResolvedValue({ data: { pairme_info_sends: [] } });
    m.sendPairmeInfo.mockResolvedValue({ error: 'That is the blank sign-in account, which has no real email.', error_code: 'PLACEHOLDER_EMAIL', status: 422 });

    render(<MemoryRouter initialEntries={['/admin/restaurants/r1']}><Routes><Route path="/admin/restaurants/:id" element={<Page />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Not sent to anyone yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Send PairMe info'));
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'blank@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That is the blank sign-in account, which has no real email.');
    expect(m.getPairmeInfoSends).toHaveBeenCalledTimes(1);
  });
});
