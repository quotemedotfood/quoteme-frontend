import { defineConfig } from 'vitest/config';

// Scoped test config for this package. The root vite.config.ts's `test`
// block only globs `src/**/*.test.{ts,tsx}` (the main app), which never
// picks up packages/pairing. Run with:
//   npx vitest run --config packages/pairing/vitest.config.js
export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
