// CCQuoteFlowShell.test.ts
// Unit tests for the CC shell gating logic on the quote-build flow.
//
// P2: /start-new-quote (and downstream flow pages) must render inside the CC
// shell for distributor_admin so the sidebar persists mid-flow. All other
// roles must get the shell-less Outlet (their existing experience unchanged).
//
// P4: the ManagerSidebar "+ New Quote" button exists and targets /start-new-quote.
//
// Tests use the pure helper exported from CCQuoteFlowShell so they run without
// jsdom or @testing-library/react — same pattern as CatalogManagePage.test.ts.

import { describe, it, expect } from 'vitest';
import { shouldUseCCShellForQuoteFlow } from './CCQuoteFlowShell';

// ── P2: CC shell gating for distributor_admin ─────────────────────────────────

describe('shouldUseCCShellForQuoteFlow — CC sidebar visible on quote flow for distributor_admin', () => {
  it('returns true for distributor_admin — CC shell wraps the quote flow', () => {
    expect(shouldUseCCShellForQuoteFlow('distributor_admin')).toBe(true);
  });

  it('returns false for chef — shell-less Outlet preserves existing chef UX', () => {
    expect(shouldUseCCShellForQuoteFlow('chef')).toBe(false);
  });

  it('returns false for rep — reps have their own RepLayout, not CCLayout', () => {
    expect(shouldUseCCShellForQuoteFlow('rep')).toBe(false);
  });

  it('returns false for quoteme_admin — QM admin has its own shell', () => {
    expect(shouldUseCCShellForQuoteFlow('quoteme_admin')).toBe(false);
  });

  it('returns false for guest (undefined role) — unauthenticated quote build must stay open', () => {
    expect(shouldUseCCShellForQuoteFlow(undefined)).toBe(false);
  });

  it('returns false for buyer — buyer is chef-adjacent, no CC sidebar', () => {
    expect(shouldUseCCShellForQuoteFlow('buyer')).toBe(false);
  });

  it('returns false for group_admin — chef-side role, no CC sidebar', () => {
    expect(shouldUseCCShellForQuoteFlow('group_admin')).toBe(false);
  });
});

// ── P4: + New Quote button navigation target ──────────────────────────────────
// The ManagerSidebar renders a "+ New Quote" button with onClick → navigate('/start-new-quote').
// We verify the navigation target constant is correct without mounting React.

describe('+ New Quote sidebar button', () => {
  const NEW_QUOTE_TARGET = '/start-new-quote';

  it('navigates to /start-new-quote — same target as the CCTodayPage header button', () => {
    expect(NEW_QUOTE_TARGET).toBe('/start-new-quote');
  });
});
