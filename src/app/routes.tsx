import { createBrowserRouter, Navigate } from "react-router";
import { RootWrapper } from "./components/RootWrapper";
import { RootLayout } from "./components/RootLayout";
import { QMAdminLayout } from "./components/QMAdminLayout";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardRoleRouter } from "./components/DashboardRoleRouter";
import { StartNewQuotePage } from "./pages/StartNewQuotePage";
import { QuoteBuilderPage } from "./pages/QuoteBuilderPage";
import { SettingsPage } from "./pages/SettingsPage";
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
import { ChefWelcomePage } from "./pages/chef/ChefWelcomePage";
import { ChefSettingsYou } from "./components/chef/ChefSettingsYou";
import { ChefSettingsRestaurant } from "./components/chef/ChefSettingsRestaurant";
import { ChefSettingsBilling } from "./components/chef/ChefSettingsBilling";
import { ChefSettingsOtherLocations } from "./components/chef/ChefSettingsOtherLocations";
import { ChefQuotesPage } from "./pages/chef/ChefQuotesPage";
import { ChefCatalogPage } from "./pages/chef/ChefCatalogPage";
import { ChefQuoteDetailPage } from "./pages/chef/ChefQuoteDetailPage";
import { ChefOrderGuideDetailPage } from "./pages/chef/ChefOrderGuideDetailPage";
import { DashboardDistributorsPage } from "./pages/chef/DashboardDistributorsPage";
import { DashboardOrderGuidesPage } from "./pages/chef/DashboardOrderGuidesPage";
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
      // ─── Chef flow action routes (single-purpose, outside dashboard shell) ───
      {
        path: "chef/welcome",
        Component: ChefWelcomePage,
      },
      {
        path: "chef/catalog",
        Component: ChefCatalogPage,
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
        path: "chef/quotes/:id",
        Component: ChefQuoteDetailPage,
      },
      {
        path: "chef/order-guide/:id",
        Component: ChefOrderGuideDetailPage,
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
          ...(demo ? [] : [
            { path: "dashboard", Component: DashboardRoleRouter },
            { path: "customers", Component: CustomersPage },
            { path: "vendors", Component: VendorsPage },
            { path: "vendors/:id", Component: VendorDetailPage },
            { path: "locations", Component: LocationPage },
            // /quotes is now the canonical chef Quotes tab (V3 A3).
            // Rep-flow quote list is accessible via sidebar link to /quotes.
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
          // ─── Chef dashboard tab routes (V3 canonical — A3) ──────────────────
          // Rendered inside ChefTabDesktopShell (NewspaperSidebar + topbar)
          // when user.role === 'chef' (RootLayout branches on role).
          { path: "quotes", Component: ChefQuotesPage },
          { path: "chef/dashboard", element: <Navigate to="/quotes" replace /> },
          // Dashboard namespace — Distributors / Order Guides / Settings
          { path: "dashboard/distributors", Component: DashboardDistributorsPage },
          { path: "dashboard/order-guides", Component: DashboardOrderGuidesPage },
          { path: "dashboard/settings", element: <Navigate to="/dashboard/settings/you" replace /> },
          { path: "dashboard/settings/you", Component: ChefSettingsYou },
          { path: "dashboard/settings/restaurant", Component: ChefSettingsRestaurant },
          { path: "dashboard/settings/billing", Component: ChefSettingsBilling },
          { path: "dashboard/settings/other-locations", Component: ChefSettingsOtherLocations },
        ],
      },
    ],
  },
]);
