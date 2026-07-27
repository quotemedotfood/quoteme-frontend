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

  // Operational Memory Epic, Lane 2.
  it('renders the DistributorMemoryBadge (house pick) on a candidate with distributor_memory: true and no rep_memory', () => {
    const distributorCandidate = makeCandidate({
      id: 'prod-house',
      rep_memory: false,
      distributor_memory: true,
      distributor_name: 'Altamira',
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

    const badges = screen.getAllByLabelText('House pick, set by your team at Altamira.');
    expect(badges).toHaveLength(1);

    const houseRow = screen.getByText('Acme Roma Tomato').closest('[role="button"]');
    const plainRow = screen.getByText('Acme Roma Tomato Alt').closest('[role="button"]');
    expect(houseRow?.contains(badges[0])).toBe(true);
    expect(plainRow?.contains(badges[0])).toBe(false);

    // rep_memory badge never renders alongside distributor_memory.
    expect(screen.queryAllByLabelText('Your choice. 1 previous quote.')).toHaveLength(0);
  });

  // Operational Memory Epic, Lane 2 revision (Ruling 2).
  it('renders the distinct Distributor Mandate label with set-by + reason attribution, wired end to end from the candidate', () => {
    const mandateCandidate = makeCandidate({
      id: 'prod-mandate',
      rep_memory: false,
      distributor_memory: true,
      distributor_name: 'Altamira',
      distributor_signal_type: 'mandate',
      distributor_mandate_reason: 'Contract requirement',
      distributor_mandate_set_by: 'Jamie Rivera',
      product: { id: 'prod-mandate', item_number: '4001', brand: 'Acme', product: 'Basil', pack_size: '5 lb', category: 'produce' },
    });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="basil"
        currentProduct={null}
        candidates={[mandateCandidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    expect(screen.getByText('Distributor Mandate')).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'Distributor mandate at Altamira, set by Jamie Rivera. Reason: Contract requirement.'
      )
    ).toBeInTheDocument();
  });

  // Preference candidates (the default, and legacy rows with no
  // distributor_signal_type at all) render "Distributor Focus" -- no
  // mandate attribution shown.
  it('renders "Distributor Focus" (not Mandate) for a preference candidate, with no mandate attribution', () => {
    const preferenceCandidate = makeCandidate({
      id: 'prod-pref',
      rep_memory: false,
      distributor_memory: true,
      distributor_name: 'Altamira',
      distributor_signal_type: 'preference',
      product: { id: 'prod-pref', item_number: '4002', brand: 'Acme', product: 'Oregano', pack_size: '5 lb', category: 'produce' },
    });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="oregano"
        currentProduct={null}
        candidates={[preferenceCandidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    expect(screen.getByText('Distributor Focus')).toBeInTheDocument();
    expect(screen.queryByText('Distributor Mandate')).not.toBeInTheDocument();
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

describe('MatchDrawer -- Needs Your Call display cap (Constitution VIII / Justin ruling 5)', () => {
  // Two or three defensible options, never five. The current-match card
  // occupies one slot, so alternates are capped at 2 -- total on-screen
  // options never exceed 3, even with 5 candidates available or after
  // repeated "Find more" appends. Past the cap the escape is Catalog
  // Search / Manually Add, not a longer list.

  it('shows at most 2 alternates (3 options total with current match) when 5 candidates are available', () => {
    const currentProduct = { id: 'prod-current', item_number: '1000', brand: 'Acme', product: 'Current Pick', pack_size: '10 lb', category: 'protein' };
    const candidates = [
      makeCandidate({ id: 'prod-alt-1', product: { id: 'prod-alt-1', item_number: '2001', brand: 'Acme', product: 'Alt One', pack_size: '10 lb', category: 'protein' } }),
      makeCandidate({ id: 'prod-alt-2', product: { id: 'prod-alt-2', item_number: '2002', brand: 'Acme', product: 'Alt Two', pack_size: '10 lb', category: 'protein' } }),
      makeCandidate({ id: 'prod-alt-3', product: { id: 'prod-alt-3', item_number: '2003', brand: 'Acme', product: 'Alt Three', pack_size: '10 lb', category: 'protein' } }),
      makeCandidate({ id: 'prod-alt-4', product: { id: 'prod-alt-4', item_number: '2004', brand: 'Acme', product: 'Alt Four', pack_size: '10 lb', category: 'protein' } }),
    ];

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="chicken"
        currentProduct={currentProduct}
        candidates={candidates}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    expect(screen.getByText(/Alternate Products \(2\)/)).toBeInTheDocument();
    expect(screen.getByText('Acme Alt One')).toBeInTheDocument();
    expect(screen.getByText('Acme Alt Two')).toBeInTheDocument();
    expect(screen.queryByText('Acme Alt Three')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Alt Four')).not.toBeInTheDocument();
  });

  it('hides the "Find more matches" button once already at the 3-option ceiling', () => {
    const candidates = [
      makeCandidate({ id: 'prod-x1', product: { id: 'prod-x1', item_number: '3001', brand: 'Acme', product: 'X One', pack_size: '10 lb', category: 'protein' } }),
      makeCandidate({ id: 'prod-x2', product: { id: 'prod-x2', item_number: '3002', brand: 'Acme', product: 'X Two', pack_size: '10 lb', category: 'protein' } }),
    ];

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="chicken"
        currentProduct={null}
        candidates={candidates}
        onFindMoreMatches={vi.fn().mockResolvedValue([])}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    // Already 2 alternates -- at the ceiling, so no "find more" escape offered.
    expect(screen.queryByText('Find 2 more matches')).not.toBeInTheDocument();
    // Catalog Search remains present as the escape hatch.
    expect(screen.getByText('Catalog Search')).toBeInTheDocument();
  });

  it('shows the "Find more matches" button below the cap, and it disappears after it pushes the list to the ceiling', async () => {
    const candidate = makeCandidate({ id: 'prod-only', product: { id: 'prod-only', item_number: '4001', brand: 'Acme', product: 'Only One', pack_size: '10 lb', category: 'protein' } });
    const more = [
      makeCandidate({ id: 'prod-more-1', product: { id: 'prod-more-1', item_number: '4002', brand: 'Acme', product: 'More One', pack_size: '10 lb', category: 'protein' } }),
      makeCandidate({ id: 'prod-more-2', product: { id: 'prod-more-2', item_number: '4003', brand: 'Acme', product: 'More Two', pack_size: '10 lb', category: 'protein' } }),
    ];
    const onFindMoreMatches = vi.fn().mockResolvedValue(more);

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="chicken"
        currentProduct={null}
        candidates={[candidate]}
        onFindMoreMatches={onFindMoreMatches}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    const findMoreButton = screen.getByText('Find 2 more matches');
    fireEvent.click(findMoreButton);

    await vi.waitFor(() => {
      expect(onFindMoreMatches).toHaveBeenCalledTimes(1);
    });

    // Even though onFindMoreMatches returned 2 more (total 3 candidates),
    // the display cap holds at 2 alternates, and the button is now gone.
    await vi.waitFor(() => {
      expect(screen.getByText(/Alternate Products \(2\)/)).toBeInTheDocument();
    });
    expect(screen.queryByText('Find 2 more matches')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme More Two')).not.toBeInTheDocument();
  });

  it('renders a single candidate as the current-match MATCH card, not a forced one-option alternates list', () => {
    const currentProduct = { id: 'prod-solo', item_number: '5001', brand: 'Acme', product: 'Solo Match', pack_size: '10 lb', category: 'protein' };
    const soloCandidate = makeCandidate({ id: 'prod-solo', product: currentProduct });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="chicken"
        currentProduct={currentProduct}
        candidates={[soloCandidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    expect(screen.getByText('Current Match')).toBeInTheDocument();
    expect(screen.getByText('Best Match')).toBeInTheDocument();
    // The lone candidate is consumed by the current-match card, not
    // re-listed as a one-item "Alternate Products" section.
    expect(screen.queryByText(/Alternate Products/)).not.toBeInTheDocument();
  });

  it('with 2 candidates shows current match + 1 alternate, with Catalog Search present as the escape', () => {
    const currentProduct = { id: 'prod-cur', item_number: '6001', brand: 'Acme', product: 'Current One', pack_size: '10 lb', category: 'protein' };
    const altCandidate = makeCandidate({ id: 'prod-alt', product: { id: 'prod-alt', item_number: '6002', brand: 'Acme', product: 'Alt Candidate', pack_size: '10 lb', category: 'protein' } });

    render(
      <MatchDrawer
        open={true}
        onOpenChange={() => {}}
        ingredientName="chicken"
        currentProduct={currentProduct}
        candidates={[altCandidate]}
        quoteId="q-1"
        quoteLineId="line-1"
      />
    );

    expect(screen.getByText('Current Match')).toBeInTheDocument();
    expect(screen.getByText(/Alternate Products \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Acme Alt Candidate')).toBeInTheDocument();
    expect(screen.getByText('Catalog Search')).toBeInTheDocument();
  });
});
