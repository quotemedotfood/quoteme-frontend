// BrandProfilePage — /brand/profile
//
// Shows brand block from GET /api/v1/me: name, category.
// No distributor wording. Account identity only.
//
// DESIGN-SWAP SEAM: Profiles.html (Desi) replaces this entire page's markup.
// The data contract (user?.brand from /me) is final.

import { useAuth } from '../../contexts/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray500: '#6B7280',
  gray700: '#4F4F4F',
  ink: '#1A1A1A',
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

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={eyebrow()}>{label}</div>
      <div
        style={{
          ...sans,
          fontSize: 14.5,
          color: value ? C.ink : C.gray500,
          fontStyle: value ? 'normal' : 'italic',
        }}
      >
        {value ?? 'Not set'}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// DESIGN-SWAP SEAM: Profiles.html (Desi) replaces this page's markup.

export function BrandProfilePage() {
  const { user } = useAuth();

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || '—';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={eyebrow()}>Profile</div>
        <div style={{ ...serif, fontSize: 24, fontWeight: 700, color: C.charcoal }}>
          {user?.brand?.name ?? fullName}
        </div>
      </div>

      {/* Brand identity card */}
      <div
        style={{
          background: '#fff',
          border: `1px solid ${C.softLine}`,
          borderRadius: 10,
          padding: '24px',
          maxWidth: 480,
        }}
      >
        <div style={{ ...eyebrow(), marginBottom: 20 }}>Brand identity</div>

        <FieldRow label="Brand name"     value={user?.brand?.name} />
        <FieldRow label="Category"       value={user?.brand?.category} />
        <FieldRow label="Contact name"   value={fullName !== '—' ? fullName : null} />
        <FieldRow label="Email"          value={user?.email} />
      </div>
    </div>
  );
}
