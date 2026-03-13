import { createBrowserRouter, Navigate } from "react-router";
import { RootWrapper } from "./components/RootWrapper";
import { RootLayout } from "./components/RootLayout";
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
        ],
      },
    ],
  },
]);