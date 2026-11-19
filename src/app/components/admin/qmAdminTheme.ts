// QM admin night mode (Moose 2026-11-19). ADMIN ONLY: QMAdminLayout is the
// one caller, and the attribute it sets on <html> is removed when the admin
// is left, so PairIt and the diner app never see it.
//
// Until the sun/moon is pressed the admin follows the system setting (and
// keeps following it if that changes). A press stores the choice for this
// browser, and the stored choice wins from then on.
import { useCallback, useEffect, useState } from 'react';

export type QmAdminTheme = 'light' | 'dark';

export const QM_ADMIN_THEME_KEY = 'qm-admin-theme';
export const QM_ADMIN_THEME_ATTR = 'data-qm-admin-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function readStoredTheme(): QmAdminTheme | null {
  try {
    const v = window.localStorage.getItem(QM_ADMIN_THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function systemTheme(): QmAdminTheme {
  try {
    return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// enabled false (signed out, not an admin, or impersonating a distributor,
// whose pages are not admin pages) leaves <html> untouched.
export function useQmAdminTheme(enabled = true): { theme: QmAdminTheme; toggle: () => void } {
  const [stored, setStored] = useState<QmAdminTheme | null>(() => readStoredTheme());
  const [system, setSystem] = useState<QmAdminTheme>(() => systemTheme());
  const theme = stored ?? system;

  useEffect(() => {
    let mq: MediaQueryList | undefined;
    try {
      mq = window.matchMedia?.(DARK_QUERY);
    } catch {
      mq = undefined;
    }
    if (!mq) return undefined;
    const onChange = () => setSystem(mq!.matches ? 'dark' : 'light');
    mq.addEventListener?.('change', onChange);
    return () => mq!.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const root = document.documentElement;
    root.setAttribute(QM_ADMIN_THEME_ATTR, theme);
    return () => root.removeAttribute(QM_ADMIN_THEME_ATTR);
  }, [theme, enabled]);

  const toggle = useCallback(() => {
    const next: QmAdminTheme = theme === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(QM_ADMIN_THEME_KEY, next);
    } catch {
      // Private window or blocked storage: the switch still works for this visit.
    }
    setStored(next);
  }, [theme]);

  return { theme, toggle };
}
