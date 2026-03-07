import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
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
            className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white"
            onClick={() => navigate('/')}
          >
            Return to Dashboard
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