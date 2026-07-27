// ChefMenusPage.render.test.tsx
//
// BUG #28 (naked delete): handleDelete had no in-flight guard of any kind.
// window.confirm() blocks the JS thread while the dialog is open, but once
// confirmed there was nothing to stop a second, fully-separate confirm+
// delete cycle on the SAME still-visible menu row (the row only disappears
// from the list AFTER a successful delete resolves, so re-opening the kebab
// and deleting again while the first request is still in flight is a real,
// reachable path, not just a millisecond click race). deleteChefMenu() is
// now routed through useAsyncMutation, whose synchronous inFlightRef blocks
// the second attempt before any second network call fires.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const { getChefMenus, getChefOrderGuides, deleteChefMenu, baseMenu } = vi.hoisted(() => {
  const baseMenu: any = {
    id: 'menu-1',
    name: 'Spring Dinner',
    item_count: 5,
    last_quoted_at: null,
    quote_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    source_type: null,
  };
  return {
    baseMenu,
    getChefMenus: vi.fn(async () => ({ data: { menus: [baseMenu] } })),
    getChefOrderGuides: vi.fn(async () => ({ data: [] })),
    deleteChefMenu: vi.fn(async (): Promise<{ data?: { success: boolean }; error?: string }> => ({ data: { success: true } })),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    getChefMenus,
    getChefOrderGuides,
    deleteChefMenu,
  };
});

import { ChefMenusPage } from './ChefMenusPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ChefMenusPage />
    </MemoryRouter>,
  );
}

describe('ChefMenusPage - delete guard (BUG #28)', () => {
  beforeEach(() => {
    getChefMenus.mockClear();
    getChefOrderGuides.mockClear();
    deleteChefMenu.mockClear();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('a second delete attempt on the same row while the first is still in flight fires deleteChefMenu exactly once', async () => {
    const gate = deferred<{ data?: { success: boolean }; error?: string }>();
    deleteChefMenu.mockImplementation(() => gate.promise);

    renderPage();

    await screen.findByText('Spring Dinner');

    const openKebabAndDelete = async () => {
      const kebabButton = screen.getByLabelText('Menu options');
      fireEvent.click(kebabButton);
      const deleteItem = await screen.findByText('Delete');
      fireEvent.click(deleteItem);
    };

    // First attempt: confirm() returns true, kicks off the (still-pending) delete.
    await openKebabAndDelete();
    expect(deleteChefMenu).toHaveBeenCalledTimes(1);

    // The row is still in the list (delete hasn't resolved yet), so a chef
    // could plausibly reopen the kebab and delete it again before the first
    // request completes. That second attempt must NOT fire a second call.
    await openKebabAndDelete();
    expect(deleteChefMenu).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve({ data: { success: true } });
    });

    await waitFor(() => {
      expect(screen.queryByText('Spring Dinner')).not.toBeInTheDocument();
    });

    expect(deleteChefMenu).toHaveBeenCalledTimes(1);
  });
});
