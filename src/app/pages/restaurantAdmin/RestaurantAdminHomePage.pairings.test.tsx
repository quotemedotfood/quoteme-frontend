// The restaurant admin sees the pairings the QM admin sees, when they were
// last updated, and what guests were shown, with the time. Moose, 2026-10-13.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({
  home: vi.fn(),
  pairme: vi.fn(),
  presentations: vi.fn(),
  adminPairme: vi.fn(),
  auth: { user: { role: 'restaurant_admin' } as any, isAuthenticated: true, isLoading: false, logout: vi.fn() },
}));
vi.mock('../../services/adminApi', () => ({
  getRestaurantAdminHome: m.home,
  getRestaurantAdminPairme: m.pairme,
  getRestaurantAdminPresentations: m.presentations,
  getAdminRestaurantPairme: m.adminPairme,
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => m.auth }));

import { RestaurantAdminHomePage } from './RestaurantAdminHomePage';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const FLOW = { url: 'https://app.pairme.wine/v/ultreia-denver', qr_png: 'data:image/png;base64,AAAA' };

function homeWith(flow: typeof FLOW | null) {
  m.home.mockResolvedValue({ data: {
    user: { id: 'u1', first_name: 'Gina', last_name: null },
    restaurants: [{ id: 'r1', name: 'Ultreia', city: 'Denver', state: 'CO', pairme_flow: flow }],
  } });
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/restaurant-admin']}>
      <Routes>
        <Route path="/restaurant-admin" element={<RestaurantAdminHomePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('restaurant admin pairings', () => {
  it('shows the pairings from their own read, stamped, and what guests were shown', async () => {
    homeWith(FLOW);
    m.pairme.mockResolvedValue({ data: {
      venue: { id: 'v1', name: 'Ultreia' },
      pairings_updated_at: '2026-10-13T15:30:00Z',
      wines: [{ wine_id: 'w-1', producer: 'Fournier', wine_name: 'Sancerre', vintage: null, list_source: 'wine_list',
                glass_cents: null, bottle_cents: 6200, say: null, say_source: null }],
      pairings: [{ dish_id: 'd-1', name: 'Oysters', pairings: [{ wine_id: 'w-1', why: 'Salt and chalk.' }] }],
    } });
    m.presentations.mockResolvedValue({ data: { restaurant_id: 'r1', time_zone: 'America/Denver', presentations: [
      { id: 'p1', presented_at: '2026-10-14T02:15:00Z', local_date: '2026-10-13', local_time: '20:15', signed_in: false,
        wines: [{ dish_id: 'd-1', dish: 'Oysters', wine_id: 'w-1', producer: 'Fournier', wine: 'Sancerre',
                  list: 'Wine list', unit: 'bottle', price_cents: 6200 }] },
    ] } });
    renderPage();

    expect(await screen.findByText('Pairings your guests are offered')).toBeTruthy();
    expect(m.pairme).toHaveBeenCalledWith('r1');
    expect(m.adminPairme).not.toHaveBeenCalled();
    expect((await screen.findByTestId('pairme-updated-at')).textContent).toMatch(/^Last updated .*2026/);
    const leg = await screen.findByTestId('pairme-leg');
    expect(leg.textContent).toContain('Fournier, Sancerre');
    expect(leg.textContent).toContain('$62 bottle');
    expect(leg.textContent).toContain('Salt and chalk.');

    const shown = await screen.findByTestId('ra-presentation');
    expect(m.presentations).toHaveBeenCalledWith('r1');
    expect(within(shown).getByTestId('ra-presentation-time').textContent).toBe('2026-10-13 20:15');
    expect(shown.textContent).toContain('Oysters: Fournier Sancerre · Wine list · $62 bottle');
  });

  it('says so when no guest has shown their pairings yet', async () => {
    homeWith(FLOW);
    m.pairme.mockResolvedValue({ data: { venue: null, pairings_updated_at: null } });
    m.presentations.mockResolvedValue({ data: { restaurant_id: 'r1', time_zone: 'America/Denver', presentations: [] } });
    renderPage();
    expect(await screen.findByTestId('ra-presentations-empty')).toBeTruthy();
  });

  it('loads neither section before the pairings are made', async () => {
    homeWith(null);
    renderPage();
    expect(await screen.findByTestId('ra-flow-pending')).toBeTruthy();
    expect(m.pairme).not.toHaveBeenCalled();
    expect(m.presentations).not.toHaveBeenCalled();
    expect(screen.queryByText('What your guests were shown')).toBeNull();
  });
});
