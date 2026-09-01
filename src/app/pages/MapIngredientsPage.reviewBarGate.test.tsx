// @vitest-environment jsdom
//
// MapIngredientsPage.reviewBarGate.test.tsx
//
// Justin's third binding criterion: the feedback surface must not appear
// before there is an actual match state to review.
//
// The old gate was `quoteId && !readOnly`. A quoteId exists from the moment
// the quote is created, and nothing in that gate consulted match state, so the
// card could ask "How do these matches look?" over a list that was still
// processing, had failed, or was empty.
//
// `!loading` would not have fixed it either: loading is set false on the
// success path, the error path AND the 30-attempt timeout path alike, so
// gating on it would still ask the question over a menu that never processed.
// Hence an explicit matchingComplete, set true only where matching genuinely
// finished, plus a non-empty match count.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach auto cleanup never registers.
// afterEach(cleanup) is declared explicitly: without it renders accumulate and
// a later query can pass against an earlier case's DOM.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const PROMPT = 'How do these matches look?';

function lineWith(product: Record<string, unknown> | null, component: string) {
  return {
    id: `line-${component}`,
    position: 1,
    category: 'Seafood',
    quantity: 1,
    unit_price_cents: 100,
    unit_price: '1.00',
    alignment_selected: 0,
    availability_status: product ? 'available' : 'not_in_catalog',
    chef_note: null,
    product,
    component: { name: component, source_dish: 'Crudo' },
    alignment_candidates: [],
  };
}

const { getMenuStatus, getQuote } = vi.hoisted(() => ({
  getMenuStatus: vi.fn(),
  getQuote: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getMenuStatus, getQuote };
});

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({ quotesRemaining: 10 }),
}));
vi.mock('../contexts/AuthContext', () => ({
  useOptionalAuth: () => ({ user: { id: 'u1', role: 'rep' } }),
}));

import { MapIngredientsPage } from './MapIngredientsPage';

function renderAtQuote(quoteId: string) {
  // The page derives isGuest from the absence of this token, and a guest goes
  // through getGuestQuote instead. A signed-in rep is the case under test.
  localStorage.setItem('quoteme_token', 'test-token');
  return render(
    <MemoryRouter initialEntries={[`/map-ingredients?quoteId=${quoteId}`]}>
      <MapIngredientsPage />
    </MemoryRouter>,
  );
}

describe('MapIngredientsPage -- the review bar waits for a real match state', () => {
  afterEach(() => {
    cleanup();
    getMenuStatus.mockReset();
    getQuote.mockReset();
    localStorage.clear();
  });

  it('shows the prompt once matching finished and produced at least one match', async () => {
    getQuote.mockResolvedValue({
      data: { id: 'q1', lines: [lineWith({ id: 'p1', name: 'Hamachi' }, 'hamachi')] },
    });

    renderAtQuote('q1');

    // Revisiting an existing quote skips the poll entirely, and matching
    // finished on the earlier visit, so the card belongs here.
    await waitFor(() => expect(screen.getByText(PROMPT)).toBeInTheDocument());
  });

  it('stays away when matching finished but matched nothing at all', async () => {
    getQuote.mockResolvedValue({
      data: { id: 'q2', lines: [lineWith(null, 'hamachi'), lineWith(null, 'ponzu')] },
    });

    renderAtQuote('q2');

    // Every line is "No Match". There is no match state to review, so asking
    // how the matches look is asking about nothing.
    await waitFor(() => expect(getQuote).toHaveBeenCalled());
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
  });

  it('stays away when the quote has no lines', async () => {
    getQuote.mockResolvedValue({ data: { id: 'q3', lines: [] } });

    renderAtQuote('q3');

    await waitFor(() => expect(getQuote).toHaveBeenCalled());
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
  });

  it('stays away when loading the quote failed, even though loading is finished', async () => {
    getQuote.mockResolvedValue({ error: 'Failed to load quote' });

    renderAtQuote('q4');

    // This is the case `!loading` would have got wrong: the request settled,
    // so loading is false, but matching never produced anything to review.
    await waitFor(() => expect(getQuote).toHaveBeenCalled());
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
  });
});
