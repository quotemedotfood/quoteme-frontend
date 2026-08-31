/**
 * The one definition of this build's Sentry release name.
 *
 * Sentry matches an event to its uploaded source maps by release name, so the
 * name the browser SDK tags events with and the name the Vite plugin uploads
 * artifacts under have to be byte-identical. They were previously set by two
 * unrelated mechanisms: src/main.tsx read VITE_RELEASE_SHA, while
 * sentryVitePlugin was given no release at all and fell back to its own CI
 * auto-detection. Two sources, no guarantee they agree.
 *
 * Both callers now go through this function, so they cannot drift.
 *
 * The trim is not cosmetic. An operator-set env var carrying a trailing space
 * produces a release name that differs from the same SHA without it, and
 * Sentry treats those as two different releases, which is exactly how source
 * maps stop resolving while everything still looks configured.
 */
export function normalizeReleaseName(raw: string | undefined | null): string {
  return (raw ?? '').trim() || 'dev';
}
