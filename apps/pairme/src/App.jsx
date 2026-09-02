import React from 'react';
import { useSpeech } from './lib/useSpeech.js';

import Welcome from './screens/Welcome';
import SignIn from './screens/SignIn';
import OnboardingHeader from './screens/OnboardingHeader';
import Q1Knowledge from './screens/Q1Knowledge';
import Q2Adventure from './screens/Q2Adventure';
import Q3Budget from './screens/Q3Budget';
import Q4Taste from './screens/Q4Taste';
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
  Welcome, SignIn, Q1Knowledge, Q2Adventure, Q3Budget, Q4Taste, Q6Summary,
  WhereTo, Menu, HowToDrink, TheWine, Present, RateIt,
  YourProfile, FriendProfile, BottleBrief, Settings, Camera,
];

/** "8:41"-style status-bar time: 12-hour, no leading zero on the hour. */
function statusBarTime(d) {
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * The single 390x800 phone-shaped box every mobile-first screen mounts
 * inside, defined ONCE so a fix here is inherited everywhere instead of
 * needing a per-screen patch. `position: relative` makes the box its own
 * containing block, so a screen reaching for position:fixed/absolute stays
 * scoped to the device instead of escaping to the real page; `overflow:
 * hidden` means whatever is inside MUST scroll through an internal scroll
 * container (DeviceFrame below, or Phone's own body further down), never
 * through the box's own border. Phone (the onboarding chrome) and
 * DeviceFrame (routes.jsx's standalone screens) both build on this, so
 * there is exactly one definition of the frame's geometry.
 */
function frameBoxStyle(themeVars) {
  return {
    width: 390, height: 800, background: 'var(--pm-page)',
    border: '1px solid var(--pm-rule)', borderRadius: 26,
    position: 'relative', overflow: 'hidden',
    boxShadow: '0 8px 28px -12px rgba(31,42,68,.28)',
    display: 'flex', flexDirection: 'column',
    ...parseVars(themeVars),
  };
}

/**
 * DeviceFrame: mounts a standalone full-page screen (not one of Phone's
 * onboarding SCREENS below) inside the phone shell, with one internal
 * scroll container so the screen's own overflow (even a naive
 * minHeight:100vh written against the real viewport) scrolls inside the
 * box instead of getting clipped by overflow:hidden or blowing the frame
 * out to full desktop width. Used by routes.jsx for /entry, /tell-us,
 * /login and /wines/list - four routes that used to render outside the
 * shell entirely. /operator is deliberately NOT wrapped here: it is the
 * restaurant-side desktop surface and a 390px frame around it would be
 * wrong.
 *
 * `keepNativeScrollbar`: the wine list is long and, viewed at desktop
 * widths, needs the browser's own scrollbar as the one signal (on Windows/
 * Linux, which have no persistent overlay scrollbar) that content
 * continues below the fold - see lib/theme.css's .pm-scroll-native. Every
 * other DeviceFrame screen hides scrollbar chrome like the rest of the
 * phone shell (.pm-scroll-hide); scrolling itself is unaffected either way.
 */
export function DeviceFrame({ children, themeVars, keepNativeScrollbar }) {
  return (
    <div className="pm-phone" style={frameBoxStyle(themeVars)}>
      <div className={keepNativeScrollbar ? 'pm-scroll-native' : 'pm-scroll-hide'} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Phone chrome: status bar, an integration error banner, the scroll body,
 * and the sticky action bar. Screens never draw any of this (Desi's
 * contract). The error banner is new here, not in any screen file: it is
 * chrome, the same category as the status bar and CTA bar below.
 */
export function Phone({ vm }) {
  const Screen = SCREENS[vm.screenNo - 1] || Welcome;
  const [clock, setClock] = React.useState(() => statusBarTime(new Date()));
  React.useEffect(() => {
    const id = setInterval(() => setClock(statusBarTime(new Date())), 30000);
    return () => clearInterval(id);
  }, []);
  // Field mics: one useSpeech, driven off vm.listening (set by any field's mic
  // button). A spoken result appends to that field via vm.appendToListening.
  // This is the real capture behind every field mic - see BUTTON_AUDIT.md.
  const speech = useSpeech({ onResult: vm.appendToListening });
  // Mirror the hook's own state/message onto vm so field() (state.js) can
  // render the right border colour and plain-language hint for whichever
  // field is currently listening, without state.js needing its own
  // SpeechRecognition instance.
  React.useEffect(() => {
    vm.setSpeechStatus(speech.state, speech.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.state, speech.message]);
  React.useEffect(() => {
    if (vm.listening) speech.start();
    else speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.listening]);
  // On scroll DOWN, only the logo stays in the header - Log in and the gear are
  // not what a diner mid-scroll needs; they come back on scroll UP.
  const [hideChrome, setHideChrome] = React.useState(false);
  const lastY = React.useRef(0);
  const onBodyScroll = (e) => {
    const y = e.target.scrollTop;
    if (y > lastY.current && y > 24) setHideChrome(true);
    else if (y < lastY.current) setHideChrome(false);
    lastY.current = y;
  };
  return (
    <div className="pm-phone" style={frameBoxStyle(vm.themeVars)}>
      <div style={{ flex: 'none', background: 'var(--pm-chrome)', padding: '7px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {/* The logo is the one thing that always stays in the header. */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/brand/pear-mark.svg" alt="PairMe" width="18" height="22" style={{ display: 'block' }} />
          <span style={{ font: '600 11px var(--font-body)', color: 'var(--pm-chromeSub)', letterSpacing: '.04em' }}>{clock}</span>
        </div>
        {/*
          AUTH CONTRACT (locked, feat/pairme-accounts-be): the top-right entry
          into /login, plus the Settings gear. Both are chrome affordances, not
          what a diner mid-scroll needs, so they hide on scroll DOWN (only the
          logo stays) and return on scroll UP. Settings is the gear alone now.
        */}
        <div data-testid="header-controls" aria-hidden={hideChrome} style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity .18s ease', opacity: hideChrome ? 0 : 1, pointerEvents: hideChrome ? 'none' : 'auto' }}>
          {!vm.isLoggedIn ? (
            <button onClick={vm.goLogin} aria-label="Log in" style={{ border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#fff', borderRadius: 999, padding: '5px 11px', font: '600 10.5px var(--font-body)', cursor: 'pointer' }}>
              Log in
            </button>
          ) : null}
          <button onClick={vm.goSettings} aria-label="Settings" style={{ border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#fff', borderRadius: 999, padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" /></svg>
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

      <div ref={vm.bodyRef} onScroll={onBodyScroll} className="pm-onboarding-body pm-scroll-hide" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {vm.onboarding ? OnboardingHeader(vm) : null}
        {Screen(vm)}
      </div>

      <div style={{ flex: 'none', padding: '12px 18px 16px', background: 'var(--pm-page)', borderTop: '1px solid var(--pm-rule)' }}>
        {vm.hasAlt ? (
          <div style={{ marginBottom: 8 }}>
            <button onClick={vm.alt} style={{ width: '100%', background: 'transparent', color: 'var(--pm-accent2)', border: '1.5px solid var(--pm-accent2)', borderRadius: 999, padding: 14, font: '600 14px var(--font-body)', cursor: 'pointer' }}>{vm.altLabel}</button>
          </div>
        ) : null}
        <button onClick={vm.cta} style={{ width: '100%', background: '#EFB96B', color: '#1F2A44', border: '1px solid #E5A44F', borderRadius: 999, padding: 16, font: '700 15px var(--font-body)', cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(31,42,68,.45)' }}>{vm.ctaLabel}</button>
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
