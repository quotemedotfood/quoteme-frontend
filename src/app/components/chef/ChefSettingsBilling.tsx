// ChefSettingsBilling — /chef/settings/billing stub
// A3 will build the full billing settings UX.

import { Link } from 'react-router';

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  gray500: '#6B7280',
};

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export function ChefSettingsBilling() {
  return (
    <div
      className="px-6 py-8 max-w-xl mx-auto w-full"
      style={{ ...sans, color: C.charcoal }}
    >
      <Link
        to="/chef/settings/you"
        style={{ fontSize: 12, color: C.gray500, textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
      >
        &larr; Settings
      </Link>
      <p style={{ fontSize: 15, color: C.gray500 }}>Coming soon</p>
    </div>
  );
}
