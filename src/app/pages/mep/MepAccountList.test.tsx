// THE MEP ACCOUNT LIST (MEP platform, part A, Moose 2026-11-13). Pins against
// the QuoteMe contract (spec/requests/api/v1/mep/accounts_spec.rb):
//   L1 lists each account with its type, place, group or hotel, and its star
//   L2 the search, type, city and My stars filters go to the server
//   L3 the star sends this account's type and id, and flips only that row;
//      a refused star leaves the row as it was and says so
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({ getMepAccounts: vi.fn(), setMepStar: vi.fn() }));
vi.mock('../../services/mepApi', () => m);

import { MepAccountList, accountDetail } from './MepAccountList';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const crawford = { account_type: 'hotel', id: 'h1', name: 'The Crawford', city: 'Denver', state: 'CO', group: null, hotel: null, restaurant_count: 2, starred: false };
const mizuna = { account_type: 'restaurant', id: 'r1', name: 'Mizuna', city: 'Denver', state: 'CO', group: { id: 'g1', name: 'Bonanno Concepts' }, hotel: null, restaurant_count: null, starred: true };
const page = (accounts: unknown[]) => ({ data: { accounts, total: accounts.length, page: 1, per_page: 50, cities: [{ city: 'Denver', count: 9 }, { city: 'Boulder', count: 3 }] } });

describe('MepAccountList', () => {
  it('L1 lists accounts with type, place, group and star', async () => {
    m.getMepAccounts.mockResolvedValue(page([crawford, mizuna]));
    render(<MepAccountList />);
    const rows = await screen.findAllByTestId('mep-account-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Hotel · Denver, CO · 2 restaurants');
    expect(rows[1].textContent).toContain('Restaurant · Denver, CO · Group: Bonanno Concepts');
    expect(within(rows[0]).getByRole('button').getAttribute('aria-pressed')).toBe('false');
    expect(within(rows[1]).getByRole('button').getAttribute('aria-pressed')).toBe('true');
    expect(accountDetail({ ...crawford, restaurant_count: 1 } as never)).toContain('1 restaurant');
  });

  it('L2 sends the type, city and My stars filters', async () => {
    m.getMepAccounts.mockResolvedValue(page([crawford]));
    render(<MepAccountList />);
    await screen.findAllByTestId('mep-account-row');
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'hotel' } });
    await waitFor(() => expect(m.getMepAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'hotel', page: 1 })));
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Boulder' } });
    await waitFor(() => expect(m.getMepAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Boulder' })));
    fireEvent.click(screen.getByLabelText('My stars'));
    await waitFor(() => expect(m.getMepAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ starred: true })));
  });

  it('L2 searches after typing', async () => {
    m.getMepAccounts.mockResolvedValue(page([mizuna]));
    render(<MepAccountList />);
    await screen.findAllByTestId('mep-account-row');
    fireEvent.change(screen.getByLabelText('Search by name'), { target: { value: 'miz' } });
    await waitFor(() => expect(m.getMepAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'miz' })), { timeout: 2000 });
  });

  it('L3 stars this account by type and id and flips only its row', async () => {
    m.getMepAccounts.mockResolvedValue(page([crawford, { ...mizuna, starred: false }]));
    m.setMepStar.mockResolvedValue({ data: { starred: true } });
    render(<MepAccountList />);
    const rows = await screen.findAllByTestId('mep-account-row');
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Star The Crawford' }));
    await waitFor(() => expect(m.setMepStar).toHaveBeenCalledWith('hotel', 'h1', true));
    await waitFor(() => expect(within(screen.getAllByTestId('mep-account-row')[0]).getByRole('button').getAttribute('aria-pressed')).toBe('true'));
    expect(within(screen.getAllByTestId('mep-account-row')[1]).getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });

  it('L3 a refused star leaves the row and says so', async () => {
    m.getMepAccounts.mockResolvedValue(page([crawford]));
    m.setMepStar.mockResolvedValue({ error: 'That account was not found.', status: 404 });
    render(<MepAccountList />);
    const rows = await screen.findAllByTestId('mep-account-row');
    fireEvent.click(within(rows[0]).getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent('That account was not found.');
    expect(within(screen.getAllByTestId('mep-account-row')[0]).getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });
});
