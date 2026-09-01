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

const { repLearning, distributorLearning, getOperationalMemoryLearnings, revertOperationalMemoryLearning, getAdminDistributors } = vi.hoisted(() => {
  const repLearning = {
    id: 'learning-rep-1',
    tier: 'rep' as const,
    canonical_key: 'produce|tomato|1',
    category: 'produce',
    catalog_version: 'v0',
    policy_version: 'v0',
    active: true,
    reverted_at: null,
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

  // Operational Memory Epic, Lane 2 revision (Ruling 2): a distributor-tier
  // MANDATE row -- must be visibly distinct from the preference row above
  // and carry attribution (who set it, why).
  const mandateLearning = {
    id: 'learning-dist-2',
    tier: 'preferred' as const,
    distributor_signal_type: 'mandate' as const,
    mandate_reason: 'Contract requirement',
    mandate_set_by: { id: 'admin-1', name: 'Morgan Lee', email: 'morgan@testcompany.com' },
    canonical_key: 'produce|garlic|3',
    category: 'produce',
    catalog_version: 'v0',
    policy_version: 'v0',
    active: true,
    reverted_at: null,
    product: { id: 'prod-3', name: 'Peeled Garlic', brand: 'Sysco Reliance', item_number: 'GAR-003' },
    distributor: { id: 'dist-1', name: 'Test Distributor' },
    rep: null,
    provenance: {
      promoted_from_operational_event_id: 'event-3',
      promoted_from_quote_id: 'quote-3',
      promoted_by_user_id: 'admin-1',
      promoted_by: { id: 'admin-1', name: 'Morgan Lee', email: 'morgan@testcompany.com' },
      promoted_at: '2026-07-12T09:30:00Z',
      correction_type: 'better_fit',
      quote_id: 'quote-3',
    },
  };

  return {
    repLearning,
    distributorLearning,
    mandateLearning,
    getOperationalMemoryLearnings: vi.fn(async () => ({
      data: { learnings: [repLearning, distributorLearning, mandateLearning], count: 3 },
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

  // The Revert control now carries an aria-label naming the learning it
  // reverts ("Revert the learning for produce|tomato|1"), so a query for the
  // bare verb no longer matches. That is the point of the change: the old
  // accessible name did not say which of the three rows the button acted on.
  it('shows an Active status for a non-reverted row and a Revert action', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Active').length).toBe(3));
    expect(screen.getAllByRole('button', { name: /^Revert the learning for / }).length).toBe(3);
  });

  it('reverts a row and reloads the list, future-only (no historical mutation UI)', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Revert the learning for / }).length).toBe(3));

    const revertButtons = screen.getAllByRole('button', { name: /^Revert the learning for / });
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

  // Operational Memory Epic, Lane 2 revision (Ruling 2): a distributor
  // MANDATE row must read as distinct from a distributor PREFERENCE row,
  // and must surface who set it and why. Preference rows carry neither.
  it('distinguishes a distributor MANDATE row from a PREFERENCE row and surfaces mandate provenance', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('produce|garlic|3')).toBeInTheDocument());

    // Tier column: no longer identical "Distributor" for both.
    expect(screen.getByText('Distributor Mandate')).toBeInTheDocument();
    expect(screen.getByText('Distributor Preference')).toBeInTheDocument();

    // Mandate attribution (who + why) shown only for the mandate row.
    expect(screen.getByText(/Mandate set by Morgan Lee/)).toBeInTheDocument();
    expect(screen.getByText(/Contract requirement/)).toBeInTheDocument();
    expect(screen.queryByText(/Mandate set by Jamie Rivera/)).not.toBeInTheDocument();
  });
});
