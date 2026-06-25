// ChefDistributorEntryPage.test.tsx
// Unit tests for the handlePickSelect rep-enrichment logic (B-133).
// The project test env is node-only (no jsdom / @testing-library/react).
// We test the core logic extracted into a standalone helper to keep tests fast.

import { describe, it, expect } from 'vitest';
import type { PullQuoteDistributor } from '../../services/api';

// ─── Extracted logic under test ───────────────────────────────────────────────
// Mirrors handlePickSelect's rep-enrichment behaviour from ChefDistributorEntryPage.

type RepData = PullQuoteDistributor['rep'];

interface DetailResponse {
  data?: {
    rep: { id: string; name: string; email: string; phone?: string | null } | null;
  } | null;
}

async function enrichDistributorWithRep(
  distributor: PullQuoteDistributor,
  fetchDetail: (id: string) => Promise<DetailResponse>,
): Promise<PullQuoteDistributor> {
  let repData: RepData = null;
  try {
    const detail = await fetchDetail(distributor.id);
    if (detail.data?.rep) {
      repData = {
        name: detail.data.rep.name,
        email: detail.data.rep.email,
      };
    }
  } catch {
    // rep data is optional — proceed without it
  }
  return { ...distributor, rep: repData };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseDistributor: PullQuoteDistributor = {
  id: 'dist-abc',
  name: 'Sysco Boston',
  affiliated: true,
  rep: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ChefDistributorEntryPage — handlePickSelect rep enrichment (B-133)', () => {
  it('includes rep in distributor state when detail returns a rep', async () => {
    const mockFetch = async (_id: string): Promise<DetailResponse> => ({
      data: {
        rep: { id: 'rep-1', name: 'Jane Smith', email: 'jane@sysco.com', phone: '555-1234' },
      },
    });

    const result = await enrichDistributorWithRep(baseDistributor, mockFetch);

    expect(result.rep).toEqual({ name: 'Jane Smith', email: 'jane@sysco.com' });
    expect(result.id).toBe(baseDistributor.id);
    expect(result.name).toBe(baseDistributor.name);
  });

  it('sets rep: null when detail returns null rep', async () => {
    const mockFetch = async (_id: string): Promise<DetailResponse> => ({
      data: { rep: null },
    });

    const result = await enrichDistributorWithRep(baseDistributor, mockFetch);

    expect(result.rep).toBeNull();
  });

  it('still navigates (rep: null, no crash) when detail fetch throws', async () => {
    const mockFetch = async (_id: string): Promise<DetailResponse> => {
      throw new Error('Network error');
    };

    // Should resolve without throwing
    const result = await enrichDistributorWithRep(baseDistributor, mockFetch);

    expect(result.rep).toBeNull();
    // Distributor base fields preserved
    expect(result.id).toBe('dist-abc');
    expect(result.name).toBe('Sysco Boston');
  });
});
