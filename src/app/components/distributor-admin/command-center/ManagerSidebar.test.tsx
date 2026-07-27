// ManagerSidebar.test.tsx
//
// Cosmetic sidebar changes (Constitution XXI language + XXII redundant
// control removal):
//   (a) the "Rep activity" nav label now reads "Quotes" (active tab key
//       stays 'quotes', only the visible label changed)
//   (b) the bottom "Hide sidebar" fully-hidden-view toggle is gone; the
//       top collapse control (aria-label "Collapse sidebar") is retained
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../../../contexts/AuthContext';
import { ManagerSidebar, type CCManagerInfo } from './ManagerSidebar';

afterEach(() => {
  cleanup();
});

const manager: CCManagerInfo = {
  name: 'Jamie Rivera',
  role: 'Manager',
  company: 'Fish Guys',
  region: 'NYC',
  today: 'Monday, July 27',
};

function renderSidebar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ManagerSidebar
          mode="open"
          onModeChange={() => {}}
          active="quotes"
          onNav={() => {}}
          manager={manager}
        />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ManagerSidebar - sidebar cosmetics', () => {
  it('renders the "Quotes" nav label, not "Rep activity"', () => {
    renderSidebar();
    expect(screen.getByText('Quotes')).toBeTruthy();
    expect(screen.queryByText('Rep activity')).toBeNull();
  });

  it('has no bottom "Hide sidebar" control, and retains the top collapse control', () => {
    renderSidebar();
    expect(screen.queryByLabelText('Hide sidebar')).toBeNull();
    expect(screen.getByLabelText('Collapse sidebar')).toBeTruthy();
  });
});
