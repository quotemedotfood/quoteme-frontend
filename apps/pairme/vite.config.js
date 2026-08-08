import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Standalone app: its own package.json, its own node_modules, not part of
// an npm/pnpm workspace. Root package.json / tsconfig.json / vite.config.ts
// (the QuoteMe app) are untouched.
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // packages/pairing lives outside this app's own root (apps/pairme);
      // allow the dev server to serve it for the plain relative import in
      // src/lib/state.js. Not needed for `vite build`, only `vite dev`.
      allow: [path.resolve(__dirname, '../../')],
    },
  },
  build: {
    outDir: 'dist',
  },
});
