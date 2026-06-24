// NewspaperShell.mark.test.ts
//
// Unit tests for the Mark rendering decision in RoleSidebar.
// The Mark shows a logo <img> when logo_url is present and has not errored,
// and falls back to the initials <span> otherwise.
//
// Tests are pure-function (no DOM) and run in the default "node" environment.

import { describe, it, expect } from 'vitest';
import { shouldShowLogoMark } from './NewspaperShell';

describe('shouldShowLogoMark — Mark renders img vs initials', () => {
  it('returns true (show img) when logo_url is present and image has not failed', () => {
    expect(shouldShowLogoMark('https://cdn.example.com/bella.png', false)).toBe(true);
  });

  it('returns false (show initials) when logo_url is null', () => {
    expect(shouldShowLogoMark(null, false)).toBe(false);
  });

  it('returns false (show initials) when logo_url is undefined', () => {
    expect(shouldShowLogoMark(undefined, false)).toBe(false);
  });

  it('returns false (show initials) when logo_url is empty string', () => {
    expect(shouldShowLogoMark('', false)).toBe(false);
  });

  it('returns false (show initials) when logo_url is present but image load errored (onError fallback)', () => {
    expect(shouldShowLogoMark('https://cdn.example.com/bella.png', true)).toBe(false);
  });
});
