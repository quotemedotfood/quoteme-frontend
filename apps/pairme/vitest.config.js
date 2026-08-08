import { defineConfig } from 'vitest/config';

// Scoped test config for this standalone app (see vite.config.js's own note
// on why apps/pairme is not part of an npm/pnpm workspace). Node environment
// is enough: the state (e) proof exercises plain JS (offlinePairing.js), no
// DOM. Run with `npm test` from apps/pairme, or:
//   npx vitest run --config apps/pairme/vitest.config.js
export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
