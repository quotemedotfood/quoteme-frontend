// A store's Funnel card: the store's today first, the five step counts with
// the percent kept, the 7 and 30 day ranges asked from the store's today,
// the by-day table newest first, an empty range, and a failed read. Read only.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({ getAdminRetailLocationFunnel: vi.fn() }));
vi.mock('../../services/adminApi', async (orig) => ({ ...(await orig<object>()), ...m }));

import { StoreFunnelCard, daysBefore, kept } from './_storeFunnelCard';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const answer = (from: string, to: string, days: unknown[]) =>
  ({ data: { from, to, today: '2026-11-28', time_zone: 'America/Denver', days } });

describe('StoreFunnelCard', () => {
  it("opens on the store's today with the five steps and the percent kept", async () => {
    m.getAdminRetailLocationFunnel.mockResolvedValueOnce(answer('2026-11-28', '2026-11-28', [
      { date: '2026-11-28', opened: 40, started: 30, understood: 24, picks: 12, presented: 3 },
    ]));
    render(<StoreFunnelCard storeId="s1" card="" heading="" />);

    await screen.findByTestId('funnel-steps');
    expect(m.getAdminRetailLocationFunnel).toHaveBeenCalledWith('s1');
    expect(screen.getByTestId('funnel-step-opened').textContent).toContain('40');
    expect(screen.getByTestId('funnel-step-opened').textContent).not.toContain('kept');
    expect(screen.getByTestId('funnel-kept-started').textContent).toBe('75% kept');
    expect(screen.getByTestId('funnel-kept-understood').textContent).toBe('80% kept');
    expect(screen.getByTestId('funnel-kept-picks').textContent).toBe('50% kept');
    expect(screen.getByTestId('funnel-kept-presented').textContent).toBe('25% kept');
    expect(screen.getAllByTestId('funnel-day')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Today' }).getAttribute('aria-pressed')).toBe('true');
  });

  it("asks 7 and 30 days back from the store's today, sums them, and lists days newest first", async () => {
    m.getAdminRetailLocationFunnel.mockResolvedValueOnce(answer('2026-11-28', '2026-11-28', []));
    render(<StoreFunnelCard storeId="s1" card="" heading="" />);
    expect(await screen.findByText('No visits in this range.')).toBeTruthy();

    m.getAdminRetailLocationFunnel.mockResolvedValueOnce(answer('2026-11-22', '2026-11-28', [
      { date: '2026-11-23', opened: 5, started: 4 },
      { date: '2026-11-27', opened: 10, started: 6, understood: 6, picks: 3, presented: 1 },
      { date: '2026-11-25', opened: 0, started: 0 },
    ]));
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    await waitFor(() => expect(m.getAdminRetailLocationFunnel).toHaveBeenLastCalledWith('s1', '2026-11-22', '2026-11-28'));
    await waitFor(() => expect(screen.getByTestId('funnel-step-opened').textContent).toContain('15'));
    expect(screen.getByTestId('funnel-kept-started').textContent).toBe('67% kept');
    const rows = screen.getAllByTestId('funnel-day');
    expect(rows).toHaveLength(2); // the day with no visits is left out
    expect(rows[0].textContent).toContain('Nov 27');
    expect(rows[1].textContent).toContain('Nov 23');

    m.getAdminRetailLocationFunnel.mockResolvedValueOnce(answer('2026-10-30', '2026-11-28', []));
    fireEvent.click(screen.getByRole('button', { name: '30 days' }));
    await waitFor(() => expect(m.getAdminRetailLocationFunnel).toHaveBeenLastCalledWith('s1', '2026-10-30', '2026-11-28'));
  });

  it('says when a step had no visits before it', async () => {
    m.getAdminRetailLocationFunnel.mockResolvedValueOnce(answer('2026-11-28', '2026-11-28', [
      { date: '2026-11-28', opened: 2 },
    ]));
    render(<StoreFunnelCard storeId="s1" card="" heading="" />);
    await screen.findByTestId('funnel-steps');
    expect(screen.getByTestId('funnel-kept-started').textContent).toBe('0% kept');
    expect(screen.getByTestId('funnel-kept-understood').textContent).toBe('no visits before');
  });

  it('says so when the read fails', async () => {
    m.getAdminRetailLocationFunnel.mockResolvedValueOnce({ error: 'Retail location not found' });
    render(<StoreFunnelCard storeId="s1" card="" heading="" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Retail location not found');
  });
});

describe('funnel math', () => {
  it('counts days back across a month', () => {
    expect(daysBefore('2026-12-03', 6)).toBe('2026-11-27');
    expect(daysBefore('2026-11-28', 29)).toBe('2026-10-30');
  });
  it('keeps whole percents and none from zero', () => {
    expect(kept(3, 1)).toBe(33);
    expect(kept(0, 0)).toBeNull();
  });
});
