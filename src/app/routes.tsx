import { createBrowserRouter, Navigate } from "react-router";
import { RootWrapper } from "./components/RootWrapper";
import { RootLayout } from "./components/RootLayout";
import { useAuth } from "./contexts/AuthContext";
import { QMAdminLayout } from "./components/QMAdminLayout";
import { CustomersPage } from "./pages/CustomersPage";
import { QuoteMePage } from "./pages/QuoteMePage";
import { DashboardRoleRouter } from "./components/DashboardRoleRouter";
import { StartNewQuotePage } from "./pages/StartNewQuotePage";
import { QuoteBuilderPage } from "./pages/QuoteBuilderPage";
import { SettingsPage } from "./pages/SettingsPage";
import { QuotesPage } from "./pages/QuotesPage";
import { ChefQuotesPage } from "./pages/chef/ChefQuotesPage";
import { QuotesRoleRouter } from "./components/QuotesRoleRouter";
import { MapIngredientsPage } from "./pages/MapIngredientsPage";
import { ExportFinalizePage } from "./pages/ExportFinalizePage";
import { QuoteReviewPage } from "./pages/QuoteReviewPage";
import { ErrorPage } from "./pages/ErrorPage";
import { AuthPage } from "./pages/AuthPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { QMAdminDashboard } from "./pages/admin/QMAdminDashboard";
import { QMAdminSignups } from "./pages/admin/QMAdminSignups";
import { QMAdminDistributors } from "./pages/admin/QMAdminDistributors";
import { QMAdminDistributorDetailPage } from "./pages/admin/QMAdminDistributorDetail";
import { QMAdminUnassociatedReps } from "./pages/admin/QMAdminUnassociatedReps";
import { QMAdminRestaurants } from "./pages/admin/QMAdminRestaurants";
import { QMAdminRestaurantDetailPage } from "./pages/admin/QMAdminRestaurantDetail";
import { QMAdminConferenceCommand } from "./pages/admin/QMAdminConferenceCommand";
import { QMAdminHealth } from "./pages/admin/QMAdminHealth";
import { QMAdminUsers } from "./pages/admin/QMAdminUsers";
import { QMAdminBrands } from "./pages/admin/QMAdminBrands";
import { QMAdminMatchingEngine } from "./pages/admin/QMAdminMatchingEngine";
import { QMAdminBrandRules } from "./pages/admin/QMAdminBrandRules";
import { QMAdminClusterLabels } from "./pages/admin/QMAdminClusterLabels";
import { QMAdminKnowledgeGapFiller } from "./pages/admin/QMAdminKnowledgeGapFiller";
import { QMAdminChefs } from "./pages/admin/QMAdminChefs";
import { QMAdminProductPipeline } from "./pages/admin/QMAdminProductPipeline";
import { SentryTestPage } from "./pages/admin/SentryTestPage";
import { QuotePreviewPage } from "./pages/QuotePreviewPage";
import { PaywallPage } from "./pages/PaywallPage";
import { OnboardingConfirmPage } from "./pages/OnboardingConfirmPage";
import { DistributorHomePage } from "./pages/DistributorHomePage";
import { DistributorCommandCenterPage } from "./pages/DistributorCommandCenterPage";
import { CCLayout } from "./components/distributor-admin/command-center/CCLayout";
import { CCTodayPage } from "./pages/command-center/CCTodayPage";
import { CCQuotesPage } from "./pages/command-center/CCQuotesPage";
import { CCQuoteDetailPage } from "./pages/command-center/CCQuoteDetailPage";
import { CCSoonPage } from "./pages/command-center/CCSoonPage";
import { CCAssignPage } from "./pages/command-center/CCAssignPage";
import { CCSearchPage } from "./pages/command-center/CCSearchPage";
import { CatalogManagePage } from "./pages/CatalogManagePage";
import { CatalogConfirmationPage } from "./pages/CatalogConfirmationPage";
import { RepInvitePage } from "./pages/RepInvitePage";
import { DistributorRepsPage } from "./pages/DistributorRepsPage";
import { OnboardingDocsPage } from "./pages/OnboardingDocsPage";
import { VendorsPage } from "./pages/VendorsPage";
import { VendorDetailPage } from "./pages/VendorDetailPage";
import { LocationPage } from "./pages/LocationPage";
import { ChefSignupPage } from "./pages/chef/ChefSignupPage";
import { ChefEntryPage } from "./pages/chef/ChefEntryPage";
import { ChefStatusPage } from "./pages/chef/ChefStatusPage";
import { QuoteStateDocumentPreviewPage } from "./pages/chef/QuoteStateDocumentPreviewPage";
import { RepCatalogEmailPreviewPage } from "./pages/chef/RepCatalogEmailPreviewPage";
import { ChefCatalogEmailPreviewPage } from "./pages/chef/ChefCatalogEmailPreviewPage";
import { ChefQuoteReceiptPage } from "./pages/chef/ChefQuoteReceiptPage";
import { ChefOrderGuidePage } from "./pages/chef/ChefOrderGuidePage";
import { ChefWelcomePage } from "./pages/chef/ChefWelcomePage";
import { ChefCatalogSelectionPage } from "./pages/chef/ChefCatalogSelectionPage";
import { ChefPullEntryPage } from "./pages/chef/ChefPullEntryPage";
import { ChefPullStatusPage } from "./pages/chef/ChefPullStatusPage";
import { ChefPullReceiptPage } from "./pages/chef/ChefPullReceiptPage";
import { ChefDistributorEntryPage } from "./pages/chef/ChefDistributorEntryPage";
import { ChefDistributorDetailPage } from "./pages/chef/ChefDistributorDetailPage";
import { ChefShellLayout } from "./components/chef/ChefShellLayout";
import { ChefMenusPage } from "./pages/chef/ChefMenusPage";
import { ChefMenuDetailPage } from "./pages/chef/ChefMenuDetailPage";
import { ChefMenuStackPage } from "./pages/chef/ChefMenuStackPage";
import { CreateRestaurantPage } from "./pages/CreateRestaurantPage";
import { isDemoMode } from "./utils/demoMode";
import { RepWelcomePage } from "./pages/rep/RepWelcomePage";
import { RepInviteAcceptPage } from "./pages/RepInviteAcceptPage";
import { RepTriagePage } from "./pages/rep/RepTriagePage";
import { RepIncomingQuotePage } from "./pages/rep/RepIncomingQuotePage";
import { RepCustomersPage } from "./pages/rep/RepCustomersPage";
import { RepProfilePage } from "./pages/rep/RepProfilePage";
import { RepLayout } from "./components/rep/RepLayout";
import { useAuth } from "./contexts/AuthContext";
import { TechLandingPage } from "./components/chef/TechLandingPage";
import { SecureTechPreviewPage } from "./pages/chef/SecureTechPreviewPage";
import { DistributorLanderPage } from "./pages/DistributorLanderPage";
// ── Brand suite ──────────────────────────────────────────────────────────────
import { BrandShellLayout } from "./components/brand/BrandShellLayout";
import { BrandSignupPage } from "./pages/brand/BrandSignupPage";
import { BrandDashboardPage } from "./pages/brand/BrandDashboardPage";
import { BrandCatalogPage } from "./pages/brand/BrandCatalogPage";
import { BrandCapturePage } from "./pages/brand/BrandCapturePage";
import { BrandPackagesPage } from "./pages/brand/BrandPackagesPage";
import { BrandDistributorsPage } from "./pages/brand/BrandDistributorsPage";
import { BrandNotificationsPage } from "./pages/brand/BrandNotificationsPage";
import { BrandSettingsPage } from "./pages/brand/BrandSettingsPage";
import { BrandProfilePage } from "./pages/brand/BrandProfilePage";
import { BrandTeamPage } from "./pages/brand/BrandTeamPage";

const demo = isDemoMode();

// RootIndex — bare domain redirect.
// RootLayout already guards unauthenticated users (→ /auth), so by the time
// this component renders the user is always authenticated. Send them straight
// to /dashboard; role-routing lives inside DashboardRoleRouter.
function RootIndex() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  // Unauthenticated path: RootLayout would have already redirected to /auth,
  // but guard here defensively so landing on "/" never shows a blank screen.
  return <Navigate to="/auth" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootWrapper,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "auth",
        element: demo ? <Navigate to="/" replace /> : <AuthPage />,
      },
      {
        // Brand signup — public, no JWT required.
        // Lives outside RootLayout so brand visitors arriving directly
        // are not bounced to /auth before they have an account.
        path: "brand/signup",
        Component: BrandSignupPage,
      },
      {
        // Brand suite — requires role: "brand" JWT.
        // BrandShellLayout enforces the brand guard (non-brand → redirect
        // to their own home). ALL brand-facing surfaces live here.
        // Doctrine: brands receive NO quotes; no rep/distributor chrome here.
        path: "brand",
        Component: BrandShellLayout,
        children: [
          { index: true,           Component: BrandDashboardPage },
          { path: "catalog",       Component: BrandCatalogPage },
          { path: "capture",       Component: BrandCapturePage },
          { path: "packages",      Component: BrandPackagesPage },
          { path: "packages/:id",  Component: BrandPackagesPage },
          { path: "distributors",  Component: BrandDistributorsPage },
          { path: "notifications", Component: BrandNotificationsPage },
          { path: "settings",      Component: BrandSettingsPage },
          { path: "profile",       Component: BrandProfilePage },
          { path: "team",          Component: BrandTeamPage },
        ],
      },
      {
        path: "chef/signup",
        Component: ChefSignupPage,
      },
      {
        path: "chef/welcome",
        Component: ChefWelcomePage,
      },
      {
        // Rep magic-link landing — MUST live outside RootLayout so reps
        // arriving via email with no JWT aren't bounced to /auth.
        // Exactly mirrors how chef/welcome is placed.
        path: "rep/welcome",
        Component: RepWelcomePage,
      },
      {
        // Rep invite-accept / set-password landing (LAUNCH-B1 FE-1).
        // MUST live outside RootLayout — reps arriving via email invite link
        // have no JWT and must not be bounced to /auth.
        // URL shape: /rep/invite?token=<64-hex-char-token>
        path: "rep/invite",
        Component: RepInviteAcceptPage,
      },
      {
        // SU-FE-3: Token-gated public catalog upload landing.
        // MUST live outside RootLayout — catalog person arrives via forwarded
        // link with no JWT and must not be bounced to /auth.
        // No QuoteMe account required to use this page.
        // URL shape: /c/:token  (7-day single-use token minted when chef asks)
        path: "c/:token",
        Component: TechLandingPage,
      },
      {
        // SU-FE-3 visual sign-off — TechLandingPage idle/sent/expired frames.
        // Remove once Moose signs off on all three states.
        path: "chef/_preview/secure-tech",
        Component: SecureTechPreviewPage,
      },
      {
        // F1 branded standing lander — public, no auth required.
        // MUST live outside RootLayout so unauthenticated visitors are not
        // bounced to /auth.
        // URL shape: /d/:slug  (e.g. /d/lipari, /d/sysco-test)
        // Slug today comes from useParams; host-based resolution seam is in
        // resolveSlug() inside DistributorLanderPage.tsx.
        path: "d/:slug",
        Component: DistributorLanderPage,
      },
      {
        path: "chef",
        Component: ChefEntryPage,
      },
      {
        // Retired route — redirects to the canonical new-distributor entry surface.
        // ChefEntryPage.tsx is kept (its drag-zone pattern is reused in pull entry).
        // Chef v4 Doctrine Day will restructure /chef/distributor/new further.
        path: "chef/entry",
        element: <Navigate to="/chef/distributor/new" replace />,
      },
      {
        path: "chef/status/:id",
        Component: ChefStatusPage,
      },
      {
        // TEMPORARY — D6 QuoteStateDocument visual sign-off (Item 3).
        // Remove once wired into ChefQuoteReceiptPage (Item 4, gated on C3).
        path: "chef/_preview/quote-states",
        Component: QuoteStateDocumentPreviewPage,
      },
      {
        // SU-FE-2 visual sign-off — RepCatalogEmail mobile + desktop frames.
        // Remove once the BE wires up the rep-email trigger (or when Moose signs off).
        path: "chef/_preview/rep-email",
        Component: RepCatalogEmailPreviewPage,
        // SU-FE-5 visual sign-off — ChefCatalogEmail mobile + desktop frames.
        // Remove once the BE wires up the chef catalog-live email trigger.
        path: "chef/_preview/chef-catalog-email",
        Component: ChefCatalogEmailPreviewPage,
      },
      {
        path: "chef/pull/status/:id",
        Component: ChefPullStatusPage,
      },
      {
        path: "chef/pull/receipt/:id",
        Component: ChefPullReceiptPage,
      },
      {
        path: "reset-password",
        element: demo ? <Navigate to="/" replace /> : <ResetPasswordPage />,
      },
      {
        path: "quotes/:id/preview",
        Component: QuotePreviewPage,
      },
      {
        path: "qm-admin",
        Component: QMAdminLayout,
        children: [
          { index: true, Component: QMAdminDashboard },
          { path: "signups", Component: QMAdminSignups },
          { path: "users", Component: QMAdminUsers },
          { path: "distributors", Component: QMAdminDistributors },
          { path: "distributors/:id", Component: QMAdminDistributorDetailPage },
          { path: "unassociated-reps", Component: QMAdminUnassociatedReps },
          { path: "restaurants", Component: QMAdminRestaurants },
          { path: "restaurants/:id", Component: QMAdminRestaurantDetailPage },
          { path: "matching-engine", Component: QMAdminMatchingEngine },
          { path: "brands", Component: QMAdminBrands },
          { path: "brand-rules", Component: QMAdminBrandRules },
          { path: "cluster-labels", Component: QMAdminClusterLabels },
          { path: "knowledge-gaps", element: <Navigate to="/qm-admin/knowledge-gap-filler" replace /> },
          { path: "knowledge-gap-filler", Component: QMAdminKnowledgeGapFiller },
          { path: "chefs", Component: QMAdminChefs },
          { path: "product-pipeline", Component: QMAdminProductPipeline },
          { path: "conference-command", Component: QMAdminConferenceCommand },
          { path: "health", Component: QMAdminHealth },
          // Hidden verification route: navigate here post-deploy to confirm
          // Sentry captures FE exceptions. Remove once verified.
          { path: "sentry-test", Component: SentryTestPage },
        ],
      },
      {
        Component: RootLayout,
        children: [
          { index: true, Component: RootIndex },
          // ── Chef shell layout — persistent tab chrome across chef sub-routes ──
          // ChefShellLayout derives activeTab from useLocation() so sidebar/bar
          // highlight stays in sync with direct URL navigation.
          {
            Component: ChefShellLayout,
            children: [
              ...(demo ? [] : [
                { path: "dashboard", Component: DashboardRoleRouter },
                { path: "chef/quotes", Component: ChefQuotesPage },
                { path: "chef/menus", Component: ChefMenusPage },
              ]),
              { path: "chef/quotes/:id", Component: ChefQuoteReceiptPage },
              { path: "chef/order-guide/:id", Component: ChefOrderGuidePage },
              { path: "chef/menus/:id", Component: ChefMenuDetailPage },
              // STACK-FE-1: compare-spread table. Static segment 'stack' takes
              // precedence over future dynamic sibling if one is added.
              { path: "chef/menus/:menuId/stack", Component: ChefMenuStackPage },
              { path: "chef/catalog", Component: ChefCatalogSelectionPage },
              { path: "chef/distributor/new", Component: ChefDistributorEntryPage },
              // B3b: distributor detail. 'new' (static) takes precedence over
              // ':id' (dynamic) in react-router — no collision.
              { path: "chef/distributor/:id", Component: ChefDistributorDetailPage },
              // Pull-entry mounted inside the shell so it gets sidebar/tab chrome.
              { path: "chef/pull/entry", Component: ChefPullEntryPage },
            ],
          },
          ...(demo ? [] : [
            { path: "customers", Component: CustomersPage },
            { path: "vendors", Component: VendorsPage },
            { path: "vendors/:id", Component: VendorDetailPage },
            { path: "locations", Component: LocationPage },
            { path: "quotes", Component: QuotesRoleRouter },
            { path: "settings", Component: SettingsPage },
            { path: "settings/billing", Component: SettingsPage },
            // ── Rep suite routes (auth-guarded via RootLayout) ──────────────
            // /rep/welcome is placed OUTSIDE RootLayout (pre-auth, magic link).
            //
            // RepLayout is a persistent shell that holds sidebar useState — it
            // never unmounts across /rep/* transitions, so sidebar mode (open /
            // collapsed / hidden) survives navigation. Pages render bare content
            // bodies; RepLayout supplies sidebar + main chrome via <Outlet />.
            //
            // Route hierarchy:
            //   /rep/quotes              → redirects to /rep/quotes/inbound (index)
            //   /rep/quotes/inbound      → RepTriagePage (was /rep/triage)
            //   /rep/quotes/history      → QuotesPage (was /rep/quotes)
            //   /rep/quotes/:id          → RepIncomingQuotePage (unchanged)
            //
            // Legacy redirect: /rep/triage → /rep/quotes/inbound
            {
              path: "rep/triage",
              element: <Navigate to="/rep/quotes/inbound" replace />,
            },
            {
              path: "rep",
              Component: RepLayout,
              children: [
                {
                  path: "quotes",
                  children: [
                    { index: true, element: <Navigate to="/rep/quotes/inbound" replace /> },
                    { path: "inbound", Component: RepTriagePage },
                    { path: "history", Component: QuotesPage },
                    // Detail route must be nested here so /rep/quotes/:id still resolves.
                    // The :id segment won't collide with "inbound"/"history" because
                    // react-router matches static segments before dynamic ones.
                    { path: ":id", Component: RepIncomingQuotePage },
                  ],
                },
                // Card 11 (Desi Lock D-2): customer list shell — list only,
                // no Add Customer form (Moose's track).
                { path: "customers", Component: RepCustomersPage },
                { path: "profile", Component: RepProfilePage },
              ],
            },
          ]),
          { path: "upgrade", Component: PaywallPage },
          { path: "start-new-quote", Component: StartNewQuotePage },
          { path: "quote-builder", Component: QuoteBuilderPage },
          { path: "review", Component: QuoteReviewPage },
          { path: "map-ingredients", Component: MapIngredientsPage },
          { path: "export-finalize", Component: ExportFinalizePage },
          { path: "onboarding/confirm", Component: OnboardingConfirmPage },
          { path: "catalog/confirmation", Component: CatalogConfirmationPage },
          // ── Command Center (B2-CC) — nested layout + routes ──────────────
          // CCLayout is the persistent shell (sidebar + sticky CCSearchBar).
          // The old DistributorCommandCenterPage (v0 RepActivitySection table)
          // is superseded by this nested route tree. The import is retained to
          // avoid breaking any existing deep link until traffic confirms zero
          // usage; it is not rendered by any active route.
          {
            path: "distributor-admin/command-center",
            Component: CCLayout,
            children: [
              { index: true,             Component: CCTodayPage },
              { path: "quotes",          Component: CCQuotesPage },
              { path: "quotes/:quoteId", Component: CCQuoteDetailPage },
              { path: "assign",          Component: CCAssignPage },
              { path: "search",          Component: CCSearchPage },
              { path: "team",            element: <CCSoonPage title="Team view lands shortly." /> },
              { path: "inbound",         element: <CCSoonPage title="Inbound lands shortly." /> },
            ],
          },
          { path: "distributor-admin/catalog", Component: CatalogManagePage },
          { path: "distributor-admin/invite", Component: RepInvitePage },
          { path: "distributor-admin/reps", Component: DistributorRepsPage },
          { path: "distributor-admin/onboarding-docs", Component: OnboardingDocsPage },
          { path: "distributor-admin/restaurants/new", Component: CreateRestaurantPage },
          { path: "distributor-admin", Component: DistributorHomePage },
          { path: "liquor", Component: StartNewQuotePage },
          { path: "liquor/*", Component: StartNewQuotePage },
        ],
      },
    ],
  },
]);
