// @vitest-environment jsdom
//
// ChainToggle.test.tsx — Operational Memory Epic, Lane 1 revision (Ruling 3).
//
// Verifies: broken vs connected visual/accessible state, exact brief hover
// text, one-click bidirectional toggle (no modal/confirmation step), and no
// em/en dash anywhere in the copy.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ChainToggle, CHAIN_TOGGLE_HOVER } from './ChainToggle';

// This project's vitest config does not set globals: true, so
// @testing-library/react's afterEach-based auto cleanup never registers.
afterEach(cleanup);

describe('ChainToggle', () => {
  it('exposes the exact brief hover text "Remembered for this account" via title, regardless of state', () => {
    const { rerender } = render(<ChainToggle locked={true} onToggle={() => {}} />);
    expect(screen.getByTitle(CHAIN_TOGGLE_HOVER)).toBeInTheDocument();
    expect(CHAIN_TOGGLE_HOVER).toBe('Remembered for this account');

    rerender(<ChainToggle locked={false} onToggle={() => {}} />);
    expect(screen.getByTitle(CHAIN_TOGGLE_HOVER)).toBeInTheDocument();
  });

  it('marks aria-pressed true when locked, false when not locked', () => {
    const { rerender } = render(<ChainToggle locked={true} onToggle={() => {}} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');

    rerender(<ChainToggle locked={false} onToggle={() => {}} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onToggle exactly once per click -- no modal, no confirmation step, reversible in one action', () => {
    const onToggle = vi.fn();
    render(<ChainToggle locked={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledTimes(1);
    // Nothing else should have appeared -- no dialog/confirm role rendered.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('does not call onToggle when disabled', () => {
    const onToggle = vi.fn();
    render(<ChainToggle locked={true} onToggle={onToggle} disabled />);

    fireEvent.click(screen.getByRole('button'));

    expect(onToggle).not.toHaveBeenCalled();
  });

  it('renders no visible text content (icon-only, no confidence number, no personification)', () => {
    render(<ChainToggle locked={true} onToggle={() => {}} />);
    const button = screen.getByRole('button');
    expect(button.textContent).toBe('');
    expect(button.textContent).not.toMatch(/\d/); // no confidence number
  });

  it('does not contain an em dash or en dash anywhere in its copy', () => {
    render(<ChainToggle locked={true} onToggle={() => {}} />);
    const button = screen.getByRole('button');
    const allCopy = [
      CHAIN_TOGGLE_HOVER,
      button.getAttribute('title') ?? '',
      button.getAttribute('aria-label') ?? '',
    ].join(' ');
    expect(allCopy).not.toMatch(/[–—]/);
  });
});
