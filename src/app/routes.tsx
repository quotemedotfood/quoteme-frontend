import { createBrowserRouter } from "react-router";
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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootWrapper,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        Component: RootLayout,
        children: [
          { index: true, Component: QuoteMePage },
          { path: "customers", Component: CustomersPage },
          { path: "quotes", Component: QuotesPage },
          { path: "start-new-quote", Component: StartNewQuotePage },
          { path: "quote-builder", Component: QuoteBuilderPage },
          { path: "settings", Component: SettingsPage },
          { path: "settings/billing", Component: SettingsPage },
          { path: "map-ingredients", Component: MapIngredientsPage },
          { path: "export-finalize", Component: ExportFinalizePage },
        ],
      },
    ],
  },
]);