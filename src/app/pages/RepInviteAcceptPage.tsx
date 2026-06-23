// RepInviteAcceptPage — public token-gated page for invited reps.
//
// Route: /rep/invite?token=... (OUTSIDE RootLayout — no auth guard)
//
// Flow:
//   1. Read `token` from URL query param.
//   2. Show set-password form (token validated server-side on submit).
//   3. POST /api/v1/rep_invitations/:token/consume  { password }
//   4. On success: store JWT → navigate to redirect_to (typically /rep/welcome).
//   5. Error states: expired, consumed, not_found, role_conflict.
//
// Pattern mirrors RepWelcomePage (OUTSIDE RootLayout, pre-auth magic-link).
// Form pattern mirrors ResetPasswordPage (password + confirm, 8-char min).
// No gradients. No marketing copy. Sacred Orange = var(--primary).

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { consumeRepInvitation } from '../services/api';
import { PasswordRequirements, passwordMeetsRequirements } from '../components/PasswordRequirements';

// ─── Style constants (match RepWelcomePage palette) ──────────────────────────
const C = {
  charcoal: '#2B2B2B',
  orange: 'var(--primary)',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray300: '#D1D5DB',
  red500: '#EF4444',
  red50: '#FEF2F2',
  red200: '#FECACA',
  green600: '#16A34A',
  green50: '#F0FDF4',
  green200: '#BBF7D0',
  white: '#ffffff',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Error message helper ─────────────────────────────────────────────────────
function errorMessageFor(code: string | undefined, raw: string | undefined): string {
  switch (code) {
    case 'expired':
      return 'This invite link has expired. Please ask your manager to send a fresh invite.';
    case 'consumed':
      return 'This invite link has already been used. Try signing in, or ask for a new invite.';
    case 'not_found':
      return 'This invite link is invalid. It may have been copied incorrectly.';
    case 'role_conflict':
      return 'An account already exists at this email address with a different role. Please contact support.';
    default:
      return raw || 'Something went wrong. Please try again or contact support.';
  }
}

// ─── PageShell (matches RepWelcomePage) ───────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.warmPaper }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 20px',
          background: C.white,
          borderBottom: `1px solid ${C.softLine}`,
        }}
      >
        <span style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal, lineHeight: 1 }}>
          QuoteMe
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px 32px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── EyeIcon / EyeOffIcon (inline SVG — avoids lucide dependency version skew) ─
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function RepInviteAcceptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<{ code?: string; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Missing token — surface immediately without waiting for a submit.
  const missingToken = !token;

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    ...sans,
    display: 'block',
    width: '100%',
    padding: '10px 40px 10px 12px',
    fontSize: 14,
    color: C.charcoal,
    background: C.white,
    border: `1px solid ${hasError ? C.red500 : C.gray300}`,
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box',
  });

  const labelStyle: React.CSSProperties = {
    ...sans,
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: C.gray700,
    marginBottom: 4,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: { password?: string; confirm?: string } = {};

    if (!password) errs.password = 'Password is required';
    else if (!passwordMeetsRequirements(password)) errs.password = 'Password must be at least 8 characters with one uppercase letter, one number, and one special character';
    if (!confirmPassword) errs.confirm = 'Please confirm your password';
    else if (password !== confirmPassword) errs.confirm = 'Passwords do not match';

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormError(null);
    setIsSubmitting(true);

    const res = await consumeRepInvitation(token, password);

    setIsSubmitting(false);

    if (res.data) {
      localStorage.setItem('quoteme_token', res.data.jwt);
      setSuccess(true);
      // Navigate to redirect_to from BE (typically /rep/welcome, then to /rep/quotes/inbound)
      setTimeout(() => {
        navigate(res.data!.redirect_to || '/rep/quotes/inbound');
      }, 1200);
    } else {
      setFormError({
        code: res.error_code,
        message: errorMessageFor(res.error_code, res.error),
      });
    }
  }

  const card: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    background: C.white,
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 8px 24px rgba(43,43,43,.08)',
    padding: '36px 32px 32px',
    border: `1px solid ${C.softLine}`,
  };

  return (
    <PageShell>
      <div style={card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, lineHeight: 1.25 }}>
            Accept Your Invitation
          </div>
          <p style={{ ...sans, fontSize: 13, color: C.gray500, marginTop: 6, lineHeight: 1.5 }}>
            {missingToken
              ? 'No invite token found in this link.'
              : "Set your password to join your distributor's team on QuoteMe."}
          </p>
        </div>

        {/* Missing token */}
        {missingToken && (
          <div style={{ background: C.red50, border: `1px solid ${C.red200}`, borderRadius: 6, padding: '12px 14px', marginBottom: 20 }}>
            <p style={{ ...sans, fontSize: 13, color: '#991B1B', margin: 0, lineHeight: 1.5 }}>
              This invite link appears to be invalid or incomplete. Please use the link from your invitation email, or ask your manager to resend it.
            </p>
          </div>
        )}

        {/* Form-level error (expired, consumed, role_conflict, etc.) */}
        {formError && !success && (
          <div style={{ background: C.red50, border: `1px solid ${C.red200}`, borderRadius: 6, padding: '12px 14px', marginBottom: 20 }}>
            <p style={{ ...sans, fontSize: 13, color: '#991B1B', margin: 0, lineHeight: 1.5 }}>
              {formError.message}
            </p>
            {(formError.code === 'expired' || formError.code === 'consumed') && (
              <p style={{ ...sans, fontSize: 12, color: '#B91C1C', margin: '6px 0 0', lineHeight: 1.4 }}>
                {formError.code === 'consumed'
                  ? 'Already have an account? Sign in at quoteme.food/auth.'
                  : 'Once you have a fresh link, come back and set your password here.'}
              </p>
            )}
          </div>
        )}

        {/* Success state */}
        {success && (
          <div style={{ background: C.green50, border: `1px solid ${C.green200}`, borderRadius: 6, padding: '12px 14px', marginBottom: 20 }}>
            <p style={{ ...sans, fontSize: 13, color: '#166534', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
              Account created — welcome to QuoteMe!
            </p>
            <p style={{ ...sans, fontSize: 12, color: '#166534', margin: '4px 0 0', lineHeight: 1.4 }}>
              Taking you to your dashboard…
            </p>
          </div>
        )}

        {/* Set-password form — hidden once token is missing, or after success */}
        {!missingToken && !success && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="rip-password" style={labelStyle}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="rip-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  style={inputStyle(!!fieldErrors.password)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: C.gray500,
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.password && (
                <p style={{ ...sans, fontSize: 11.5, color: C.red500, marginTop: 4 }}>
                  {fieldErrors.password}
                </p>
              )}
              <PasswordRequirements password={password} />
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: 24 }}>
              <label htmlFor="rip-confirm" style={labelStyle}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="rip-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirm) setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
                  }}
                  style={inputStyle(!!fieldErrors.confirm)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: C.gray500,
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.confirm && (
                <p style={{ ...sans, fontSize: 11.5, color: C.red500, marginTop: 4 }}>
                  {fieldErrors.confirm}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                ...sans,
                display: 'block',
                width: '100%',
                padding: '11px 18px',
                fontSize: 15,
                fontWeight: 500,
                color: C.white,
                background: isSubmitting ? '#E8953A' : C.orange,
                border: 'none',
                borderRadius: 6,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.8 : 1,
              }}
            >
              {isSubmitting ? 'Setting up your account…' : 'Accept Invitation'}
            </button>
          </form>
        )}

        {/* Footer link — sign in if already have account */}
        {!success && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                ...sans,
                fontSize: 13,
                color: C.gray500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Already have an account? Sign in
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
