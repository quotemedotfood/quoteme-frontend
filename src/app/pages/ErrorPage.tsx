import { useRouteError, isRouteErrorResponse, useNavigate, useLocation } from "react-router";
import { Button } from "../components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * P0 route/shell guard, item 2: surface-aware error recovery.
 *
 * This page renders at the root errorElement, OUTSIDE AppProviders (the
 * error replaces RootWrapper), so it cannot read AuthContext. The failing
 * URL's prefix is the deterministic signal for which shell the user was in,
 * and recovery must stay inside that shell: a QM admin failing on
 * /qm-admin/* must never be hard-routed to /dashboard, where the rep shell
 * mounts with cached quote history. (The bad-URL trigger is deterministic
 * for the historical wrong-shell class, but it is NOT the root cause of
 * that class.)
 *
 * Exported for unit testing.
 */
export function errorRecoveryTarget(pathname: string): { label: string; path: string } {
  if (pathname.startsWith("/qm-admin")) {
    return { label: "Return to Dashboard", path: "/qm-admin" };
  }
  if (pathname.startsWith("/distributor-admin")) {
    return { label: "Return to Command Center", path: "/distributor-admin/command-center" };
  }
  if (pathname.startsWith("/brand")) {
    return { label: "Return to Dashboard", path: "/brand" };
  }
  if (pathname.startsWith("/chef") || pathname.startsWith("/d/")) {
    return { label: "Start over", path: "/chef/distributor/new" };
  }
  // /rep/*, /dashboard, quote-flow pages, and anything else: /dashboard is
  // safe because DashboardRoleRouter role-branches every non-rep role away
  // from the rep shell (including quoteme_admin, see that file).
  return { label: "Return to Dashboard", path: "/dashboard" };
}

export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();
  let errorMessage: string;

  if (isRouteErrorResponse(error)) {
    // error is type `ErrorResponse`
    errorMessage = error.statusText || error.data?.message || "Unknown error";
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    console.error(error);
    errorMessage = 'Unknown error';
  }

  const { label: primaryLabel, path: primaryPath } = errorRecoveryTarget(location.pathname);

  return (
    <div className="min-h-screen bg-[#FFF9F3] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center border border-[#F2993D]">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-[#F2993D]" />
        </div>
        <h1 className="text-2xl font-bold text-[#2A2A2A] mb-2">Oops! Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          {errorMessage === "Not Found" 
            ? "The page you are looking for does not exist." 
            : "An unexpected error occurred."}
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-3 rounded text-left text-xs text-red-600 font-mono mb-6 overflow-auto max-h-32">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <Button 
            className="w-full bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
            onClick={() => navigate(primaryPath)}
          >
            {primaryLabel}
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}