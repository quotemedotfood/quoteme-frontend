// CCQuoteFlowShell -- role-routed shell wrapper for the quote-build flow.
//
// History: this component used to special-case distributor_admin, wrapping the
// quote-build routes (/start-new-quote, /map-ingredients, /quote-builder,
// /export-finalize) in the full CCLayout (sidebar + sticky search bar) while
// every other role (chef, rep, guest, quoteme_admin, buyer) got a bare
// <Outlet/>. That produced two genuinely different quote-flow experiences --
// e.g. two different "map-ingredients" designs depending on who was looking --
// so a prior fix flattened this to a pure pass-through Outlet for every role.
//
// That flattening over-corrected: RootLayout deliberately never renders
// AppSidebar for rep or distributor_admin (see RootLayout.tsx's AppSidebar
// condition) because those two roles carry their OWN dedicated sidebar shells
// elsewhere (RepLayout for /rep/*, CCLayout for /distributor-admin/command-
// center/* + satellite pages). With CCQuoteFlowShell as a bare Outlet, rep and
// distributor_admin users landed on the quote-build flow with NO sidebar at
// all -- the dashboard-always-one-click-away rule broke specifically on
// /map-ingredients and its siblings (Moose, sidebar-consolidation audit).
//
// Fix (persistent-sidebar-quoting-flow): role-branch to each role's OWN
// existing shell -- not one shell for everyone, which is what caused the
// original divergence bug this component was built to close:
// * rep              -> RepLayout (RepNewspaperSidebar, collapsible)
// * distributor_admin -> CCLayout (ManagerSidebar, collapsible)
// * everyone else     -> bare <Outlet/>, unchanged. Chef/group_admin/buyer
//   get ChefTopbar and quoteme_admin gets AppSidebar independently, both via
//   RootLayout -- this component must not add a second chrome layer for them.
//
// Why this doesn't reintroduce the old bug: the old bug was ONE role
// (distributor_admin) getting CCLayout while every other role got nothing --
// a single shell picked for the whole flow. This is each role getting its OWN
// pre-existing shell (or none, where RootLayout already supplies one) --
// no role is left divergent from how it's chromed everywhere else in the app.
//
// CCLayout's hard role guard (see CCLayout.tsx "B-42": non-distributor_admin
// roles get redirected out of the Command Center) is a non-issue here because
// CCLayout is only reached when role IS distributor_admin.
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
import { useAuth } from '../../../contexts/AuthContext';
import { RepLayout } from '../../rep/RepLayout';
import { CCLayout } from './CCLayout';

export function CCQuoteFlowShell() {
  const { user } = useAuth();

  if (shouldUseRepShellForQuoteFlow(user?.role)) {
    // RepLayout renders its own <Outlet/> when not given children, so the
    // matched quote-flow page (StartNewQuotePage/MapIngredientsPage/etc.)
    // renders inside it exactly as it would under /rep/*.
    return <RepLayout />;
  }

  if (shouldUseCCShellForQuoteFlow(user?.role)) {
    return <CCLayout />;
  }

  // Unchanged for every other role: no CCLayout/RepLayout injection here.
  return <Outlet />;
}

// -- Pure helpers (exported for unit tests) ----------------------------------

/**
 * Returns true when the CC shell (ManagerSidebar) should wrap the quote-build
 * flow -- true ONLY for distributor_admin, whose only other sidebar-bearing
 * shell in the app is CCLayout.
 */
export function shouldUseCCShellForQuoteFlow(role: string | undefined): boolean {
  return role === 'distributor_admin';
}

/**
 * Returns true when the rep shell (RepNewspaperSidebar) should wrap the
 * quote-build flow -- true ONLY for rep, whose only other sidebar-bearing
 * shell in the app is RepLayout.
 */
export function shouldUseRepShellForQuoteFlow(role: string | undefined): boolean {
  return role === 'rep';
}
