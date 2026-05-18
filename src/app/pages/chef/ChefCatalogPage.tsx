// ChefCatalogPage — /chef/catalog
// Chef-flow-specific catalog entry. Catalog upload logic deferred;
// StartNewQuotePage is not touched. This is the V3 canonical landing
// point for the chef catalog flow.

const C = {
  charcoal: '#2B2B2B',
  gray500: '#6B7280',
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export function ChefCatalogPage() {
  return (
    <div
      className="min-h-screen bg-[#FBFAF7] flex flex-col items-center justify-center p-6"
      style={{ ...sans, color: C.charcoal }}
    >
      <div className="w-full max-w-lg">
        <h1
          style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15, marginBottom: 12 }}
        >
          Catalog
        </h1>
        <p style={{ fontSize: 14, color: C.gray500, lineHeight: 1.6 }}>
          Catalog connection coming soon.
        </p>
      </div>
    </div>
  );
}
