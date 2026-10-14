// The restaurant admin's settings: profile, restaurant details, the PairMe
// plan, and invoices paid or outstanding (Moose, 2026-10-14).
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  checkout: vi.fn(),
  portal: vi.fn(),
  auth: { user: { role: 'restaurant_admin' } as any, isAuthenticated: true, isLoading: false },
}));
vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  getRestaurantAdminSettings: m.get,
  updateRestaurantAdminSettings: m.update,
  startRestaurantAdminCheckout: m.checkout,
  openRestaurantAdminBillingPortal: m.portal,
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => m.auth }));

import { RestaurantAdminSettingsPage } from './RestaurantAdminSettingsPage';

const settings = (billing: object = {}) => ({
  user: { email: 'alexa@aquitaine.example', first_name: 'Alexa', last_name: 'Host', phone: '555-0100' },
  restaurant: { id: 'r1', name: 'Aquitaine', phone: null, website: null, address_line_1: '688 Boylston St', address_line_2: null, city: 'Chestnut Hill', state: 'MA', zip: '02467' },
  billing: { configured: true, status: null, self_managed: false, current_period_end: null, invoices: [], ...billing },
});

afterEach(() => { cleanup(); vi.clearAllMocks(); m.auth.user = { role: 'restaurant_admin' }; });

function renderPage(path = '/restaurant-admin/r1/settings') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/restaurant-admin/:restaurantId/settings" element={<RestaurantAdminSettingsPage />} />
        <Route path="/dashboard" element={<p>DASHBOARD</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('restaurant admin settings', () => {
  it('shows their details, with the email read only, and saves edits for this restaurant', async () => {
    m.get.mockResolvedValue({ data: settings() });
    m.update.mockImplementation(async (_id, body) => ({ data: { ...settings(), user: { ...settings().user, ...body.user } } }));
    renderPage();
    expect(await screen.findByTestId('ra-email')).toHaveValue('alexa@aquitaine.example');
    expect(screen.getByTestId('ra-email')).toHaveAttribute('readonly');
    expect(m.get).toHaveBeenCalledWith('r1');

    fireEvent.change(screen.getByDisplayValue('Alexa'), { target: { value: 'Alexandra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByTestId('ra-saved');
    expect(m.update).toHaveBeenCalledWith('r1', expect.objectContaining({
      user: expect.objectContaining({ first_name: 'Alexandra' }),
      restaurant: expect.objectContaining({ city: 'Chestnut Hill', zip: '02467' }),
    }));
    expect(m.update.mock.calls[0][1].user).not.toHaveProperty('email');
  });

  it('offers the plan when not subscribed and sends them to Stripe checkout', async () => {
    m.get.mockResolvedValue({ data: settings() });
    m.checkout.mockResolvedValue({ data: { checkout_url: 'https://checkout.stripe.com/c/pay_1' } });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true });
    renderPage();
    expect(await screen.findByText(/\$200 for your first three months, then \$100 a month/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ra-subscribe'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay_1'));
    expect(m.checkout).toHaveBeenCalledWith('r1');
  });

  it('lists invoices as Paid or Outstanding', async () => {
    m.get.mockResolvedValue({ data: settings({
      status: 'active', self_managed: true, current_period_end: '2027-01-14T00:00:00Z',
      invoices: [
        { number: 'A-1', date: '2026-10-14', amount_cents: 20000, state: 'paid', url: 'https://inv/A-1' },
        { number: 'A-2', date: '2027-01-14', amount_cents: 10000, state: 'outstanding', url: null },
      ],
    }) });
    renderPage();
    const table = await screen.findByTestId('ra-invoices');
    const rows = within(table).getAllByRole('row').slice(1).map((r) => r.textContent);
    expect(rows[0]).toContain('$200.00');
    expect(rows[0]).toContain('Paid');
    expect(rows[1]).toContain('$100.00');
    expect(rows[1]).toContain('Outstanding');
    expect(screen.getByRole('button', { name: 'Update card or cancel' })).toBeInTheDocument();
    expect(screen.queryByTestId('ra-subscribe')).toBeNull();
  });

  it('sends any other role away without loading anything', async () => {
    m.auth.user = { role: 'chef' };
    renderPage();
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument();
    expect(m.get).not.toHaveBeenCalled();
  });
});
