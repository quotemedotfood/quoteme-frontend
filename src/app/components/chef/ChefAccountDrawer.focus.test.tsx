// @vitest-environment jsdom
//
// ChefAccountDrawer.focus.test.tsx
//
// The drawer portals to document.body, which puts its controls after the whole
// app in document order. Nothing used to move focus on open, so a keyboard user
// could not tab into it without traversing the page behind it first. The close
// button now takes initial focus.
//
// This is initial focus only. There is deliberately no focus trap and no focus
// restoration in this component.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ChefAccountDrawer } from './ChefAccountDrawer';

// Explicit: vitest is not configured with `globals: true`, so RTL does not
// auto-register its own cleanup. Without this the drawer's portal content
// survives into the next test, since it mounts on document.body rather than
// inside the container RTL discards.
afterEach(cleanup);

const baseProps = {
  onClose: () => {},
  chefType: 'single' as const,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  onSignOut: () => {},
};

describe('ChefAccountDrawer initial focus', () => {
  it('focuses the close button when the drawer opens', () => {
    render(<ChefAccountDrawer {...baseProps} open />);

    const closeButton = screen.getByRole('button', { name: 'Close account drawer' });
    expect(closeButton).toHaveFocus();
  });

  it('renders nothing when closed', () => {
    render(<ChefAccountDrawer {...baseProps} open={false} />);

    expect(screen.queryByRole('button', { name: 'Close account drawer' })).toBeNull();
  });
});
