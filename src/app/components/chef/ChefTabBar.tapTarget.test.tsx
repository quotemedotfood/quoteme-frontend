// ChefTabBar.tapTarget.test.tsx
//
// Justin, item 2 (2026-07-29 board): the mobile bottom bar tabs measured
// 129 x 14 on a real handset. The standard is 44. This is how a rep moves
// through the app all day, one thumb, wet hands, in a moving vehicle. The bar
// had collapsed because its `flex: 0 0 56px` is inert on a position:fixed
// element, and the buttons carried minHeight: 0. These tests pin the 44px
// floor so the row cannot silently collapse to text height again.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ChefTabBar, type TabDef } from './ChefTabBar';

const REP_TABS: TabDef[] = [
  { id: 'today', label: 'Today', target: 'rep-tab-today' },
  { id: 'inbound', label: 'Inbound', target: 'rep-tab-inbound' },
  { id: 'quotes', label: 'Quotes', target: 'rep-tab-quotes' },
];

function minH(el: HTMLElement): number {
  return parseInt(el.style.minHeight || '0', 10);
}

describe('ChefTabBar tap targets', () => {
  afterEach(cleanup);

  it('gives every rep bottom-nav tab at least a 44px tap target', () => {
    const { container } = render(<ChefTabBar tabs={REP_TABS} active="today" />);
    const buttons = Array.from(container.querySelectorAll('button')) as HTMLElement[];
    expect(buttons.length).toBe(3);
    for (const b of buttons) {
      expect(minH(b)).toBeGreaterThanOrEqual(44);
    }
  });

  it('gives every chef default tab (incl. the Build Quote action) a 44px target', () => {
    const { container } = render(<ChefTabBar active="home" />);
    const buttons = Array.from(container.querySelectorAll('button')) as HTMLElement[];
    expect(buttons.length).toBe(4);
    for (const b of buttons) {
      expect(minH(b)).toBeGreaterThanOrEqual(44);
    }
  });
});
