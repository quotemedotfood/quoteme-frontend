import { useEffect } from 'react';

/**
 * Hidden admin route for verifying Sentry capture post-deploy.
 * Navigate to /admin/sentry-test to trigger an intentional error.
 * Verify the event appears in the Sentry dashboard before removing this route.
 */
export function SentryTestPage() {
  useEffect(() => {
    throw new Error('FE Sentry verification -- intentional');
  }, []);

  return null;
}
