// RepLayout.test.tsx
//
// Item 1d: the sidebar "WORKING AS" block previously showed only the rep's
// name and their distributor's name — never the role. After the CJ identity
// split, the rep user and the distributor_admin user are distinct logins, so
// each session must show ITS OWN role, derived live from the authenticated
// user, never hardcoded or borrowed from another role.
//
// These tests drive RepLayout through the real AuthProvider (mocking only
// the network boundary, getCurrentUser from services/api) so the role label
// is proven to come from the live session, not a prop threaded in by the test.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../../contexts/AuthContext';

const { getCurrentUser } = vi.hoisted(() => {
  return {
    getCurrentUser: vi.fn(),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    getCurrentUser,
  };
});

import { RepLayout } from './RepLayout';

function renderLayout() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RepLayout>
          <div>PAGE_BODY</div>
        </RepLayout>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RepLayout - "Working as" role indicator (item 1d)', () => {
  beforeEach(() => {
    localStorage.clear();
    getCurrentUser.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders "Rep" for a rep-role session', async () => {
    localStorage.setItem('quoteme_token', 'fake.jwt');
    getCurrentUser.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'rep@sysco.com',
        first_name: 'Jamie',
        last_name: 'Rivera',
        role: 'rep',
        status: 'active',
        distributor: { id: 'dist-1', name: 'Sysco Boston' },
      },
    });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('Jamie Rivera')).toBeTruthy();
    });
    expect(screen.getByText(/^Rep · Sysco Boston$/)).toBeTruthy();
  });

  it('renders "Distributor Admin" for a distributor_admin-role session (not borrowed from a rep)', async () => {
    localStorage.setItem('quoteme_token', 'fake.jwt');
    getCurrentUser.mockResolvedValue({
      data: {
        id: 'user-2',
        email: 'admin@sysco.com',
        first_name: 'Morgan',
        last_name: 'Lee',
        role: 'distributor_admin',
        status: 'active',
        distributor: { id: 'dist-1', name: 'Sysco Boston' },
      },
    });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('Morgan Lee')).toBeTruthy();
    });
    expect(screen.getByText(/^Distributor Admin · Sysco Boston$/)).toBeTruthy();
  });

  it('falls back gracefully to "Rep" when role is missing from the session', async () => {
    localStorage.setItem('quoteme_token', 'fake.jwt');
    getCurrentUser.mockResolvedValue({
      data: {
        id: 'user-3',
        email: 'nobody@sysco.com',
        first_name: 'Sam',
        last_name: 'Doe',
        role: '',
        status: 'active',
        distributor: { id: 'dist-1', name: 'Sysco Boston' },
      },
    });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('Sam Doe')).toBeTruthy();
    });
    expect(screen.getByText(/^Rep · Sysco Boston$/)).toBeTruthy();
  });

  it('renders no signed-in user without crashing (pre-load / logged-out state)', async () => {
    getCurrentUser.mockResolvedValue({ data: undefined });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('PAGE_BODY')).toBeTruthy();
    });
    // Default identity block still renders sensibly (no role, no throw). Both
    // the name fallback and the role label default to "Rep" here, so two
    // nodes are expected.
    expect(screen.getAllByText('Rep').length).toBeGreaterThanOrEqual(1);
  });
});
