import { createBrowserRouter, Navigate } from "react-router";
import { RootWrapper } from "./components/RootWrapper";
import { RootLayout } from "./components/RootLayout";
import { QMAdminLayout } from "./components/QMAdminLayout";
import { CustomersPage } from "./pages/CustomersPage";
import { QuoteMePage } from "./pages/QuoteMePage";
import { StartNewQuotePage } from "./pages/StartNewQuotePage";
import { QuoteBuilderPage } from "./pages/QuoteBuilderPage";
import { SettingsPage } from "./pages/SettingsPage";
import { QuotesPage } from "./pages/QuotesPage";
import { MapIngredientsPage } from "./pages/MapIngredientsPage";
import { ExportFinalizePage } from "./pages/ExportFinalizePage";
import { ErrorPage } from "./pages/ErrorPage";
import { AuthPage } from "./pages/AuthPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { QMAdminDashboard } from "./pages/admin/QMAdminDashboard";
import { QMAdminSignups } from "./pages/admin/QMAdminSignups";
import { QMAdminDistributors } from "./pages/admin/QMAdminDistributors";
import { QMAdminDistributorDetailPage } from "./pages/admin/QMAdminDistributorDetail";
import { QMAdminUnassociatedReps } from "./pages/admin/QMAdminUnassociatedReps";
import { QMAdminRestaurants } from "./pages/admin/QMAdminRestaurants";
import { QMAdminConferenceCommand } from "./pages/admin/QMAdminConferenceCommand";
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
        path: "reset-password",
        element: demo ? <Navigate to="/" replace /> : <ResetPasswordPage />,
      },
      {
        path: "qm-admin",
        Component: QMAdminLayout,
        children: [
          { index: true, Component: QMAdminDashboard },
          { path: "signups", Component: QMAdminSignups },
          { path: "distributors", Component: QMAdminDistributors },
          { path: "distributors/:id", Component: QMAdminDistributorDetailPage },
          { path: "unassociated-reps", Component: QMAdminUnassociatedReps },
          { path: "restaurants", Component: QMAdminRestaurants },
          { path: "conference-command", Component: QMAdminConferenceCommand },
        ],
      },
      {
        path: "/",
        Component: RootLayout,
        children: [
          { index: true, Component: StartNewQuotePage },
          ...(demo ? [] : [
            { path: "dashboard", Component: QuoteMePage },
            { path: "customers", Component: CustomersPage },
            { path: "quotes", Component: QuotesPage },
            { path: "settings", Component: SettingsPage },
            { path: "settings/billing", Component: SettingsPage },
          ]),
          { path: "start-new-quote", Component: StartNewQuotePage },
          { path: "quote-builder", Component: QuoteBuilderPage },
          { path: "map-ingredients", Component: MapIngredientsPage },
          { path: "export-finalize", Component: ExportFinalizePage },
          {
            path: "distributor-admin/*",
            element: (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <h1 className="text-2xl font-bold text-[#2A2A2A] mb-2">Distributor Admin</h1>
                <p className="text-gray-500 mb-6">Admin dashboard coming soon.</p>
                <a href="/dashboard" className="text-[#7FAEC2] hover:underline font-medium">Go to Rep Dashboard →</a>
              </div>
            ),
          },
        ],
      },
    ],
  },
]);
