// QM admin Sticker codes: the batches, making one (1 to 500, with a name),
// opening it, and the printer's sheet holding only codes and links.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getAdminPairitBatches: vi.fn(),
  getAdminPairitBatch: vi.fn(),
  createAdminPairitCodes: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { QMAdminStickerCodes, printerSheet } from './QMAdminStickerCodes';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const code = (c: string, extra: Record<string, unknown> = {}) => ({
  code: c, url: `https://app.pairme.wine/q/${c}`, batch: 'pilot-2026-11', name: null, attached_at: null, restaurant_id: null, ...extra,
});

describe('QMAdminStickerCodes', () => {
  it('lists the batches with how many are on a store and how many are blank', async () => {
    m.getAdminPairitBatches.mockResolvedValue({ data: { batches: [{ batch: 'pilot-2026-11', total: 100, attached: 12 }] } });
    render(<QMAdminStickerCodes />);
    const row = within(await screen.findByTestId('sticker-batches')).getByText('pilot-2026-11').closest('tr') as HTMLElement;
    expect(within(row).getByText('100')).toBeTruthy();
    expect(within(row).getByText('12')).toBeTruthy();
    expect(within(row).getByText('88')).toBeTruthy();
  });

  it('makes a batch only with a name and 1 to 500 stickers, then opens it', async () => {
    m.getAdminPairitBatches.mockResolvedValue({ data: { batches: [] } });
    render(<QMAdminStickerCodes />);
    await screen.findByText(/No batches yet/);
    const make = screen.getByRole('button', { name: /Make a batch/ }) as HTMLButtonElement;
    expect(make.disabled).toBe(true); // no name yet

    fireEvent.change(screen.getByLabelText('Batch name'), { target: { value: ' Pilot 2026-11 ' } });
    expect(make.disabled).toBe(false);
    for (const bad of ['0', '501', '2.5', 'many', '']) {
      fireEvent.change(screen.getByLabelText('How many stickers'), { target: { value: bad } });
      expect(make.disabled).toBe(true);
    }
    expect(screen.getByRole('status').textContent).toContain('1 to 500');

    fireEvent.change(screen.getByLabelText('How many stickers'), { target: { value: '2' } });
    m.createAdminPairitCodes.mockResolvedValue({ data: { batch: 'pilot-2026-11', codes: [code('K7M2QX'), code('P9RT3W')] } });
    m.getAdminPairitBatch.mockResolvedValue({
      data: { batch: 'pilot-2026-11', total: 2, attached: 1, codes: [code('K7M2QX', { name: 'Aisle 7, left', restaurant_id: 's1' }), code('P9RT3W')] },
    });
    fireEvent.click(make);

    await waitFor(() => expect(m.createAdminPairitCodes).toHaveBeenCalledWith(2, 'Pilot 2026-11'));
    const codes = within(await screen.findByTestId('sticker-codes'));
    expect(codes.getByText('K7M2QX')).toBeTruthy();
    expect(codes.getByText('Aisle 7, left')).toBeTruthy();
    expect(codes.getByText('Blank')).toBeTruthy();
    expect(m.getAdminPairitBatch).toHaveBeenCalledWith('pilot-2026-11');
  });

  it('shows the backend reason when a batch is refused', async () => {
    m.getAdminPairitBatches.mockResolvedValue({ data: { batches: [] } });
    render(<QMAdminStickerCodes />);
    await screen.findByText(/No batches yet/);
    fireEvent.change(screen.getByLabelText('Batch name'), { target: { value: 'x' } });
    m.createAdminPairitCodes.mockResolvedValue({ error: 'Name the batch, for example pilot-2026-11.' });
    fireEvent.click(screen.getByRole('button', { name: /Make a batch/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Name the batch');
  });
});

describe('printerSheet', () => {
  it('holds one row per sticker with its code and link, and nothing else', () => {
    const sheet = printerSheet([code('K7M2QX', { name: 'Aisle 7, left', restaurant_id: 's1' }), code('P9RT3W')]);
    expect(sheet).toBe('code,link\nK7M2QX,https://app.pairme.wine/q/K7M2QX\nP9RT3W,https://app.pairme.wine/q/P9RT3W\n');
    expect(sheet).not.toContain('Aisle');
  });
});
