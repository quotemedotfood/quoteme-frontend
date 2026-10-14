// The restaurant admin's wine learning sheet button: once paired, one click
// saves "<slug>-learning-sheet-YYYY-MM.pdf"; before then there is no button.
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
  downloadRestaurantAdminLearningSheet: m.download,
  getRestaurantAdminHome: m.home,
  getRestaurantAdminPairme: () => new Promise(() => {}),
  getRestaurantAdminPresentations: () => new Promise(() => {}),
}));
vi.mock('../../services/adminApi', () => ({ getAdminRestaurantPairme: () => new Promise(() => {}) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => m.auth }));

import { LearningSheetButton, learningSheetFilename } from './LearningSheetButton';
import { RestaurantAdminHomePage } from './RestaurantAdminHomePage';

const URL_ = 'https://app.pairme.wine/v/aquitaine-chestnut-hill';

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

describe('LearningSheetButton', () => {
  it('names the file for the restaurant and the month, from its PairMe link', () => {
    expect(learningSheetFilename(URL_, new Date(2026, 9, 14))).toBe('aquitaine-chestnut-hill-learning-sheet-2026-10.pdf');
    expect(learningSheetFilename(URL_, new Date(2027, 0, 2))).toBe('aquitaine-chestnut-hill-learning-sheet-2027-01.pdf');
  });

  it('downloads this restaurant’s sheet and saves it under that name', async () => {
    let finish: (v: { blob: Blob }) => void = () => {};
    m.download.mockReturnValue(new Promise((r) => { finish = r; }));
    const create = vi.fn(() => 'blob:sheet');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const saved: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push({ href: this.href, download: this.download });
    });

    render(<LearningSheetButton restaurantId="r1" flowUrl={URL_} />);
    fireEvent.click(screen.getByTestId('ra-learning-sheet-download'));
    // The first download waits on the tasting notes; the button says so.
    expect(screen.getByTestId('ra-learning-sheet-download').textContent).toContain('this can take a minute');
    expect((screen.getByTestId('ra-learning-sheet-download') as HTMLButtonElement).disabled).toBe(true);
    finish({ blob: new Blob(['%PDF']) });

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(m.download).toHaveBeenCalledWith('r1');
    expect(saved[0]).toEqual({ href: 'blob:sheet', download: learningSheetFilename(URL_) });
    expect(revoke).toHaveBeenCalledWith('blob:sheet');
  });

  it('says so when the download fails', async () => {
    m.download.mockResolvedValue({ error: 'Restaurant not found' });
    render(<LearningSheetButton restaurantId="r1" flowUrl={URL_} />);
    fireEvent.click(screen.getByTestId('ra-learning-sheet-download'));
    expect((await screen.findByTestId('ra-learning-sheet-error')).textContent).toBe('Restaurant not found');
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
    expect(await screen.findByTestId('ra-learning-sheet-download')).toBeTruthy();
  });

  it('shows no button before the pairings are ready', async () => {
    renderHome(null);
    expect(await screen.findByTestId('ra-flow-pending')).toBeTruthy();
    expect(screen.queryByTestId('ra-learning-sheet')).toBeNull();
  });
});
