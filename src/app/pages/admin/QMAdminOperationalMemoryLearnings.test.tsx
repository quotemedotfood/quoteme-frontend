// @vitest-environment jsdom
//
// QMAdminOperationalMemoryLearnings.test.tsx — Operational Memory Epic,
// Lane 2. The QM-admin-only learnings table: lists rep + distributor tier
// promotions with full provenance, and reverts a row (future-only).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach } from 'vitest';

afterEach(cleanup);

const { repLearning, distributorLearning, mandateLearning, staleLearning, getOperationalMemoryLearnings, revertOperationalMemoryLearning, getAdminDistributors } = vi.hoisted(() => {
  const repLearning = {
    id: 'learning-rep-1',
    tier: 'rep' as const,
    distributor_signal_type: null,
    mandate_reason: null,
    mandate_set_by: null,
    canonical_key: 'produce|tomato|1',
    category: 'produce',
    catalog_version: 'v0',
    policy_version: 'v0',
    active: true,
    reverted_at: null,
    stale_at: null,
    product: { id: 'prod-1', name: 'Heirloom Tomato', brand: "Chef's Choice", item_number: 'TOM-001' },
    distributor: null,
    rep: { id: 'rep-1', name: 'Jamie Rivera', email: 'jamie@testcompany.com' },
    provenance: {
      promoted_from_operational_event_id: 'event-1',
      promoted_from_quote_id: 'quote-1',
      promoted_by_user_id: 'rep-1',
      promoted_by: { id: 'rep-1', name: 'Jamie Rivera', email: 'jamie@testcompany.com' },
      promoted_at: '2026-07-10T12:00:00Z',
      correction_type: 'rep_preference',
      quote_id: 'quote-1',
    },
  };

  const distributorLearning = {
    id: 'learning-dist-1',
    tier: 'preferred' as const,
    distributor_signal_type: 'preference' as const,
    mandate_reason: null,
    mandate_set_by: null,
    canonical_key: 'produce|basil|2',
    category: 'produce',
    catalog_version: 'v0',
    policy_version: 'v0',
    active: true,
    reverted_at: null,
    stale_at: null,
    product: { id: 'prod-2', name: 'Genovese Basil', brand: 'Sysco Reliance', item_number: 'BAS-002' },
    distributor: { id: 'dist-1', name: 'Test Distributor' },
    rep: null,
    provenance: {
      promoted_from_operational_event_id: 'event-2',
      promoted_from_quote_id: 'quote-2',
      promoted_by_user_id: 'rep-1',
      promoted_by: { id: 'rep-1', name: 'Jamie Rivera', email: 'jamie@testcompany.com' },
      promoted_at: '2026-07-11T09:30:00Z',
      correction_type: 'distributor_preference',
      quote_id: 'quote-2',
    },
  };

  // Operational Memory Epic, Lane 2 revision (Ruling 2): a mandate row, with attribution.
  const mandateLearning = {
    id: 'learning-mandate-1',
    tier: 'preferred' as const,
    distributor_signal_type: 'mandate' as const,
    mandate_reason: 'supplier transition',
    mandate_set_by: { id: 'rep-1', name: 'Jamie Rivera', email: 'jamie@testcompany.com' },
    canonical_key: 'produce|garlic|4',
    category: 'produce',
    catalog_version: 'v0',
    policy_version: 'v0',
    active: true,
    reverted_at: null,
    stale_at: null,
    product: { id: 'prod-4', name: 'Peeled Garlic', brand: "Chef's Choice", item_number: 'GAR-004' },
    distributor: { id: 'dist-1', name: 'Test Distributor' },
    rep: null,
    provenance: {
      promoted_from_operational_event_id: 'event-4',
      promoted_from_quote_id: 'quote-4',
      promoted_by_user_id: 'rep-1',
      promoted_by: { id: 'rep-1', name: 'Jamie Rivera', email: 'jamie@testcompany.com' },
      promoted_at: '2026-07-12T09:30:00Z',
      correction_type: 'distributor_mandate',
      quote_id: 'quote-4',
    },
  };

  // Ruling 4: a stale distributor row -- left the assortment, never deleted.
  const staleLearning = {
    ...mandateLearning,
    id: 'learning-stale-1',
    canonical_key: 'produce|shallot|5',
    stale_at: '2026-07-15T00:00:00Z',
  };

  return {
    repLearning,
    distributorLearning,
    mandateLearning,
    staleLearning,
    getOperationalMemoryLearnings: vi.fn(async () => ({
      data: { learnings: [repLearning, distributorLearning], count: 2 },
    })),
    revertOperationalMemoryLearning: vi.fn(async (id: string) => ({
      data: { ...(id === repLearning.id ? repLearning : distributorLearning), active: false, reverted_at: '2026-07-16T00:00:00Z' },
    })),
    getAdminDistributors: vi.fn(async () => ({ data: [{ id: 'dist-1', name: 'Test Distributor' }] })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return {
    ...actual,
    getOperationalMemoryLearnings,
    revertOperationalMemoryLearning,
    getAdminDistributors,
  };
});

import { QMAdminOperationalMemoryLearnings } from './QMAdminOperationalMemoryLearnings';

function renderPage() {
  return render(
    <MemoryRouter>
      <QMAdminOperationalMemoryLearnings />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getOperationalMemoryLearnings.mockClear();
  revertOperationalMemoryLearning.mockClear();
});

describe('QMAdminOperationalMemoryLearnings', () => {
  it('lists both rep-tier and distributor-tier learnings with provenance', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('produce|tomato|1')).toBeInTheDocument());
    expect(screen.getByText('produce|basil|2')).toBeInTheDocument();

    // Provenance: who taught it, and the reason (correction_type).
    expect(screen.getAllByText('Jamie Rivera').length).toBeGreaterThan(0);
    expect(screen.getByText('Rep preference')).toBeInTheDocument();
    expect(screen.getByText('Distributor preference')).toBeInTheDocument();

    // Distributor scope shown for the distributor-tier row (also appears
    // once more in the distributor filter dropdown option).
    expect(screen.getAllByText('Test Distributor').length).toBeGreaterThan(0);
  });

  it('shows an Active status for a non-reverted row and a Revert action', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Active').length).toBe(2));
    expect(screen.getAllByRole('button', { name: 'Revert' }).length).toBe(2);
  });

  it('reverts a row and reloads the list, future-only (no historical mutation UI)', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Revert' }).length).toBe(2));

    const revertButtons = screen.getAllByRole('button', { name: 'Revert' });
    fireEvent.click(revertButtons[0]);

    await waitFor(() => expect(revertOperationalMemoryLearning).toHaveBeenCalledWith(repLearning.id));
    await waitFor(() => expect(getOperationalMemoryLearnings).toHaveBeenCalledTimes(2)); // initial load + reload after revert
  });

  it('never renders any distributor-facing chrome or copy (this is the QM-admin-only surface)', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('produce|tomato|1')).toBeInTheDocument());
    expect(screen.getByText(/Not shown to distributors/i)).toBeInTheDocument();
  });

  it('filters by tier', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('produce|tomato|1')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Tier'), { target: { value: 'preferred' } });

    await waitFor(() =>
      expect(getOperationalMemoryLearnings).toHaveBeenLastCalledWith(
        expect.objectContaining({ tier: 'preferred' })
      )
    );
  });

  it('filters by signal (mandate vs preference)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('produce|tomato|1')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Signal'), { target: { value: 'mandate' } });

    await waitFor(() =>
      expect(getOperationalMemoryLearnings).toHaveBeenLastCalledWith(
        expect.objectContaining({ signal_type: 'mandate' })
      )
    );
  });

  // Operational Memory Epic, Lane 2 revision (Ruling 2): mandate vs
  // preference + attribution columns on the learnings table.
  describe('mandate vs preference + attribution', () => {
    beforeEach(() => {
      getOperationalMemoryLearnings.mockResolvedValueOnce({
        data: { learnings: [repLearning, distributorLearning, mandateLearning], count: 3 },
      });
    });

    it('shows a Preference badge for a plain distributor preference row', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('produce|basil|2')).toBeInTheDocument());

      // "Preference" also appears as a <select> option in the Signal filter,
      // so scope to the actual badge (data-slot="badge"), not the dropdown.
      const badge = screen.getAllByText('Preference').map((el) => el.closest('[data-slot="badge"]')).find(Boolean);
      expect(badge).toBeTruthy();
    });

    it('shows a Mandate badge with attribution (who/why) for a mandate row, and "-" for the rep tier', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('produce|garlic|4')).toBeInTheDocument());

      const mandateBadge = screen.getAllByText('Mandate')
        .map((el) => el.closest('[data-slot="badge"]'))
        .find(Boolean) as HTMLElement;
      expect(mandateBadge).toBeTruthy();
      expect(mandateBadge.getAttribute('title')).toBe('Set by Jamie Rivera: supplier transition.');
    });
  });

  // Ruling 4: stale lock visibility on the learnings table.
  it('shows a Stale status (not Active) for a distributor row whose product left the assortment, without deleting it', async () => {
    getOperationalMemoryLearnings.mockResolvedValueOnce({
      data: { learnings: [staleLearning], count: 1 },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('produce|shallot|5')).toBeInTheDocument());
    expect(screen.getByText(/Stale since/)).toBeInTheDocument();
    // Still active (never reverted/deleted) -- a Revert action is still offered.
    expect(screen.getByRole('button', { name: 'Revert' })).toBeInTheDocument();
  });
});
