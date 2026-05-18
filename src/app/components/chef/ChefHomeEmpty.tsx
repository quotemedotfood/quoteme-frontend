// ChefHomeEmpty — Path 2 empty state (no rep, no quote in queue)
//
// Shown on /chef/welcome (or wherever the chef dashboard lands) when the
// chef has zero quotes and no rep-pushed quote waiting.
//
// V3 Part 12 checks:
//   No banned verbs (sign up / get started / onboard / submit / log in)
//   No marketing copy, no feature grids, no testimonials
//   Canonical strings verbatim from dispatch spec

import { useNavigate } from 'react-router';

const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  orangeHover: '#E8953A',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray500: '#6B7280',
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export function ChefHomeEmpty() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] px-6"
      style={{ background: C.warmPaper }}
    >
      <div className="w-full max-w-sm text-center">
        {/* Heading */}
        <h1
          style={{
            ...serif,
            fontSize: 28,
            fontWeight: 600,
            color: C.charcoal,
            lineHeight: 1.25,
            marginBottom: 8,
          }}
        >
          Let's build your first quote
        </h1>

        {/* Subhead */}
        <p
          style={{
            ...sans,
            fontSize: 14,
            color: C.gray500,
            lineHeight: 1.5,
            marginBottom: 32,
          }}
        >
          Takes about a minute
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => navigate('/chef/entry')}
          style={{
            ...sans,
            fontSize: 15,
            fontWeight: 500,
            color: '#FFFFFF',
            background: C.orange,
            border: 'none',
            borderRadius: 6,
            padding: '12px 28px',
            cursor: 'pointer',
            width: '100%',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = C.orange)}
        >
          Build a quote
        </button>
      </div>
    </div>
  );
}
