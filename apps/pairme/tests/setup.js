import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './e2e/msw/server.js';
import { resetRequestLog } from './e2e/msw/handlers.js';

// Global MSW lifecycle for every spec in this app's test tree, mirroring the
// standard MSW node testing setup. onUnhandledRequest: 'error' means a spec
// that hits a real endpoint no handler covers fails immediately and loudly.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  // @testing-library/react's automatic per-test cleanup only self-registers
  // when `afterEach` exists as a GLOBAL; this project's vitest config does
  // not set test.globals: true (tests import afterEach/describe/it
  // explicitly instead), so cleanup must be called explicitly here or
  // multiple renders across tests in the same file pile up in the same
  // jsdom document (duplicate "Aquitaine" etc. across tests).
  cleanup();
  server.resetHandlers();
  resetRequestLog();
  // api.js's identity (anon_id) is the only thing persisted to localStorage
  // (contract note in src/lib/api.js). Clear it between tests so each spec
  // gets a fresh POST /v1/session instead of silently reusing a stale one.
  localStorage.clear();
});

afterAll(() => server.close());
