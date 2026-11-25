// QM admin Wine producers: the list with wine counts, the Everywhere tick
// (sets and clears one row and moves the count), the filter, and a refused
// tick leaving the box as it was.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getAdminWineProducers: vi.fn(),
  setAdminWineProducerEverywhere: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { QMAdminWineProducers } from './QMAdminWineProducers';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const row = (name: string, extra: Record<string, unknown> = {}) => ({
  id: `id-${name.toLowerCase()}`, name, status: 'active', everywhere: false, wines: 3, ...extra,
});
const page = (producers: unknown[], extra: Record<string, unknown> = {}) => ({
  data: { producers, total: producers.length, everywhere_total: 0, page: 1, per_page: 50, ...extra },
});

describe('QMAdminWineProducers', () => {
  it('lists producers with wine counts and the ticked total', async () => {
    m.getAdminWineProducers.mockResolvedValue(page([row('Barefoot', { wines: 40 }), row('Meiomi', { everywhere: true })], { everywhere_total: 1 }));
    render(<QMAdminWineProducers />);
    const table = await screen.findByTestId('wine-producers');
    const bf = within(table).getByText('Barefoot').closest('tr') as HTMLElement;
    expect(within(bf).getByText('40')).toBeTruthy();
    expect((screen.getByLabelText('Everywhere: Meiomi') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId('wine-producers-counts').textContent).toContain('1 ticked everywhere');
  });

  it('a tick saves that producer and moves the count', async () => {
    m.getAdminWineProducers.mockResolvedValue(page([row('Barefoot')]));
    m.setAdminWineProducerEverywhere.mockResolvedValue({ data: row('Barefoot', { everywhere: true }) });
    render(<QMAdminWineProducers />);
    const box = (await screen.findByLabelText('Everywhere: Barefoot')) as HTMLInputElement;
    fireEvent.click(box);
    await waitFor(() => expect((screen.getByLabelText('Everywhere: Barefoot') as HTMLInputElement).checked).toBe(true));
    expect(m.setAdminWineProducerEverywhere).toHaveBeenCalledWith('id-barefoot', true);
    expect(screen.getByTestId('wine-producers-counts').textContent).toContain('1 ticked everywhere');
  });

  it('a refused tick leaves the box as it was and says why', async () => {
    m.getAdminWineProducers.mockResolvedValue(page([row('Barefoot')]));
    m.setAdminWineProducerEverywhere.mockResolvedValue({ error: 'Wine producer not found' });
    render(<QMAdminWineProducers />);
    fireEvent.click(await screen.findByLabelText('Everywhere: Barefoot'));
    expect((await screen.findByRole('alert')).textContent).toContain('Wine producer not found');
    expect((screen.getByLabelText('Everywhere: Barefoot') as HTMLInputElement).checked).toBe(false);
  });

  it('the Everywhere filter asks for ticked producers only', async () => {
    m.getAdminWineProducers.mockResolvedValue(page([row('Barefoot')]));
    render(<QMAdminWineProducers />);
    await screen.findByTestId('wine-producers');
    fireEvent.click(screen.getByRole('button', { name: 'Everywhere' }));
    await waitFor(() => expect(m.getAdminWineProducers).toHaveBeenLastCalledWith({ q: '', everywhere: 'yes', page: 1 }));
  });
});
