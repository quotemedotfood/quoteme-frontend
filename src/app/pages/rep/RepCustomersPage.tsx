// RepCustomersPage — /rep/customers
//
// Card 11 (Desi Lock D-2): render the rep's customer list.
// Scope: LIST only. The "+ Add Customer" CREATE flow is Moose's track.
//
// Desktop: table (name · location · last quote · total quotes).
// Mobile: stacked cards — same data, single-column.
//
// BE status: GET /api/v1/rep/customers is NOT yet implemented.
// Until the endpoint lands this page shows the empty state below.
// When the endpoint ships, remove the TODO comment and the forced
// empty-state fallback here — the real data will flow through automatically.
//
// Rendered inside RepLayout (persistent sidebar shell via <Outlet />).
// No extra chrome needed — RepLayout provides sidebar + padding wrapper.

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { getRepCustomers } from '../../services/api';
import type { RepCustomer } from '../../services/api';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function locationStr(c?: string, s?: string): string {
  if (c && s) return `${c}, ${s}`;
  if (c) return c;
  if (s) return s;
  return '—';
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        ...sans,
        marginTop: 48,
        textAlign: 'center',
        color: C.gray500,
        fontSize: 14,
        lineHeight: 1.7,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <Building2 className="w-8 h-8 opacity-35" style={{ color: '#A5CFDD' }} />
      </div>
      <div style={{ fontWeight: 500, color: C.gray700, fontSize: 15 }}>
        No customers yet
      </div>
      <div style={{ marginTop: 4, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
        Your customers will appear here once quotes have been sent. Add Customer
        flow coming soon.
      </div>
    </div>
  );
}

// ─── Desktop table ────────────────────────────────────────────────────────────

const th: React.CSSProperties = {
  ...sans,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: C.gray500,
  textAlign: 'left',
  padding: '0 0 8px',
  borderBottom: `2px solid ${C.charcoal}`,
};

const td: React.CSSProperties = {
  ...sans,
  fontSize: 13,
  color: C.charcoal,
  padding: '12px 0',
  borderBottom: `1px solid ${C.softLine}`,
  verticalAlign: 'top',
};

function DesktopTable({ customers }: { customers: RepCustomer[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
      <thead>
        <tr>
          <th style={{ ...th, width: '38%' }}>Restaurant</th>
          <th style={{ ...th, width: '22%' }}>Location</th>
          <th style={{ ...th, width: '22%' }}>Last quote</th>
          <th style={{ ...th, width: '18%', textAlign: 'right' }}>Quotes</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((c) => (
          <tr key={c.id}>
            <td style={{ ...td, fontWeight: 500 }}>{c.name}</td>
            <td style={{ ...td, color: C.gray700 }}>{locationStr(c.city, c.state)}</td>
            <td style={{ ...td, color: C.gray700, fontVariantNumeric: 'tabular-nums' }}>
              {formatDate(c.last_quote_at)}
            </td>
            <td
              style={{
                ...td,
                color: C.gray700,
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
              }}
            >
              {c.quote_count ?? 0}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Mobile card list ─────────────────────────────────────────────────────────

function MobileCards({ customers }: { customers: RepCustomer[] }) {
  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {customers.map((c) => (
        <div
          key={c.id}
          style={{
            padding: '14px 0',
            borderBottom: `1px solid ${C.softLine}`,
          }}
        >
          <div style={{ ...sans, fontSize: 14.5, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
            {c.name}
          </div>
          <div
            style={{
              ...sans,
              fontSize: 12,
              color: C.gray500,
              marginTop: 3,
              lineHeight: 1.4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {locationStr(c.city, c.state)}
            {c.last_quote_at && (
              <span> · last quote {formatDate(c.last_quote_at)}</span>
            )}
            {c.quote_count != null && (
              <span> · {c.quote_count} {c.quote_count === 1 ? 'quote' : 'quotes'}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RepCustomersPage() {
  const [customers, setCustomers] = useState<RepCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRepCustomers().then((res) => {
      // BE endpoint not yet implemented — will 404 until it lands.
      // In that case res.data is undefined; we fall through to empty state.
      if (res.data) setCustomers(res.data);
      setLoading(false);
    }).catch(() => {
      // Network / 404 — show empty state, don't crash
      setLoading(false);
    });
  }, []);

  const hasCustomers = customers.length > 0;

  const body = (
    <>
      {/* Header */}
      <div>
        <div style={eyebrow(11)}>YOUR BOOK</div>
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
          Customers
        </h1>
        <p
          style={{
            ...sans,
            fontSize: 13,
            color: C.gray700,
            lineHeight: 1.6,
            marginTop: 6,
            maxWidth: 540,
          }}
        >
          {loading
            ? 'Loading your customers…'
            : hasCustomers
            ? `${customers.length} ${customers.length === 1 ? 'restaurant' : 'restaurants'} in your book.`
            : "Restaurants you've quoted will appear here."}
        </p>
      </div>

      {/* List / empty state */}
      {!loading && !hasCustomers && <EmptyState />}

      {!loading && hasCustomers && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <DesktopTable customers={customers} />
          </div>
          {/* Mobile cards */}
          <div className="block md:hidden">
            <MobileCards customers={customers} />
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: RepLayout provides shell. Render body directly. */}
      <div className="hidden md:block">{body}</div>

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
        <div style={{ padding: '20px' }}>{body}</div>
      </div>
    </>
  );
}
