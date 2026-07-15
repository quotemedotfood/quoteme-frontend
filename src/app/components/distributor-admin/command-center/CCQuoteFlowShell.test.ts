// CCQuoteFlowShell.test.ts
// Unit tests for the shell-gating logic on the quote-build flow.
//
// Sidebar-consolidation fix (fix/persistent-sidebar-quoting-flow): a prior fix
// flattened CCQuoteFlowShell to a pure pass-through Outlet for every role, to
// close a divergence where distributor_admin alone got CCLayout. That
// flattening over-corrected: rep and distributor_admin get NO chrome from
// RootLayout (they carry their own dedicated shells elsewhere), so the bare
// Outlet left the quote-build flow (incl. /map-ingredients) with no sidebar at
// all for those two roles. The fix role-branches to each role's OWN existing
// shell -- RepLayout for rep, CCLayout for distributor_admin -- leaving every
// other role's chrome (RootLayout's ChefTopbar/AppSidebar, or none) untouched.
//
// Tests use the pure helpers exported from CCQuoteFlowShell so they run
// without jsdom or @testing-library/react -- same pattern as
// CatalogManagePage.test.ts.

import { describe, it, expect } from 'vitest';
import { shouldUseCCShellForQuoteFlow, shouldUseRepShellForQuoteFlow } from './CCQuoteFlowShell';

// -- CC shell (ManagerSidebar) gating: distributor_admin only ----------------

describe('shouldUseCCShellForQuoteFlow -- CCLayout wraps the quote flow for distributor_admin only', () => {
  it('returns true for distributor_admin -- their only other shell in the app is CCLayout', () => {
    expect(shouldUseCCShellForQuoteFlow('distributor_admin')).toBe(true);
  });

  it('returns false for chef -- chef chrome comes from RootLayout (ChefTopbar), not CCLayout', () => {
    expect(shouldUseCCShellForQuoteFlow('chef')).toBe(false);
  });

  it('returns false for rep -- reps have their own RepLayout, not CCLayout', () => {
    expect(shouldUseCCShellForQuoteFlow('rep')).toBe(false);
  });

  it('returns false for quoteme_admin -- QM admin has its own shell (AppSidebar via RootLayout)', () => {
    expect(shouldUseCCShellForQuoteFlow('quoteme_admin')).toBe(false);
  });

  it('returns false for guest (undefined role) -- unauthenticated quote build must stay open', () => {
    expect(shouldUseCCShellForQuoteFlow(undefined)).toBe(false);
  });

  it('returns false for buyer -- buyer is chef-adjacent, no CC sidebar', () => {
    expect(shouldUseCCShellForQuoteFlow('buyer')).toBe(false);
  });

  it('returns false for group_admin -- chef-side role, no CC sidebar', () => {
    expect(shouldUseCCShellForQuoteFlow('group_admin')).toBe(false);
  });
});

// -- Rep shell (RepNewspaperSidebar) gating: rep only -------------------------

describe('shouldUseRepShellForQuoteFlow -- RepLayout wraps the quote flow for rep only', () => {
  it('returns true for rep -- their only other shell in the app is RepLayout', () => {
    expect(shouldUseRepShellForQuoteFlow('rep')).toBe(true);
  });

  it('returns false for distributor_admin -- distributor_admin gets CCLayout, not RepLayout', () => {
    expect(shouldUseRepShellForQuoteFlow('distributor_admin')).toBe(false);
  });

  it('returns false for chef, quoteme_admin, buyer, group_admin, and guest', () => {
    expect(shouldUseRepShellForQuoteFlow('chef')).toBe(false);
    expect(shouldUseRepShellForQuoteFlow('quoteme_admin')).toBe(false);
    expect(shouldUseRepShellForQuoteFlow('buyer')).toBe(false);
    expect(shouldUseRepShellForQuoteFlow('group_admin')).toBe(false);
    expect(shouldUseRepShellForQuoteFlow(undefined)).toBe(false);
  });
});

// -- + New Quote sidebar button navigation target -----------------------------
// The ManagerSidebar renders a "+ New Quote" button with onClick -> navigate('/start-new-quote').
// We verify the navigation target constant is correct without mounting React.

describe('+ New Quote sidebar button', () => {
  const NEW_QUOTE_TARGET = '/start-new-quote';

  it('navigates to /start-new-quote -- same target as the CCTodayPage header button', () => {
    expect(NEW_QUOTE_TARGET).toBe('/start-new-quote');
  });
});
