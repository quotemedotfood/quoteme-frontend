import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './app/App';
import { ErrorFallback } from './app/components/ErrorFallback';
import { scrubSentryEvent, scrubSentrySpan } from './app/utils/scrubSentryEvent';
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
  // SECURITY: all three send hooks are wired, deliberately.
  //
  // beforeSend is gated behind isErrorEvent() inside @sentry/core, so it sees
  // ERROR events only. Transactions go to beforeSendTransaction and individual
  // spans to beforeSendSpan. With browserTracingIntegration enabled and
  // tracesSampleRate above zero, leaving those two unset means a pageload or
  // navigation transaction recorded on /chef/welcome?token=... ships the raw
  // magic-link token in request.url (httpContextIntegration sets request.url
  // and the Referer header on every event) and in the root span's url.full,
  // with the scrubber never running. Wiring only beforeSend is the leak.
  //
  // See src/app/utils/scrubSentryEvent.ts. The scrubber never throws and never
  // returns null, so these hooks cannot take telemetry offline.
  beforeSend(event) {
    // No-op when DSN is not configured (local dev without Sentry).
    if (!import.meta.env.VITE_SENTRY_DSN) return null;
    return scrubSentryEvent(event);
  },
  beforeSendTransaction(event) {
    if (!import.meta.env.VITE_SENTRY_DSN) return null;
    return scrubSentryEvent(event);
  },
  // Spans carry the URL in `description` and `data['url.full']`.
  //
  // This hook must return a span and never null, but NOT because null drops the
  // span. In v10 a null return is fail-OPEN: client.js:1056-1062 shows Sentry
  // warns ("Returning null from `beforeSendSpan` is disallowed") and then skips
  // the merge, so the event keeps the ORIGINAL UNSCRUBBED span values. The
  // consequence of returning null is therefore shipping the raw URL, which is
  // worse than a drop, so do not "simplify" this to a conditional return.
  //
  // No DSN means nothing is sent at all, so the span passes through untouched
  // rather than being nulled, for the same reason.
  beforeSendSpan(span) {
    if (!import.meta.env.VITE_SENTRY_DSN) return span;
    return scrubSentrySpan(span);
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
