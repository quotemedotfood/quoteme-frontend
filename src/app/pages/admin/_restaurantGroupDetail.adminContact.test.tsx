// The group admin on the open group (Moose, 2026-10-20: "let's make sure that
// groups have admin's name, phone (optional), and emails going forward").
// Shown with Edit; the payment link waits for name and email.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getAdminRestaurantGroup: vi.fn(),
  getAdminRestaurants: vi.fn(),
  addRestaurantToGroup: vi.fn(),
  removeRestaurantFromGroup: vi.fn(),
  createGroupPaymentLink: vi.fn(),
  getGroupPaymentOffers: vi.fn(),
  updateAdminRestaurantGroup: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { RestaurantGroupDetail, hasGroupAdminContact, NO_ADMIN_CONTACT_REASON } from './_restaurantGroupDetail';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const noPlan = { configured: true, status: null, paid: false, current_period_end: null, has_customer: false };
const boston = { id: 'r1', name: 'Aquitaine', city: 'Boston', state: 'MA', status: 'active' };
const group = (contact: Record<string, string | null>) => ({
  data: { id: 'g1', name: 'Aquitaine Group', status: 'active', created_at: '2026-10-15', restaurant_count: 1, billing: noPlan, restaurants: [boston], ...contact },
});
const linkButton = () => screen.getByText('Create payment link').closest('button') as HTMLButtonElement;

describe('group admin on the group detail', () => {
  it('shows the admin, and the payment link is open', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group({ admin_name: 'Seth Woods', admin_email: 'swoods109@me.com', admin_phone: '(617) 697-8094' }));
    render(<RestaurantGroupDetail groupId="g1" />);
    expect(await screen.findByText('Seth Woods')).toBeTruthy();
    expect(screen.getByText('swoods109@me.com')).toBeTruthy();
    expect(screen.getByText('(617) 697-8094')).toBeTruthy();
    expect(linkButton().disabled).toBe(false);
    expect(screen.queryByText(NO_ADMIN_CONTACT_REASON)).toBeNull();
  });

  it('keeps Create payment link disabled, with the reason, until name and email are set', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group({ admin_name: null, admin_email: null, admin_phone: null }));
    render(<RestaurantGroupDetail groupId="g1" />);
    expect(await screen.findByText('No group admin yet.')).toBeTruthy();
    expect(linkButton().disabled).toBe(true);
    expect(screen.getByText(NO_ADMIN_CONTACT_REASON)).toBeTruthy();
    fireEvent.click(linkButton());
    expect(m.getGroupPaymentOffers).not.toHaveBeenCalled();
  });

  it('a name alone is not enough', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group({ admin_name: 'Seth Woods', admin_email: null, admin_phone: null }));
    render(<RestaurantGroupDetail groupId="g1" />);
    expect(await screen.findByText('Seth Woods')).toBeTruthy();
    expect(linkButton().disabled).toBe(true);
  });

  it('Edit saves name, email and phone, and then the link opens', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group({ admin_name: null, admin_email: null, admin_phone: null }));
    m.updateAdminRestaurantGroup.mockResolvedValue({
      data: { id: 'g1', name: 'Aquitaine Group', status: 'active', admin_name: 'Seth Woods', admin_email: 'swoods109@me.com', admin_phone: '(617) 697-8094' },
    });
    render(<RestaurantGroupDetail groupId="g1" />);
    fireEvent.click(await screen.findByText('Edit'));
    const save = () => screen.getByText('Save').closest('button') as HTMLButtonElement;
    expect(save().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Group admin'), { target: { value: ' Seth Woods ' } });
    expect(save().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'swoods109@me.com' } });
    fireEvent.change(screen.getByLabelText('Phone (optional)'), { target: { value: '(617) 697-8094' } });
    fireEvent.click(save());
    await waitFor(() =>
      expect(m.updateAdminRestaurantGroup).toHaveBeenCalledWith('g1', {
        admin_name: 'Seth Woods', admin_email: 'swoods109@me.com', admin_phone: '(617) 697-8094',
      })
    );
    expect(await screen.findByText('Seth Woods')).toBeTruthy();
    expect(linkButton().disabled).toBe(false);
  });

  it('shows the backend refusal and stays in edit', async () => {
    m.getAdminRestaurantGroup.mockResolvedValue(group({ admin_name: 'Seth Woods', admin_email: 'swoods109@me.com', admin_phone: null }));
    m.updateAdminRestaurantGroup.mockResolvedValue({ error: 'Validation failed: That email does not look right' });
    render(<RestaurantGroupDetail groupId="g1" />);
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'seth@' } });
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText(/That email does not look right/)).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('hasGroupAdminContact needs both name and email', () => {
    expect(hasGroupAdminContact({ admin_name: 'Seth', admin_email: 's@x.com' })).toBe(true);
    expect(hasGroupAdminContact({ admin_name: 'Seth', admin_email: ' ' })).toBe(false);
    expect(hasGroupAdminContact({ admin_name: null, admin_email: 's@x.com' })).toBe(false);
    expect(hasGroupAdminContact(null)).toBe(false);
  });
});
