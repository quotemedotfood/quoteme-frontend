// ChefQuotesPage — /chef/quotes
// Chef's primary Quotes destination. With-data state deferred to Desi V3 final.

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export function ChefQuotesPage() {
  return (
    <div
      className="px-6 py-8 max-w-2xl mx-auto w-full"
      style={{ ...sans, color: C.charcoal }}
    >
      <h1
        style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15, marginBottom: 16 }}
      >
        Quotes
      </h1>
      <p style={{ fontSize: 14, color: C.gray500, lineHeight: 1.6 }}>
        Your quotes will appear here.
      </p>
    </div>
  );
}
