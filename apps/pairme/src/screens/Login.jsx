import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, signup } from '../lib/api.js';
import { errorCopy } from '../lib/errors.js';

/**
 * /login - a real, bookmarkable route, NOT one of the phone-frame SCREENS in
 * routes.jsx/state.js. One screen, one toggle between login and signup
 * (signup is not a separate page, per the AUTH CONTRACT this implements).
 *
 * NEVER a wall: this route is only ever reached by tapping the top-right
 * "Log in" chrome button (App.jsx's vm.goLogin) or a direct visit to
 * /login itself. Nothing in state.js's bootstrap or /t/:code effects
 * navigates here, so the /t/:code walk to a wine recommendation never
 * passes through this screen.
 *
 * On success, vm.setAuthenticated (state.js) persists the token + the
 * RETURNED anon_id and this navigates back to wherever "Log in" was tapped
 * from (vm.goLogin passes that path as router state), defaulting to '/'.
 */
export default function Login({ vm }) {
  const navigate = useNavigate();
  const location = useLocation();
  const back = (location.state && location.state.from) || '/';

  const [mode, setMode] = React.useState('login'); // 'login' | 'signup'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const isSignup = mode === 'signup';

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const call = isSignup ? signup : login;
      const data = await call(email, password);
      if (vm && vm.setAuthenticated) vm.setAuthenticated(data || {});
      navigate(back, { replace: true });
    } catch (err) {
      setError(errorCopy(err));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', border: '1.5px solid var(--pm-rule)', borderRadius: 10,
    padding: '12px 14px', font: '400 14.5px var(--font-body)', color: 'var(--pm-ink)',
    background: 'var(--pm-card)', marginBottom: 16,
  };
  const labelStyle = {
    display: 'block', font: '600 12px var(--font-body)', color: 'var(--pm-muted)', marginBottom: 6,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pm-page)', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 390, background: 'var(--pm-card)', border: '1px solid var(--pm-rule)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 28px -12px rgba(31,42,68,.28)' }}>
        <div style={{ background: 'var(--pm-chrome)', padding: '34px 22px 26px', textAlign: 'center' }}>
          <div style={{ font: '700 20px var(--font-display)', color: '#FFCC7D', letterSpacing: '-.02em' }}>PairMe</div>
          <div style={{ font: '600 20px var(--font-display)', color: '#fff', marginTop: 12 }}>
            {isSignup ? 'Save your taste' : 'Log in'}
          </div>
          <div style={{ font: '400 13px/1.6 var(--font-body)', color: 'var(--pm-chromeSub)', marginTop: 6, maxWidth: 260, marginLeft: 'auto', marginRight: 'auto' }}>
            {isSignup
              ? 'So it follows you to the next restaurant. Email and a password, nothing else.'
              : 'Welcome back. Your taste and history pick up right where you left them.'}
          </div>
        </div>

        <form onSubmit={submit} style={{ padding: '22px 20px 20px' }}>
          <label htmlFor="pm-login-email" style={labelStyle}>Email</label>
          <input
            id="pm-login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <label htmlFor="pm-login-password" style={labelStyle}>Password</label>
          <input
            id="pm-login-password"
            type="password"
            required
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          {error ? (
            <div style={{ font: '500 12.5px/1.5 var(--font-body)', color: 'var(--pm-warnInk)', background: 'var(--pm-warnBg)', border: '1px solid var(--pm-warnBd)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#FFCC7D', color: '#1F2A44', border: '1px solid #E5A44F', borderRadius: 999, padding: 15, font: '700 14.5px var(--font-body)', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Please wait' : isSignup ? 'Create account' : 'Log in'}
          </button>

          <button
            type="button"
            onClick={() => { setError(null); setMode(isSignup ? 'login' : 'signup'); }}
            style={{ width: '100%', background: 'transparent', color: 'var(--pm-accent2)', border: 'none', padding: '16px 0 0', font: '600 13px var(--font-body)', cursor: 'pointer' }}
          >
            {isSignup ? 'Already have an account. Log in' : "New here. Create an account"}
          </button>

          <button
            type="button"
            onClick={() => navigate(back)}
            style={{ width: '100%', background: 'transparent', color: 'var(--pm-muted)', border: 'none', padding: '10px 0 0', font: '500 12.5px var(--font-body)', cursor: 'pointer' }}
          >
            Not now
          </button>
        </form>
      </div>
    </div>
  );
}
