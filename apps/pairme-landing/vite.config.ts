import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone Vite config for the PairMe landing/legal/support site. This app
// is deployed independently from the main QuoteMe FE (own package.json, own
// node_modules, own Vercel project) so it is intentionally not wired into the
// root vite.config.ts.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
