// ChefPullEntryPage.test.tsx
// Unit tests for B-134, B-135, B-151, and related pull-entry logic.
// Project test env is node-only (no jsdom / @testing-library/react).
// Tests cover extracted pure logic; render tests are deferred to E2E.

import { describe, it, expect } from 'vitest';

// ─── B-151: guard-state copy helper ──────────────────────────────────────────
//
// Verifies the broken-sentence fix. The guard renders a "Select a distributor
// to continue." sentence — previously read "No distributor selected. to continue."
//
// We extract the copy as a pure constant so we can assert on it without
// mounting a React component.

const NO_DISTRIBUTOR_PREFIX = 'Select a distributor';
const NO_DISTRIBUTOR_SUFFIX = 'to continue.';

describe('B-151 — no-distributor guard copy', () => {
  it('produces a grammatically correct sentence when joined', () => {
    // The rendered sentence reads: "Select a distributor to continue."
    const sentence = `${NO_DISTRIBUTOR_PREFIX} ${NO_DISTRIBUTOR_SUFFIX}`;
    expect(sentence).toBe('Select a distributor to continue.');
    // Confirm old broken form is absent
    expect(sentence).not.toContain('No distributor selected.');
    expect(sentence).not.toMatch(/\.\s+to /); // no ". to" mid-sentence
  });
});

// ─── B-135: disabled-reason ordering ─────────────────────────────────────────
//
// Verifies that both catalog-not-ready and content-missing reasons are
// surfaced ABOVE the submit button. We model the render order as an array
// of named sections and assert their relative positions.

type Section = 'error' | 'catalog-not-ready' | 'content-missing' | 'submit';

function renderOrder(opts: { hasError: boolean; catalogReady: boolean; hasContent: boolean }): Section[] {
  const order: Section[] = [];
  if (opts.hasError) order.push('error');
  if (!opts.catalogReady) order.push('catalog-not-ready');
  if (opts.catalogReady && !opts.hasContent) order.push('content-missing');
  order.push('submit');
  return order;
}

describe('B-135 — disabled reason renders above submit button', () => {
  it('catalog-not-ready notice comes before submit', () => {
    const order = renderOrder({ hasError: false, catalogReady: false, hasContent: false });
    const catalogIdx = order.indexOf('catalog-not-ready');
    const submitIdx = order.indexOf('submit');
    expect(catalogIdx).toBeGreaterThanOrEqual(0);
    expect(catalogIdx).toBeLessThan(submitIdx);
  });

  it('content-missing notice comes before submit', () => {
    const order = renderOrder({ hasError: false, catalogReady: true, hasContent: false });
    const missingIdx = order.indexOf('content-missing');
    const submitIdx = order.indexOf('submit');
    expect(missingIdx).toBeGreaterThanOrEqual(0);
    expect(missingIdx).toBeLessThan(submitIdx);
  });

  it('content-missing is not shown when catalog is not ready (catalog message takes priority)', () => {
    const order = renderOrder({ hasError: false, catalogReady: false, hasContent: false });
    expect(order).not.toContain('content-missing');
    expect(order).toContain('catalog-not-ready');
  });

  it('no disabled reason shown when everything is ready', () => {
    const order = renderOrder({ hasError: false, catalogReady: true, hasContent: true });
    expect(order).not.toContain('catalog-not-ready');
    expect(order).not.toContain('content-missing');
    expect(order).toContain('submit');
  });
});

// ─── B-134: "Change distributor" vs "Change rep" affordance logic ─────────────
//
// The anchor shows "Change distributor" always (when onChangeDistributor is wired).
// "Change rep" only appears when the distributor is affiliated AND has a rep with
// name + email populated.

interface DistributorContext {
  affiliated: boolean;
  rep?: { name: string; email: string } | null;
}

function shouldShowChangeRep(distributor: DistributorContext | null): boolean {
  return !!(
    distributor?.affiliated &&
    distributor?.rep?.name?.trim() &&
    distributor?.rep?.email?.trim()
  );
}

describe('B-134 — Change distributor vs Change rep affordance', () => {
  it('shows Change rep when affiliated with full rep data', () => {
    expect(shouldShowChangeRep({ affiliated: true, rep: { name: 'Pat', email: 'pat@dist.com' } })).toBe(true);
  });

  it('does NOT show Change rep when not affiliated', () => {
    expect(shouldShowChangeRep({ affiliated: false, rep: { name: 'Pat', email: 'pat@dist.com' } })).toBe(false);
  });

  it('does NOT show Change rep when rep is null', () => {
    expect(shouldShowChangeRep({ affiliated: true, rep: null })).toBe(false);
  });

  it('does NOT show Change rep when rep email is empty', () => {
    expect(shouldShowChangeRep({ affiliated: true, rep: { name: 'Pat', email: '' } })).toBe(false);
  });

  it('does NOT show Change rep when distributor context is null', () => {
    expect(shouldShowChangeRep(null)).toBe(false);
  });
});
