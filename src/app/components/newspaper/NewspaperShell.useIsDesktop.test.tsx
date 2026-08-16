// @vitest-environment jsdom
//
// NewspaperShell.useIsDesktop.test.tsx
//
// The old code read window.innerWidth during render and never subscribed to
// anything, so the value could not change after mount. useIsDesktop replaces
// that with a real matchMedia subscription. These tests drive the subscription
// through a mocked matchMedia (jsdom does not implement matchMedia at all).

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsDesktop } from './NewspaperShell';

type Listener = (e: MediaQueryListEvent) => void;

/** Installs a controllable window.matchMedia. Returns a fire() to flip it. */
function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initialMatches,
    media: '(min-width: 768px)',
    addEventListener: (_type: string, fn: Listener) => { listeners.add(fn); },
    removeEventListener: (_type: string, fn: Listener) => { listeners.delete(fn); },
  };
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
  return {
    fire(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((fn) => fn({ matches } as MediaQueryListEvent));
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  // jsdom has no matchMedia by default. Restore that so the guard path in the
  // last test is honest and no other test file inherits a stub.
  delete (window as { matchMedia?: unknown }).matchMedia;
  vi.restoreAllMocks();
});

describe('useIsDesktop', () => {
  it('seeds from the current matchMedia result', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it('reacts to a matchMedia change event', () => {
    const mm = installMatchMedia(true);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);

    act(() => { mm.fire(false); });
    expect(result.current).toBe(false);

    act(() => { mm.fire(true); });
    expect(result.current).toBe(true);
  });

  it('removes its listener on unmount', () => {
    const mm = installMatchMedia(true);
    const { unmount } = renderHook(() => useIsDesktop());
    expect(mm.listenerCount()).toBe(1);
    unmount();
    expect(mm.listenerCount()).toBe(0);
  });

  it('falls back to desktop when matchMedia is absent (the guard)', () => {
    // No installMatchMedia call: this is bare jsdom, which has no matchMedia.
    // The guard must keep this from throwing, and must default to desktop so
    // existing desktop-oriented tests are unaffected.
    expect(typeof window.matchMedia).toBe('undefined');
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });
});
