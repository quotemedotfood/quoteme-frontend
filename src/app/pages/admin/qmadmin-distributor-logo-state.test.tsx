// NF-25 regression: /qm-admin/distributors/:id threw `ReferenceError: setLogoUrl
// is not defined` inside the load effect. Because the throw happened AFTER
// setDist but BEFORE setLoading(false), the page never left the "Loading…" state
// (and the logo render path at line 307 was never reached). The B-181 logo-upload
// identifiers (logoUrl/setLogoUrl, logoUploading, logoError, logoInputRef) were
// referenced but never declared; esbuild does no type-checking, so the undefined
// references shipped and threw at runtime — same defect class as the B-183
// `backTo is not defined` crash.
//
// This mounts the page via react-test-renderer (node env, no jsdom) with a mocked
// adminApi and flushes the load effect. Pre-fix the effect throws at setLogoUrl,
// setLoading(false) never runs, and the tree stays on "Loading…". Post-fix the
// effect completes and the detail view (distributor name + Upload control) renders.
//
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Routes, Route } from 'react-router';

const mockDist = {
  id: 'd1',
  name: 'Test Distributor',
  status: 'active',
  unclaimed: false,
  email_domain: 'test.com',
  branding_slug: 'test-distributor',
  region: 'West',
  primary_state: 'CA',
  service_states: [],
  catalog: null,
  admins: [],
  reps: [],
  restaurants: [],
  catalogs: [],
  logo_url: null,
};

vi.mock('../../services/adminApi', () => ({
  getAdminDistributor: vi.fn(async () => ({ data: mockDist })),
  updateAdminDistributor: vi.fn(async () => ({ data: mockDist })),
  inviteAdminUser: vi.fn(async () => ({ data: {} })),
  assignDistributorAdmin: vi.fn(async () => ({ data: {} })),
  getAdminUsers: vi.fn(async () => ({ data: [] })),
  uploadAdminDistributorLogo: vi.fn(async () => ({ data: { logo_url: 'x' } })),
}));

import { QMAdminDistributorDetailPage } from './QMAdminDistributorDetail';

describe('NF-25: QMAdminDistributorDetail load effect', () => {
  it('completes the load effect and renders the detail view (not stuck on Loading)', async () => {
    let root!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      root = TestRenderer.create(
        createElement(
          MemoryRouter,
          { initialEntries: ['/qm-admin/distributors/d1'] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: '/qm-admin/distributors/:id',
              element: createElement(QMAdminDistributorDetailPage),
            }),
          ),
        ),
      );
    });
    // Flush the mocked getAdminDistributor promise + trailing state updates.
    await act(async () => {
      await Promise.resolve();
    });

    const text = JSON.stringify(root.toJSON());
    // Pre-fix: setLogoUrl throws, setLoading(false) never runs → stuck here.
    expect(text).not.toContain('Loading...');
    // Post-fix: loaded detail view renders.
    expect(text).toContain('Test Distributor');
  });
});
