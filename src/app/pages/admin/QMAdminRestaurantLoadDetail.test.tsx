// @vitest-environment jsdom
//
// One restaurant load (QuoteMe #588). What this page must hold:
//   - Apply asks first, in words that say it writes to production and name
//     the row count; the "Pair these restaurants after loading" box reaches
//     the request only when ticked.
//   - A 409 REFUSED shows the server's sentence.
//   - The page asks again while a job runs and stops at a settled status.
//   - The server is the authority on the buttons (can_apply / can_revert),
//     and its refusal sentence is shown when one is off.
//
// This project's vitest config does not set `globals: true`, so cleanup is
// registered by hand.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({
  getRestaurantLoadBatch: vi.fn(),
  applyRestaurantLoadBatch: vi.fn(),
  revertRestaurantLoadBatch: vi.fn(),
  markRestaurantLoadBatchInterrupted: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { QMAdminRestaurantLoadDetail } from './QMAdminRestaurantLoadDetail';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

function batch(over: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    status: 'dry_run_done',
    filename: 'boston_crawl.csv',
    byte_size: 2048,
    file_sha256: 'aa',
    dry_run_sha256: 'aa',
    row_count: 42,
    load_batch_id: 'lb1',
    error: null,
    ledger_counts: null,
    pair_after_apply: false,
    pair_report: null,
    can_apply: true,
    can_revert: false,
    requested_by: { id: 'u1', email: 'moose@example.test' },
    applied_by: null,
    reverted_by: null,
    started_at: null,
    finished_at: null,
    apply_started_at: null,
    created_at: '2026-10-24T12:00:00Z',
    updated_at: '2026-10-24T12:00:00Z',
    apply_refusal: null,
    revert_refusal: 'Only an applied batch, or one whose apply stopped, can be reverted. This batch is dry_run_done.',
    dry_run_report: 'DRY RUN\nrow 1: would create Foo',
    apply_report: null,
    revert_report: null,
    ...over,
  };
}

function renderAt(pollMs = 5) {
  return render(
    <MemoryRouter initialEntries={['/qm-admin/restaurant-loads/b1']}>
      <Routes>
        <Route path="/qm-admin/restaurant-loads/:id" element={<QMAdminRestaurantLoadDetail pollMs={pollMs} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;

describe('restaurant load detail', () => {
  it('Apply confirms in words that name production and the row count, and sends no pair flag when the box is off', async () => {
    m.getRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: batch() } });
    m.applyRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: batch({ status: 'applying' }) } });
    renderAt(60_000);

    await screen.findByText('Dry run finished');
    fireEvent.click(button('Apply'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toMatch(/production/);
    expect(dialog.textContent).toMatch(/42 rows/);
    expect(m.applyRestaurantLoadBatch).not.toHaveBeenCalled();

    fireEvent.click(button('Write to production'));
    await waitFor(() => expect(m.applyRestaurantLoadBatch).toHaveBeenCalledTimes(1));
    expect(m.applyRestaurantLoadBatch).toHaveBeenCalledWith('b1', { pairAfterApply: false });
  });

  it('sends pair after apply when "Pair these restaurants after loading" is ticked', async () => {
    m.getRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: batch() } });
    m.applyRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: batch({ status: 'applying' }) } });
    renderAt(60_000);

    await screen.findByText('Dry run finished');
    const box = screen.getByLabelText('Pair these restaurants after loading') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    fireEvent.click(button('Apply'));
    await screen.findByRole('alertdialog');
    fireEvent.click(button('Write to production'));
    await waitFor(() => expect(m.applyRestaurantLoadBatch).toHaveBeenCalledWith('b1', { pairAfterApply: true }));
  });

  it('a 409 refusal shows the server sentence', async () => {
    m.getRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: batch() } });
    m.applyRestaurantLoadBatch.mockResolvedValue({
      error: 'Batch b0 is applying. One batch writes at a time.',
      error_code: 'REFUSED',
      status: 409,
    });
    renderAt(60_000);

    await screen.findByText('Dry run finished');
    fireEvent.click(button('Apply'));
    await screen.findByRole('alertdialog');
    fireEvent.click(button('Write to production'));
    const alert = await screen.findByText('Batch b0 is applying. One batch writes at a time.');
    expect(alert.getAttribute('role')).toBe('alert');
  });

  it('Revert confirms before it sends', async () => {
    m.getRestaurantLoadBatch.mockResolvedValue({
      data: {
        restaurant_load_batch: batch({
          status: 'applied',
          can_apply: false,
          can_revert: true,
          apply_refusal: 'A write needs a finished dry run first. This batch is applied.',
          revert_refusal: null,
          ledger_counts: { restaurants_created: 3, restaurants_updated: 1, menus_created: 4, menus_updated: 0 },
        }),
      },
    });
    m.revertRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: batch({ status: 'reverting' }) } });
    renderAt(60_000);

    await screen.findByText('Loaded');
    expect(button('Apply').disabled).toBe(true);
    expect(screen.getByTestId('apply-refusal').textContent).toMatch(/A write needs a finished dry run first/);
    fireEvent.click(button('Revert'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toMatch(/production/);
    expect(m.revertRestaurantLoadBatch).not.toHaveBeenCalled();
    fireEvent.click(button('Revert in production'));
    await waitFor(() => expect(m.revertRestaurantLoadBatch).toHaveBeenCalledWith('b1'));
  });

  it('buttons follow the server, and its refusal sentence shows under a disabled one', async () => {
    m.getRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: batch() } });
    renderAt(60_000);

    await screen.findByText('Dry run finished');
    expect(button('Apply').disabled).toBe(false);
    expect(button('Revert').disabled).toBe(true);
    expect(screen.getByTestId('revert-refusal').textContent).toMatch(/Only an applied batch/);
  });

  it('polls while the dry run runs and stops once the status settles', async () => {
    m.getRestaurantLoadBatch
      .mockResolvedValueOnce({ data: { restaurant_load_batch: batch({ status: 'dry_running', can_apply: false }) } })
      .mockResolvedValueOnce({ data: { restaurant_load_batch: batch({ status: 'dry_running', can_apply: false }) } })
      .mockResolvedValue({ data: { restaurant_load_batch: batch({ status: 'dry_run_done' }) } });
    renderAt(5);

    await screen.findByText('Dry run finished');
    expect(m.getRestaurantLoadBatch).toHaveBeenCalledTimes(3);
    // Twenty poll intervals later, nothing more was asked.
    await new Promise((r) => setTimeout(r, 100));
    expect(m.getRestaurantLoadBatch).toHaveBeenCalledTimes(3);
  });

  it('shows the status in words, never the code, and keeps the report collapsed until asked', async () => {
    m.getRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: batch({ status: 'dry_run_failed', can_apply: false }) } });
    renderAt(60_000);

    await screen.findByText('Dry run failed');
    expect(screen.queryByText('dry_run_failed')).toBeNull();
    expect(screen.queryByText(/would create Foo/)).toBeNull();
    fireEvent.click(button('Show dry run report'));
    expect(screen.getByText(/would create Foo/)).toBeTruthy();
  });

  // MARK AS INTERRUPTED (QuoteMe #588, POST mark_interrupted).
  const stuck = (over: Record<string, unknown> = {}) =>
    batch({
      status: 'applying',
      can_apply: false,
      apply_refusal: 'A write needs a finished dry run first. This batch is applying.',
      apply_started_at: '2026-10-24T13:00:00Z',
      can_mark_interrupted: true,
      mark_interrupted_refusal: null,
      ...over,
    });

  it('offers Mark as interrupted only while applying or reverting', async () => {
    for (const status of ['dry_run_done', 'applied', 'apply_failed', 'revert_failed', 'reverted']) {
      m.getRestaurantLoadBatch.mockResolvedValue({
        data: { restaurant_load_batch: batch({ status, can_mark_interrupted: false, mark_interrupted_refusal: `This batch is ${status}.` }) },
      });
      renderAt(60_000);
      await screen.findByTestId('restaurant-load-status');
      expect(screen.queryByRole('button', { name: 'Mark as interrupted' })).toBeNull();
      cleanup();
    }
    for (const status of ['applying', 'reverting']) {
      m.getRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: stuck({ status }) } });
      renderAt(60_000);
      await screen.findByTestId('restaurant-load-status');
      expect(button('Mark as interrupted').disabled).toBe(false);
      cleanup();
    }
  });

  it('follows can_mark_interrupted and shows the server sentence when it is off', async () => {
    m.getRestaurantLoadBatch.mockResolvedValue({
      data: {
        restaurant_load_batch: stuck({
          can_mark_interrupted: false,
          mark_interrupted_refusal: 'A job for this batch is running on railway-web, which last reported at 2026-10-24T13:05:00Z.',
        }),
      },
    });
    renderAt(60_000);

    await screen.findByText('Writing to production');
    expect(button('Mark as interrupted').disabled).toBe(true);
    expect(screen.getByTestId('mark-interrupted-refusal').textContent).toMatch(/is running on railway-web/);
  });

  it('confirms that it only unblocks the queue and that written rows stay, then sends', async () => {
    m.getRestaurantLoadBatch
      .mockResolvedValueOnce({ data: { restaurant_load_batch: stuck() } })
      .mockResolvedValue({
        data: {
          restaurant_load_batch: stuck({
            status: 'apply_failed',
            can_mark_interrupted: false,
            error: 'Marked interrupted by moose@example.test at 2026-10-25T09:00:00Z',
          }),
        },
      });
    m.markRestaurantLoadBatchInterrupted.mockResolvedValue({ data: { restaurant_load_batch: stuck({ status: 'apply_failed' }) } });
    renderAt(60_000);

    await screen.findByText('Writing to production');
    fireEvent.click(button('Mark as interrupted'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toMatch(/only unblocks the queue/);
    expect(dialog.textContent).toMatch(/already wrote to production stay/);
    expect(dialog.textContent).toMatch(/reverted .* if the revert ledger covers them/);
    expect(m.markRestaurantLoadBatchInterrupted).not.toHaveBeenCalled();

    fireEvent.click(button('Unblock the queue'));
    await waitFor(() => expect(m.markRestaurantLoadBatchInterrupted).toHaveBeenCalledWith('b1'));
    await screen.findByText('Load stopped with an error');
    expect(screen.getByRole('alert').textContent).toMatch(/Marked interrupted by moose@example.test/);
    expect(screen.queryByRole('button', { name: 'Mark as interrupted' })).toBeNull();
  });

  it('a 409 on Mark as interrupted shows the server sentence', async () => {
    m.getRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: stuck() } });
    m.markRestaurantLoadBatchInterrupted.mockResolvedValue({
      error: 'A job for this batch is queued and will run. It decides the batch itself; wait for it.',
      error_code: 'REFUSED',
      status: 409,
    });
    renderAt(60_000);

    await screen.findByText('Writing to production');
    fireEvent.click(button('Mark as interrupted'));
    await screen.findByRole('alertdialog');
    fireEvent.click(button('Unblock the queue'));
    const alert = await screen.findByText(/A job for this batch is queued and will run/);
    expect(alert.getAttribute('role')).toBe('alert');
  });
});
