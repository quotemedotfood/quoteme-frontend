// BrandSignupPage — /brand/signup (public, no auth required)
//
// POST /users with role: "brand" + brand_name.
// BE creates brand_group + brand + membership atomically; response Authorization
// header carries JWT → stored → redirect to /brand.
//
// DESIGN-SWAP SEAM: visual layer (Desi's brand signup frame) replaces this
// minimal form. Field names, submit flow, and redirect contract are final.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { signUp } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray500: '#6B7280',
  errorRed: '#B91C1C',
  ink: '#1A1A1A',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BrandSignupPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [brandName, setBrandName] = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !brandName.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    const res = await signUp({
      first_name: firstName.trim(),
      last_name:  lastName.trim(),
      email:      email.trim().toLowerCase(),
      password,
      role:       'brand',
      brand_name: brandName.trim(),
    });
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.token) {
      localStorage.setItem('quoteme_token', res.token);
      await refreshUser();
      navigate('/brand');
    }
  };

  const inputStyle: React.CSSProperties = {
    ...sans,
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: `1px solid ${C.softLine}`,
    borderRadius: 6,
    outline: 'none',
    color: C.ink,
    background: '#fff',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    ...sans,
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: C.gray500,
    marginBottom: 6,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.warmPaper,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: `1px solid ${C.softLine}`,
          borderRadius: 12,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 420,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              ...serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.charcoal,
              marginBottom: 6,
            }}
          >
            Create a brand account
          </div>
          <div style={{ ...sans, fontSize: 13.5, color: C.gray500 }}>
            Upload your catalog, capture menu opportunities, and reach distributors.
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Name row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First name</label>
              <input
                style={inputStyle}
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last name</label>
              <input
                style={inputStyle}
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Brand name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Brand name</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g. Pacific Coast Seafood"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Work email</label>
            <input
              style={inputStyle}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Password</label>
            <input
              style={inputStyle}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                ...sans,
                fontSize: 13,
                color: C.errorRed,
                marginBottom: 16,
                padding: '10px 12px',
                background: '#FEF2F2',
                borderRadius: 6,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...sans,
              width: '100%',
              padding: '12px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: loading ? '#9CA3AF' : C.charcoal,
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating account…' : 'Create brand account'}
          </button>
        </form>

        {/* Sign-in link */}
        <div
          style={{
            ...sans,
            fontSize: 13,
            color: C.gray500,
            marginTop: 20,
            textAlign: 'center',
          }}
        >
          Already have an account?{' '}
          <Link
            to="/auth"
            style={{ color: C.charcoal, fontWeight: 600, textDecoration: 'none' }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
