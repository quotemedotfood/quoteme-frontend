// Upload menu / Upload wine list on the QM admin restaurant page (Moose,
// 2026-10-30). The backend half (one intake with the rep tablet photos, the
// status read, pairing once both are on file) is pinned by QuoteMe's
// spec/requests/api/v1/admin/restaurant_menu_uploads_spec.rb; this pins what
// the page sends, shows and retries.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  uploadRestaurantMenuFiles: vi.fn(),
  getRestaurantMenuUpload: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { MenuUploadSection, describeUpload } from './_menuUploadSection';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const file = (name: string, type = 'image/jpeg') => new File(['x'], name, { type });

function pick(kind: 'menu' | 'wine_list', files: File[]) {
  fireEvent.change(screen.getByTestId(`upload-input-${kind}`), { target: { files } });
}

function row(name: string) {
  return screen.getAllByTestId('upload-item').find((li) => li.textContent?.includes(name))!;
}

describe('Menu upload section', () => {
  it('shows the two buttons and file inputs for photos and PDFs, several at once', () => {
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    expect(screen.getByRole('button', { name: 'Upload menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload wine list' })).toBeInTheDocument();
    for (const kind of ['menu', 'wine_list']) {
      const input = screen.getByTestId(`upload-input-${kind}`);
      expect(input).toHaveAttribute('accept', 'image/*,application/pdf');
      expect(input).toHaveAttribute('multiple');
    }
  });

  it('success: uploads, polls the read, and shows the dishes read when pairing is done', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue({ data: { uploads: [{ filename: 'dinner.jpg', menu_id: 'm1', status: 'extracting' }] } });
    m.getRestaurantMenuUpload
      .mockResolvedValueOnce({ data: { menu_id: 'm1', kind: 'menu', status: 'extracting', error: null, error_code: null, pairing: null } })
      .mockResolvedValueOnce({ data: { menu_id: 'm1', kind: 'menu', status: 'read', error: null, error_code: null, pairing: { state: 'started' } } })
      .mockResolvedValue({ data: { menu_id: 'm1', kind: 'menu', status: 'read', error: null, error_code: null, pairing: { state: 'done', dishes: 42, wines: 18 } } });

    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('menu', [file('dinner.jpg')]);

    await waitFor(() => expect(row('dinner.jpg')).toHaveTextContent('Menu received. 42 dishes read. Pairing done.'));
    expect(row('dinner.jpg')).toHaveAttribute('data-phase', 'done');
    expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledWith('r1', 'menu', [expect.any(File)]);
    expect(m.getRestaurantMenuUpload).toHaveBeenCalledWith('r1', 'm1');
    expect(m.getRestaurantMenuUpload).toHaveBeenCalledTimes(3);
    expect(within(row('dinner.jpg')).queryByRole('button', { name: /Retry/ })).toBeNull();
  });

  it('multi-file: one request and one line per file, each with its own result', async () => {
    m.uploadRestaurantMenuFiles.mockImplementation(async (_r: string, _k: string, files: File[]) => ({
      data: { uploads: [{ filename: files[0].name, menu_id: `id-${files[0].name}`, status: 'extracting' }] },
    }));
    m.getRestaurantMenuUpload.mockImplementation(async (_r: string, id: string) => ({
      data: id === 'id-list-1.pdf'
        ? { menu_id: id, kind: 'wine_list', status: 'read', error: null, error_code: null, pairing: { state: 'waiting_for_menu' } }
        : { menu_id: id, kind: 'wine_list', status: 'failed', error: 'This PDF is too large to read automatically.', error_code: 'PDF_TOO_LARGE', pairing: null },
    }));

    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('wine_list', [file('list-1.pdf', 'application/pdf'), file('list-2.pdf', 'application/pdf')]);

    await waitFor(() => expect(row('list-1.pdf')).toHaveTextContent('Wine list received. Pairing waits for a menu.'));
    await waitFor(() => expect(row('list-2.pdf')).toHaveTextContent('This PDF is too large to read automatically.'));
    expect(screen.getAllByTestId('upload-item')).toHaveLength(2);
    expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(2);
    expect(m.uploadRestaurantMenuFiles.mock.calls.map((c) => [c[1], c[2].map((f: File) => f.name)])).toEqual([
      ['wine_list', ['list-1.pdf']],
      ['wine_list', ['list-2.pdf']],
    ]);
  });

  it('failure + retry: shows the error, and Retry re-sends only the failed file', async () => {
    m.uploadRestaurantMenuFiles.mockImplementation(async (_r: string, _k: string, files: File[]) => {
      if (files[0].name === 'bad.jpg' && m.uploadRestaurantMenuFiles.mock.calls.filter((c) => c[2][0].name === 'bad.jpg').length === 1) {
        return { error: 'That file is too large.', error_code: 'FILE_TOO_LARGE', status: 422 };
      }
      return { data: { uploads: [{ filename: files[0].name, menu_id: `id-${files[0].name}`, status: 'extracting' }] } };
    });
    m.getRestaurantMenuUpload.mockImplementation(async (_r: string, id: string) => ({
      data: { menu_id: id, kind: 'menu', status: 'read', error: null, error_code: null, pairing: { state: 'done', dishes: 7 } },
    }));

    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('menu', [file('good.jpg'), file('bad.jpg')]);

    await waitFor(() => expect(row('bad.jpg')).toHaveTextContent('That file is too large.'));
    await waitFor(() => expect(row('good.jpg')).toHaveTextContent('Menu received. 7 dishes read. Pairing done.'));
    expect(row('bad.jpg')).toHaveAttribute('data-phase', 'failed');
    expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(2);

    fireEvent.click(within(row('bad.jpg')).getByRole('button', { name: 'Retry bad.jpg' }));

    await waitFor(() => expect(row('bad.jpg')).toHaveTextContent('Menu received. 7 dishes read. Pairing done.'));
    expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(3);
    const third = m.uploadRestaurantMenuFiles.mock.calls[2];
    expect(third[2].map((f: File) => f.name)).toEqual(['bad.jpg']);
    expect(screen.getAllByTestId('upload-item')).toHaveLength(2);
  });

  it('a pairing that failed shows its reason and a Retry', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue({ data: { uploads: [{ filename: 'd.jpg', menu_id: 'm9', status: 'extracting' }] } });
    m.getRestaurantMenuUpload.mockResolvedValue({
      data: { menu_id: 'm9', kind: 'menu', status: 'read', error: null, error_code: null, pairing: { state: 'failed', error: 'no dishes read from the menu' } },
    });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('menu', [file('d.jpg')]);
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Menu received. Pairing failed: no dishes read from the menu.'));
    expect(within(row('d.jpg')).getByRole('button', { name: 'Retry d.jpg' })).toBeInTheDocument();
  });
});

describe('describeUpload', () => {
  const base = { menu_id: 'm', error: null, error_code: null } as const;
  it('says pairing waits for a wine list when a menu comes in alone', () => {
    expect(describeUpload({ ...base, kind: 'menu', status: 'read', pairing: { state: 'waiting_for_list' } }).message)
      .toBe('Menu received. Pairing waits for a wine list.');
  });
  it('counts wines for a wine list once paired', () => {
    expect(describeUpload({ ...base, kind: 'wine_list', status: 'read', pairing: { state: 'done', dishes: 3, wines: 18 } }).message)
      .toBe('Wine list received. 18 wines read. Pairing done.');
  });
  it('keeps polling while reading or pairing', () => {
    expect(describeUpload({ ...base, kind: 'menu', status: 'extracting', pairing: null }).terminal).toBe(false);
    expect(describeUpload({ ...base, kind: 'menu', status: 'read', pairing: { state: 'started' } }).terminal).toBe(false);
  });
});
