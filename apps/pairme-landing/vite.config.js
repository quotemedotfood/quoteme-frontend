import { defineConfig } from 'vite';
import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const resolve = (...segments) => resolvePath(__dirname, ...segments);

// Standalone Vite config for the PairMe landing/legal/support site. This app
// is deployed independently from the main QuoteMe FE (own package.json, own
// node_modules, own Vercel project) so it is intentionally not wired into the
// root vite.config.ts.
//
// This is a plain multi-page static build (Desi's export: no framework, no
// build-time dependencies beyond the bundler itself). Vite is used only to
// process/hash the four HTML entry points and their referenced assets
// (styles.css, pairme.js, assets/*.svg), same as the previous React setup,
// just without React.
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        index: resolve('index.html'),
        privacy: resolve('privacy.html'),
        terms: resolve('terms.html'),
        support: resolve('support.html'),
      },
    },
  },
});
