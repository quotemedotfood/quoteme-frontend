// BrandSettingsPage — /brand/settings
//
// Minimal: account email + name update (PATCH /api/v1/users/me).
// No distributor wording. No rep-facing fields.
//
// DESIGN-SWAP SEAM: visual frame replaced by Desi's settings panel.
// Field schema and submit contract are final.

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateCurrentUser } from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray500: '#6B7280',
  gray700: '#4F4F4F',
  ink: '#1A1A1A',
  errorRed: '#B91C1C',
  successGreen: '#15803D',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

function eyebrow(): React.CSSProperties {
  return {
    ...sans,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: C.gray500,
    marginBottom: 6,
  };
}

const inputStyle: React.CSSProperties = {
  ...sans,
  width: '100%',
  padding: '9px 12px',
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
  marginBottom: 5,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BrandSettingsPage() {
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName]   = useState(user?.last_name ?? '');
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    const res = await updateCurrentUser({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(true);
    await refreshUser();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={eyebrow()}>Settings</div>
        <div style={{ ...serif, fontSize: 24, fontWeight: 700, color: C.charcoal }}>
          Account settings
        </div>
      </div>

      {/* Account section */}
      <div
        style={{
          background: '#fff',
          border: `1px solid ${C.softLine}`,
          borderRadius: 10,
          padding: '24px',
          maxWidth: 480,
        }}
      >
        <div style={{ ...eyebrow(), marginBottom: 16 }}>Account</div>

        {/* Email — read-only */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <div
            style={{
              ...sans,
              fontSize: 14,
              color: C.gray700,
              padding: '9px 12px',
              background: C.warmPaper,
              border: `1px solid ${C.softLine}`,
              borderRadius: 6,
            }}
          >
            {user?.email ?? '—'}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First name</label>
              <input
                style={inputStyle}
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last name</label>
              <input
                style={inputStyle}
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                ...sans,
                fontSize: 13,
                color: C.errorRed,
                marginBottom: 12,
                padding: '8px 12px',
                background: '#FEF2F2',
                borderRadius: 6,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                ...sans,
                fontSize: 13,
                color: C.successGreen,
                marginBottom: 12,
                padding: '8px 12px',
                background: '#F0FDF4',
                borderRadius: 6,
              }}
            >
              Settings saved.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              ...sans,
              padding: '9px 20px',
              fontSize: 13.5,
              fontWeight: 600,
              color: '#fff',
              background: saving ? '#9CA3AF' : C.charcoal,
              border: 'none',
              borderRadius: 6,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
