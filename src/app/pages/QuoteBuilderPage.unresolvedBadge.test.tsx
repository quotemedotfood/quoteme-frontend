// QuoteBuilderPage.unresolvedBadge.test.tsx
//
// Wave 4(c): the unresolved-items badge on QuoteBuilderPage must use the
// exact same predicate as ExportFinalizePage's send gate
// (unacknowledgedUnmatchedLines: availability_status === 'not_in_catalog'
// && !rep_handled) so the count means the same thing on both screens.
// Drives the real component through @testing-library/react rather than a
// reimplemented copy of its logic, following the pattern in
// ExportFinalizePage.render.test.tsx.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { getQuote, setQuoteLines, navigateMock } = vi.hoisted(() => {
  let lines: any[] = [];
  return {
    setQuoteLines: (l: any[]) => {
      lines = l;
    },
    getQuote: vi.fn(async () => ({
      data: {
        id: 'quote-1',
        lines,
        distributor: { currency: 'USD' },
      },
    })),
    navigateMock: vi.fn(),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getQuote,
  };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { QuoteBuilderPage } from './QuoteBuilderPage';

function makeLine(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    component: { name: `component-${id}`, source_dish: 'Test Dish' },
    category: 'Produce',
    unit_price_cents: 100,
    availability_status: 'available',
    rep_handled: false,
    product: {
      id: `product-${id}`,
      item_number: 'SKU-1',
      brand: 'Brand',
      product: 'Product',
      pack_size: '1x1',
    },
    alignment_candidates: [],
    ...overrides,
  };
}

function renderPage() {
  localStorage.setItem('quoteme_token', 'test-token');
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/quote-builder', state: { quoteId: 'quote-1' } }]}>
      <UserProvider>
        <Routes>
          <Route path="/quote-builder" element={<QuoteBuilderPage />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  );
}

describe('QuoteBuilderPage - unresolved items badge (Wave 4c)', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    navigateMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the count of not_in_catalog lines with rep_handled=false, excluding rep_handled=true lines', async () => {
    setQuoteLines([
      makeLine('line-1', { availability_status: 'not_in_catalog', rep_handled: false }),
      makeLine('line-2', { availability_status: 'not_in_catalog', rep_handled: false }),
      // Acknowledged already; must NOT be counted.
      makeLine('line-3', { availability_status: 'not_in_catalog', rep_handled: true }),
      // Matched line; must NOT be counted.
      makeLine('line-4', { availability_status: 'available' }),
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Total Components:/)).toBeInTheDocument();
    });

    expect(await screen.findByText('2 items need your input')).toBeInTheDocument();
  });

  it('shows singular copy for exactly one unresolved item', async () => {
    setQuoteLines([
      makeLine('line-1', { availability_status: 'not_in_catalog', rep_handled: false }),
      makeLine('line-2', { availability_status: 'available' }),
    ]);

    renderPage();

    expect(await screen.findByText('1 item needs your input')).toBeInTheDocument();
  });

  it('renders no pill when the unresolved count is zero', async () => {
    setQuoteLines([
      makeLine('line-1', { availability_status: 'available' }),
      // Unmatched but already acknowledged by the rep.
      makeLine('line-2', { availability_status: 'not_in_catalog', rep_handled: true }),
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Total Components:/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/needs? your input/)).not.toBeInTheDocument();
  });

  it('navigates to the Export/Finalize step when the pill is clicked', async () => {
    setQuoteLines([
      makeLine('line-1', { availability_status: 'not_in_catalog', rep_handled: false }),
    ]);

    renderPage();

    const pill = await screen.findByText('1 item needs your input');
    fireEvent.click(pill);

    expect(navigateMock).toHaveBeenCalledWith('/export-finalize?quoteId=quote-1');
  });

  // Dispatch #7 (QB smalls) -- dueling counts. The load-time dedup used to key
  // on the matched product id, so two DIFFERENT lines (different dishes/
  // components) that happen to resolve to the SAME catalog product were
  // wrongly collapsed into one, undercounting "Total Components". Dedup must
  // key on the line id (always unique per backend row) instead, so two
  // distinct lines sharing one product both count.
  it('counts two distinct lines that share the same matched product as two components, not one', async () => {
    setQuoteLines([
      makeLine('line-1', {
        availability_status: 'available',
        product: { id: 'shared-product', item_number: 'SKU-1', brand: 'Brand', product: 'Yellow Onion', pack_size: '25lb' },
      }),
      makeLine('line-2', {
        availability_status: 'available',
        product: { id: 'shared-product', item_number: 'SKU-1', brand: 'Brand', product: 'Yellow Onion', pack_size: '25lb' },
      }),
    ]);

    renderPage();

    expect(await screen.findByText('Total Components: 2')).toBeInTheDocument();
  });
});
