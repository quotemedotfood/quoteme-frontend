// The New Group form asks for the group admin (Moose, 2026-10-20: "let's make
// sure that groups have admin's name, phone (optional), and emails going
// forward").
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getAdminRestaurantGroups: vi.fn(),
  createAdminRestaurantGroup: vi.fn(),
  updateAdminRestaurantGroup: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);
vi.mock('./_restaurantGroupDetail', () => ({ RestaurantGroupDetail: () => null }));

import { QMAdminRestaurantGroups } from './QMAdminRestaurantGroups';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const newGroupButton = () => screen.getByText('New Group').closest('button') as HTMLButtonElement;
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('New Group form', () => {
  it('waits for the name, the group admin and the email; phone is optional', async () => {
    m.getAdminRestaurantGroups.mockResolvedValue({ data: [] });
    m.createAdminRestaurantGroup.mockResolvedValue({
      data: { id: 'g9', name: 'Aquitaine Group', status: 'active', restaurant_count: 0, created_at: '2026-10-20' },
    });
    render(<QMAdminRestaurantGroups />);
    await screen.findByText('No restaurant groups yet.');
    expect(screen.getByPlaceholderText('Phone (optional)')).toBeTruthy();

    expect(newGroupButton().disabled).toBe(true);
    type('New group name', 'Aquitaine Group');
    expect(newGroupButton().disabled).toBe(true);
    type('Group admin', 'Seth Woods');
    expect(newGroupButton().disabled).toBe(true);
    type('Email', ' swoods109@me.com ');
    expect(newGroupButton().disabled).toBe(false);

    fireEvent.click(newGroupButton());
    await waitFor(() =>
      expect(m.createAdminRestaurantGroup).toHaveBeenCalledWith({
        name: 'Aquitaine Group', status: 'active', admin_name: 'Seth Woods', admin_email: 'swoods109@me.com',
      })
    );
    expect(await screen.findByText('Aquitaine Group')).toBeTruthy();
  });

  it('sends the phone when one is typed', async () => {
    m.getAdminRestaurantGroups.mockResolvedValue({ data: [] });
    m.createAdminRestaurantGroup.mockResolvedValue({ error: 'Validation failed: That email does not look right' });
    render(<QMAdminRestaurantGroups />);
    await screen.findByText('No restaurant groups yet.');
    type('New group name', 'Aquitaine Group');
    type('Group admin', 'Seth Woods');
    type('Email', 'seth@');
    type('Phone (optional)', '(617) 697-8094');
    fireEvent.click(newGroupButton());
    await waitFor(() =>
      expect(m.createAdminRestaurantGroup).toHaveBeenCalledWith({
        name: 'Aquitaine Group', status: 'active', admin_name: 'Seth Woods', admin_email: 'seth@', admin_phone: '(617) 697-8094',
      })
    );
    expect(await screen.findByText(/That email does not look right/)).toBeTruthy();
  });
});
