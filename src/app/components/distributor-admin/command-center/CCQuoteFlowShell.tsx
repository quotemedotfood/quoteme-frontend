// CCQuoteFlowShell — role-aware shell wrapper for the quote-build flow.
//
// Problem: /start-new-quote (and the downstream flow pages) are top-level
// routes outside CCLayout. When a distributor_admin navigates there from the
// Command Center, the CC sidebar/shell disappears.
//
// Fix: wrap the quote-flow routes in this pathless layout route. For
// distributor_admin users it renders the full CCLayout (sidebar + search bar)
// around the Outlet. For every other role (chef, rep, guest, quoteme_admin,
// buyer) it renders Outlet directly — identical to the previous shell-less
// behaviour, so no existing flow is broken.
//
// Usage in routes.tsx:
//   {
//     Component: CCQuoteFlowShell,
//     children: [
//       { path: "start-new-quote", Component: StartNewQuotePage },
//       { path: "map-ingredients",  Component: MapIngredientsPage },
//       { path: "quote-builder",   Component: QuoteBuilderPage },
//       { path: "export-finalize", Component: ExportFinalizePage },
//     ],
//   }
//
// Design notes:
// • Imports CCLayout (not a re-implementation) so sidebar state, counts, and
//   search bar are identical to the rest of the CC shell.
// • Uses useAuth() — same hook used by every other role gate in RootLayout.
// • No gradient colors. No AppSidebar (that's the old shell for non-CC users).

import { Outlet } from 'react-router';
import { useAuth } from '../../../contexts/AuthContext';
import { CCLayout } from './CCLayout';

export function CCQuoteFlowShell() {
  const { user } = useAuth();

  if (user?.role === 'distributor_admin') {
    // Render the full CC shell (sidebar + search bar) with the page as Outlet.
    return <CCLayout />;
  }

  // All other roles: no CC shell — Outlet only, preserving existing behaviour.
  return <Outlet />;
}

// ── Pure helper (exported for unit tests) ────────────────────────────────────

/**
 * Returns true when the CC shell should wrap the quote-build flow.
 * Extracted as a pure function so tests don't need jsdom / router context.
 */
export function shouldUseCCShellForQuoteFlow(role: string | undefined): boolean {
  return role === 'distributor_admin';
}
