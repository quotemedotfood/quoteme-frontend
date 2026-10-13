// The restaurant admin's cheat sheet button: once paired, one click saves
// "<slug>-server-cheat-sheet.pdf"; before then there is no button.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({
  download: vi.fn(),
  home: vi.fn(),
  auth: { user: { role: 'restaurant_admin' } as any, isAuthenticated: true, isLoading: false, logout: vi.fn() },
}));
vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  downloadRestaurantAdminCheatSheet: m.download,
  getRestaurantAdminHome: m.home,
  getRestaurantAdminPairme: () => new Promise(() => {}),
  getRestaurantAdminPresentations: () => new Promise(() => {}),
}));
vi.mock('../../services/adminApi', () => ({ getAdminRestaurantPairme: () => new Promise(() => {}) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => m.auth }));

import { ServerCheatSheetButton, cheatSheetFilename } from './ServerCheatSheetButton';
import { RestaurantAdminHomePage } from './RestaurantAdminHomePage';

const URL_ = 'https://app.pairme.wine/v/aquitaine-chestnut-hill';

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

describe('ServerCheatSheetButton', () => {
  it('names the file for the restaurant, from its PairMe link', () => {
    expect(cheatSheetFilename(URL_)).toBe('aquitaine-chestnut-hill-server-cheat-sheet.pdf');
  });

  it('downloads this restaurant’s sheet and saves it under that name', async () => {
    m.download.mockResolvedValue({ blob: new Blob(['%PDF']) });
    const create = vi.fn(() => 'blob:sheet');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const saved: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push({ href: this.href, download: this.download });
    });

    render(<ServerCheatSheetButton restaurantId="r1" flowUrl={URL_} />);
    fireEvent.click(screen.getByTestId('ra-cheat-sheet-download'));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(m.download).toHaveBeenCalledWith('r1');
    expect(saved[0]).toEqual({ href: 'blob:sheet', download: 'aquitaine-chestnut-hill-server-cheat-sheet.pdf' });
    expect(revoke).toHaveBeenCalledWith('blob:sheet');
  });

  it('says so when the download fails', async () => {
    m.download.mockResolvedValue({ error: 'Restaurant not found' });
    render(<ServerCheatSheetButton restaurantId="r1" flowUrl={URL_} />);
    fireEvent.click(screen.getByTestId('ra-cheat-sheet-download'));
    expect((await screen.findByTestId('ra-cheat-sheet-error')).textContent).toBe('Restaurant not found');
  });
});

describe('on the restaurant admin home', () => {
  function renderHome(flow: { url: string; qr_png: string } | null) {
    m.home.mockResolvedValue({ data: {
      user: { id: 'u1', first_name: 'Alexa', last_name: 'Gomez' },
      restaurants: [{ id: 'r1', name: 'Aquitaine Chestnut Hill', city: 'Newton', state: 'MA', pairme_flow: flow }],
    } });
    render(
      <MemoryRouter initialEntries={['/restaurant-admin']}>
        <Routes><Route path="/restaurant-admin" element={<RestaurantAdminHomePage />} /></Routes>
      </MemoryRouter>,
    );
  }

  it('shows the button once the restaurant is paired', async () => {
    renderHome({ url: URL_, qr_png: 'data:image/png;base64,AAAA' });
    expect(await screen.findByTestId('ra-cheat-sheet-download')).toBeTruthy();
  });

  it('shows no button before the pairings are ready', async () => {
    renderHome(null);
    expect(await screen.findByTestId('ra-flow-pending')).toBeTruthy();
    expect(screen.queryByTestId('ra-cheat-sheet')).toBeNull();
  });
});
