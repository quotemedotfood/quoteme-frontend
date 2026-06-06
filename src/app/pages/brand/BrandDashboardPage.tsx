// BrandDashboardPage — /brand (index)
//
// Shows: brand name, catalog item_count, packages count by status,
// recent notifications.
//
// Doctrine: brands receive NO quotes. No inbox, no "New Quote", no
// distributor wording beyond the distributors section.
//
// DESIGN-SWAP SEAM: card layouts and typography replaced by Desi's
// brand dashboard frame. Data fetching + state shape here are final.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import {
  getBrandCatalog,
  getBrandPackages,
  getNotifications,
} from '../../services/api';
import type { BrandPackageSummary } from '../../services/api';

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

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.warmPaper,
        border: `1px solid ${C.softLine}`,
        borderRadius: 10,
        padding: '20px 22px',
        cursor: onClick ? 'pointer' : 'default',
        flex: '1 1 160px',
        minWidth: 0,
      }}
    >
      <div style={eyebrow()}>{label}</div>
      <div
        style={{
          ...serif,
          fontSize: 28,
          fontWeight: 700,
          color: C.charcoal,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Package status chip ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#F3F4F6', color: '#374151' },
  sent:      { bg: '#EFF6FF', color: '#1D4ED8' },
  converted: { bg: '#F0FDF4', color: '#15803D' },
  dismissed: { bg: '#FEF2F2', color: '#B91C1C' },
};

function StatusChip({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#F3F4F6', color: '#374151' };
  return (
    <span
      style={{
        ...sans,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 99,
        background: colors.bg,
        color: colors.color,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BrandDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [itemCount, setItemCount]       = useState<number | null>(null);
  const [packages, setPackages]         = useState<BrandPackageSummary[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getBrandCatalog(),
      getBrandPackages(),
      getNotifications(),
    ]).then(([catRes, pkgRes, notifRes]) => {
      if (cancelled) return;
      setItemCount(catRes.data?.catalog?.item_count ?? null);
      setPackages(pkgRes.data ?? []);
      setNotifications(notifRes.data?.notifications?.slice(0, 5) ?? []);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const brandName = user?.brand?.name ?? user?.first_name ?? 'Brand';

  // Package status counts
  const pkgByStatus = packages.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const recentPackages = [...packages]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={eyebrow()}>Dashboard</div>
        <div
          style={{
            ...serif,
            fontSize: 26,
            fontWeight: 700,
            color: C.charcoal,
            lineHeight: 1.2,
          }}
        >
          {brandName}
        </div>
      </div>

      {loading ? (
        <div style={{ ...sans, color: C.gray500, fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {/* Stat row */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 36 }}>
            <StatCard
              label="Catalog items"
              value={itemCount !== null ? itemCount.toLocaleString() : '—'}
              onClick={() => navigate('/brand/catalog')}
            />
            <StatCard
              label="Total packages"
              value={packages.length}
              onClick={() => navigate('/brand/packages')}
            />
            <StatCard
              label="Sent"
              value={pkgByStatus['sent'] ?? 0}
              onClick={() => navigate('/brand/packages')}
            />
            <StatCard
              label="Converted"
              value={pkgByStatus['converted'] ?? 0}
              onClick={() => navigate('/brand/packages')}
            />
          </div>

          {/* Recent packages */}
          {recentPackages.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ ...eyebrow(), marginBottom: 12 }}>Recent packages</div>
              <div
                style={{
                  border: `1px solid ${C.softLine}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {recentPackages.map((pkg, i) => (
                  <div
                    key={pkg.id}
                    onClick={() => navigate(`/brand/packages/${pkg.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: i < recentPackages.length - 1 ? `1px solid ${C.softLine}` : 'none',
                      cursor: 'pointer',
                      background: '#fff',
                    }}
                  >
                    <div>
                      <div style={{ ...sans, fontSize: 14, fontWeight: 600, color: C.ink }}>
                        {pkg.title}
                      </div>
                      <div style={{ ...sans, fontSize: 12, color: C.gray500, marginTop: 2 }}>
                        {pkg.items_count} item{pkg.items_count !== 1 ? 's' : ''}
                        {pkg.target_distributor && ` · ${pkg.target_distributor.name}`}
                      </div>
                    </div>
                    <StatusChip status={pkg.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent notifications */}
          {notifications.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div style={eyebrow()}>Notifications</div>
                <button
                  type="button"
                  onClick={() => navigate('/brand/notifications')}
                  style={{
                    ...sans,
                    fontSize: 12,
                    color: C.gray500,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  View all
                </button>
              </div>
              <div
                style={{
                  border: `1px solid ${C.softLine}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {notifications.map((n: any, i: number) => (
                  <div
                    key={n.id ?? i}
                    style={{
                      padding: '12px 16px',
                      borderBottom:
                        i < notifications.length - 1 ? `1px solid ${C.softLine}` : 'none',
                      background: n.read_at ? '#fff' : C.warmPaper,
                    }}
                  >
                    <div style={{ ...sans, fontSize: 13.5, color: C.ink }}>{n.body ?? n.message ?? 'Notification'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
