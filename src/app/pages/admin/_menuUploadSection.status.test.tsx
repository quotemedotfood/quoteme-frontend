// SAY WHAT WENT WRONG with an upload (Moose, 2026-11-11: "We should
// communicate issues with uploads: too big, doesn't look right, low
// bandwidth, whatever"). Pins queued vs running pairing (QuoteMe pairing.queue),
// the copy for each refusal, a dropped or slow connection, and the line after a
// long wait, so no row is an endless silent spinner.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  uploadRestaurantMenuFiles: vi.fn(),
  getRestaurantMenuUpload: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { MenuUploadSection, describeUpload, describeRefusal, UPLOAD_COPY, MAX_FILE_BYTES } from './_menuUploadSection';
import { TIMEOUT_MUTATION_MESSAGE, NETWORK_FAILURE_MESSAGE } from '../../services/requestPolicy';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const file = (name: string, type = 'image/jpeg', size?: number) => {
  const f = new File(['x'], name, { type });
  if (size != null) Object.defineProperty(f, 'size', { value: size });
  return f;
};

function pick(kind: 'menu' | 'wine_list', files: File[]) {
  fireEvent.change(screen.getByTestId(`upload-input-${kind}`), { target: { files } });
}

function row(name: string) {
  return screen.getAllByTestId('upload-item').find((li) => li.textContent?.includes(name))!;
}

const accepted = (id = 'm1') => ({ data: { uploads: [{ filename: 'd.jpg', menu_id: id, status: 'extracting' }] } });
const base = { menu_id: 'm', error: null, error_code: null } as const;

describe('queued vs running pairing', () => {
  it('says "Pairing queued" while the job waits its turn, and keeps polling', () => {
    const d = describeUpload({ ...base, kind: 'menu', status: 'read', pairing: { state: 'started', queue: 'queued' } });
    expect(d.message).toBe('Menu received. Pairing queued.');
    expect(d.phase).toBe('queued');
    expect(d.terminal).toBe(false);
  });

  it('keeps the running line when the job runs, or when an older server sends no queue', () => {
    const running = describeUpload({ ...base, kind: 'wine_list', status: 'read', pairing: { state: 'started', queue: 'running' } });
    const older = describeUpload({ ...base, kind: 'wine_list', status: 'read', pairing: { state: 'started' } });
    for (const d of [running, older]) {
      expect(d.message).toBe('Wine list received. Pairing started.');
      expect(d.phase).toBe('pairing');
      expect(d.terminal).toBe(false);
    }
  });

  it('a queued row shows no spinner, then moves to running and done', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted());
    m.getRestaurantMenuUpload.mockResolvedValue({ data: { ...base, menu_id: 'm1', kind: 'menu', status: 'read', pairing: { state: 'started', queue: 'queued' } } });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('menu', [file('d.jpg')]);
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Menu received. Pairing queued.'));
    expect(row('d.jpg')).toHaveAttribute('data-phase', 'queued');
    expect(row('d.jpg').querySelector('.animate-spin')).toBeNull();
    m.getRestaurantMenuUpload.mockResolvedValue({ data: { ...base, menu_id: 'm1', kind: 'menu', status: 'read', pairing: { state: 'done', dishes: 4 } } });
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Menu received. 4 dishes read. Pairing done.'));
  });
});

describe('describeRefusal copy', () => {
  it.each([
    ['FILE_TOO_LARGE', 'That file is too large. The limit is 25 MB per file.', true],
    ['NOT_PHOTO_OR_PDF', 'That is not a photo or a PDF. Upload a photo or a PDF.', false],
    ['TOO_MANY_FILES', 'Too many files. Send 20 or fewer at a time.', false],
    ['TOO_MANY_PAGES', 'Too many pages. One list holds 20 pages at most.', false],
  ])('%s', (code, message, retry) => {
    expect(describeRefusal({ error: 'server copy', error_code: code, status: 422 })).toEqual({ message, retry });
  });

  it('413 from the server or a proxy says the size limit', () => {
    expect(describeRefusal({ error: 'Upload failed (413)', status: 413 })).toEqual({ message: UPLOAD_COPY.tooLarge, retry: false });
  });

  it('a dropped connection says so and offers Retry', () => {
    for (const error of ['Network error', NETWORK_FAILURE_MESSAGE, 'Failed to fetch']) {
      expect(describeRefusal({ error })).toEqual({ message: 'The connection dropped. Check your signal and retry.', retry: true });
    }
  });

  it('an upload that timed out says the connection is slow and it may have gone through', () => {
    expect(describeRefusal({ error: TIMEOUT_MUTATION_MESSAGE })).toEqual({ message: UPLOAD_COPY.timedOut, retry: true });
  });

  it('any other server refusal shows the server copy', () => {
    expect(describeRefusal({ error: 'Choose menu or wine list.', error_code: 'BAD_KIND', status: 422 }))
      .toEqual({ message: 'Choose menu or wine list.', retry: true });
  });
});

describe('upload problems on the row', () => {
  it('a file over 25 MB is refused before sending, with the limit and no Retry', () => {
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('menu', [file('huge.jpg', 'image/jpeg', MAX_FILE_BYTES + 1)]);
    expect(row('huge.jpg')).toHaveTextContent('That file is too large. The limit is 25 MB per file.');
    expect(row('huge.jpg')).toHaveAttribute('data-phase', 'failed');
    expect(within(row('huge.jpg')).queryByRole('button', { name: /Retry/ })).toBeNull();
    expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();
  });

  it('a page over 25 MB is left out of the page queue with a note', () => {
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    fireEvent.change(screen.getByTestId('page-files-input'), {
      target: { files: [file('p1.jpg'), file('big.jpg', 'image/jpeg', MAX_FILE_BYTES + 1)] },
    });
    expect(screen.getAllByTestId('queued-page')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('big.jpg is over the 25 MB limit, so it was left out.');
  });

  it('a file the server says is not a photo or PDF shows that, with no Retry', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue({
      error: 'Upload a photo or a PDF.', error_code: 'NOT_PHOTO_OR_PDF', status: 422,
    });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('menu', [file('menu.heic', 'image/heic')]);
    await waitFor(() => expect(row('menu.heic')).toHaveTextContent('That is not a photo or a PDF. Upload a photo or a PDF.'));
    expect(within(row('menu.heic')).queryByRole('button', { name: /Retry/ })).toBeNull();
  });

  it('a per-file refusal inside a 202 uses its own code', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue({
      data: { uploads: [{ filename: 'x.jpg', error: 'That file is too large.', error_code: 'FILE_TOO_LARGE' }] },
    });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('menu', [file('x.jpg')]);
    await waitFor(() => expect(row('x.jpg')).toHaveTextContent('That file is too large. The limit is 25 MB per file.'));
  });

  it('a dropped connection says so, and Retry sends it again', async () => {
    m.uploadRestaurantMenuFiles
      .mockResolvedValueOnce({ error: 'Network error' })
      .mockResolvedValue(accepted());
    m.getRestaurantMenuUpload.mockResolvedValue({ data: { ...base, menu_id: 'm1', kind: 'menu', status: 'read', pairing: { state: 'done', dishes: 2 } } });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('menu', [file('d.jpg')]);
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('The connection dropped. Check your signal and retry.'));
    fireEvent.click(within(row('d.jpg')).getByRole('button', { name: 'Retry d.jpg' }));
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Menu received. 2 dishes read. Pairing done.'));
    expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(2);
  });

  it('a slow upload says the connection looks slow while it is still going', async () => {
    let finish: (v: unknown) => void = () => {};
    m.uploadRestaurantMenuFiles.mockReturnValue(new Promise((r) => { finish = r; }));
    m.getRestaurantMenuUpload.mockResolvedValue({ data: { ...base, menu_id: 'm1', kind: 'menu', status: 'extracting', pairing: null } });
    render(<MenuUploadSection restaurantId="r1" pollMs={1000} slowUploadMs={5} />);
    pick('menu', [file('d.jpg')]);
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Still uploading. The connection looks slow.'));
    expect(row('d.jpg')).toHaveAttribute('data-phase', 'uploading');
    finish(accepted());
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Reading...'));
    expect(row('d.jpg')).not.toHaveTextContent('looks slow');
  });

  it('a read that failed with no reason gives the plain fallback', () => {
    expect(describeUpload({ ...base, kind: 'menu', status: 'failed', pairing: null }).message)
      .toBe("We couldn't read that file. Try a clearer, straight-on photo.");
  });

  it('a read that failed shows the server copy when there is one', () => {
    expect(describeUpload({ ...base, kind: 'menu', status: 'failed', error: 'This PDF is too large to read automatically.', error_code: 'PDF_TOO_LARGE', pairing: null }).message)
      .toBe('This PDF is too large to read automatically.');
  });
});

describe('long waits are never silent', () => {
  it('a read in the same state past the limit says it is still working and safe to leave', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted());
    m.getRestaurantMenuUpload.mockResolvedValue({ data: { ...base, menu_id: 'm1', kind: 'menu', status: 'extracting', pairing: null } });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} staleMs={0} />);
    pick('menu', [file('d.jpg')]);
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent(
      'Reading... Still working. This can take a while, and it is safe to leave this page.',
    ));
  });

  it('no still-working line before the limit', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted());
    m.getRestaurantMenuUpload.mockResolvedValue({ data: { ...base, menu_id: 'm1', kind: 'menu', status: 'read', pairing: { state: 'started', queue: 'running' } } });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    pick('menu', [file('d.jpg')]);
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Menu received. Pairing started.'));
    expect(row('d.jpg')).not.toHaveTextContent('Still working');
  });

  it('a poll that loses the connection says so and keeps checking', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted());
    m.getRestaurantMenuUpload
      .mockResolvedValueOnce({ error: 'Network error' })
      .mockResolvedValue({ data: { ...base, menu_id: 'm1', kind: 'menu', status: 'read', pairing: { state: 'done', dishes: 1 } } });
    render(<MenuUploadSection restaurantId="r1" pollMs={30} />);
    pick('menu', [file('d.jpg')]);
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('The connection dropped. Still checking.'));
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Menu received. 1 dishes read. Pairing done.'));
  });

  it('when polling stops, the spinner stops too, with Check again', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted());
    m.getRestaurantMenuUpload.mockResolvedValue({ data: { ...base, menu_id: 'm1', kind: 'menu', status: 'extracting', pairing: null } });
    render(<MenuUploadSection restaurantId="r1" pollMs={1} maxPolls={2} />);
    pick('menu', [file('d.jpg')]);
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Still working. Check back later. It is safe to leave this page.'));
    expect(row('d.jpg')).toHaveAttribute('data-phase', 'stalled');
    expect(row('d.jpg').querySelector('.animate-spin')).toBeNull();
    expect(m.getRestaurantMenuUpload).toHaveBeenCalledTimes(2);

    m.getRestaurantMenuUpload.mockResolvedValue({ data: { ...base, menu_id: 'm1', kind: 'menu', status: 'read', pairing: { state: 'done', dishes: 3 } } });
    fireEvent.click(within(row('d.jpg')).getByRole('button', { name: 'Check again d.jpg' }));
    await waitFor(() => expect(row('d.jpg')).toHaveTextContent('Menu received. 3 dishes read. Pairing done.'));
  });
});
