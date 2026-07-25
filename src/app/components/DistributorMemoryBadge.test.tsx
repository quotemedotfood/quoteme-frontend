// @vitest-environment jsdom
//
// DistributorMemoryBadge.test.tsx — Operational Memory Epic, Lane 2.
//
// The distributor label is plain, no sparkles/confidence numbers/em dashes.
// Ruling 2: PREFERENCE is presentation only ("Distributor Focus"), MANDATE
// is a distinct label that MUST carry attribution (set by / reason).

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  DistributorMemoryBadge,
  distributorMemoryLabel,
  distributorMandateTooltip,
} from './DistributorMemoryBadge';

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

describe('distributorMandateTooltip', () => {
  it('includes distributor name, who set it, and the reason', () => {
    expect(distributorMandateTooltip('Altamira', 'Jamie Rivera', 'Contract requirement')).toBe(
      'Distributor mandate at Altamira, set by Jamie Rivera. Reason: Contract requirement.'
    );
  });

  it('degrades gracefully when name/setBy/reason are missing', () => {
    expect(distributorMandateTooltip(null, null, null)).toBe('Distributor mandate.');
    expect(distributorMandateTooltip(null, 'Jamie Rivera', null)).toBe(
      'Distributor mandate, set by Jamie Rivera.'
    );
  });

  it('does not contain an em dash or en dash', () => {
    expect(distributorMandateTooltip('Altamira', 'Jamie Rivera', 'Contract requirement')).not.toMatch(
      /[–—]/
    );
  });
});

describe('DistributorMemoryBadge', () => {
  it('renders the "Distributor Focus" label for a preference candidate, no mandate attribution', () => {
    render(<DistributorMemoryBadge distributorName="Altamira" signalType="preference" />);

    expect(screen.getByText('Distributor Focus')).toBeInTheDocument();
    const badge = screen.getByLabelText('House pick, set by your team at Altamira.');
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('title')).toBe('House pick, set by your team at Altamira.');
    expect(badge.textContent).not.toMatch(/mandate/i);
  });

  it('treats a null/undefined signalType as preference (legacy rows)', () => {
    render(<DistributorMemoryBadge distributorName="Altamira" />);

    expect(screen.getByText('Distributor Focus')).toBeInTheDocument();
    expect(screen.getByLabelText('House pick, set by your team at Altamira.')).toBeInTheDocument();
  });

  it('falls back to the generic tooltip when distributorName is not provided', () => {
    render(<DistributorMemoryBadge />);

    expect(screen.getByLabelText('House pick, set by your team.')).toBeInTheDocument();
  });

  it('renders a distinct "Distributor Mandate" label with set-by and reason attribution', () => {
    render(
      <DistributorMemoryBadge
        distributorName="Altamira"
        signalType="mandate"
        mandateSetBy="Jamie Rivera"
        mandateReason="Contract requirement"
      />
    );

    expect(screen.getByText('Distributor Mandate')).toBeInTheDocument();
    const badge = screen.getByLabelText(
      'Distributor mandate at Altamira, set by Jamie Rivera. Reason: Contract requirement.'
    );
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('title')).toBe(
      'Distributor mandate at Altamira, set by Jamie Rivera. Reason: Contract requirement.'
    );
  });
});
