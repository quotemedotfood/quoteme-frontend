// @vitest-environment jsdom
//
// StartNewQuotePage.render.test.tsx — FE-TESTING epic slice 3 (3a).
//
// Real render smoke tests for the first page of the quoting flow. Mounts the
// REAL component inside a real MemoryRouter + real AuthProvider (per house
// style — see QuoteReviewBar.render.test.tsx), mocking only `../services/api`
// network calls the component fires unconditionally on mount.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { StartNewQuotePage } from './StartNewQuotePage';
import { AuthProvider } from '../contexts/AuthContext';
import * as api from '../services/api';
import type { User } from '../services/api';

// Cover every function StartNewQuotePage (and AuthProvider, which it mounts
// underneath via useAuth()) calls, so mount-time effects settle without
// throwing. Everything resolves to a benign empty/success shape.
vi.mock('../services/api', () => ({
  createMenu: vi.fn().mockResolvedValue({ data: null }),
  createGuestQuote: vi.fn().mockResolvedValue({ data: null }),
  extractMenuText: vi.fn().mockResolvedValue({ data: null }),
  extractMenuTextAsync: vi.fn().mockResolvedValue({ data: null }),
  getCatalogs: vi.fn().mockResolvedValue({ data: [] }),
  uploadCatalogFile: vi.fn().mockResolvedValue({ data: null }),
  getRestaurants: vi.fn().mockResolvedValue({ data: [] }),
  getRestaurant: vi.fn().mockResolvedValue({ data: null }),
  createRestaurant: vi.fn().mockResolvedValue({ data: null }),
  createContact: vi.fn().mockResolvedValue({ data: null }),
  getStockQuotes: vi.fn().mockResolvedValue({ data: [] }),
  generateFromStockQuote: vi.fn().mockResolvedValue({ data: null }),
  getDemoDistributor: vi.fn().mockResolvedValue({ data: { distributor_id: 'demo-1' } }),
  getClassificationStatus: vi.fn().mockResolvedValue({ data: null }),
  getQuotes: vi.fn().mockResolvedValue({ data: [] }),
  getMenuStatus: vi.fn().mockResolvedValue({ data: null }),
  updateCurrentUser: vi.fn().mockResolvedValue({ data: null }),
  // Pulled in transitively by AuthContext (useAuth(), mounted for real).
  getCurrentUser: vi.fn().mockResolvedValue({ data: null }),
  signIn: vi.fn().mockResolvedValue({}),
  signUp: vi.fn().mockResolvedValue({}),
  convertGuestToUser: vi.fn().mockResolvedValue({}),
  getGuestToken: vi.fn().mockReturnValue(null),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <StartNewQuotePage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('StartNewQuotePage — real render smoke tests (quoting flow)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(api.getCatalogs).mockResolvedValue({ data: [] } as any);
    vi.mocked(api.getRestaurants).mockResolvedValue({ data: [] } as any);
    vi.mocked(api.getStockQuotes).mockResolvedValue({ data: [] } as any);
    vi.mocked(api.getQuotes).mockResolvedValue({ data: [] } as any);
    vi.mocked(api.getCurrentUser).mockResolvedValue({ data: null } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('paste textarea updates the live character counter immediately, then the debounced parser renders parsed dishes in the DOM', () => {
    vi.useFakeTimers();
    renderPage();

    const textarea = screen.getByPlaceholderText(
      /Paste a menu, cocktail list, or food concept/i,
    );

    const sampleMenu = 'Grilled Salmon\nSalmon, lemon, capers';

    // Real client-side parsing is debounced 1500ms — no network involved.
    fireEvent.change(textarea, { target: { value: sampleMenu } });

    // First real assertion: the character counter updates immediately (no
    // wait needed — this is plain state, not the debounced parse).
    expect(screen.getByText(`${sampleMenu.length} / 5,000 characters`)).toBeInTheDocument();

    // Nothing parsed yet — still pre-debounce.
    expect(screen.queryByText('Grilled Salmon')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Second real assertion: the parsed dish name from our sample text
    // actually renders in the "Extracted Ingredients" panel.
    expect(screen.getByText('Grilled Salmon')).toBeInTheDocument();
    expect(screen.getByText('Salmon')).toBeInTheDocument();
  });

  it('renders the guest-specific catalog copy when no token/user is present', async () => {
    renderPage();

    // isGuestVisitor(user, token) resolves true (no token, no user) — the
    // real isGuest-gated JSX (Catalog section, "0 catalogs" branch) shows the
    // guest-only copy.
    expect(
      await screen.findByText('Upload your own catalog below, or continue with the sample.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Prices won't reflect your rep's pricing."),
    ).not.toBeInTheDocument();
  });

  it('renders the authed-rep catalog copy once the token validates to a real user', async () => {
    const repUser: User = {
      id: '1',
      email: 'rep@test.com',
      first_name: 'Test',
      last_name: 'Rep',
      role: 'rep',
      status: 'active',
      distributor: { id: 'dist-1', name: 'Test Distributor' },
    };
    localStorage.setItem('quoteme_token', 'fake-token');
    vi.mocked(api.getCurrentUser).mockResolvedValue({ data: repUser } as any);

    renderPage();

    // Token validation (AuthProvider -> getCurrentUser) is async — wait for
    // the authed-only copy (isGuest resolves false once `user` is populated).
    expect(
      await screen.findByText("Prices won't reflect your rep's pricing."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Upload your own catalog below, or continue with the sample.'),
    ).not.toBeInTheDocument();
  });
});
