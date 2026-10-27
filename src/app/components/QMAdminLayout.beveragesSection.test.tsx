// The QM admin sidebar carries Beverages as its own section, with Wines and
// Review matches under it (Moose, 2026-10-27). Only a quoteme_admin gets the
// layout at all; anyone else is sent to /auth.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const auth = vi.hoisted(() => ({ user: { role: 'quoteme_admin' } as { role: string } | null }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user, isLoading: false, logout: vi.fn() }),
}));

import { QMAdminLayout } from './QMAdminLayout';

afterEach(() => { cleanup(); auth.user = { role: 'quoteme_admin' }; });

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/qm-admin" element={<QMAdminLayout />}>
          <Route path="beverages/wines" element={<div data-testid="wines-page" />} />
          <Route path="beverages/review-matches" element={<div data-testid="matches-page" />} />
        </Route>
        <Route path="/auth" element={<div data-testid="auth-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QMAdminLayout: Beverages section', () => {
  it('shows Wines and Review matches under a Beverages heading', () => {
    renderAt('/qm-admin/beverages/wines');
    const section = screen.getByTestId('qm-admin-nav-section-beverages');
    expect(section.textContent).toContain('Beverages');
    expect(within(section).getByRole('link', { name: /Wines/ }).getAttribute('href')).toBe('/qm-admin/beverages/wines');
    expect(within(section).getByRole('link', { name: /Review matches/ }).getAttribute('href')).toBe('/qm-admin/beverages/review-matches');
  });

  it('marks only the open page as active', () => {
    renderAt('/qm-admin/beverages/review-matches');
    const section = screen.getByTestId('qm-admin-nav-section-beverages');
    expect(within(section).getByRole('link', { name: /Review matches/ }).className).toContain('font-medium');
    expect(within(section).getByRole('link', { name: /Wines/ }).className).not.toContain('font-medium');
  });

  it('sends anyone but a QM admin to /auth', () => {
    auth.user = { role: 'restaurant_admin' };
    renderAt('/qm-admin/beverages/wines');
    expect(screen.getByTestId('auth-page')).toBeTruthy();
    expect(screen.queryByTestId('wines-page')).toBeNull();
  });
});
