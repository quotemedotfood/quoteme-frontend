// @vitest-environment jsdom
//
// MatchDrawer.test.tsx — Operational Memory Epic, Lane 1 (revised).
//
// Covers the pieces of real wiring added for rep-memory surfacing:
//   1. A candidate with `rep_memory: true` renders a CONNECTED ChainToggle;
//      one without it renders a BROKEN ChainToggle -- both are present and
//      clickable now (Ruling 3 revision: bidirectional, not a conditional
//      read-only bookmark), and clicking calls toggleRepMemoryLock.
//   2. The "reason for this pick" picker's selected value is included in the
//      submitYourCallSelection call payload as `correction_type`, defaulting
//      to `rep_preference` when the rep never touches it.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach-based auto cleanup never registers --
// afterEach(cleanup) is required explicitly (see ChainToggle.test.tsx).

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MatchDrawer } from './MatchDrawer';
import { submitYourCallSelection, toggleRepMemoryLock, type AlignmentCandidateResponse } from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    searchCatalogProducts: vi.fn().mockResolvedValue({ data: [] }),
    submitYourCallSelection: vi.fn().mockResolvedValue({ data: { quote_line_id: 'line-1', applied: [] } }),
    toggleRepMemoryLock: vi.fn().mockResolvedValue({ data: { locked: true } }),
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
    distributor_memory: false,
    distributor_name: null,
    distributor_signal_type: null,
    distributor_mandate_reason: null,
    distributor_mandate_set_by: null,
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

describe('MatchDrawer — chain toggle + reason picker', () => {
  it('renders a CONNECTED chain on the candidate with rep_memory: true, BROKEN on the one without', () => {
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

    const memoryRow = screen.getByText('Acme Diced Onion').closest('[role="button"]') as HTMLElement;
    const plainRow = screen.getByText('Acme Diced Onion Alt').closest('[role="button"]') as HTMLElement;

    const memoryToggle = memoryRow.querySelector('[aria-pressed]') as HTMLElement;
    const plainToggle = plainRow.querySelector('[aria-pressed]') as HTMLElement;

    expect(memoryToggle.getAttribute('aria-pressed')).toBe('true');
    expect(plainToggle.getAttribute('aria-pressed')).toBe('false');
    // Both carry the exact brief hover text -- it labels the control, not a status.
    expect(memoryToggle.getAttribute('title')).toBe('Remembered for this account');
    expect(plainToggle.getAttribute('title')).toBe('Remembered for this account');
  });

  it('clicking a broken chain calls toggleRepMemoryLock with locked: true, without toggling the pick checkbox', async () => {
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
        canonicalKey="chicken-breast"
      />
    );

    const row = screen.getByText('Acme Chicken Breast').closest('[role="button"]') as HTMLElement;
    const toggle = row.querySelector('[aria-pressed]') as HTMLElement;

    fireEvent.click(toggle);

    await vi.waitFor(() => {
      expect(toggleRepMemoryLock).toHaveBeenCalledTimes(1);
    });
    expect(toggleRepMemoryLock).toHaveBeenCalledWith('q-1', {
      quote_line_id: 'line-1',
      product_id: 'prod-plain',
      canonical_key: 'chicken-breast',
      locked: true,
    });

    // Clicking the chain must NOT also select this candidate as a pick --
    // the Replace Match button stays disabled (no picks made).
    expect(screen.getByRole('button', { name: /Replace Match/i })).toBeDisabled();
  });

  // Operational Memory Epic, Lane 2 revision (Ruling 2): distributor
  // PREFERENCE renders a plain "Distributor focus" LABEL, never a chain lock.
  it('renders the "Distributor focus" label on a candidate with distributor_memory: true, signal_type preference, and no rep_memory', () => {
    const distributorCandidate = makeCandidate({
      id: 'prod-house',
      rep_memory: false,
      distributor_memory: true,
      distributor_name: 'Altamira',
      distributor_signal_type: 'preference',
      product: { id: 'prod-house', item_number: '3001', brand: 'Acme', product: 'Roma Tomato', pack_size: '25 lb', category: 'produce' },
    });
    const plainCandidate = makeCandidate({ id: 'prod-plain2', product: { id: 'prod-plain2', item_number: '3002', brand: 'Acme', product: 'Roma Tomato Alt', pack_size: '25 lb', category: 'produce' } });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="tomato"
        currentProduct={null}
        candidates={[distributorCandidate, plainCandidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    const labels = screen.getAllByText('Distributor focus');
    expect(labels).toHaveLength(1);

    const houseRow = screen.getByText('Acme Roma Tomato').closest('[role="button"]');
    const plainRow = screen.getByText('Acme Roma Tomato Alt').closest('[role="button"]');
    expect(houseRow?.contains(labels[0])).toBe(true);
    expect(plainRow?.contains(labels[0])).toBe(false);

    // A plain preference label carries no icon/svg -- text pill only.
    expect(labels[0].querySelector('svg')).toBeNull();
  });

  // Ruling 2: a MANDATE renders "Distributor mandate" and MUST carry its
  // attribution (who set it, why) on hover.
  it('renders "Distributor mandate" with attribution on hover for signal_type mandate', () => {
    const mandateCandidate = makeCandidate({
      id: 'prod-mandate',
      rep_memory: false,
      distributor_memory: true,
      distributor_name: 'Altamira',
      distributor_signal_type: 'mandate',
      distributor_mandate_reason: 'supplier transition',
      distributor_mandate_set_by: 'Jordan Rep',
      product: { id: 'prod-mandate', item_number: '4001', brand: 'Acme', product: 'Beefsteak Tomato', pack_size: '25 lb', category: 'produce' },
    });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="tomato"
        currentProduct={null}
        candidates={[mandateCandidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    const label = screen.getByText('Distributor mandate');
    expect(label).toBeInTheDocument();
    expect(label.getAttribute('title')).toBe('Distributor mandate. Set by Jordan Rep: supplier transition.');
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

  // Ruling 2: a mandate MUST be attributable -- the FE requires a reason
  // whenever "Distributor mandate" is selected, before it will submit.
  it('shows a reason input when "Distributor mandate" is selected, and blocks submit with no reason', async () => {
    const candidate = makeCandidate({ id: 'prod-mandate-submit' });

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
    fireEvent.change(select, { target: { value: 'distributor_mandate' } });

    const reasonInput = screen.getByPlaceholderText(/why is this a mandate/i);
    expect(reasonInput).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Replace Match/i }));

    expect(submitYourCallSelection).not.toHaveBeenCalled();
    expect(screen.getByText('A reason is required for a distributor mandate.')).toBeInTheDocument();
  });

  it('submits correction_type distributor_mandate with the typed mandate_reason', async () => {
    const candidate = makeCandidate({ id: 'prod-mandate-submit-2' });

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
    fireEvent.change(select, { target: { value: 'distributor_mandate' } });

    const reasonInput = screen.getByPlaceholderText(/why is this a mandate/i);
    fireEvent.change(reasonInput, { target: { value: 'supplier transition' } });

    fireEvent.click(screen.getByRole('button', { name: /Replace Match/i }));

    await vi.waitFor(() => {
      expect(submitYourCallSelection).toHaveBeenCalledTimes(1);
    });

    const [, payload] = vi.mocked(submitYourCallSelection).mock.calls[0];
    expect(payload.correction_type).toBe('distributor_mandate');
    expect(payload.mandate_reason).toBe('supplier transition');
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
