// A restaurant admin never sees the rep pages (customers, quotes).
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({ auth: { user: { role: 'restaurant_admin' } as any, isAuthenticated: true, isLoading: false } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => m.auth }));
vi.mock('./AppSidebar', () => ({ AppSidebar: () => <nav>REP SIDEBAR</nav> }));
vi.mock('./ChefTopbar', () => ({ ChefTopbar: () => null }));
vi.mock('./AuthSyncProvider', () => ({ AuthSyncProvider: ({ children }: any) => <>{children}</> }));
vi.mock('./DemoBanner', () => ({ DemoBanner: () => null }));

import { RootLayout } from './RootLayout';

afterEach(() => { cleanup(); m.auth.user = { role: 'restaurant_admin' }; });

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route path="customers" element={<p>CUSTOMERS PAGE</p>} />
          <Route path="quotes" element={<p>QUOTES PAGE</p>} />
        </Route>
        <Route path="/restaurant-admin" element={<p>RESTAURANT ADMIN HOME</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RootLayout and restaurant admins', () => {
  it.each(['/customers', '/quotes'])('sends a restaurant admin from %s to their home', (path) => {
    renderAt(path);
    expect(screen.getByText('RESTAURANT ADMIN HOME')).toBeTruthy();
    expect(screen.queryByText('REP SIDEBAR')).toBeNull();
    expect(screen.queryByText(/CUSTOMERS PAGE|QUOTES PAGE/)).toBeNull();
  });

  it('still shows a rep their customers', () => {
    m.auth.user = { role: 'rep' };
    renderAt('/customers');
    expect(screen.getByText('CUSTOMERS PAGE')).toBeTruthy();
  });
});
