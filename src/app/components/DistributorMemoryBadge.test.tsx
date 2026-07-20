// @vitest-environment jsdom
//
// DistributorMemoryBadge.test.tsx — Operational Memory Epic, Lane 2 revision
// (Justin's 2026-07-20 matching rulings, Ruling 2: mandate vs preference).
//
// PREFERENCE renders a plain "Distributor focus" label -- no chain lock, no
// sparkles/confidence numbers/em-dashes. MANDATE renders "Distributor
// mandate" and MUST carry its attribution (who set it, why) on hover.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  DistributorMemoryLabel,
  distributorPreferenceLabel,
  distributorMandateLabel,
} from './DistributorMemoryBadge';

afterEach(cleanup);

describe('distributorPreferenceLabel', () => {
  it('includes the distributor name when given', () => {
    expect(distributorPreferenceLabel('Altamira')).toBe('Current preferred option at Altamira.');
  });

  it('falls back to a generic label when no distributor name is given', () => {
    expect(distributorPreferenceLabel(null)).toBe('Current preferred option.');
    expect(distributorPreferenceLabel(undefined)).toBe('Current preferred option.');
    expect(distributorPreferenceLabel('')).toBe('Current preferred option.');
  });

  it('does not contain an em dash or en dash', () => {
    expect(distributorPreferenceLabel('Altamira')).not.toMatch(/[–—]/);
    expect(distributorPreferenceLabel(null)).not.toMatch(/[–—]/);
  });
});

describe('distributorMandateLabel', () => {
  it('includes both who set it and why when both are given', () => {
    expect(distributorMandateLabel('Jordan Rep', 'supplier transition')).toBe(
      'Distributor mandate. Set by Jordan Rep: supplier transition.'
    );
  });

  it('includes only who set it when no reason is given', () => {
    expect(distributorMandateLabel('Jordan Rep', null)).toBe('Distributor mandate. Set by Jordan Rep.');
  });

  it('includes only the reason when no setter is given', () => {
    expect(distributorMandateLabel(null, 'supplier transition')).toBe(
      'Distributor mandate. Reason: supplier transition.'
    );
  });

  it('falls back to a bare label when neither is given', () => {
    expect(distributorMandateLabel(null, null)).toBe('Distributor mandate.');
  });

  it('does not contain an em dash or en dash', () => {
    expect(distributorMandateLabel('Jordan Rep', 'supplier transition')).not.toMatch(/[–—]/);
  });
});

describe('DistributorMemoryLabel (preference)', () => {
  it('renders the plain "Distributor focus" text with the distributor name on hover', () => {
    render(<DistributorMemoryLabel signalType="preference" distributorName="Altamira" />);

    expect(screen.getByText('Distributor focus')).toBeInTheDocument();
    const badge = screen.getByLabelText('Current preferred option at Altamira.');
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('title')).toBe('Current preferred option at Altamira.');
  });

  it('never renders a chain lock or icon for a preference (label only)', () => {
    render(<DistributorMemoryLabel signalType="preference" distributorName="Altamira" />);
    const badge = screen.getByText('Distributor focus');
    expect(badge.querySelector('svg')).toBeNull();
  });
});

describe('DistributorMemoryLabel (mandate)', () => {
  it('renders "Distributor mandate" with attribution (who/why) on hover', () => {
    render(
      <DistributorMemoryLabel
        signalType="mandate"
        mandateSetBy="Jordan Rep"
        mandateReason="supplier transition"
      />
    );

    expect(screen.getByText('Distributor mandate')).toBeInTheDocument();
    const badge = screen.getByLabelText('Distributor mandate. Set by Jordan Rep: supplier transition.');
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('title')).toBe('Distributor mandate. Set by Jordan Rep: supplier transition.');
  });
});
