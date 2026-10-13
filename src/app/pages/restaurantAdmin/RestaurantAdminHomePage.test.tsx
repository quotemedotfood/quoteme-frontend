// The restaurant admin's home: the PairMe link and QR code come first.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { routeByRole } from '../../utils/roleRouting';

const m = vi.hoisted(() => ({ getRestaurantAdminHome: vi.fn(), auth: { user: { role: 'restaurant_admin' } as any, isAuthenticated: true, isLoading: false, logout: vi.fn() } }));
vi.mock('../../services/adminApi', () => ({ getRestaurantAdminHome: m.getRestaurantAdminHome }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => m.auth }));

import { RestaurantAdminHomePage } from './RestaurantAdminHomePage';

const URL_ = 'https://app.pairme.wine/v/ultreia-denver';
afterEach(() => { cleanup(); vi.clearAllMocks(); m.auth.user = { role: 'restaurant_admin' }; });

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/restaurant-admin']}>
      <Routes>
        <Route path="/restaurant-admin" element={<RestaurantAdminHomePage />} />
        <Route path="/dashboard" element={<p>DASHBOARD</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('restaurant admin home', () => {
  it('is where a restaurant admin lands after signing in', () => {
    expect(routeByRole('restaurant_admin')).toBe('/restaurant-admin');
  });

  it('shows each restaurant with its link and QR code, or says the pairings are not ready', async () => {
    m.getRestaurantAdminHome.mockResolvedValue({ data: {
      user: { id: 'u1', first_name: 'Gina', last_name: 'Manager' },
      restaurants: [
        { id: 'r1', name: 'Ultreia', city: 'Denver', state: 'CO', pairme_flow: { url: URL_, qr_png: 'data:image/png;base64,AAAA' } },
        { id: 'r2', name: 'Rioja', city: 'Denver', state: 'CO', pairme_flow: null },
      ],
    } });
    renderPage();
    expect(await screen.findByText('Welcome, Gina')).toBeInTheDocument();
    expect(screen.getAllByTestId('ra-restaurant')).toHaveLength(2);
    expect(screen.getByTestId('pairme-flow-url')).toHaveAttribute('href', URL_);
    expect(screen.getByTestId('pairme-flow-qr')).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(screen.getByTestId('ra-flow-pending')).toHaveTextContent('as soon as your pairings are ready');
  });

  it('sends any other role to its own dashboard and never calls the API', async () => {
    m.auth.user = { role: 'chef' };
    renderPage();
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument();
    expect(m.getRestaurantAdminHome).not.toHaveBeenCalled();
  });
});
