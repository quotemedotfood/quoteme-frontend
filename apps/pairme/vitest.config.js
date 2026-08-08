import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Scoped test config for this standalone app, same pattern as
// packages/pairing/vitest.config.js. The root vite.config.ts's `test` block
// only globs the main app's src/**/*.test.{ts,tsx} and never picks this up.
// Run with:
//   npx vitest run --config apps/pairme/vitest.config.js
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    fs: {
      // packages/pairing lives outside this app's own root; the E2E no-signal
      // spec imports it directly (same relative import src/lib/state.js uses).
      allow: [path.resolve(__dirname, '../../')],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    css: false,
  },
});
