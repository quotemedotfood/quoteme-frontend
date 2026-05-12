import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './app/App';
import { ErrorFallback } from './app/components/ErrorFallback';
import './styles/index.css';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  release: import.meta.env.VITE_RELEASE_SHA || 'dev',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // No-op when DSN is not configured (local dev without Sentry).
    return import.meta.env.VITE_SENTRY_DSN ? event : null;
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error as Error} resetError={resetError} />
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
