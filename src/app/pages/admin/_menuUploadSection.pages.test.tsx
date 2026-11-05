// PAGES OF ONE LIST on the QM admin restaurant page (Moose, 2026-11-03):
// drag and drop, the phone camera, "Add another page", remove and reorder,
// and every page sent together with pages=1 so the server reads ONE list in
// page order. The backend half is pinned by QuoteMe's
// spec/requests/api/v1/admin/restaurant_menu_upload_pages_spec.rb.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  uploadRestaurantMenuFiles: vi.fn(),
  getRestaurantMenuUpload: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { MenuUploadSection, describeUpload } from './_menuUploadSection';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const file = (name: string, type = 'image/jpeg') => new File(['x'], name, { type });

function shoot(f: File) {
  fireEvent.change(screen.getByTestId('page-camera-input'), { target: { files: [f] } });
}

function queued(): string[] {
  return screen.queryAllByTestId('queued-page').map((li) => li.textContent ?? '');
}

describe('Page queue', () => {
  it('names the restaurant being uploaded to', () => {
    render(<MenuUploadSection restaurantId="r1" restaurantName="Coohills" pollMs={1} />);
    expect(screen.getByTestId('upload-restaurant-name')).toHaveTextContent('Uploading to Coohills');
  });

  it('offers the phone camera: an image input that opens the back camera', () => {
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    const cam = screen.getByTestId('page-camera-input');
    expect(cam).toHaveAttribute('accept', 'image/*');
    expect(cam).toHaveAttribute('capture', 'environment');
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument();
  });

  it('queues several shots in a row, then sends them as ONE wine list with pages=1, in order', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue({
      data: { uploads: [{ filename: 'p1.jpg', menu_id: 'm1', status: 'extracting', pages: 3 }] },
    });
    m.getRestaurantMenuUpload.mockResolvedValue({
      data: { menu_id: 'm1', kind: 'wine_list', pages: 3, status: 'read', error: null, error_code: null, pairing: { state: 'done', wines: 40 } },
    });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);

    shoot(file('p1.jpg'));
    expect(screen.getByRole('button', { name: 'Add another page' })).toBeInTheDocument();
    shoot(file('p2.jpg'));
    shoot(file('p3.jpg'));
    expect(queued().map((t) => t.match(/Page \d/)![0])).toEqual(['Page 1', 'Page 2', 'Page 3']);
    expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Send 3 pages as the wine list' }));

    await waitFor(() => expect(screen.getByTestId('upload-item')).toHaveTextContent('Wine list, 3 pages'));
    await waitFor(() => expect(screen.getByTestId('upload-item')).toHaveTextContent('40 wines read. Pairing done.'));
    expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(1);
    const [rid, kind, files, opts] = m.uploadRestaurantMenuFiles.mock.calls[0];
    expect([rid, kind, files.map((f: File) => f.name), opts]).toEqual(['r1', 'wine_list', ['p1.jpg', 'p2.jpg', 'p3.jpg'], { pages: true }]);
    expect(queued()).toEqual([]);
  });

  it('removes and reorders pages before sending', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue({ data: { uploads: [{ filename: 'c.jpg', menu_id: 'm2', status: 'extracting' }] } });
    m.getRestaurantMenuUpload.mockResolvedValue({
      data: { menu_id: 'm2', kind: 'menu', status: 'extracting', error: null, error_code: null, pairing: null },
    });
    render(<MenuUploadSection restaurantId="r1" pollMs={1000} />);
    fireEvent.change(screen.getByTestId('page-files-input'), {
      target: { files: [file('a.jpg'), file('b.jpg'), file('c.jpg')] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove page 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move page 2 earlier' }));
    expect(queued().map((t) => t.replace(/^Page \d/, ''))).toEqual(['c.jpg', 'a.jpg']);

    fireEvent.click(screen.getByRole('button', { name: 'Send 2 pages as the menu' }));
    await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(1));
    const call = m.uploadRestaurantMenuFiles.mock.calls[0];
    expect(call[1]).toBe('menu');
    expect(call[2].map((f: File) => f.name)).toEqual(['c.jpg', 'a.jpg']);
    expect(call[3]).toEqual({ pages: true });
  });

  it('takes files dropped on the upload area into the queue, and leaves out what is not a photo or PDF', () => {
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    const zone = screen.getByTestId('upload-dropzone');
    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });
    expect(zone).toHaveAttribute('data-dragging', 'true');
    fireEvent.drop(zone, {
      dataTransfer: { files: [file('list-1.jpg'), file('list-2.pdf', 'application/pdf'), file('notes.csv', 'text/csv')] },
    });
    expect(zone).toHaveAttribute('data-dragging', 'false');
    expect(queued()).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('notes.csv is not a photo or a PDF');
    expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();
  });

  it('a failed list says which page, and Retry sends every page again as one list', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue({ data: { uploads: [{ filename: 'p1.jpg', menu_id: 'm3', status: 'extracting', pages: 2 }] } });
    m.getRestaurantMenuUpload.mockResolvedValue({
      data: { menu_id: 'm3', kind: 'wine_list', pages: 2, status: 'failed', error: 'We could not read any text.', error_code: 'EMPTY_RESULT', error_page: 2, pairing: null },
    });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    shoot(file('p1.jpg'));
    shoot(file('p2.jpg'));
    fireEvent.click(screen.getByRole('button', { name: 'Send 2 pages as the wine list' }));
    await waitFor(() => expect(screen.getByTestId('upload-item')).toHaveTextContent('Page 2 could not be read. We could not read any text.'));

    fireEvent.click(screen.getByRole('button', { name: 'Retry Wine list, 2 pages' }));
    await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(2));
    const again = m.uploadRestaurantMenuFiles.mock.calls[1];
    expect(again[2].map((f: File) => f.name)).toEqual(['p1.jpg', 'p2.jpg']);
    expect(again[3]).toEqual({ pages: true });
  });
});

describe('describeUpload, no food menu on file', () => {
  it('says plainly that pairing waits because no food menu is on file', () => {
    const d = describeUpload({
      menu_id: 'm', kind: 'wine_list', status: 'read', error: null, error_code: null, pairing: { state: 'waiting_for_menu' },
    });
    expect(d.message).toContain('No food menu is on file for this restaurant yet.');
    expect(d.terminal).toBe(true);
  });
});
