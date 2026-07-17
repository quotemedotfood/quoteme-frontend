// @vitest-environment jsdom
//
// MatchDrawer.test.tsx — Operational Memory Epic, Lane 1.
//
// Covers the two pieces of real wiring added for rep-memory surfacing:
//   1. A candidate with `rep_memory: true` renders the RepMemoryBadge
//      bookmark (exact tooltip "Your choice. 1 previous quote."); a
//      candidate without it does not.
//   2. The "reason for this pick" picker's selected value is included in the
//      submitYourCallSelection call payload as `correction_type`, defaulting
//      to `rep_preference` when the rep never touches it.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach-based auto cleanup never registers --
// afterEach(cleanup) is required explicitly (see RepMemoryBadge.test.tsx).

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MatchDrawer } from './MatchDrawer';
import { submitYourCallSelection, type AlignmentCandidateResponse } from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    searchCatalogProducts: vi.fn().mockResolvedValue({ data: [] }),
    submitYourCallSelection: vi.fn().mockResolvedValue({ data: { quote_line_id: 'line-1', applied: [] } }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function makeCandidate(overrides: Partial<AlignmentCandidateResponse> & { id: string }): AlignmentCandidateResponse {
  return {
    position: 2,
    tier: 'alternate',
    score: 0.8,
    rep_memory: false,
    product: {
      id: overrides.id,
      item_number: '1000',
      brand: 'Acme',
      product: 'Chicken Breast',
      pack_size: '10 lb',
      category: 'protein',
    },
    ...overrides,
  };
}

describe('MatchDrawer — rep memory badge + reason picker', () => {
  it('renders the RepMemoryBadge only on the candidate with rep_memory: true', () => {
    const memoryCandidate = makeCandidate({ id: 'prod-memory', rep_memory: true, product: { id: 'prod-memory', item_number: '2001', brand: 'Acme', product: 'Diced Onion', pack_size: '5 lb', category: 'produce' } });
    const plainCandidate = makeCandidate({ id: 'prod-plain', rep_memory: false, product: { id: 'prod-plain', item_number: '2002', brand: 'Acme', product: 'Diced Onion Alt', pack_size: '5 lb', category: 'produce' } });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="onion"
        currentProduct={null}
        candidates={[memoryCandidate, plainCandidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    // Exactly one bookmark badge, and it carries the exact fixed tooltip text.
    const badges = screen.getAllByLabelText('Your choice. 1 previous quote.');
    expect(badges).toHaveLength(1);
    expect(badges[0].getAttribute('title')).toBe('Your choice. 1 previous quote.');

    // The badge sits in the memory candidate's row, not the plain one.
    const memoryRow = screen.getByText('Acme Diced Onion').closest('[role="button"]');
    const plainRow = screen.getByText('Acme Diced Onion Alt').closest('[role="button"]');
    expect(memoryRow?.contains(badges[0])).toBe(true);
    expect(plainRow?.contains(badges[0])).toBe(false);
  });

  it('does not render any bookmark badge when no candidate has rep_memory', () => {
    const plainCandidate = makeCandidate({ id: 'prod-plain', rep_memory: false });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="chicken"
        currentProduct={null}
        candidates={[plainCandidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    expect(screen.queryAllByLabelText('Your choice. 1 previous quote.')).toHaveLength(0);
  });

  it('submits correction_type: "rep_preference" by default when the rep never touches the reason picker', async () => {
    const candidate = makeCandidate({ id: 'prod-a' });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="chicken"
        currentProduct={null}
        candidates={[candidate]}
        quoteId="q-1"
        quoteLineId="line-1"
        dishComponentId="comp-1"
        canonicalKey="chicken-breast"
      />
    );

    // Pick the only alternate (becomes picks[0], the replacement).
    fireEvent.click(screen.getByText('Acme Chicken Breast'));

    const replaceButton = screen.getByRole('button', { name: /Replace Match/i });
    expect(replaceButton).toBeEnabled();
    fireEvent.click(replaceButton);

    await vi.waitFor(() => {
      expect(submitYourCallSelection).toHaveBeenCalledTimes(1);
    });

    const [, payload] = vi.mocked(submitYourCallSelection).mock.calls[0];
    expect(payload.correction_type).toBe('rep_preference');
    expect(payload.selections).toEqual([{ product_id: 'prod-a', rank: 0 }]);
  });

  it('submits the reason the rep selects in the picker as correction_type', async () => {
    const candidate = makeCandidate({ id: 'prod-b' });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="chicken"
        currentProduct={null}
        candidates={[candidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    fireEvent.click(screen.getByText('Acme Chicken Breast'));

    const select = screen.getByLabelText('Reason for this pick') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'wrong_product' } });

    fireEvent.click(screen.getByRole('button', { name: /Replace Match/i }));

    await vi.waitFor(() => {
      expect(submitYourCallSelection).toHaveBeenCalledTimes(1);
    });

    const [, payload] = vi.mocked(submitYourCallSelection).mock.calls[0];
    expect(payload.correction_type).toBe('wrong_product');
  });

  it('does not show the reason picker until a replacement pick exists', () => {
    const candidate = makeCandidate({ id: 'prod-c' });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="chicken"
        currentProduct={null}
        candidates={[candidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    expect(screen.queryByLabelText('Reason for this pick')).toBeNull();
    fireEvent.click(screen.getByText('Acme Chicken Breast'));
    expect(screen.getByLabelText('Reason for this pick')).toBeInTheDocument();
  });
});
