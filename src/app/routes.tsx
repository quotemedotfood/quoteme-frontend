import { createBrowserRouter, Navigate } from "react-router";
import { RootWrapper } from "./components/RootWrapper";
import { RootLayout } from "./components/RootLayout";
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
import { ChefQuoteReceiptPage } from "./pages/chef/ChefQuoteReceiptPage";
import { ChefOrderGuidePage } from "./pages/chef/ChefOrderGuidePage";
import { ChefWelcomePage } from "./pages/chef/ChefWelcomePage";
import { ChefCatalogSelectionPage } from "./pages/chef/ChefCatalogSelectionPage";
import { ChefPullEntryPage } from "./pages/chef/ChefPullEntryPage";
import { ChefPullStatusPage } from "./pages/chef/ChefPullStatusPage";
import { ChefPullReceiptPage } from "./pages/chef/ChefPullReceiptPage";
import { ChefShellLayout } from "./components/chef/ChefShellLayout";
import { ChefMenusPage } from "./pages/chef/ChefMenusPage";
import { ChefMenuDetailPage } from "./pages/chef/ChefMenuDetailPage";
import { CreateRestaurantPage } from "./pages/CreateRestaurantPage";
import { isDemoMode } from "./utils/demoMode";

const demo = isDemoMode();

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
        path: "chef/signup",
        Component: ChefSignupPage,
      },
      {
        path: "chef/welcome",
        Component: ChefWelcomePage,
      },
      {
        path: "chef",
        Component: ChefEntryPage,
      },
      {
        path: "chef/entry",
        Component: ChefEntryPage,
      },
      {
        path: "chef/status/:id",
        Component: ChefStatusPage,
      },
      {
        path: "chef/pull/entry",
        Component: ChefPullEntryPage,
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
          { index: true, Component: StartNewQuotePage },
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
              { path: "chef/catalog", Component: ChefCatalogSelectionPage },
            ],
          },
          ...(demo ? [] : [
            { path: "customers", Component: CustomersPage },
            { path: "vendors", Component: VendorsPage },
            { path: "vendors/:id", Component: VendorDetailPage },
            { path: "locations", Component: LocationPage },
            { path: "rep/quotes", Component: QuotesPage },
            { path: "quotes", Component: QuotesRoleRouter },
            { path: "settings", Component: SettingsPage },
            { path: "settings/billing", Component: SettingsPage },
          ]),
          { path: "upgrade", Component: PaywallPage },
          { path: "start-new-quote", Component: StartNewQuotePage },
          { path: "quote-builder", Component: QuoteBuilderPage },
          { path: "review", Component: QuoteReviewPage },
          { path: "map-ingredients", Component: MapIngredientsPage },
          { path: "export-finalize", Component: ExportFinalizePage },
          { path: "onboarding/confirm", Component: OnboardingConfirmPage },
          { path: "catalog/confirmation", Component: CatalogConfirmationPage },
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
