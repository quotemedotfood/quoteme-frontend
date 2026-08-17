// @vitest-environment jsdom
//
// The QM-admin list pages had five near-copies of the same "nothing to show"
// block, and four of them said "No <thing> yet" plus a line promising where
// records would appear. Both halves are wrong when a search filter is what hid
// the rows. Chefs already used the honest wording; AdminEmptyState is that one
// wording, extracted, so a fifth variant cannot be written by accident.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AdminEmptyState } from './_adminEmptyState';

// No global afterEach in this vitest config, so RTL's auto-cleanup never
// registers; unmount explicitly between cases.
afterEach(() => cleanup());

describe('AdminEmptyState', () => {
  it('renders the Chefs wording for any label', () => {
    render(<AdminEmptyState label="restaurants" />);
    expect(screen.getByText('No restaurants found')).toBeInTheDocument();
  });

  it('never says "yet", which is a claim about the data rather than the filter', () => {
    const { container } = render(<AdminEmptyState label="brands" />);
    expect(container.textContent).toBe('No brands found');
  });
});
