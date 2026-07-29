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
  message?: string;
  token?: string;
};

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { mockJwt, consumeChefMagicLink, getCurrentUser, getChefQuote } = vi.hoisted(() => {
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
    // Welcome-count fix: ChefWelcomePage fetches the real quote lines after a
    // successful consume so it can recompute matched-only item/category
    // counts (matchedLineCounts) instead of trusting the BE's raw
    // item_count/category_count. Default mock returns no lines (opt-in per
    // test); a rejection here must never break rendering, since the call is
    // fire-and-forget. Typed loosely (not the real ApiResponse<QuoteResponse>)
    // since these tests only ever read res.data.lines / res.error.
    getChefQuote: vi.fn<() => Promise<{ data?: { lines: unknown[] }; error?: string }>>(
      async () => ({ data: { lines: [] } }),
    ),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    consumeChefMagicLink,
    getCurrentUser,
    getChefQuote,
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
    getChefQuote.mockClear();
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
    getChefQuote.mockClear();
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
    // #286 removed the dedicated already_used copy, so an already-burned
    // token now falls through to the generic "We couldn't open that link."
    // The point of THIS test is unchanged: the stale impersonation key must
    // be cleared on a failed open regardless of which error copy renders.
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'already_used',
      error_code: 'already_used',
      data: undefined,
    });

    localStorage.setItem('quoteme_chef_impersonating', 'A Different Chef');

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("We couldn't open that link.")).toBeInTheDocument();
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

// Welcome-count mismatch fix (2026-07-29): the consume payload's raw
// item_count/category_count count ALL lines (including not_in_catalog), but
// the receipt the chef lands on next only ever shows matched lines. Before
// this fix the welcome envelope could promise "51 items across 14
// categories" while the receipt delivered 24 across 7 - because the two
// surfaces counted different things. ChefWelcomePage now recounts from the
// real quote lines (matchedLineCounts, shared with the receipt's own
// filter) once they load, and displays that instead.
describe('ChefWelcomePage: welcome count matches the matched-only receipt count', () => {
  beforeEach(() => {
    localStorage.clear();
    consumeChefMagicLink.mockClear();
    getCurrentUser.mockClear();
    getChefQuote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('replaces the BE raw item_count/category_count with the matched-only recount once quote lines load', async () => {
    // Mock consume response reports 12 items / 4 categories (raw, all lines).
    // The real quote has only 2 matched (available + has product) lines
    // across 1 category - the rest are not_in_catalog and would be hidden
    // on the receipt.
    getChefQuote.mockResolvedValueOnce({
      data: {
        lines: [
          {
            id: 'l1',
            availability_status: 'available',
            category: 'produce',
            product: { category: 'produce' },
          },
          {
            id: 'l2',
            availability_status: 'available',
            category: 'produce',
            product: { category: 'produce' },
          },
          {
            id: 'l3',
            availability_status: 'not_in_catalog',
            category: 'dairy',
            product: null,
          },
        ],
      },
    });

    renderPage();

    // Raw BE count (12 items across 4 categories) shows first...
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Review quote/ })).toBeInTheDocument();
    });

    // ...then corrects to the matched-only recount (2 items across 1 category)
    // once getChefQuote's lines resolve.
    await waitFor(() => {
      expect(screen.getByText('2 items across 1 category')).toBeInTheDocument();
    });
    expect(screen.queryByText('12 items across 4 categories')).not.toBeInTheDocument();
  });

  it('falls back to the raw BE counts if the recount fetch never resolves with data', async () => {
    getChefQuote.mockResolvedValueOnce({ error: 'boom' });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('12 items across 4 categories')).toBeInTheDocument();
    });
  });
});

describe('ChefWelcomePage: BUG #39 error-copy branches', () => {
  beforeEach(() => {
    localStorage.clear();
    consumeChefMagicLink.mockClear();
    getCurrentUser.mockClear();
    getChefQuote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('expired: still renders the dedicated expired-link screen, unaffected by the account_conflict/already_used rewrite', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'expired',
      error_code: 'expired',
      message: 'This link has expired. Ask your rep to resend.',
      data: undefined,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("This link's been around the block.")).toBeInTheDocument();
    });
    expect(
      screen.getByText('Quote links expire after 72 hours. Your rep can send a fresh one in a moment.'),
    ).toBeInTheDocument();
  });

  it('account_conflict: renders the BE message when present', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'account_conflict',
      error_code: 'account_conflict',
      message: 'This link can\'t sign you in right now. Please contact your rep for help.',
      data: undefined,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("This link can't sign you in right now. Please contact your rep for help.")).toBeInTheDocument();
    });
  });

  it('account_conflict: falls back to the exact BE fallback copy when no message is sent', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'account_conflict',
      error_code: 'account_conflict',
      data: undefined,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("This link can't sign you in right now. Please contact your rep for help.")).toBeInTheDocument();
    });
  });

  it('already_used: no longer renders the old already_used copy, falls back to the generic invalid-link message', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'already_used',
      error_code: 'already_used',
      data: undefined,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("We couldn't open that link.")).toBeInTheDocument();
    });
    expect(screen.queryByText('This link has already been used.')).not.toBeInTheDocument();
    expect(screen.queryByText('Contact your rep for a new one.')).not.toBeInTheDocument();
  });
});
