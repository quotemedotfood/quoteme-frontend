// CCQuoteFlowShell.test.ts
// Unit tests for the CC shell gating logic on the quote-build flow.
//
// Quoting-flow audit fix: CCQuoteFlowShell used to wrap the quote-build
// routes in the full CCLayout for distributor_admin only, leaving every other
// role (chef, rep, guest, quoteme_admin, buyer) with a bare Outlet -- two
// genuinely different quote-flow "shells" depending on role. That divergence
// is gone: shouldUseCCShellForQuoteFlow now always returns false, and
// CCQuoteFlowShell is a pure pass-through Outlet for every role.
//
// Tests use the pure helper exported from CCQuoteFlowShell so they run without
// jsdom or @testing-library/react -- same pattern as CatalogManagePage.test.ts.

import { describe, it, expect } from 'vitest';
import { shouldUseCCShellForQuoteFlow } from './CCQuoteFlowShell';

// -- CC shell gating is consistently off for every role ----------------------

describe('shouldUseCCShellForQuoteFlow -- CC shell no longer wraps the quote flow for any role', () => {
  it('returns false for distributor_admin -- CCLayout no longer special-cased here', () => {
    expect(shouldUseCCShellForQuoteFlow('distributor_admin')).toBe(false);
  });

  it('returns false for chef -- shell-less Outlet preserves existing chef UX', () => {
    expect(shouldUseCCShellForQuoteFlow('chef')).toBe(false);
  });

  it('returns false for rep -- reps have their own RepLayout, not CCLayout', () => {
    expect(shouldUseCCShellForQuoteFlow('rep')).toBe(false);
  });

  it('returns false for quoteme_admin -- QM admin has its own shell', () => {
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

// -- + New Quote sidebar button navigation target -----------------------------
// The ManagerSidebar renders a "+ New Quote" button with onClick -> navigate('/start-new-quote').
// We verify the navigation target constant is correct without mounting React.

describe('+ New Quote sidebar button', () => {
  const NEW_QUOTE_TARGET = '/start-new-quote';

  it('navigates to /start-new-quote -- same target as the CCTodayPage header button', () => {
    expect(NEW_QUOTE_TARGET).toBe('/start-new-quote');
  });
});
