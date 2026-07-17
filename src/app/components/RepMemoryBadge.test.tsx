// @vitest-environment jsdom
//
// RepMemoryBadge.test.tsx — Operational Memory Epic, Lane 1.
//
// The bookmark label's copy is a fixed string, not templated (no count, no
// confidence number, no sparkles/personification). This test asserts the
// LITERAL string so a future accidental edit (e.g. "2 previous quotes", or
// an em-dash creeping in) fails the test rather than passing under a loose
// substring/regex match.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RepMemoryBadge, REP_MEMORY_LABEL } from './RepMemoryBadge';

// This project's vitest config does not set globals: true, so
// @testing-library/react's afterEach-based auto cleanup never registers.
// Without this, successive renders in the same file pile up in the same
// document and getByLabelText finds duplicates across tests.
afterEach(cleanup);

describe('RepMemoryBadge', () => {
  it('exposes the exact accessible name "Your choice. 1 previous quote."', () => {
    render(<RepMemoryBadge />);
    expect(REP_MEMORY_LABEL).toBe('Your choice. 1 previous quote.');

    const badge = screen.getByLabelText('Your choice. 1 previous quote.');
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('aria-label')).toBe('Your choice. 1 previous quote.');
    expect(badge.getAttribute('title')).toBe('Your choice. 1 previous quote.');
  });

  it('renders no other text content (icon-only, no visible label)', () => {
    render(<RepMemoryBadge />);
    const badge = screen.getByLabelText('Your choice. 1 previous quote.');
    expect(badge.textContent).toBe('');
  });

  it('does not contain an em dash or en dash in the label', () => {
    expect(REP_MEMORY_LABEL).not.toMatch(/[–—]/);
  });
});
