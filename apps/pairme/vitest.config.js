import { defineConfig } from 'vitest/config';

// Scoped test config for this standalone app. The root vite.config.ts's
// `test` block only globs `src/**/*.test.{ts,tsx}` (the main QuoteMe app),
// which never picks up apps/pairme (this app is .jsx/.js, not part of the
// root npm workspace). Run with:
//   npx vitest run --config apps/pairme/vitest.config.js
export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
