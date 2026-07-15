// RepProfilePage — /rep/profile
//
// Rep self-edit: first name, last name, phone.
// Email, role, and distributor are displayed read-only (server ignores edits).
//
// BE contract:
//   GET  /api/v1/rep/profile  → RepProfileData
//   PATCH /api/v1/rep/profile  { profile: { first_name?, last_name?, phone? } }
//
// Rendered inside RepLayout (persistent sidebar shell via <Outlet />).
// No extra chrome needed — RepLayout provides sidebar + padding wrapper.

import { useEffect, useState } from 'react';
import { getRepProfile, updateRepProfile } from '../../services/api';
import type { RepProfileData } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ─── Design tokens (match RepCustomersPage / RepDesktopShell) ─────────────────

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  errorRed: '#B91C1C',
  successGreen: '#15803D',
} as const;

function eyebrow(size = 10): React.CSSProperties {
  return {
    ...sans,
    fontSize: size,
    fontWeight: 600,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: C.gray700,
  };
}

// ─── Field components ─────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        ...sans,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '.1em',
        textTransform: 'uppercase' as const,
        color: C.gray500,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        style={{
          ...sans,
          fontSize: 14,
          color: C.gray700,
          padding: '9px 12px',
          background: C.warmPaper,
          border: `1px solid ${C.softLine}`,
          borderRadius: 6,
          lineHeight: 1.4,
        }}
      >
        {value || '-'}
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...sans,
          width: '100%',
          fontSize: 14,
          color: C.charcoal,
          padding: '9px 12px',
          background: disabled ? C.warmPaper : '#fff',
          border: `1px solid ${C.softLine}`,
          borderRadius: 6,
          outline: 'none',
          boxSizing: 'border-box' as const,
          lineHeight: 1.4,
        }}
      />
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        ...sans,
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '.18em',
        textTransform: 'uppercase' as const,
        color: C.gray500,
        borderBottom: `2px solid ${C.charcoal}`,
        paddingBottom: 6,
        marginBottom: 20,
        marginTop: 32,
      }}
    >
      {label}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RepProfilePage() {
  // B-10: pre-seed form fields from the already-loaded auth user so the form
  // is never blank while getRepProfile() is in flight.
  const { user: authUser } = useAuth();

  const [profile, setProfile] = useState<RepProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Editable form state — pre-populated from authUser so fields are never blank
  // on initial render while the rep/profile fetch is in flight.
  const [firstName, setFirstName] = useState(authUser?.first_name ?? '');
  const [lastName, setLastName] = useState(authUser?.last_name ?? '');
  const [phone, setPhone] = useState(authUser?.phone ?? '');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getRepProfile()
      .then((res) => {
        if (res.data) {
          setProfile(res.data);
          // Override with the authoritative rep/profile values (phone lives on
          // rep_profile, not users table, so this is the canonical source).
          setFirstName(res.data.first_name ?? '');
          setLastName(res.data.last_name ?? '');
          setPhone(res.data.phone ?? '');
        } else {
          setLoadError('Could not load profile. Please refresh.');
        }
      })
      .catch(() => {
        setLoadError('Could not load profile. Please refresh.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await updateRepProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      });

      if (res.data) {
        setProfile(res.data);
        setFirstName(res.data.first_name ?? '');
        setLastName(res.data.last_name ?? '');
        setPhone(res.data.phone ?? '');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else if (res.error) {
        setSaveError(res.error);
      } else {
        setSaveError('Save failed. Please try again.');
      }
    } catch {
      setSaveError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    const body = (
      <div
        style={{
          ...sans,
          fontSize: 14,
          color: C.gray500,
          marginTop: 48,
          textAlign: 'center',
        }}
      >
        Loading profile…
      </div>
    );
    return <PageShell>{body}</PageShell>;
  }

  if (loadError || !profile) {
    const body = (
      <div
        style={{
          ...sans,
          fontSize: 14,
          color: C.errorRed,
          marginTop: 48,
          textAlign: 'center',
        }}
      >
        {loadError ?? 'Profile unavailable.'}
      </div>
    );
    return <PageShell>{body}</PageShell>;
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  const roleDisplay =
    profile.role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const distributorDisplay = profile.distributor?.name ?? '-';

  const formBody = (
    <>
      {/* Header */}
      <div>
        <div style={eyebrow(11)}>YOUR ACCOUNT</div>
        <h1
          style={{
            ...serif,
            fontSize: 28,
            fontWeight: 600,
            color: C.charcoal,
            marginTop: 4,
            lineHeight: 1.1,
          }}
        >
          My Profile
        </h1>
        <p
          style={{
            ...sans,
            fontSize: 13,
            color: C.gray700,
            lineHeight: 1.6,
            marginTop: 6,
            maxWidth: 480,
          }}
        >
          Update your name and phone number. Email, role, and distributor are
          managed by your administrator.
        </p>
      </div>

      {/* Editable fields */}
      <SectionDivider label="Contact Details" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
          maxWidth: 600,
        }}
      >
        <EditableField
          label="First Name"
          value={firstName}
          onChange={setFirstName}
          placeholder="First name"
          disabled={saving}
        />
        <EditableField
          label="Last Name"
          value={lastName}
          onChange={setLastName}
          placeholder="Last name"
          disabled={saving}
        />
        <EditableField
          label="Phone"
          value={phone}
          onChange={setPhone}
          placeholder="e.g. 555-867-5309"
          type="tel"
          disabled={saving}
        />
      </div>

      {/* Read-only fields */}
      <SectionDivider label="Account Info" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
          maxWidth: 600,
        }}
      >
        <ReadOnlyField label="Email" value={profile.email} />
        <ReadOnlyField label="Role" value={roleDisplay} />
        <ReadOnlyField label="Distributor" value={distributorDisplay} />
      </div>

      {/* Save */}
      <div
        style={{
          marginTop: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          maxWidth: 600,
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            ...sans,
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            background: saving ? C.gray500 : C.charcoal,
            border: 'none',
            borderRadius: 6,
            padding: '10px 24px',
            cursor: saving ? 'not-allowed' : 'pointer',
            letterSpacing: '.04em',
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        {saveSuccess && (
          <span
            style={{
              ...sans,
              fontSize: 13,
              color: C.successGreen,
              fontWeight: 500,
            }}
          >
            Profile updated.
          </span>
        )}

        {saveError && (
          <span
            style={{
              ...sans,
              fontSize: 13,
              color: C.errorRed,
              fontWeight: 500,
            }}
          >
            {saveError}
          </span>
        )}
      </div>
    </>
  );

  return <PageShell>{formBody}</PageShell>;
}

// ─── PageShell ────────────────────────────────────────────────────────────────
// Mirrors RepCustomersPage: desktop relies on RepLayout's padding wrapper;
// mobile gets its own minimal chrome.

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop: RepLayout provides shell; render body directly. */}
      <div className="hidden md:block">{children}</div>

      {/* Mobile: minimal chrome — just scrollable content */}
      <div className="block md:hidden" style={{ minHeight: '100vh', background: '#fff' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: `1px solid ${C.softLine}`,
            background: '#fff',
          }}
        >
          <span style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal, lineHeight: 1 }}>
            QuoteMe
          </span>
          <span
            style={{
              ...sans,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: C.gray700,
            }}
          >
            REP
          </span>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </>
  );
}
