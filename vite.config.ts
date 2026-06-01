/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Upload source maps to Sentry during Vercel builds.
    // Requires SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT in Vercel
    // dashboard env vars (NOT VITE_* — auth tokens must not reach the browser).
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
          }),
        ]
      : []),
  ],
  build: {
    // Source maps are required for Sentry stack traces to resolve to original source.
    sourcemap: true,
  },
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  test: {
    // Run in node environment — no DOM / jsdom needed for pure-logic unit tests.
    // Component-level tests that require a DOM should use environment: 'jsdom'
    // on a per-file basis once @testing-library/react is added to devDependencies.
    environment: 'node',
    // Only pick up files explicitly named *.test.ts / *.test.tsx so the broad
    // glob doesn't accidentally match storybook or playground files.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
