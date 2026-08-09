import React from 'react';

import Welcome from './screens/Welcome';
import SignIn from './screens/SignIn';
import OnboardingHeader from './screens/OnboardingHeader';
import Q1Knowledge from './screens/Q1Knowledge';
import Q2Adventure from './screens/Q2Adventure';
import Q3Budget from './screens/Q3Budget';
import Q4Taste from './screens/Q4Taste';
import Q5MustKnow from './screens/Q5MustKnow';
import Q6Summary from './screens/Q6Summary';
import WhereTo from './screens/WhereTo';
import Menu from './screens/Menu';
import HowToDrink from './screens/HowToDrink';
import TheWine from './screens/TheWine';
import Present from './screens/Present';
import RateIt from './screens/RateIt';
import YourProfile from './screens/YourProfile';
import FriendProfile from './screens/FriendProfile';
import BottleBrief from './screens/BottleBrief';
import Settings from './screens/Settings';
import Camera from './screens/Camera';

/** Index is the screen number. Add a screen here and in state.js (usePairMe). */
export const SCREENS = [
  Welcome, SignIn, Q1Knowledge, Q2Adventure, Q3Budget, Q4Taste, Q5MustKnow,
  Q6Summary, WhereTo, Menu, HowToDrink, TheWine, Present, RateIt,
  YourProfile, FriendProfile, BottleBrief, Settings, Camera,
];

/**
 * Phone chrome: status bar, an integration error banner, the scroll body,
 * and the sticky action bar. Screens never draw any of this (Desi's
 * contract). The error banner is new here, not in any screen file: it is
 * chrome, the same category as the status bar and CTA bar below.
 */
export function Phone({ vm }) {
  const Screen = SCREENS[vm.screenNo - 1] || Welcome;
  return (
    <div
      className="pm-phone"
      style={{
        width: 390, height: 800, background: 'var(--pm-page)',
        border: '1px solid var(--pm-rule)', borderRadius: 26, overflow: 'hidden',
        boxShadow: '0 8px 28px -12px rgba(31,42,68,.28)',
        display: 'flex', flexDirection: 'column',
        ...parseVars(vm.themeVars),
      }}
    >
      <div style={{ flex: 'none', background: 'var(--pm-chrome)', padding: '7px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ font: '600 11px var(--font-body)', color: 'var(--pm-chromeSub)', letterSpacing: '.04em' }}>8:41</span>
        {/*
          AUTH CONTRACT (locked, feat/pairme-accounts-be): the top-right
          entry point into /login, reachable from every screen this chrome
          wraps. Only rendered when signed out - it never blocks anything
          underneath it, it is just another chrome affordance next to
          Settings. See vm.goLogin/vm.isLoggedIn (state.js) and
          screens/Login.jsx.
        */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          {!vm.isLoggedIn ? (
            <button onClick={vm.goLogin} aria-label="Log in" style={{ border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#fff', borderRadius: 999, padding: '5px 11px', font: '600 10.5px var(--font-body)', cursor: 'pointer' }}>
              Log in
            </button>
          ) : null}
          <button onClick={vm.goSettings} aria-label="Settings" style={{ border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#fff', borderRadius: 999, padding: '5px 11px', font: '600 10.5px var(--font-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" /></svg>
            <span>Settings</span>
          </button>
        </div>
      </div>

      {vm.apiError ? (
        <button
          onClick={vm.dismissApiError}
          style={{
            flex: 'none', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--pm-warnBd)',
            background: 'var(--pm-warnBg)', color: 'var(--pm-warnInk)', padding: '8px 14px',
            font: '500 11.5px/1.4 var(--font-body)', cursor: 'pointer',
          }}
        >
          {vm.apiError} (tap to dismiss)
        </button>
      ) : null}

      <div ref={vm.bodyRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {vm.onboarding ? OnboardingHeader(vm) : null}
        {Screen(vm)}
      </div>

      <div style={{ flex: 'none', padding: '12px 18px 16px', background: 'var(--pm-page)', borderTop: '1px solid var(--pm-rule)' }}>
        {vm.hasAlt ? (
          <div style={{ marginBottom: 8 }}>
            <button onClick={vm.alt} style={{ width: '100%', background: 'transparent', color: 'var(--pm-accent2)', border: '1.5px solid var(--pm-accent2)', borderRadius: 999, padding: 14, font: '600 14px var(--font-body)', cursor: 'pointer' }}>{vm.altLabel}</button>
          </div>
        ) : null}
        <button onClick={vm.cta} style={{ width: '100%', background: '#FFCC7D', color: '#1F2A44', border: '1px solid #E5A44F', borderRadius: 999, padding: 16, font: '700 15px var(--font-body)', cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(31,42,68,.45)' }}>{vm.ctaLabel}</button>
      </div>
    </div>
  );
}

/** The inline var string from usePairMe, as a React style object. */
function parseVars(s) {
  const out = {};
  (s || '').split(';').forEach((d) => {
    const i = d.indexOf(':');
    if (i > 0) out[d.slice(0, i).trim()] = d.slice(i + 1).trim();
  });
  return out;
}
