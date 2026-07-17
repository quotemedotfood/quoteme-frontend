// @vitest-environment jsdom
//
// DistributorMemoryBadge.test.tsx — Operational Memory Epic, Lane 2.
//
// The house-pick label is plain, no sparkles/confidence numbers/em-dashes.
// Distributor name is interpolated but the surrounding copy is fixed.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DistributorMemoryBadge, distributorMemoryLabel } from './DistributorMemoryBadge';

afterEach(cleanup);

describe('distributorMemoryLabel', () => {
  it('includes the distributor name when given', () => {
    expect(distributorMemoryLabel('Altamira')).toBe('House pick, set by your team at Altamira.');
  });

  it('falls back to a generic label when no distributor name is given', () => {
    expect(distributorMemoryLabel(null)).toBe('House pick, set by your team.');
    expect(distributorMemoryLabel(undefined)).toBe('House pick, set by your team.');
    expect(distributorMemoryLabel('')).toBe('House pick, set by your team.');
  });

  it('does not contain an em dash or en dash', () => {
    expect(distributorMemoryLabel('Altamira')).not.toMatch(/[–—]/);
    expect(distributorMemoryLabel(null)).not.toMatch(/[–—]/);
  });
});

describe('DistributorMemoryBadge', () => {
  it('exposes the distributor-specific accessible name', () => {
    render(<DistributorMemoryBadge distributorName="Altamira" />);

    const badge = screen.getByLabelText('House pick, set by your team at Altamira.');
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('title')).toBe('House pick, set by your team at Altamira.');
  });

  it('falls back to the generic label when distributorName is not provided', () => {
    render(<DistributorMemoryBadge />);

    const badge = screen.getByLabelText('House pick, set by your team.');
    expect(badge).toBeInTheDocument();
  });

  it('renders no other text content (icon-only, no visible label)', () => {
    render(<DistributorMemoryBadge distributorName="Altamira" />);
    const badge = screen.getByLabelText('House pick, set by your team at Altamira.');
    expect(badge.textContent).toBe('');
  });
});
