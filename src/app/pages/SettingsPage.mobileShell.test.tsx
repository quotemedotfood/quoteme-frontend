// SettingsPage.mobileShell.test.tsx
//
// Justin, item 1 (2026-07-29 board): a distributor_admin on a phone could not
// edit their own details. SettingsPage wrapped its content in the ManagerSidebar
// shell, a fixed 280px sidebar with no responsive handling, which crushed the
// form column to ~26px and pinned the inputs off the right edge of a 387px
// frame. Below 768px the shell must drop and settings render full width.
//
// Same matchMedia gate RepLayout uses for its aside; these tests prove the
// shell is present above the breakpoint and absent below it.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getCurrentUser,
    getBilling: vi.fn().mockResolvedValue({ data: null }),
    getDistributorAdminSettings: vi.fn().mockResolvedValue({ data: null }),
    getDistributorAdminBilling: vi.fn().mockResolvedValue({ data: null }),
  };
});

import { SettingsPage } from './SettingsPage';

const adminUser = {
  id: 'u-1',
  email: 'cj@fishguys.com',
  role: 'distributor_admin',
  first_name: 'CJ',
  last_name: 'Rivera',
  distributor: { name: 'Fish Guys' },
} as any;

function mockMatchMedia(matches: boolean) {
  const mql = {
    matches,
    media: '(min-width: 768px)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  window.matchMedia = vi.fn().mockReturnValue(mql);
}

function renderSettingsAt(isDesktop: boolean) {
  mockMatchMedia(isDesktop);
  return render(
    <MemoryRouter>
      <AuthProvider>
        <UserProvider>
          <SettingsPage />
        </UserProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('SettingsPage distributor_admin mobile shell', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('quoteme_token', 'test-token');
    getCurrentUser.mockResolvedValue({ data: adminUser });
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('below 768px: the ManagerSidebar shell is dropped so settings is full width', async () => {
    renderSettingsAt(false);
    // Settings itself renders (the distributor_admin "Back to Board" link proves
    // we are on the page and it is the distributor_admin variant).
    await waitFor(() => expect(screen.getByText('Back to Board')).toBeTruthy());
    // The ManagerSidebar shell ("WORKING AS" block) must NOT be present.
    expect(screen.queryByText('WORKING AS')).toBeNull();
  });

  it('at/above 768px: the ManagerSidebar shell renders as before', async () => {
    renderSettingsAt(true);
    await waitFor(() => expect(screen.getByText('WORKING AS')).toBeTruthy());
    expect(screen.getByText('Back to Board')).toBeTruthy();
  });
});
