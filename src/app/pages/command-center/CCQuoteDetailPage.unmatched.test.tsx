// CCQuoteDetailPage.unmatched.test.tsx
//
// Constitution VIII (rep/admin sees the miss) + ruling 2 (rep/admin surfaces
// get ingredient name + "Not in catalog", never a blank row) + XXII (no
// misleading content). The manager-facing Command Center quote detail was
// rendering unmatched (not-in-catalog) lines as a blank name with
// "1 x $0.00" -- a misleading price for a line that was never priced.
//
// BE contract addition: each CCLineItem now carries `component_name` (the
// dish_component/ingredient name, may be null) and `unmatched` (boolean).
// This test drives the real component through @testing-library/react,
// following the pattern in QuoteBuilderPage.unresolvedBadge.test.tsx.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const { getCommandCenterQuote } = vi.hoisted(() => ({
  getCommandCenterQuote: vi.fn(),
}));

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    getCommandCenterQuote,
  };
});

import { CCQuoteDetailPage } from './CCQuoteDetailPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/distributor-admin/command-center/quotes/quote-1']}>
      <Routes>
        <Route
          path="/distributor-admin/command-center/quotes/:quoteId"
          element={<CCQuoteDetailPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CCQuoteDetailPage: unmatched line rendering', () => {
  it('renders the ingredient name + "Not in catalog" and suppresses the price for an unmatched line', async () => {
    getCommandCenterQuote.mockResolvedValue({
      data: {
        id: 'quote-1',
        rep: { id: 'rep-1', name: 'Jamie Rivera', initials: 'JR' },
        restaurant: 'Fish Guys',
        city: 'Brooklyn, NY',
        status: 'sent',
        sent: 'Jul 20',
        items: 1,
        total: null,
        requote: 0,
        wait: 1,
        requote_trail: [],
        has_unanswered_chef_question: false,
        line_groups: [
          {
            cat: 'produce',
            items: [
              {
                id: 'line-1',
                name: '',
                pack: '',
                qty: 1,
                unit: 0,
                component_name: 'Heirloom Tomatoes',
                unmatched: true,
              },
            ],
          },
        ],
      },
    });

    renderPage();

    expect(await screen.findByText('Heirloom Tomatoes')).toBeInTheDocument();
    expect(screen.getByText('Not in catalog')).toBeInTheDocument();
    // The unmatched line must not render a "qty x price" string at all --
    // no "1 x $0.00" for a line that was never priced (Constitution XXII).
    expect(screen.queryByText(/1 ×/)).not.toBeInTheDocument();
  });

  it('still renders product name + price for a matched line', async () => {
    getCommandCenterQuote.mockResolvedValue({
      data: {
        id: 'quote-2',
        rep: { id: 'rep-1', name: 'Jamie Rivera', initials: 'JR' },
        restaurant: 'Fish Guys',
        city: 'Brooklyn, NY',
        status: 'sent',
        sent: 'Jul 20',
        items: 1,
        total: 42,
        requote: 0,
        wait: 1,
        requote_trail: [],
        has_unanswered_chef_question: false,
        line_groups: [
          {
            cat: 'produce',
            items: [
              {
                id: 'line-2',
                name: 'Roma Tomatoes 25lb',
                pack: '25lb case',
                qty: 2,
                unit: 21,
                unmatched: false,
              },
            ],
          },
        ],
      },
    });

    renderPage();

    expect(await screen.findByText('Roma Tomatoes 25lb')).toBeInTheDocument();
    expect(screen.getByText('25lb case')).toBeInTheDocument();
    expect(screen.getByText(/2 ×/)).toBeInTheDocument();
    expect(screen.queryByText('Not in catalog')).not.toBeInTheDocument();
  });
});
