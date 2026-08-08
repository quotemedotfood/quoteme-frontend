import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Scoped test config for this standalone app, same pattern as
// packages/pairing/vitest.config.js. The root vite.config.ts's `test` block
// only globs the main app's src/**/*.test.{ts,tsx} and never picks this up
// (apps/pairme is .jsx/.js, not part of the root npm workspace). Covers both
// the plain-JS unit tests under src/ (state.test.js, track.test.js,
// offlinePairing tests - node-safe, don't need a DOM) and the RTL/jsdom E2E
// walk under tests/ (jest-dom matchers need setupFiles below). Run with
// `npm test` from apps/pairme, or:
//   npx vitest run --config apps/pairme/vitest.config.js
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    fs: {
      // packages/pairing lives outside this app's own root; several specs
      // (offlinePairing.noSignal.test.js, the E2E no-signal spec) import it
      // directly, same relative import src/lib/state.js uses.
      allow: [path.resolve(__dirname, '../../')],
    },
  },
  test: {
    environment: 'jsdom',
    // jest-dom matchers (toBeInTheDocument, etc) used throughout the
    // tests/e2e/demo-walk spec are registered here; without this,
    // `@testing-library/jest-dom/vitest`'s side-effectful import in
    // tests/setup.js never runs and every matcher call throws
    // "Invalid Chai property".
    setupFiles: ['./tests/setup.js'],
    include: ['src/**/*.test.js', 'tests/**/*.test.{js,jsx}'],
    css: false,
  },
});
