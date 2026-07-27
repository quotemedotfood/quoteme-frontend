// QMAdminDistributorDetail.quotaReset.test.tsx
//
// P0-2b (FE): the qm-admin "Set quota" control on the distributor detail
// page. BE (P0-2b, merged branch feat/admin-actions-quota-audit) added
// bonus_free_quotes/effective_quota to serialize_detail and wired
// grant_free_quotes to write an AdminAction audit row. grant_free_quotes
// stays increment-only, so this control computes the delta between the
// admin's target quota and the current effective_quota and posts that delta.
//
// Coverage:
//   1. renders the current effective_quota / bonus_free_quotes
//   2. submitting a target N computes the correct delta and calls
//      grantFreeQuotes(id, delta), then refetches so the display updates
//   3. a rapid double-submit fires the call once (useAsyncMutation guard)
//   4. a target below the base quota (5) is clamped before the delta is sent
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const { baseDist, grownDist, getAdminDistributor, grantFreeQuotes } = vi.hoisted(() => {
  const baseDist = {
    id: 'd1',
    name: 'Test Distributor',
    status: 'active',
    unclaimed: false,
    email_domain: 'test.com',
    branding_slug: null,
    region: 'West',
    primary_state: 'CA',
    service_states: [],
    catalog: null,
    admins: [],
    reps: [],
    restaurants: [],
    catalogs: [],
    logo_url: null,
    bonus_free_quotes: 3,
    effective_quota: 8, // base 5 + bonus 3
  };
  const grownDist = { ...baseDist, bonus_free_quotes: 15, effective_quota: 20 };

  return {
    baseDist,
    grownDist,
    getAdminDistributor: vi.fn(async () => ({ data: baseDist })),
    grantFreeQuotes: vi.fn(async () => ({ data: { bonus_free_quotes: 15 } })),
  };
});

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return {
    ...actual,
    getAdminDistributor,
    grantFreeQuotes,
  };
});

import { QMAdminDistributorDetailPage } from './QMAdminDistributorDetail';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/qm-admin/distributors/d1']}>
      <Routes>
        <Route path="/qm-admin/distributors/:id" element={<QMAdminDistributorDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QMAdminDistributorDetail - Set quota control', () => {
  beforeEach(() => {
    getAdminDistributor.mockClear();
    grantFreeQuotes.mockClear();
    getAdminDistributor.mockImplementation(async () => ({ data: baseDist }));
    grantFreeQuotes.mockImplementation(async () => ({ data: { bonus_free_quotes: 15 } }));
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the current effective_quota and bonus_free_quotes from the detail payload', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test Distributor')).toBeInTheDocument();
    });

    expect(screen.getByText('Free Quotes')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // effective quota
    expect(screen.getByText('3')).toBeInTheDocument(); // bonus granted
  });

  it('computes the delta from target - effective_quota and posts it, then refetches so the display updates', async () => {
    getAdminDistributor
      .mockImplementationOnce(async () => ({ data: baseDist })) // initial load
      .mockImplementationOnce(async () => ({ data: grownDist })); // post-grant refetch

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test Distributor')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Set quota to') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set quota' }));

    // 20 (target) - 8 (current effective_quota) = 12
    await waitFor(() => {
      expect(grantFreeQuotes).toHaveBeenCalledWith('d1', 12);
    });

    // Refetch fires and the page resyncs to the new effective_quota/bonus.
    await waitFor(() => {
      expect(getAdminDistributor).toHaveBeenCalledTimes(2);
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('fires grantFreeQuotes once on a rapid double-submit (useAsyncMutation in-flight guard)', async () => {
    let resolveGrant!: (v: { data: { bonus_free_quotes: number } }) => void;
    grantFreeQuotes.mockImplementation(
      () => new Promise((resolve) => { resolveGrant = resolve; }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test Distributor')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Set quota to') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '20' } });
    const submitButton = screen.getByRole('button', { name: 'Set quota' });

    // Two rapid clicks before the mutation resolves.
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(grantFreeQuotes).toHaveBeenCalledTimes(1);
    });

    resolveGrant({ data: { bonus_free_quotes: 15 } });
    await waitFor(() => {
      expect(screen.queryByText('Setting...')).not.toBeInTheDocument();
    });
    expect(grantFreeQuotes).toHaveBeenCalledTimes(1);
  });

  it('clamps a target below the base quota (5) before computing the delta', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test Distributor')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Set quota to') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set quota' }));

    // Target clamped to base (5); delta = 5 - 8 (current effective_quota) = -3.
    await waitFor(() => {
      expect(grantFreeQuotes).toHaveBeenCalledWith('d1', -3);
    });
  });
});
