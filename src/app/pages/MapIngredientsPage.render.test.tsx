// @vitest-environment jsdom
//
// MapIngredientsPage.render.test.tsx — FE-TESTING epic slice 3 (3b).
//
// Real render smoke test for the ingredient-mapping step of the quoting
// flow. Mounts the REAL component inside a real MemoryRouter carrying the
// `quoteId` the component reads off `location.state` (matching how
// StartNewQuotePage navigates here), mocking only the `../services/api`
// network calls it fires.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MapIngredientsPage } from './MapIngredientsPage';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  createMenu: vi.fn().mockResolvedValue({ data: null }),
  getMenuStatus: vi.fn().mockResolvedValue({ data: null }),
  createQuote: vi.fn().mockResolvedValue({ data: null }),
  getQuote: vi.fn().mockResolvedValue({ data: null }),
  getGuestQuote: vi.fn().mockResolvedValue({ data: null }),
  getMoreMatches: vi.fn().mockResolvedValue({ data: [] }),
  updateQuote: vi.fn().mockResolvedValue({ data: null }),
  updateGuestQuote: vi.fn().mockResolvedValue({ data: null }),
}));

const SYNTHETIC_QUOTE = {
  id: 'quote-1',
  status: 'draft',
  working_label: 'Test Quote',
  lines: [
    {
      id: 'line-1',
      position: 1,
      component: { id: 'comp-1', name: 'Grilled Salmon Fillet', source_dish: 'Test Dish' },
      product: {
        id: 'prod-1',
        item_number: 'IN-1',
        brand: 'Acme',
        product: 'Atlantic Salmon Fillet',
        pack_size: '10 lb case',
        category: 'Seafood',
      },
      quantity: 1,
      unit_price: '12.00',
      unit_price_cents: 1200,
      category: 'Seafood',
      alignment_selected: 1,
      chef_note: null,
      alignment_candidates: [
        {
          id: 'cand-1',
          position: 1,
          tier: 'standard',
          score: 0.95,
          product: {
            id: 'prod-1',
            item_number: 'IN-1',
            brand: 'Acme',
            product: 'Atlantic Salmon Fillet',
            pack_size: '10 lb case',
            category: 'Seafood',
          },
        },
      ],
    },
    {
      id: 'line-2',
      position: 2,
      component: { id: 'comp-2', name: 'Saffron Threads', source_dish: 'Test Dish' },
      product: null,
      quantity: 1,
      unit_price: null,
      unit_price_cents: null,
      category: 'Spices',
      alignment_selected: 0,
      chef_note: null,
      alignment_candidates: [],
    },
  ],
};

function renderPage(quoteId = 'quote-1') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/map-ingredients', state: { quoteId } }]}>
      <MapIngredientsPage />
    </MemoryRouter>,
  );
}

describe('MapIngredientsPage — real render smoke test (quoting flow)', () => {
  beforeEach(() => {
    localStorage.clear(); // no quoteme_token => guest path => getGuestQuote
    vi.clearAllMocks();
    vi.mocked(api.getGuestQuote).mockResolvedValue({ data: SYNTHETIC_QUOTE } as any);
  });

  it('renders real ingredient rows, a real match badge, and opens the real MapComponentDrawer on Add Match', async () => {
    renderPage();

    // Wait for the quote to load, then switch to the "Dishes" tab where
    // renderComponentRow renders directly for the selected dish's
    // components (the default "Categories" tab starts collapsed).
    const dishesTab = await screen.findByRole('button', { name: 'Dishes' });
    fireEvent.click(dishesTab);

    // 1) Real ingredient/component names from the mocked lines appear.
    expect(await screen.findByText('Grilled Salmon Fillet')).toBeInTheDocument();
    expect(screen.getByText('Saffron Threads')).toBeInTheDocument();

    // 2) A real match badge renders for the matched line (score 0.95 -> 95
    // confidence -> "Strong Match" per getMatchStatus/renderComponentRow).
    expect(screen.getByText('Strong Match')).toBeInTheDocument();
    // The unmatched line (no product) gets "Needs Your Pick".
    expect(screen.getByText('Needs Your Pick')).toBeInTheDocument();

    // 3) Clicking the matched row's real "Add Match" button opens the real
    // MapComponentDrawer (asserted via its real, stable DrawerTitle text).
    const addMatchButtons = screen.getAllByRole('button', { name: 'Add Match' });
    fireEvent.click(addMatchButtons[0]);

    expect(await screen.findByText(/Select Match for/i)).toBeInTheDocument();
  });
});
