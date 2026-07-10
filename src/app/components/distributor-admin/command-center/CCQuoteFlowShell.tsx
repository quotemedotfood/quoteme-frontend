// CCQuoteFlowShell -- consistent, chrome-less shell wrapper for the quote-build flow.
//
// History: this component used to special-case distributor_admin, wrapping the
// quote-build routes (/start-new-quote, /map-ingredients, /quote-builder,
// /export-finalize) in the full CCLayout (sidebar + sticky search bar) while
// every other role (chef, rep, guest, quoteme_admin, buyer) got a bare
// <Outlet/>. That produced two genuinely different quote-flow experiences --
// e.g. two different "map-ingredients" designs depending on who was looking --
// which is the divergence this component now exists to close.
//
// Fix (quoting-flow audit precursor): render ONE consistent surface for every
// role -- bare <Outlet/>, no CCLayout injection here. Rationale:
// * CCLayout carries a hard role guard (see CCLayout.tsx "B-42") that redirects
//   any role that can't access the Command Center -- wrapping every role in
//   CCLayout would have actively broken the flow for chef/rep/guest/buyer
//   instead of unifying it.
// * CCLayout's sidebar/search bar/counts are Command-Center-specific
//   (Today/Quotes/Assign/Team/Inbound nav, distributor-scoped API calls) and
//   don't describe "building a quote" for any role -- injecting it here was
//   incidental, not load-bearing.
// * Bare Outlet is already the experience for the majority of roles that
//   reach this route (rep, and -- via RootLayout's own role-aware chrome --
//   chef/group_admin/buyer get ChefTopbar and quoteme_admin gets AppSidebar
//   independently of this component). Removing the one-role special case
//   here makes CCQuoteFlowShell a true no-op pass-through, so the quote flow's
//   chrome is driven consistently by RootLayout for every role, not doubled
//   up by a second, role-specific shell layer.
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

import { Outlet } from 'react-router';

export function CCQuoteFlowShell() {
  // Consistent across roles: no CCLayout injection, no role branching.
  return <Outlet />;
}

// -- Pure helper (exported for unit tests) -----------------------------------

/**
 * Returns true when the CC shell should wrap the quote-build flow.
 * Always false now -- CCQuoteFlowShell no longer role-branches (see history
 * note above). Kept as a named export so existing call sites/tests have a
 * single source of truth to assert against rather than reading the component
 * internals directly.
 */
export function shouldUseCCShellForQuoteFlow(_role: string | undefined): boolean {
  return false;
}
