// @vitest-environment jsdom
// QM admin night mode guards.
//   NM1 nothing stored: follows the system setting, and keeps following it
//   NM2 the sun/moon stores the choice per browser, and it beats the system
//   NM3 leaving the admin takes the attribute off <html>
//   NM4 not enabled (signed out, not admin, impersonating): <html> untouched
//   NM5 every rule in qmAdminTheme.css is scoped to the admin attribute, so
//       PairIt and the diner app can never pick up a dark colour
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QM_ADMIN_THEME_ATTR, QM_ADMIN_THEME_KEY, useQmAdminTheme } from './qmAdminTheme';

type Listener = () => void;
let systemDark = false;
let listeners: Listener[] = [];

function setSystem(dark: boolean) {
  systemDark = dark;
  listeners.forEach((l) => l());
}

beforeEach(() => {
  systemDark = false;
  listeners = [];
  window.localStorage.clear();
  document.documentElement.removeAttribute(QM_ADMIN_THEME_ATTR);
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes('dark') && systemDark;
    },
    media: query,
    addEventListener: (_: string, l: Listener) => listeners.push(l),
    removeEventListener: (_: string, l: Listener) => {
      listeners = listeners.filter((x) => x !== l);
    },
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => document.documentElement.removeAttribute(QM_ADMIN_THEME_ATTR));

// Split a selector list on its top-level commas only (not inside :where()).
function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of list) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

const attr = () => document.documentElement.getAttribute(QM_ADMIN_THEME_ATTR);

describe('QM admin night mode', () => {
  it('NM1 follows the system setting until a choice is made', () => {
    systemDark = true;
    const { result } = renderHook(() => useQmAdminTheme(true));
    expect(result.current.theme).toBe('dark');
    expect(attr()).toBe('dark');

    act(() => setSystem(false));
    expect(attr()).toBe('light');
  });

  it('NM2 the toggle is remembered for this browser and beats the system', () => {
    const { result, unmount } = renderHook(() => useQmAdminTheme(true));
    expect(attr()).toBe('light');

    act(() => result.current.toggle());
    expect(attr()).toBe('dark');
    expect(window.localStorage.getItem(QM_ADMIN_THEME_KEY)).toBe('dark');
    act(() => setSystem(false));
    expect(attr()).toBe('dark');
    unmount();

    const again = renderHook(() => useQmAdminTheme(true));
    expect(again.result.current.theme).toBe('dark');
  });

  it('NM3 leaving the admin takes the attribute off <html>', () => {
    systemDark = true;
    const { unmount } = renderHook(() => useQmAdminTheme(true));
    expect(attr()).toBe('dark');
    unmount();
    expect(attr()).toBeNull();
  });

  it('NM4 not enabled leaves <html> untouched', () => {
    systemDark = true;
    window.localStorage.setItem(QM_ADMIN_THEME_KEY, 'dark');
    renderHook(() => useQmAdminTheme(false));
    expect(attr()).toBeNull();
  });

  it('NM5 every rule in the night mode CSS is scoped to the admin attribute', () => {
    const css = readFileSync(resolve(__dirname, '../../../styles/qmAdminTheme.css'), 'utf8');
    const body = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@layer\s+utilities\s*\{/, '');
    const selectors = [...body.matchAll(/([^{}]+)\{/g)].flatMap((m) => splitSelectors(m[1])).map((s) => s.trim()).filter(Boolean);
    expect(selectors.length).toBeGreaterThan(20);
    const unscoped = selectors.filter(
      (s) => !s.startsWith(':root[data-qm-admin-theme') && !s.startsWith(':where(:root[data-qm-admin-theme'),
    );
    expect(unscoped).toEqual([]);
  });
});
