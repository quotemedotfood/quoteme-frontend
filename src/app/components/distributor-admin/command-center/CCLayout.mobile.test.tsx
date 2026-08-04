// CCLayout.mobile.test.tsx
//
// Justin audit item 2 (2026-08-04): the isDesktop gate lived on RepLayout only.
// CCLayout renders ManagerSidebar (280px) unconditionally, so a distributor_admin
// on a phone loses 43% of a 658px window to a sidebar with no bottom nav. Every
// distributor_admin is also a rep in the field (on Fish Guys the same person, the
// account owner), so the layout CJ actually lands on was left ungated.
//
// Justin's nav ruling: below 768px the aside does not render / holds no width,
// content goes full width, a bottom bar carries the primary destinations, and on
// quote detail the bottom bar is SUPPRESSED so Send owns the bottom.
//
// Acceptance as a sentence about a person: "CJ, opening the command center or a
// quote on his phone, gets a full-width screen with nav at his thumb, and on a
// quote he is sending nothing competes with Send."
//
// The ManagerSidebar shares Today/Inbound/Quotes labels with the bottom bar, so
// the sidebar is detected via its unique "WORKING AS" block and the bottom bar
// by counting "Today" (sidebar present -> exactly one, from the sidebar; sidebar
// gone + bottom bar -> exactly one, from the bar; both gone -> zero).
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthProvider } from '../../../contexts/AuthContext';

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock('../../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/api')>();
  return {
    ...actual,
    getCurrentUser,
    getCommandCenterUnassigned: vi.fn().mockResolvedValue({ data: { items: [] } }),
    getCommandCenterInbound: vi.fn().mockResolvedValue({ data: [] }),
    getDistributorHome: vi.fn().mockResolvedValue({ data: { rep_count: 0, slug: null } }),
  };
});

import { CCLayout } from './CCLayout';

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

function renderCCAt(pathname: string, isDesktop: boolean) {
  mockMatchMedia(isDesktop);
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AuthProvider>
        <Routes>
          <Route element={<CCLayout />}>
            <Route path="/distributor-admin/command-center" element={<div>CC_BODY</div>} />
            <Route path="/quote-builder" element={<div>QB_BODY</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('CCLayout mobile gate (audit item 2)', () => {
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

  it('below 768px on the command center: sidebar dropped, bottom bar present', async () => {
    renderCCAt('/distributor-admin/command-center', false);
    await waitFor(() => expect(screen.getByText('CC_BODY')).toBeTruthy());
    // ManagerSidebar (its unique "WORKING AS" block) is gone.
    expect(screen.queryByText('WORKING AS')).toBeNull();
    // Bottom bar present: with the sidebar gone, "Today" can only be the bar.
    expect(screen.getAllByText('Today').length).toBe(1);
    expect(screen.getByText('Inbound')).toBeTruthy();
    expect(screen.getByText('Quotes')).toBeTruthy();
  });

  it('below 768px on quote-builder: bottom bar suppressed (Send wins)', async () => {
    renderCCAt('/quote-builder', false);
    await waitFor(() => expect(screen.getByText('QB_BODY')).toBeTruthy());
    expect(screen.queryByText('WORKING AS')).toBeNull();
    // No sidebar and no bottom bar -> no "Today" anywhere.
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('at/above 768px on the command center: sidebar renders, no bottom bar', async () => {
    renderCCAt('/distributor-admin/command-center', true);
    await waitFor(() => expect(screen.getByText('CC_BODY')).toBeTruthy());
    // Sidebar present.
    expect(screen.getByText('WORKING AS')).toBeTruthy();
    // Exactly one "Today" (the sidebar's) proves the bottom bar did not mount.
    expect(screen.getAllByText('Today').length).toBe(1);
  });
});
