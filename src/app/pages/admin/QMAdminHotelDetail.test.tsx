// One hotel on the QM admin: its outlets, adding one by restaurant id, and
// taking one out. A refused add (already an outlet of another hotel) shows
// the backend's reason.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const m = vi.hoisted(() => ({
  getAdminHotel: vi.fn(),
  updateAdminHotel: vi.fn(),
  attachHotelOutlet: vi.fn(),
  detachHotelOutlet: vi.fn(),
  getAdminRestaurants: vi.fn(),
  getAdminHotels: vi.fn(),
  createAdminHotel: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { HotelDetail } from './QMAdminHotelDetail';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const o = (id: string, name: string, city: string) => ({ id, name, city, state: 'CO', status: 'active' });
const hotel = (outlets: ReturnType<typeof o>[], extra: Record<string, unknown> = {}) => ({
  id: 'h1', name: 'The Crawford', google_place_id: 'ChIJ-1', address_line_1: null, city: 'Denver', state: 'CO',
  website: null, has_room_service: null, status: 'active', created_by_user_id: null, created_at: '2026-11-06',
  outlet_count: outlets.length, outlets, ...extra,
});

const dining = o('r1', 'Cooper Lounge', 'Denver');
const bar = o('r2', 'Terminal Bar', 'Denver');

function show() {
  render(<MemoryRouter><HotelDetail hotelId="h1" /></MemoryRouter>);
}

describe('HotelDetail', () => {
  it('lists the outlets and shows room service as Unknown when not known', async () => {
    m.getAdminHotel.mockResolvedValue({ data: hotel([dining, bar]) });
    show();
    expect(await screen.findByText('Cooper Lounge')).toBeTruthy();
    expect(screen.getByText('Terminal Bar')).toBeTruthy();
    expect(screen.getByText('Outlets (2)')).toBeTruthy();
    expect(screen.getByTestId('hotel-facts').textContent).toContain('Unknown');
  });

  it('finds a restaurant and adds it by its id', async () => {
    m.getAdminHotel.mockResolvedValue({ data: hotel([dining]) });
    m.getAdminRestaurants.mockResolvedValue({ data: { restaurants: [bar], meta: {} } });
    m.attachHotelOutlet.mockResolvedValue({ data: hotel([dining, bar]) });
    show();
    fireEvent.change(await screen.findByLabelText('Find a restaurant to add'), { target: { value: 'Terminal' } });
    fireEvent.click(screen.getByText('Search'));
    fireEvent.click(await screen.findByLabelText('Add Terminal Bar (Denver) to the hotel'));
    await waitFor(() => expect(m.attachHotelOutlet).toHaveBeenCalledWith('h1', 'r2'));
    expect(await screen.findByLabelText('Remove Terminal Bar (Denver) from the hotel')).toBeTruthy();
  });

  it('shows why an add was refused', async () => {
    m.getAdminHotel.mockResolvedValue({ data: hotel([]) });
    m.getAdminRestaurants.mockResolvedValue({ data: { restaurants: [bar], meta: {} } });
    m.attachHotelOutlet.mockResolvedValue({ error: 'That restaurant is already an outlet of another hotel. Detach it there first.', status: 409 });
    show();
    fireEvent.change(await screen.findByLabelText('Find a restaurant to add'), { target: { value: 'Terminal' } });
    fireEvent.click(screen.getByText('Search'));
    fireEvent.click(await screen.findByLabelText('Add Terminal Bar (Denver) to the hotel'));
    expect((await screen.findByRole('alert')).textContent).toContain('already an outlet of another hotel');
  });

  it('removes an outlet', async () => {
    m.getAdminHotel.mockResolvedValue({ data: hotel([dining, bar]) });
    m.detachHotelOutlet.mockResolvedValue({ data: hotel([dining]) });
    show();
    fireEvent.click(await screen.findByLabelText('Remove Terminal Bar (Denver) from the hotel'));
    await waitFor(() => expect(m.detachHotelOutlet).toHaveBeenCalledWith('h1', 'r2'));
    await waitFor(() => expect(screen.queryByText('Terminal Bar')).toBeNull());
  });

  it('edits room service to No and saves it as false', async () => {
    m.getAdminHotel.mockResolvedValue({ data: hotel([]) });
    m.updateAdminHotel.mockResolvedValue({ data: hotel([], { has_room_service: false }) });
    show();
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.change(screen.getByLabelText('Room service'), { target: { value: 'no' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(m.updateAdminHotel).toHaveBeenCalled());
    expect(m.updateAdminHotel.mock.calls[0][1]).toMatchObject({ has_room_service: false, google_place_id: 'ChIJ-1' });
  });
});
