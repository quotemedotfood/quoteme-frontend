// THE "+ MENU" DRAWER (Moose, 2026-11-12): one way in for every kind of menu.
// What kind (Food menu, Wine list, Cocktail list, New menu) times how it comes
// in (Text, URL, Picture / PDF). Blank text and a bad link never leave the
// page. New menu still asks first. A cocktail list ends at "stored".
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within, act } from '@testing-library/react';

const m = vi.hoisted(() => ({
  uploadRestaurantMenuFiles: vi.fn(),
  submitRestaurantMenuSource: vi.fn(),
  getRestaurantMenuUpload: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { MenuUploadSection, MenuDrawerHost, NEW_MENU_QUESTION, DRAWER_COPY, describeUpload, isWebLink } from './_menuUploadSection';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const file = (name: string, type = 'image/jpeg') => new File(['x'], name, { type });
const accepted = { data: { uploads: [{ menu_id: 'm1', status: 'extracting' }] } };
const read = (kind: string, pairing: Record<string, unknown>) => ({
  data: { menu_id: 'm1', kind, status: 'read', error: null, error_code: null, pairing },
});

function openDrawer() {
  render(<MenuUploadSection restaurantId="r1" restaurantName="Madeline Lounge" pollMs={1} />);
  fireEvent.click(screen.getByTestId('add-menu-button'));
  return screen.getByTestId('menu-drawer');
}

function pick(drawer: HTMLElement, kind: string, tab: string) {
  fireEvent.click(within(drawer).getByTestId(`drawer-kind-${kind}`));
  fireEvent.click(within(drawer).getByTestId(`drawer-tab-${tab}`));
}

function fill(drawer: HTMLElement, tab: string) {
  if (tab === 'text') fireEvent.change(within(drawer).getByTestId('drawer-text'), { target: { value: 'Trout 24\nBurger 19' } });
  if (tab === 'url') fireEvent.change(within(drawer).getByTestId('drawer-url'), { target: { value: 'https://example.com/menu.pdf' } });
  if (tab === 'files') fireEvent.change(within(drawer).getByTestId('drawer-files-input'), { target: { files: [file('p1.jpg'), file('p2.jpg')] } });
}

describe('+ Menu drawer: open and close', () => {
  it('opens from the right with the restaurant name, and Close shuts it', () => {
    const drawer = openDrawer();
    expect(within(drawer).getByRole('heading', { name: DRAWER_COPY.title })).toBeInTheDocument();
    expect(within(drawer).getByTestId('drawer-restaurant-name')).toHaveTextContent('Adding to Madeline Lounge');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('menu-drawer')).toBeNull();
  });

  it('Escape shuts it', () => {
    openDrawer();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByTestId('menu-drawer')).toBeNull();
  });

  it('the scrim shuts it', async () => {
    openDrawer();
    // The outside-press listener is armed on the next tick after opening.
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const scrim = document.querySelector('[data-slot="sheet-overlay"]') as HTMLElement;
    expect(scrim).not.toBeNull();
    fireEvent.pointerDown(scrim);
    await waitFor(() => expect(screen.queryByTestId('menu-drawer')).toBeNull());
  });
});

describe('+ Menu drawer: each kind times each way in sends the right body', () => {
  const kinds = [
    { kind: 'menu', apiKind: 'menu', replace: false },
    { kind: 'wine_list', apiKind: 'wine_list', replace: false },
    { kind: 'cocktail_list', apiKind: 'cocktail_list', replace: false },
    { kind: 'new_menu', apiKind: 'menu', replace: true },
  ];
  const tabs = ['text', 'url', 'files'];

  for (const k of kinds) {
    for (const tab of tabs) {
      it(`${k.kind} by ${tab}`, async () => {
        m.uploadRestaurantMenuFiles.mockResolvedValue(accepted);
        m.submitRestaurantMenuSource.mockResolvedValue(accepted);
        m.getRestaurantMenuUpload.mockResolvedValue(read(k.apiKind, { state: 'done', dishes: 3, wines: 3 }));
        const drawer = openDrawer();
        pick(drawer, k.kind, tab);
        fill(drawer, tab);
        fireEvent.click(within(drawer).getByTestId('drawer-send'));
        if (k.replace) {
          // New menu asks first; nothing goes until Continue.
          const confirm = within(drawer).getByRole('alertdialog', { name: NEW_MENU_QUESTION });
          expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();
          expect(m.submitRestaurantMenuSource).not.toHaveBeenCalled();
          fireEvent.click(within(confirm).getByRole('button', { name: 'Continue' }));
        }
        const opts = k.replace ? [{ replace: true }] : [];
        if (tab === 'text') {
          await waitFor(() => expect(m.submitRestaurantMenuSource).toHaveBeenCalledWith('r1', k.apiKind, { text: 'Trout 24\nBurger 19' }, ...opts));
        } else if (tab === 'url') {
          await waitFor(() => expect(m.submitRestaurantMenuSource).toHaveBeenCalledWith('r1', k.apiKind, { url: 'https://example.com/menu.pdf' }, ...opts));
        } else {
          await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledTimes(1));
          const [rid, kind, files, sentOpts] = m.uploadRestaurantMenuFiles.mock.calls[0];
          expect([rid, kind, files.map((f: File) => f.name)]).toEqual(['r1', k.apiKind, ['p1.jpg', 'p2.jpg']]);
          expect(sentOpts).toEqual(k.replace ? { pages: true, replace: true } : { pages: true });
        }
        if (tab !== 'files') expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();
        else expect(m.submitRestaurantMenuSource).not.toHaveBeenCalled();
        // The row lands in the page's own list, and in the drawer.
        await waitFor(() => expect(screen.getAllByTestId('upload-item')[0]).toHaveAttribute('data-phase', 'done'));
        expect(within(drawer).getAllByTestId('drawer-upload-item')).toHaveLength(1);
        expect(within(drawer).getByTestId('drawer-sent')).toHaveTextContent(DRAWER_COPY.sent);
      });
    }
  }

  it('several in a row each get their own row', async () => {
    m.submitRestaurantMenuSource.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(read('menu', { state: 'started', queue: 'queued' }));
    const drawer = openDrawer();
    pick(drawer, 'menu', 'text');
    fill(drawer, 'text');
    fireEvent.click(within(drawer).getByTestId('drawer-send'));
    pick(drawer, 'wine_list', 'url');
    fill(drawer, 'url');
    fireEvent.click(within(drawer).getByTestId('drawer-send'));
    await waitFor(() => expect(m.submitRestaurantMenuSource).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByTestId('upload-item')).toHaveLength(2));
    expect(screen.getAllByTestId('upload-item').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Wine list, https://example.com/menu.pdf'),
      expect.stringContaining('Menu, pasted text'),
    ]);
  });
});

describe('+ Menu drawer: refused here, never sent', () => {
  it('blank text', () => {
    const drawer = openDrawer();
    pick(drawer, 'menu', 'text');
    fireEvent.change(within(drawer).getByTestId('drawer-text'), { target: { value: '   \n ' } });
    fireEvent.click(within(drawer).getByTestId('drawer-send'));
    expect(within(drawer).getByTestId('drawer-error')).toHaveTextContent(DRAWER_COPY.blankText);
    expect(m.submitRestaurantMenuSource).not.toHaveBeenCalled();
  });

  it.each(['example.com/menu', 'ftp://example.com/menu.pdf', 'javascript:alert(1)', ''])('a bad link: %s', (bad) => {
    const drawer = openDrawer();
    pick(drawer, 'wine_list', 'url');
    fireEvent.change(within(drawer).getByTestId('drawer-url'), { target: { value: bad } });
    fireEvent.click(within(drawer).getByTestId('drawer-send'));
    expect(within(drawer).getByTestId('drawer-error')).toHaveTextContent(DRAWER_COPY.badUrl);
    expect(m.submitRestaurantMenuSource).not.toHaveBeenCalled();
  });

  it('no pages yet', () => {
    const drawer = openDrawer();
    pick(drawer, 'menu', 'files');
    fireEvent.click(within(drawer).getByTestId('drawer-send'));
    expect(within(drawer).getByTestId('drawer-error')).toHaveTextContent(DRAWER_COPY.noPages);
    expect(m.uploadRestaurantMenuFiles).not.toHaveBeenCalled();
  });

  it('a New menu blank text is refused before the confirm', () => {
    const drawer = openDrawer();
    pick(drawer, 'new_menu', 'text');
    fireEvent.click(within(drawer).getByTestId('drawer-send'));
    expect(within(drawer).getByTestId('drawer-error')).toHaveTextContent(DRAWER_COPY.blankText);
    expect(within(drawer).queryByRole('alertdialog')).toBeNull();
  });

  it('isWebLink takes http and https only', () => {
    expect(isWebLink('https://a.com/x.pdf')).toBe(true);
    expect(isWebLink(' http://a.com ')).toBe(true);
    expect(isWebLink('a.com')).toBe(false);
    expect(isWebLink('mailto:x@a.com')).toBe(false);
  });
});

describe('+ Menu drawer: New menu', () => {
  it('is pear, and Cancel in the confirm sends nothing', () => {
    const drawer = openDrawer();
    const choice = within(drawer).getByTestId('drawer-kind-new_menu');
    expect(choice).toHaveStyle({ background: '#EFB96B', color: '#1F2A44' });
    pick(drawer, 'new_menu', 'url');
    expect(within(drawer).getByTestId('drawer-kind-note')).toHaveTextContent('Replaces the menu on file');
    fill(drawer, 'url');
    fireEvent.click(within(drawer).getByTestId('drawer-send'));
    const confirm = within(drawer).getByRole('alertdialog', { name: NEW_MENU_QUESTION });
    expect(confirm).toHaveTextContent('Replace the menu on file? Pairing will read only what you upload now.');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(within(drawer).queryByRole('alertdialog')).toBeNull();
    expect(m.submitRestaurantMenuSource).not.toHaveBeenCalled();
  });
});

describe('Cocktail list', () => {
  it('"stored" is the end: Cocktail list received., no spinner', async () => {
    expect(describeUpload(read('cocktail_list', { state: 'stored' }).data as never)).toEqual({
      phase: 'done', message: 'Cocktail list received.', terminal: true,
    });
    m.submitRestaurantMenuSource.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(read('cocktail_list', { state: 'stored' }));
    const drawer = openDrawer();
    pick(drawer, 'cocktail_list', 'text');
    fill(drawer, 'text');
    fireEvent.click(within(drawer).getByTestId('drawer-send'));
    await waitFor(() => expect(screen.getAllByTestId('upload-item')[0]).toHaveAttribute('data-phase', 'done'));
    const row = screen.getAllByTestId('upload-item')[0];
    expect(row).toHaveTextContent('Cocktail list, pasted text');
    expect(row).toHaveTextContent('Cocktail list received.');
    expect(row.querySelector('.animate-spin')).toBeNull();
    expect(m.getRestaurantMenuUpload).toHaveBeenCalledTimes(1);
  });
});

describe('MenuDrawerHost (a hotel outlet)', () => {
  it('sends for the outlet restaurant id and shows rows in the drawer', async () => {
    m.uploadRestaurantMenuFiles.mockResolvedValue(accepted);
    m.getRestaurantMenuUpload.mockResolvedValue(read('wine_list', { state: 'done', wines: 40 }));
    render(<MenuDrawerHost restaurantId="out1" restaurantName="Madeline Bar" open onOpenChange={() => {}} pollMs={1} />);
    const drawer = screen.getByTestId('menu-drawer');
    pick(drawer, 'wine_list', 'files');
    fill(drawer, 'files');
    fireEvent.click(within(drawer).getByTestId('drawer-send'));
    await waitFor(() => expect(m.uploadRestaurantMenuFiles).toHaveBeenCalledWith('out1', 'wine_list', expect.any(Array), { pages: true }));
    await waitFor(() => expect(within(drawer).getByTestId('drawer-upload-item')).toHaveTextContent('40 wines read. Pairing done.'));
    expect(m.getRestaurantMenuUpload).toHaveBeenCalledWith('out1', 'm1');
  });
});
