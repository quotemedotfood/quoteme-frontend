// @vitest-environment jsdom
//
// ChefWelcomePage.test.tsx: regression coverage for BUG #29 (magic-link
// session isolation).
//
// Two things this page (and the shared useEstablishSession helper it calls)
// must guarantee on a successful magic-link consume:
//
//   1. Every prior-identity localStorage key (QM-admin token, impersonation
//      display names/event id, guest token) is cleared BEFORE the chef's own
//      quoteme_token is written. Before the fix, these were left behind, and
//      ImpersonationBanner's mount-once effect would read them and hijack
//      the chef's screen with a stale admin/impersonation identity.
//   2. The consume/exchange call fires EXACTLY ONCE per token, even when the
//      effect is invoked twice (React 18 StrictMode double-invokes effects
//      in dev). Before the fix, a second consume call for an
//      already-spent single-use token came back "already_used" even though
//      the FIRST call had already succeeded - a wrongful lockout.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthProvider } from '../../contexts/AuthContext';
import { UserProvider } from '../../contexts/UserContext';
import type { ChefMagicLinkConsumeResponse } from '../../services/api';

// Broader than the success-only shape the hoisted mock factory below
// infers by default: #29-residue's new tests need to mockResolvedValueOnce
// an ERROR response (data undefined, error/error_code set instead), which
// consumeChefMagicLink's real return type (ApiResponse<T>, not exported)
// already allows.
type ConsumeChefMagicLinkResult = {
  data?: ChefMagicLinkConsumeResponse;
  error?: string;
  error_code?: string;
  token?: string;
};

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { mockJwt, consumeChefMagicLink, getCurrentUser } = vi.hoisted(() => {
  const mockJwt = 'mock.chef.jwt';
  const mockUser = {
    id: 'chef-1',
    email: 'chef@restaurant.com',
    first_name: 'Jamie',
    last_name: 'Oliver',
    role: 'chef',
    status: 'active',
    distributor: null,
  };

  return {
    mockJwt,
    consumeChefMagicLink: vi.fn<() => Promise<ConsumeChefMagicLinkResult>>(async () => ({
      data: {
        jwt: mockJwt,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name,
        },
        quote: {
          id: 'quote-1',
          label: 'Q-ABCDEF12',
          created_at: '2026-07-01T00:00:00Z',
          sent_at: '2026-07-01T00:00:00Z',
          status: 'sent',
          item_count: 12,
          category_count: 4,
          total_cents: 45000,
          rep: { name: 'Marcus Lee', first_name: 'Marcus', email: 'marcus@dist.com', phone: null },
          distributor: { name: 'Altamira Foods', short_name: 'Altamira' },
          restaurant: { name: 'The Grove', city: 'Austin', state: 'TX' },
        },
        redirect: '/chef/quotes/quote-1',
      },
      token: mockJwt,
    })),
    getCurrentUser: vi.fn(async () => ({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        role: 'chef',
        status: 'active',
        distributor: null,
      },
    })),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    consumeChefMagicLink,
    getCurrentUser,
  };
});

import { ChefWelcomePage } from './ChefWelcomePage';

function renderPage() {
  return render(
    // Mount in StrictMode so React double-invokes the consume effect in
    // this test the same way it does in dev - if the double-consume guard
    // ever regresses, this is what would catch it.
    <React.StrictMode>
      <MemoryRouter initialEntries={['/chef/welcome?token=magic-token-abc']}>
        <AuthProvider>
          <UserProvider>
            <Routes>
              <Route path="/chef/welcome" element={<ChefWelcomePage />} />
              <Route path="/chef/quotes/:id" element={<div>CHEF_QUOTE_VIEW</div>} />
            </Routes>
          </UserProvider>
        </AuthProvider>
      </MemoryRouter>
    </React.StrictMode>,
  );
}

describe('ChefWelcomePage: BUG #29 magic-link session isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    consumeChefMagicLink.mockClear();
    getCurrentUser.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('clears every prior-identity session key before writing the chef token', async () => {
    // Simulate a QM admin having impersonated a chef (or a stale guest
    // session) in this browser BEFORE the new chef opens their own magic
    // link. None of this belongs to the incoming chef session.
    localStorage.setItem('quoteme_admin_token', 'stale.admin.jwt');
    localStorage.setItem('quoteme_impersonating', 'Some Other User');
    localStorage.setItem('quoteme_chef_impersonating', 'A Different Chef');
    localStorage.setItem('quoteme_chef_impersonation_event_id', 'evt-stale-123');
    localStorage.setItem('quoteme_guest_token', 'stale.guest.token');

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Review quote/ })).toBeInTheDocument();
    });

    expect(localStorage.getItem('quoteme_token')).toBe(mockJwt);
    expect(localStorage.getItem('quoteme_admin_token')).toBeNull();
    expect(localStorage.getItem('quoteme_impersonating')).toBeNull();
    expect(localStorage.getItem('quoteme_chef_impersonating')).toBeNull();
    expect(localStorage.getItem('quoteme_chef_impersonation_event_id')).toBeNull();
    expect(localStorage.getItem('quoteme_guest_token')).toBeNull();
  });

  it('fires the consume call exactly once per token, even under a double effect invocation', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Review quote/ })).toBeInTheDocument();
    });

    // React.StrictMode double-invokes this component's effects in this
    // test environment; without the ref guard this would be 2.
    expect(consumeChefMagicLink).toHaveBeenCalledTimes(1);
    expect(consumeChefMagicLink).toHaveBeenCalledWith('magic-token-abc');
  });
});

// #29-residue: BUG #29's fix only cleared prior-identity keys on a
// SUCCESSFUL consume (inside useEstablishSession, which a failed consume
// never reaches). A failed open (an already-burned single-use token, any
// 4xx from the consume endpoint) left those stale keys in place, and the
// error screen would still render a PRIOR admin/impersonation identity's
// ImpersonationBanner right alongside "We couldn't open that link." This
// block covers the clear-on-attempt fix: prior-identity keys must be gone
// whether the open SUCCEEDS or ERRORS.
describe('ChefWelcomePage: #29-residue clear stale identity on error', () => {
  beforeEach(() => {
    localStorage.clear();
    consumeChefMagicLink.mockClear();
    getCurrentUser.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('clears every prior-identity key when the consume call errors', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'invalid_token',
      error_code: 'invalid_token',
      data: undefined,
    });

    localStorage.setItem('quoteme_admin_token', 'stale.admin.jwt');
    localStorage.setItem('quoteme_impersonating', 'Some Other User');
    localStorage.setItem('quoteme_chef_impersonating', 'A Different Chef');
    localStorage.setItem('quoteme_chef_impersonation_event_id', 'evt-stale-123');
    localStorage.setItem('quoteme_guest_token', 'stale.guest.token');

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/We couldn't open that link/)).toBeInTheDocument();
    });

    expect(localStorage.getItem('quoteme_admin_token')).toBeNull();
    expect(localStorage.getItem('quoteme_impersonating')).toBeNull();
    expect(localStorage.getItem('quoteme_chef_impersonating')).toBeNull();
    expect(localStorage.getItem('quoteme_chef_impersonation_event_id')).toBeNull();
    expect(localStorage.getItem('quoteme_guest_token')).toBeNull();
  });

  it('a stale impersonation key present before a failed open does not survive it', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'already_used',
      error_code: 'already_used',
      data: undefined,
    });

    localStorage.setItem('quoteme_chef_impersonating', 'A Different Chef');

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/This link has already been used/)).toBeInTheDocument();
    });

    expect(localStorage.getItem('quoteme_chef_impersonating')).toBeNull();
  });

  it('regression: a successful open still clears prior-identity keys and the single-consume guard still fires exactly once', async () => {
    localStorage.setItem('quoteme_chef_impersonating', 'A Different Chef');

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Review quote/ })).toBeInTheDocument();
    });

    expect(localStorage.getItem('quoteme_token')).toBe(mockJwt);
    expect(localStorage.getItem('quoteme_chef_impersonating')).toBeNull();
    expect(consumeChefMagicLink).toHaveBeenCalledTimes(1);
  });
});
