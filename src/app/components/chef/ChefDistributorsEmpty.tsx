// ChefDistributorsEmpty — empty state for /chef/distributors
//
// Top section: informational empty state when chef has no connected distributors.
// Bottom section: "Around Hudson" discovery panel with stub nearby distributors.
//
// V3 Part 12 checks:
//   No banned verbs
//   Canonical strings verbatim from dispatch spec
//   "Request quote" stubs are aria-disabled placeholders — no toast, no behavior

import { useNavigate } from 'react-router';

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  white: '#FFFFFF',
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// Stub nearby distributors — realistic Hudson Valley operators
const NEARBY_DISTRIBUTORS: { name: string; city: string }[] = [
  { name: 'Baldor Specialty Foods', city: 'Bronx, NY' },
  { name: 'Performance Foodservice', city: 'Middletown, NY' },
  { name: 'Sysco Hudson Valley', city: 'Newburgh, NY' },
  { name: 'Crown Linen & Provisions', city: 'Kingston, NY' },
  { name: 'Catskill Provisions', city: 'Catskill, NY' },
];

export function ChefDistributorsEmpty() {
  const navigate = useNavigate();

  return (
    <div
      className="px-6 py-8 max-w-xl mx-auto w-full"
      style={{ ...sans, color: C.charcoal }}
    >
      {/* ── Top: empty state ── */}
      <div className="mb-10">
        <p
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: C.charcoal,
            lineHeight: 1.4,
            marginBottom: 6,
          }}
        >
          Distributors show up here once you've gotten a quote from one
        </p>
        <p
          style={{
            fontSize: 13,
            color: C.gray500,
            lineHeight: 1.55,
            marginBottom: 20,
          }}
        >
          Nothing to do here yet — when a rep sends you a quote, their distributor will appear in this list.
        </p>

        {/* Secondary CTA — Upload price list */}
        <button
          onClick={() => navigate('/chef/catalog')}
          style={{
            ...sans,
            fontSize: 13,
            fontWeight: 500,
            color: C.gray700,
            background: C.white,
            border: `1px solid ${C.softLine}`,
            borderRadius: 6,
            padding: '8px 16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gray400)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.softLine)}
        >
          Upload price list
        </button>
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${C.softLine}`, marginBottom: 24 }} />

      {/* ── Bottom: Around Hudson panel ── */}
      <div>
        <p
          style={{
            ...serif,
            fontSize: 15,
            fontWeight: 600,
            color: C.charcoal,
            marginBottom: 16,
            letterSpacing: '-0.01em',
          }}
        >
          Around Hudson
        </p>

        <div className="flex flex-col gap-0">
          {NEARBY_DISTRIBUTORS.map((d, i) => (
            <div
              key={d.name}
              className="flex items-center justify-between py-3"
              style={{
                borderBottom: i < NEARBY_DISTRIBUTORS.length - 1 ? `1px solid ${C.softLine}` : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.charcoal }}>
                  {d.name}
                </div>
                <div style={{ fontSize: 12, color: C.gray500, marginTop: 1 }}>
                  {d.city}
                </div>
              </div>

              {/* Placeholder — non-functional per A2 scope */}
              <button
                aria-disabled="true"
                onClick={() => {/* A3 will wire this */}}
                style={{
                  ...sans,
                  fontSize: 12,
                  fontWeight: 500,
                  color: C.gray500,
                  background: 'transparent',
                  border: `1px solid ${C.softLine}`,
                  borderRadius: 5,
                  padding: '5px 12px',
                  cursor: 'default',
                  opacity: 0.7,
                }}
              >
                Request quote
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
