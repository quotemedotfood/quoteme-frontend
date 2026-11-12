// NEW MENU on the QM admin restaurant page (Moose, 2026-11-12: "Have a
// different colored button for NEW menu, this should follow the button we made
// on the manager tablet for new menu."). "Upload menu" adds to the menu on
// file; "New menu" asks first, then sends replace=1 (with pages=1 for several
// pages). The backend half is QuoteMe RestaurantMenuUploadsController.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  uploadRestaurantMenuFiles: vi.fn(),
  getRestaurantMenuUpload: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { MenuUploadSection, NEW_MENU_QUESTION } from './_menuUploadSection';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const file = (name: string, type = 'image/jpeg') => new File(['x'], name, { type });
const accepted = { data: { uploads: [{ filename: 'n.jpg', menu_id: 'm1', status: 'extracting' }] } };
const done = { data: { menu_id: 'm1', kind: 'menu', status: 'read', error: null, error_code: null, pairing: { state: 'done', dishes: 5 } } };

function openConfirm() {
  fireEvent.click(screen.getByTestId('new-menu-button'));
  return screen.getByRole('dialog', { name: NEW_MENU_QUESTION });
}

describe('New menu', () => {
  it('is a separate pear button, and Upload menu says it adds to the menu on file', () => {
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    const btn = screen.getByRole('button', { name: 'New menu' });
    expect(btn).toHaveStyle({ background: '#EFB96B', color: '#1F2A44' });
    expect(screen.getByRole('button', { name: 'Upload menu' })).toBeInTheDocument();
    expect(screen.getByTestId('upload-menu-adds')).toHaveTextContent('Adds to the menu on file');
    expect(screen.queryByRole('button', { name: /New wine list/ })).toBeNull();
  });

  it('asks first; Cancel, Escape and the scrim each close it and send nothing', () => {
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    expect(openConfirm()).toHaveTextContent('Replace the menu on file? Pairing will read only what you upload now.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    openConfirm();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    openConfirm();
    fireEvent.click(screen.getByTestId('new-menu-scrim'));
    expect(screen.queryByRole('dialog')).toBeNull();

    expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();
  });

  it('Continue opens the picker, and the file goes up with replace', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(done);
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    openConfirm();
    const input = screen.getByTestId('upload-input-new-menu') as HTMLInputElement;
    const clicked = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(clicked).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.change(input, { target: { files: [file('n.jpg')] } });
    await waitFor(() => expect(screen.getByTestId('upload-item')).toHaveTextContent('Menu received. 5 dishes read. Pairing done.'));
    expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledWith('r1', 'menu', [expect.any(File)], { replace: true });
  });

  it('several files picked for a new menu go up as one list: pages and replace', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(done);
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByTestId('upload-input-new-menu'), { target: { files: [file('a.jpg'), file('b.jpg')] } });
    await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(1));
    const call = m.uploadRestaurantMenuFiles.mock.calls[0];
    expect(call[2].map((f: File) => f.name)).toEqual(['a.jpg', 'b.jpg']);
    expect(call[3]).toEqual({ pages: true, replace: true });
  });

  it('queued pages sent as a new menu go with pages and replace, after the confirm', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(done);
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    for (const f of [file('p1.jpg'), file('p2.jpg')]) {
      fireEvent.change(screen.getByTestId('page-camera-input'), { target: { files: [f] } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Send 2 pages as a new menu' }));
    expect(screen.getByRole('dialog', { name: NEW_MENU_QUESTION })).toBeInTheDocument();
    expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(1));
    const call = m.uploadRestaurantMenuFiles.mock.calls[0];
    expect(call[2].map((f: File) => f.name)).toEqual(['p1.jpg', 'p2.jpg']);
    expect(call[3]).toEqual({ pages: true, replace: true });
    expect(screen.queryAllByTestId('queued-page')).toHaveLength(0);
  });

  it('Retry on a failed new menu sends replace again', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValueOnce({ error: 'Network error' }).mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(done);
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByTestId('upload-input-new-menu'), { target: { files: [file('n.jpg')] } });
    await waitFor(() => expect(screen.getByTestId('upload-item')).toHaveTextContent('The connection dropped.'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry New menu, n.jpg' }));
    await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(2));
    expect(m.uploadRestaurantMenuFiles.mock.calls[1][3]).toEqual({ replace: true });
  });

  it('a plain Upload menu sends no replace', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(done);
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    fireEvent.change(screen.getByTestId('upload-input-menu'), { target: { files: [file('d.jpg')] } });
    await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(1));
    expect(m.uploadRestaurantMenuFiles.mock.calls[0]).toHaveLength(3);
  });
});
