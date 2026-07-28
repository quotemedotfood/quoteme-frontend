// RepDesktopShell.test.tsx
//
// Item 1d: RepNewspaperSidebar's "WORKING AS" block must show the session's
// role explicitly (e.g. "Rep", "Distributor Admin"), not just a name and a
// distributor. This is a presentational-level test of the sidebar component
// itself (mirrors ManagerSidebar.test.tsx) , the role LABEL is passed in as a
// prop here; RepLayout.test.tsx covers deriving that label live from
// useAuth()/user.role.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RepNewspaperSidebar } from './RepDesktopShell';

afterEach(() => {
  cleanup();
});

function renderSidebar(overrides: Partial<React.ComponentProps<typeof RepNewspaperSidebar>> = {}) {
  return render(
    <RepNewspaperSidebar
      mode="open"
      onModeChange={() => {}}
      active="quotes-inbound"
      onNav={() => {}}
      repName="Jamie Rivera"
      roleLabel="Rep"
      distributorName="Sysco Boston"
      {...overrides}
    />,
  );
}

describe('RepNewspaperSidebar - "Working as" role indicator', () => {
  it('shows the role alongside the distributor, not just the distributor', () => {
    renderSidebar();
    expect(screen.getByText('Jamie Rivera')).toBeTruthy();
    expect(screen.getByText('Rep · Sysco Boston')).toBeTruthy();
  });

  it('shows a distributor_admin role explicitly, distinct from a rep session', () => {
    renderSidebar({ repName: 'Morgan Lee', roleLabel: 'Distributor Admin' });
    expect(screen.getByText('Morgan Lee')).toBeTruthy();
    expect(screen.getByText('Distributor Admin · Sysco Boston')).toBeTruthy();
  });

  it('is graceful when there is no distributor name (still shows the role)', () => {
    renderSidebar({ distributorName: '' });
    expect(screen.getByText('Rep')).toBeTruthy();
  });
});
