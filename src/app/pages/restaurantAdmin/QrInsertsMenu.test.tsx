// The restaurant admin's "Download insert QR codes" menu: Horizontal or
// Vertical, each saved as "<slug>-qr-inserts-<layout>.pdf". Moose, 2026-10-14.
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
  downloadRestaurantAdminQrInserts: m.download,
  getRestaurantAdminHome: m.home,
  getRestaurantAdminPairme: () => new Promise(() => {}),
  getRestaurantAdminPresentations: () => new Promise(() => {}),
}));
vi.mock('../../services/adminApi', () => ({ getAdminRestaurantPairme: () => new Promise(() => {}) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => m.auth }));

import { QrInsertsMenu, qrInsertsFilename } from './QrInsertsMenu';
import { RestaurantAdminHomePage } from './RestaurantAdminHomePage';

const URL_ = 'https://app.pairme.wine/v/aquitaine-boston';

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

function captureSaves() {
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:inserts'), revokeObjectURL: vi.fn() });
  const saved: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    saved.push(this.download);
  });
  return saved;
}

describe('QrInsertsMenu', () => {
  it('names each file for the restaurant and the layout', () => {
    expect(qrInsertsFilename(URL_, 'vertical')).toBe('aquitaine-boston-qr-inserts-vertical.pdf');
    expect(qrInsertsFilename(URL_, 'horizontal')).toBe('aquitaine-boston-qr-inserts-horizontal.pdf');
  });

  it('opens to Horizontal and Vertical', () => {
    render(<QrInsertsMenu restaurantId="r1" flowUrl={URL_} />);
    expect(screen.queryByTestId('ra-qr-inserts-horizontal')).toBeNull();
    fireEvent.click(screen.getByTestId('ra-qr-inserts-toggle'));
    expect(screen.getByTestId('ra-qr-inserts-horizontal').textContent).toContain('Horizontal');
    expect(screen.getByTestId('ra-qr-inserts-vertical').textContent).toContain('Vertical');
  });

  it.each(['horizontal', 'vertical'] as const)('downloads the %s sheet for this restaurant', async (layout) => {
    m.download.mockResolvedValue({ blob: new Blob(['%PDF']) });
    const saved = captureSaves();
    render(<QrInsertsMenu restaurantId="r1" flowUrl={URL_} />);
    fireEvent.click(screen.getByTestId('ra-qr-inserts-toggle'));
    fireEvent.click(screen.getByTestId(`ra-qr-inserts-${layout}`));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(m.download).toHaveBeenCalledWith('r1', layout);
    expect(saved[0]).toBe(`aquitaine-boston-qr-inserts-${layout}.pdf`);
  });

  it('says so when the download fails', async () => {
    m.download.mockResolvedValue({ error: 'Restaurant not found' });
    render(<QrInsertsMenu restaurantId="r1" flowUrl={URL_} />);
    fireEvent.click(screen.getByTestId('ra-qr-inserts-toggle'));
    fireEvent.click(screen.getByTestId('ra-qr-inserts-vertical'));
    expect((await screen.findByTestId('ra-qr-inserts-error')).textContent).toBe('Restaurant not found');
  });
});

describe('on the restaurant admin home', () => {
  function renderHome(flow: { url: string; qr_png: string } | null) {
    m.home.mockResolvedValue({ data: {
      user: { id: 'u1', first_name: 'Alexa', last_name: 'Gomez' },
      restaurants: [{ id: 'r1', name: 'Aquitaine Boston', city: 'Boston', state: 'MA', pairme_flow: flow }],
    } });
    render(
      <MemoryRouter initialEntries={['/restaurant-admin']}>
        <Routes><Route path="/restaurant-admin" element={<RestaurantAdminHomePage />} /></Routes>
      </MemoryRouter>,
    );
  }

  it('shows the menu once the restaurant is paired', async () => {
    renderHome({ url: URL_, qr_png: 'data:image/png;base64,AAAA' });
    expect(await screen.findByTestId('ra-qr-inserts-toggle')).toBeTruthy();
  });

  it('shows no menu before the pairings are ready', async () => {
    renderHome(null);
    expect(await screen.findByTestId('ra-flow-pending')).toBeTruthy();
    expect(screen.queryByTestId('ra-qr-inserts')).toBeNull();
  });
});
