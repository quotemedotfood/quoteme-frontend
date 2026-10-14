// The restaurant admin's Staff tablet section: the tablet's address, whether a
// PIN is set, and the form that sets it. Shown once paired; never the PIN.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({
  setPin: vi.fn(),
  home: vi.fn(),
  auth: { user: { role: 'restaurant_admin' } as any, isAuthenticated: true, isLoading: false, logout: vi.fn() },
}));
vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  setRestaurantAdminStaffPin: m.setPin,
  getRestaurantAdminHome: m.home,
  getRestaurantAdminPairme: () => new Promise(() => {}),
  getRestaurantAdminPresentations: () => new Promise(() => {}),
}));
vi.mock('../../services/adminApi', () => ({ getAdminRestaurantPairme: () => new Promise(() => {}) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => m.auth }));

import { StaffTabletCard } from './StaffTabletCard';
import { RestaurantAdminHomePage } from './RestaurantAdminHomePage';

const URL_ = 'https://app.pairme.wine/v/aquitaine-boston/staff';
const LOCKED = { url: URL_, pin_set: false, pin_set_at: null };
const SET = { url: URL_, pin_set: true, pin_set_at: '2026-10-14T16:00:00Z' };

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function typePin(value: string) {
  fireEvent.change(screen.getByTestId('ra-staff-pin-input'), { target: { value } });
  fireEvent.click(screen.getByTestId('ra-staff-pin-save'));
}

describe('StaffTabletCard', () => {
  it('shows the tablet address and that it stays locked without a PIN', () => {
    render(<StaffTabletCard restaurantId="r1" tablet={LOCKED} />);
    expect(screen.getByTestId('ra-staff-tablet-url').getAttribute('href')).toBe(URL_);
    expect(screen.getByTestId('ra-staff-pin-status').textContent).toContain('No staff PIN yet');
    expect(screen.getByTestId('ra-staff-pin-save').textContent).toBe('Set PIN');
  });

  it('sends the PIN as text, keeping a leading zero, then shows it is set', async () => {
    m.setPin.mockResolvedValue({ data: { staff_tablet: SET } });
    render(<StaffTabletCard restaurantId="r1" tablet={LOCKED} />);
    typePin('0482');
    await waitFor(() => expect(m.setPin).toHaveBeenCalledWith('r1', '0482'));
    expect((await screen.findByTestId('ra-staff-pin-status')).textContent).toContain('A staff PIN is set (since October 14, 2026)');
    expect(screen.getByTestId('ra-staff-pin-saved').textContent).toContain('PIN saved');
    expect((screen.getByTestId('ra-staff-pin-input') as HTMLInputElement).value).toBe('');
    expect(document.body.textContent).not.toContain('0482');
  });

  it('will not send fewer than 4 digits, and keeps only digits', () => {
    render(<StaffTabletCard restaurantId="r1" tablet={LOCKED} />);
    typePin('12');
    expect(screen.getByTestId('ra-staff-pin-error').textContent).toBe('Use 4 to 8 digits.');
    fireEvent.change(screen.getByTestId('ra-staff-pin-input'), { target: { value: '12ab34' } });
    expect((screen.getByTestId('ra-staff-pin-input') as HTMLInputElement).value).toBe('1234');
    expect(m.setPin).not.toHaveBeenCalled();
  });

  it('warns that changing the PIN locks every tablet', async () => {
    m.setPin.mockResolvedValue({ data: { staff_tablet: SET } });
    render(<StaffTabletCard restaurantId="r1" tablet={SET} />);
    expect(screen.getByTestId('ra-staff-pin-status').textContent).toContain('Changing it locks every tablet');
    expect(screen.getByTestId('ra-staff-pin-save').textContent).toBe('Change PIN');
    typePin('7777');
    expect((await screen.findByTestId('ra-staff-pin-saved')).textContent).toBe('New PIN saved. Every tablet will ask for it.');
  });

  it('says so when the server refuses', async () => {
    m.setPin.mockResolvedValue({ error: 'The PIN must be 4 to 8 digits.' });
    render(<StaffTabletCard restaurantId="r1" tablet={LOCKED} />);
    typePin('0482');
    expect((await screen.findByTestId('ra-staff-pin-error')).textContent).toBe('The PIN must be 4 to 8 digits.');
  });
});

describe('on the restaurant admin home', () => {
  function renderHome(r: Record<string, unknown>) {
    m.home.mockResolvedValue({ data: {
      user: { id: 'u1', first_name: 'Alexa', last_name: 'Gomez' },
      restaurants: [{ id: 'r1', name: 'Aquitaine Boston', city: 'Boston', state: 'MA', ...r }],
    } });
    render(
      <MemoryRouter initialEntries={['/restaurant-admin']}>
        <Routes><Route path="/restaurant-admin" element={<RestaurantAdminHomePage />} /></Routes>
      </MemoryRouter>,
    );
  }

  it('shows the Staff tablet section once paired', async () => {
    renderHome({ pairme_flow: { url: 'https://app.pairme.wine/v/aquitaine-boston', qr_png: 'data:image/png;base64,AAAA' }, staff_tablet: LOCKED });
    expect(await screen.findByTestId('ra-staff-tablet')).toBeTruthy();
  });

  it('shows no Staff tablet section before the pairings are ready', async () => {
    renderHome({ pairme_flow: null, staff_tablet: null });
    expect(await screen.findByTestId('ra-flow-pending')).toBeTruthy();
    expect(screen.queryByTestId('ra-staff-tablet')).toBeNull();
  });
});
