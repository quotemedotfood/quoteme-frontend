// @vitest-environment jsdom
//
// The restaurant load list (QuoteMe #588): upload a crawler CSV, see each
// batch's status in words. A 413 on upload adds the note that Railway limits
// request size; any other failure does not.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({
  getRestaurantLoadBatches: vi.fn(),
  uploadRestaurantLoadBatch: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { QMAdminRestaurantLoads } from './QMAdminRestaurantLoads';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

function row(over: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    status: 'applied',
    filename: 'boston_crawl.csv',
    byte_size: 2048,
    row_count: 42,
    ledger_counts: { restaurants_created: 3, restaurants_updated: 1, menus_created: 4, menus_updated: 2 },
    requested_by: { id: 'u1', email: 'moose@example.test' },
    created_at: '2026-10-24T12:00:00Z',
    updated_at: '2026-10-24T12:00:00Z',
    can_apply: false,
    can_revert: true,
    ...over,
  };
}

function list(rows: unknown[]) {
  return { data: { restaurant_load_batches: rows, page: 1, per_page: 25, total_count: rows.length, total_pages: 1 } };
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/qm-admin/restaurant-loads']}>
      <Routes>
        <Route path="/qm-admin/restaurant-loads" element={<QMAdminRestaurantLoads pollMs={60_000} />} />
        <Route path="/qm-admin/restaurant-loads/:id" element={<p>detail page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const uploadButton = () => screen.getByRole('button', { name: /Upload and run the dry run/ }) as HTMLButtonElement;

describe('restaurant load list', () => {
  it('shows each batch with its status in words and its counts', async () => {
    m.getRestaurantLoadBatches.mockResolvedValue(list([row()]));
    renderList();
    await screen.findByText('boston_crawl.csv');
    expect(m.getRestaurantLoadBatches).toHaveBeenCalledWith({ page: 1, per_page: 25 });
    expect(screen.getByText('Loaded')).toBeTruthy();
    expect(screen.queryByText('applied')).toBeNull();
    expect(screen.getByText('moose@example.test')).toBeTruthy();
    expect(screen.getByText('3 created, 1 updated')).toBeTruthy();
    expect(screen.getByText('4 created, 2 updated')).toBeTruthy();
  });

  it('uploads the chosen file and opens its page', async () => {
    m.getRestaurantLoadBatches.mockResolvedValue(list([]));
    m.uploadRestaurantLoadBatch.mockResolvedValue({ data: { restaurant_load_batch: row({ id: 'b9', status: 'uploaded' }) } });
    renderList();
    await screen.findByText('No restaurant loads found');

    expect(uploadButton().disabled).toBe(true);
    const file = new File(['name\nFoo\n'], 'crawl.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('Crawler CSV file'), { target: { files: [file] } });
    fireEvent.click(uploadButton());

    await waitFor(() => expect(m.uploadRestaurantLoadBatch).toHaveBeenCalledWith(file));
    expect(await screen.findByText('detail page')).toBeTruthy();
  });

  it('a 413 adds the request size note; another failure does not', async () => {
    m.getRestaurantLoadBatches.mockResolvedValue(list([]));
    m.uploadRestaurantLoadBatch
      .mockResolvedValueOnce({ error: 'Upload failed (413)', status: 413 })
      .mockResolvedValueOnce({ error: 'Send the CSV as a multipart file in `file`.', status: 400 });
    renderList();
    await screen.findByText('No restaurant loads found');

    fireEvent.change(screen.getByLabelText('Crawler CSV file'), { target: { files: [new File(['x'], 'big.csv')] } });
    fireEvent.click(uploadButton());
    expect(await screen.findByText(/Railway limits the size of a request/)).toBeTruthy();

    fireEvent.click(uploadButton());
    await screen.findByText('Send the CSV as a multipart file in `file`.');
    expect(screen.queryByText(/Railway limits the size of a request/)).toBeNull();
  });
});
