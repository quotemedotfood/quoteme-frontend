// A store's History card: the store's today first, a picked day, each
// session's time, who, QR spot, dishes and bottles with shelf price, an
// empty day and a failed read. Read only.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({ getAdminRetailLocationHistory: vi.fn() }));
vi.mock('../../services/adminApi', () => m);

import { StoreHistoryCard } from './_storeHistoryCard';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const session = {
  id: 'p1', time: '2026-11-21T01:42:00Z', who: 'shopper', code: 'Aisle 7',
  dishes: [{ name: 'Roast turkey', parts: ['turkey', 'sage'] }],
  bottles: [{ id: 'w1', producer: 'Domaine Test', wine: 'Willamette Pinot Noir', price_cents: 1299 }],
};
const day = (date: string, entries: unknown[]) => ({ data: { date, today: '2026-11-20', time_zone: 'America/Denver', entries } });

describe('StoreHistoryCard', () => {
  it("opens on the store's today and shows each session", async () => {
    m.getAdminRetailLocationHistory.mockResolvedValueOnce(day('2026-11-20', [session, { ...session, id: 'p2', who: 'staff', code: null, dishes: [] }]));
    render(<StoreHistoryCard storeId="s1" card="" heading="" />);

    const rows = await screen.findAllByTestId('store-session');
    expect(m.getAdminRetailLocationHistory).toHaveBeenCalledWith('s1', undefined);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('6:42 PM');
    expect(rows[0].textContent).toContain('Shopper');
    expect(rows[0].textContent).toContain('QR: Aisle 7');
    expect(within(rows[0]).getByText('Roast turkey', { exact: false }).tagName).toBe('LI');
    expect(rows[0].textContent).toContain('turkey, sage');
    expect(rows[0].textContent).toContain('Domaine Test, Willamette Pinot Noir');
    expect(rows[0].textContent).toContain('bottle, shelf price $12.99');
    expect(rows[1].textContent).toContain('Staff');
    expect(rows[1].textContent).toContain('No QR spot');
    expect((screen.getByLabelText('Day') as HTMLInputElement).value).toBe('2026-11-20');
    // The store's today is read once, not again for the date it answered.
    expect(m.getAdminRetailLocationHistory).toHaveBeenCalledTimes(1);
  });

  it('reads the day picked, and says when a day has none', async () => {
    m.getAdminRetailLocationHistory.mockResolvedValueOnce(day('2026-11-20', [session]));
    render(<StoreHistoryCard storeId="s1" card="" heading="" />);
    await screen.findAllByTestId('store-session');

    m.getAdminRetailLocationHistory.mockResolvedValueOnce(day('2026-11-18', []));
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2026-11-18' } });
    await waitFor(() => expect(m.getAdminRetailLocationHistory).toHaveBeenLastCalledWith('s1', '2026-11-18'));
    expect(await screen.findByText('No pairings saved on this day.')).toBeTruthy();
    expect(screen.queryAllByTestId('store-session')).toHaveLength(0);
  });

  it('says so when the read fails', async () => {
    m.getAdminRetailLocationHistory.mockResolvedValueOnce({ error: 'Retail location not found' });
    render(<StoreHistoryCard storeId="s1" card="" heading="" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Retail location not found');
  });
});
