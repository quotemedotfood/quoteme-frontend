import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-[#FFF9F3] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center border border-[#F2993D]">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-[#F2993D]" />
        </div>
        <h1 className="text-2xl font-bold text-[#2A2A2A] mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          An unexpected error occurred. Please reload the page to continue.
        </p>

        {import.meta.env.DEV && error && (
          <div className="bg-gray-100 p-3 rounded text-left text-xs text-red-600 font-mono mb-6 overflow-auto max-h-32">
            {error.message}
          </div>
        )}

        <div className="space-y-3">
          {resetError && (
            <Button
              className="w-full bg-[#F39839] hover:bg-[#e08830] text-white"
              onClick={resetError}
            >
              Try again
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.assign('/')}
          >
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
