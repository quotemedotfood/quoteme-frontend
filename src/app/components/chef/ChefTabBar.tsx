// ChefTabBar — mobile bottom tab strip (May 19 4-button lock).
//
// Ported verbatim from source/screens-tabs.jsx (Desi V2 handoff, 2026-05-19).
// V3 spec refs: Part 6.7.
//
// May 19 locks:
//   • 4 destinations: Quotes / Distributors / Settings + "Build Quote" outlined-orange pill.
//   • Tab order: Quotes · Distributors · Settings (never adds Discovery / Browse / Marketplace).
//   • Scroll-hide: hides on scroll-down >24px (6px deadzone), reveals on scroll-up.
//   • "Build Quote" is an OUTLINED-orange pill (not solid) — one-solid-orange-per-screen rule.
//
// Translation notes (JSX → TSX):
//   • PhoneShell context (wrapRef.current.closest(".screen")) → adapted to use
//     document.querySelector(".chef-scroller") as the scroll target; parent
//     containers should add className="chef-scroller" to their overflow-auto div.
//   • cls() → inline ternary strings.
//   • CSS vars → FE color constants.
//
// Intended route: /dashboard/distributors (wire-up pending A3 promotion).

import React, { useRef, useState, useEffect } from 'react';

const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  gray500: '#6B7280',
  softLine: '#E8E8E8',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

type TabId = 'home' | 'order-guides' | 'distributors' | 'settings';

interface TabDef {
  id: TabId | 'build';
  label: string;
  target: string;
  isAction?: boolean;
}

export interface ChefTabBarProps {
  active?: TabId;
  nav?: (target: string) => void;
}

export function ChefTabBar({ active = 'home', nav = () => {} }: ChefTabBarProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState(false);

  // Hide on scroll-down, reveal on scroll-up.
  // Verbatim logic from screens-tabs.jsx — finds the nearest .scroller ancestor
  // (prototype used .screen > .scroller; real FE wraps the scroll body in the
  // same component, so we look for the closest .chef-scroller or fall back to
  // the closest overflow-auto ancestor).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // Walk up to find a scrollable container. In the FE shell the tab bar sits
    // AFTER the scrollable content div inside the same flex column; use the
    // previous sibling (the scroll body) as the scroll target.
    const scrollTarget =
      el.previousElementSibling instanceof HTMLElement
        ? el.previousElementSibling
        : null;

    if (!scrollTarget) return;

    let lastY = scrollTarget.scrollTop;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = scrollTarget.scrollTop;
        const dy = y - lastY;
        if (Math.abs(dy) >= 6) {
          if (dy > 0 && y > 24) setHidden(true);
          else if (dy < 0) setHidden(false);
          lastY = y;
        }
        ticking = false;
      });
    };

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollTarget.removeEventListener('scroll', onScroll);
  }, []);

  const tabs: TabDef[] = [
    { id: 'home',         label: 'Quotes',       target: 'tab-home' },
    { id: 'order-guides', label: 'Order Guides', target: 'tab-order-guides' },
    { id: 'distributors', label: 'Distributors', target: 'tab-distributors' },
    { id: 'settings',     label: 'Settings',     target: 'tab-settings' },
    { id: 'build',        label: 'Build Quote',  target: 'distributor-new', isAction: true },
  ];

  return (
    <div
      ref={wrapRef}
      className="flex items-stretch bg-white"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        flex: '0 0 56px',
        borderTop: `1px solid ${C.softLine}`,
        paddingBottom: 12, // clears home indicator on iOS
        transform: hidden ? 'translateY(120%)' : 'translateY(0)',
        transition: 'transform 240ms ease',
        willChange: 'transform',
      }}
    >
      {tabs.map((t) => {
        if (t.isAction) {
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => nav(t.target)}
              className="flex-1 flex items-center justify-center"
              style={{ paddingLeft: 6, paddingRight: 8, minHeight: 0 }}
            >
              <span
                style={{
                  ...sans,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.orange,
                  border: `1.5px solid ${C.orange}`,
                  background: 'transparent',
                  borderRadius: 999,
                  padding: '8px 14px',
                  lineHeight: 1,
                  letterSpacing: 0.1,
                  whiteSpace: 'nowrap',
                }}
              >
                Build Quote
              </span>
            </button>
          );
        }

        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => nav(t.target)}
            className="flex-1 flex flex-col items-center justify-center gap-1"
            style={{ position: 'relative', minHeight: 0 }}
          >
            <span
              style={{
                ...(on ? serif : sans),
                fontSize: on ? 14 : 13,
                fontWeight: on ? 600 : 500,
                color: on ? C.charcoal : C.gray500,
                letterSpacing: on ? 0 : 0.1,
                lineHeight: 1,
              }}
            >
              {t.label}
            </span>
            {on && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  height: 2,
                  width: 22,
                  background: C.charcoal,
                  borderRadius: 1,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
