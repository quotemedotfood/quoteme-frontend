// ChefTabDesktopShell — layout shell for chef dashboard surfaces
//
// Composition:
//   Top:   ChefTopbar (existing — not modified)
//   Left:  NewspaperSidebar (desktop md+ only)
//   Right: <Outlet /> / children (main content area)
//   Bottom: ChefMobileTabBar (mobile only, below md breakpoint)
//
// Sidebar is hidden on mobile — ChefMobileTabBar replaces it.
// Content area gets bottom padding on mobile to clear the fixed tab bar.

import { Outlet } from 'react-router';
import { ChefTopbar } from '../ChefTopbar';
import { NewspaperSidebar } from './NewspaperSidebar';
import { ChefMobileTabBar } from './ChefMobileTabBar';

export function ChefTabDesktopShell() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#FBFAF7',
      }}
    >
      {/* Topbar — full width across top */}
      <ChefTopbar />

      {/* Body row: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Sidebar — desktop only (md+) */}
        <div className="hidden md:flex" style={{ height: '100%' }}>
          <NewspaperSidebar />
        </div>

        {/* Main content */}
        <main
          style={{ flex: 1, overflowY: 'auto' }}
          // Mobile: pad bottom so content doesn't sit under the fixed tab bar
          className="pb-16 md:pb-0"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar — hidden on md+ */}
      <ChefMobileTabBar />
    </div>
  );
}
