// ChefMenusPage.uploads.test.tsx
//
// PairMe 1c: a restaurant uploads its own menu or wine list from drawers on
// the right, and the Menus history is one list with a tag on each row.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { getChefMenus, getChefOrderGuides, uploadChefMenuDocument } = vi.hoisted(() => {
  const row = (id: string, name: string, kind: 'menu' | 'wine_list') => ({
    id, name, kind, item_count: 0, last_quoted_at: null, quote_count: 0,
    created_at: '2026-09-29T12:00:00Z', updated_at: '2026-09-29T12:00:00Z', source_type: 'chef_upload', file_name: null,
  });
  return {
    getChefMenus: vi.fn(async () => ({ data: { menus: [row('m-1', 'Dinner', 'menu'), row('m-2', 'Fall wines', 'wine_list')] } })),
    getChefOrderGuides: vi.fn(async () => ({ data: [] })),
    uploadChefMenuDocument: vi.fn(async (args: any) => ({ data: row('m-3', args.name || 'Untitled Menu', args.kind) })),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return { ...actual, getChefMenus, getChefOrderGuides, uploadChefMenuDocument };
});

import { ChefMenusPage } from './ChefMenusPage';

const renderPage = () => render(<MemoryRouter><ChefMenusPage /></MemoryRouter>);

beforeEach(() => { uploadChefMenuDocument.mockClear(); });
afterEach(() => cleanup());

describe('ChefMenusPage uploads (1c)', () => {
  it('tags every row of the one history as a menu or a wine list', async () => {
    renderPage();
    await screen.findByText('Fall wines');
    expect(screen.getAllByTestId('menu-kind-tag').map((t) => t.textContent)).toEqual(['Menu', 'Wine list']);
  });

  it('uploads a wine list file from the drawer and adds it to the history, tagged', async () => {
    renderPage();
    await screen.findByText('Dinner');
    fireEvent.click(screen.getByRole('button', { name: 'Upload wine list' }));
    const drawer = await screen.findByTestId('upload-menu-drawer');
    fireEvent.change(within(drawer).getByLabelText('Name'), { target: { value: 'Winter wines' } });
    const file = new File(['%PDF-1.4'], 'wines.pdf', { type: 'application/pdf' });
    fireEvent.change(within(drawer).getByLabelText('File'), { target: { files: [file] } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Upload wine list' }));
    await waitFor(() => expect(uploadChefMenuDocument).toHaveBeenCalledWith(
      { kind: 'wine_list', name: 'Winter wines', file, rawText: undefined },
    ));
    await screen.findByText('Winter wines');
    expect(screen.getAllByTestId('menu-kind-tag').map((t) => t.textContent)).toEqual(['Wine list', 'Menu', 'Wine list']);
  });

  it('asks for a file or text, and refuses a file over 20 MB, without calling the server', async () => {
    renderPage();
    await screen.findByText('Dinner');
    fireEvent.click(screen.getByRole('button', { name: 'Upload menu' }));
    const drawer = await screen.findByTestId('upload-menu-drawer');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Upload menu' }));
    expect(await within(drawer).findByRole('alert')).toHaveTextContent('Add a file or paste the text.');
    const big = new File(['x'], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 });
    fireEvent.change(within(drawer).getByLabelText('File'), { target: { files: [big] } });
    expect(within(drawer).getByRole('alert')).toHaveTextContent('over 20 MB');
    expect(uploadChefMenuDocument).not.toHaveBeenCalled();
  });
});
