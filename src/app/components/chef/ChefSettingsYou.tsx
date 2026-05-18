// ChefSettingsYou — /chef/settings/you
//
// Read-only-ish profile display with inline-edit affordances (non-functional
// in A2 — all "Add X" links log to console, no modals). Email from useAuth().
//
// V3 Part 12 checks:
//   No banned verbs
//   Labels as short as possible while remaining clear

import { useAuth } from '../../contexts/AuthContext';

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  white: '#FFFFFF',
  linkBlue: '#2563EB',
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// Shared row wrapper
function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-start py-4"
      style={{ borderBottom: `1px solid ${C.softLine}` }}
    >
      <div
        style={{
          ...sans,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: C.gray500,
          width: 110,
          paddingTop: 2,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div style={{ ...sans, fontSize: 14, color: C.charcoal, flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// Placeholder link — logs to console in A2
function PlaceholderLink({ label }: { label: string }) {
  return (
    <button
      onClick={() => console.log(`[ChefSettingsYou] "${label}" tapped — not yet wired`)}
      style={{
        ...sans,
        fontSize: 14,
        color: C.linkBlue,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textDecoration: 'underline',
        textUnderlineOffset: 2,
      }}
    >
      {label}
    </button>
  );
}

export function ChefSettingsYou() {
  const { user } = useAuth();

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ')
    : '';

  return (
    <div
      className="px-6 py-8 max-w-xl mx-auto w-full"
      style={{ ...sans, color: C.charcoal }}
    >
      {/* Section heading */}
      <p
        style={{
          ...serif,
          fontSize: 15,
          fontWeight: 600,
          color: C.charcoal,
          marginBottom: 8,
          letterSpacing: '-0.01em',
        }}
      >
        You
      </p>

      {/* Field rows */}
      <div style={{ borderTop: `1px solid ${C.softLine}` }}>

        {/* NAME */}
        <FieldRow label="Name">
          {fullName ? (
            <span>{fullName}</span>
          ) : (
            <PlaceholderLink label="Add your name" />
          )}
        </FieldRow>

        {/* EMAIL — read-only */}
        <FieldRow label="Email">
          <span style={{ color: C.gray700 }}>{user?.email ?? '—'}</span>
        </FieldRow>

        {/* PHONE */}
        <FieldRow label="Phone">
          {user?.phone ? (
            <span>{user.phone}</span>
          ) : (
            <PlaceholderLink label="Add a number" />
          )}
        </FieldRow>

        {/* RESTAURANT (logo upload affordance) */}
        <FieldRow label="Restaurant">
          <PlaceholderLink label="Add a logo" />
        </FieldRow>

        {/* ADDRESS */}
        <FieldRow label="Address">
          <PlaceholderLink label="Add address" />
        </FieldRow>

        {/* OTHER CHEFS HERE */}
        <FieldRow label="Others here">
          <div className="flex items-center gap-4">
            <span style={{ color: C.gray500 }}>0</span>
            <button
              onClick={() => console.log('[ChefSettingsYou] "Invite a chef" tapped — not yet wired')}
              style={{
                ...sans,
                fontSize: 13,
                fontWeight: 500,
                color: C.charcoal,
                background: C.white,
                border: `1px solid ${C.softLine}`,
                borderRadius: 5,
                padding: '5px 14px',
                cursor: 'pointer',
              }}
            >
              Invite a chef
            </button>
          </div>
        </FieldRow>

      </div>
    </div>
  );
}
