// FE-TESTING epic slice 1 — global setup for DOM-rendering (jsdom) tests.
//
// Only test files that opt into the jsdom environment (via the
// `// @vitest-environment jsdom` pragma at the top of the file) load a DOM,
// so this setup only matters for those files. It adds jest-dom's custom
// matchers (toBeDisabled, toBeEnabled, toBeInTheDocument, etc.) on top of
// vitest's `expect`.
import '@testing-library/jest-dom/vitest';

// FE-TESTING epic slice 3: this repo does not set `test.globals: true` in
// vite.config.ts (test files import `describe`/`it`/`expect` explicitly), so
// @testing-library/react's own auto-cleanup-on-globalThis.afterEach never
// registers. Without this, a jsdom test file with more than one render leaks
// DOM nodes across tests within the same file — a later `screen.findByRole`
// can match a stale node left over from an earlier test in the same file
// instead of the current render. Guarded on `document` existing so it's a
// no-op for node-environment (non-jsdom) test files sharing this setup file.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
  }
});
