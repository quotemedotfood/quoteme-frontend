// releaseName.test.ts
//
// Sentry matches an event to its source maps by release NAME. The browser SDK
// tags events (src/main.tsx) and the Vite plugin uploads artifacts
// (vite.config.ts); if those two strings differ by so much as a space, the
// maps never resolve and nothing about the config looks wrong.
//
// This file pins the normalisation both callers share. The trailing-space case
// is the one that prompted the work: a release var set to "8ef1fef " is a
// different Sentry release from "8ef1fef".
//
// This project's vitest config does not set `globals: true`, so
// @testing-library's afterEach auto cleanup never registers. Nothing is
// rendered here, but the file declares its own afterEach anyway so that it
// stays correct if a future case does render.

import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { normalizeReleaseName } from './releaseName';

describe('normalizeReleaseName', () => {
  afterEach(() => {
    cleanup();
  });

  it('strips a trailing space, so "8ef1fef " and "8ef1fef" are one release', () => {
    expect(normalizeReleaseName('8ef1fef ')).toBe('8ef1fef');
    expect(normalizeReleaseName('8ef1fef ')).toBe(normalizeReleaseName('8ef1fef'));
  });

  it('strips leading and surrounding whitespace, including newlines from shell capture', () => {
    expect(normalizeReleaseName('  8ef1fef  ')).toBe('8ef1fef');
    expect(normalizeReleaseName('8ef1fef\n')).toBe('8ef1fef');
  });

  it('falls back to "dev" when the variable is unset, empty or only whitespace', () => {
    expect(normalizeReleaseName(undefined)).toBe('dev');
    expect(normalizeReleaseName(null)).toBe('dev');
    expect(normalizeReleaseName('')).toBe('dev');
    expect(normalizeReleaseName('   ')).toBe('dev');
  });

  it('leaves a well-formed sha untouched', () => {
    expect(normalizeReleaseName('8ef1fef')).toBe('8ef1fef');
    expect(normalizeReleaseName('1c41c1af6d536d7f83beafc30c11dbd2e2e659b1'))
      .toBe('1c41c1af6d536d7f83beafc30c11dbd2e2e659b1');
  });
});
