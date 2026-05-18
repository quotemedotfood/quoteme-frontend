// ChefOrderGuideDetailPage — /chef/order-guide/:id
// Single order guide detail view placeholder shell.

import { useParams } from 'react-router';

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

export function ChefOrderGuideDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div
      className="min-h-screen bg-[#FBFAF7] flex flex-col items-center justify-center p-6"
      style={{ ...sans, color: C.charcoal }}
    >
      <div className="w-full max-w-lg">
        <h1
          style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15, marginBottom: 12 }}
        >
          Order Guide
        </h1>
        <p style={{ fontSize: 14, color: C.gray500, lineHeight: 1.6 }}>
          Order guide detail for {id} coming soon.
        </p>
      </div>
    </div>
  );
}
