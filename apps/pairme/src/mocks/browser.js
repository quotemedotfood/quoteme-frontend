import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

export const worker = setupWorker(...handlers);

/**
 * Starts the mock worker. Backend is not deployed for the endpoints in
 * handlers.js (session/profile/demo/rules-bundle/pairings/rating/account),
 * so this runs unconditionally for this app: unmatched requests (e.g. GET
 * /v1/venues, which IS deployed) fall straight through to the real network
 * (`onUnhandledRequest: 'bypass'`), so the existing onboarding/venue-search
 * flow is unaffected.
 */
export function startMockWorker() {
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}
