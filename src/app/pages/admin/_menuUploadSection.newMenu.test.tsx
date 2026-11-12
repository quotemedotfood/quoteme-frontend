// NEW MENU on the QM admin restaurant page (Moose, 2026-11-12: "Have a
// different colored button for NEW menu, this should follow the button we made
// on the manager tablet for new menu."). Food menu adds to the menu on
// file; New menu asks first, then sends replace=1 (with pages=1 for several
// pages). The backend half is QuoteMe RestaurantMenuUploadsController.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';

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

// Moose 11-12: retire the old buttons. New menu is now a choice in the
// "+ Menu" drawer: pick it, add the files, Send, and the confirm asks first.
function openConfirm(files: File[] = [file('n.jpg')]) {
  fireEvent.click(screen.getByTestId('add-menu-button'));
  fireEvent.click(screen.getByTestId('drawer-kind-new_menu'));
  fireEvent.click(screen.getByTestId('drawer-tab-files'));
  fireEvent.change(screen.getByTestId('drawer-files-input'), { target: { files } });
  fireEvent.click(screen.getByTestId('drawer-send'));
  return screen.getByRole('alertdialog', { name: NEW_MENU_QUESTION });
}

function closeDrawer() {
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
}

describe('New menu', () => {
  // Moose 11-12: retire the old buttons. Was: a separate pear New menu button
  // beside Upload menu. Now: the pear New menu choice in the drawer, beside
  // Food menu, which says it adds to the menu on file.
  it('is a pear choice in the drawer, and Food menu says it adds to the menu on file', () => {
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    expect(screen.queryByTestId('new-menu-button')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Upload menu' })).toBeNull();
    fireEvent.click(screen.getByTestId('add-menu-button'));
    const choice = screen.getByRole('radio', { name: 'New menu' });
    expect(choice).toHaveStyle({ background: '#EFB96B', color: '#1F2A44' });
    expect(screen.getByTestId('drawer-kind-note')).toHaveTextContent('Adds to the menu on file');
    fireEvent.click(choice);
    expect(screen.getByTestId('drawer-kind-note')).toHaveTextContent('Replaces the menu on file');
    expect(screen.queryByRole('radio', { name: /New wine list/ })).toBeNull();
  });

  // Moose 11-12: retire the old buttons. Was: Cancel, Escape and the scrim of
  // the New menu button's confirm. Now: Cancel in the drawer's confirm, and
  // Escape and the scrim close the drawer; none sends anything.
  it('asks first; Cancel, Escape and the scrim each close it and send nothing', async () => {
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    expect(openConfirm()).toHaveTextContent('Replace the menu on file? Pairing will read only what you upload now.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    closeDrawer();

    openConfirm();
    closeDrawer();
    expect(screen.queryByRole('alertdialog')).toBeNull();

    openConfirm();
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    fireEvent.pointerDown(document.querySelector('[data-slot="sheet-overlay"]') as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

    expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();
  });

  // Moose 11-12: retire the old buttons. Was: Continue opened the New menu
  // file picker. Now: the file is picked first in the drawer, and Continue sends it.
  it('Continue sends the file with replace', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(done);
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    openConfirm([file('n.jpg')]);
    expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    closeDrawer();
    await waitFor(() => expect(screen.getByTestId('upload-item')).toHaveTextContent('Menu received. 5 dishes read. Pairing done.'));
    expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledWith('r1', 'menu', [expect.any(File)], { replace: true });
  });

  // Moose 11-12: retire the old buttons. Same expectation, files picked in the drawer.
  it('several files picked for a new menu go up as one list: pages and replace', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(done);
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    openConfirm([file('a.jpg'), file('b.jpg')]);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
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

  // Moose 11-12: retire the old buttons. Same expectation, file picked in the drawer.
  it('Retry on a failed new menu sends replace again', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValueOnce({ error: 'Network error' }).mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(done);
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    openConfirm([file('n.jpg')]);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    closeDrawer();
    await waitFor(() => expect(screen.getByTestId('upload-item')).toHaveTextContent('The connection dropped.'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry New menu, n.jpg' }));
    await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(2));
    expect(m.uploadRestaurantMenuFiles.mock.calls[1][3]).toEqual({ replace: true });
  });

  // Moose 11-12: retire the old buttons. Was: a plain Upload menu. Now: Food menu in the drawer.
  it('a plain Food menu sends no replace', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(done);
    render(<MenuUploadSection restaurantId="r1" pollMs={1} />);
    fireEvent.click(screen.getByTestId('add-menu-button'));
    fireEvent.click(screen.getByTestId('drawer-kind-menu'));
    fireEvent.change(screen.getByTestId('drawer-files-input'), { target: { files: [file('d.jpg')] } });
    fireEvent.click(screen.getByTestId('drawer-send'));
    await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(1));
    expect(m.uploadRestaurantMenuFiles.mock.calls[0]).toHaveLength(3);
  });
});
