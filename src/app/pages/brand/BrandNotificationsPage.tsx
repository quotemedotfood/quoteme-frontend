// BrandNotificationsPage — /brand/notifications
//
// GET /api/v1/notifications → list of user's notifications.
// PATCH /api/v1/notifications/:id/mark_read → mark one read.
//
// DESIGN-SWAP SEAM: visual frame replaced by Desi's notifications panel.
// Notification data shape and mark-read flow are final.

import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead } from '../../services/api';

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BrandNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    getNotifications().then((res) => {
      setNotifications(res.data?.notifications ?? []);
      setLoading(false);
    });
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={eyebrow()}>Notifications</div>
        <div style={{ ...serif, fontSize: 24, fontWeight: 700, color: C.charcoal }}>
          {unread > 0 ? `${unread} unread` : 'All caught up'}
        </div>
      </div>

      {loading ? (
        <div style={{ ...sans, color: C.gray500, fontSize: 14 }}>Loading…</div>
      ) : notifications.length === 0 ? (
        <div
          style={{
            ...sans,
            fontSize: 14,
            color: C.gray500,
            padding: '24px',
            background: C.warmPaper,
            borderRadius: 8,
            textAlign: 'center',
          }}
        >
          No notifications yet.
        </div>
      ) : (
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
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom:
                  i < notifications.length - 1 ? `1px solid ${C.softLine}` : 'none',
                background: n.read_at ? '#fff' : C.warmPaper,
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    ...sans,
                    fontSize: 13.5,
                    color: C.ink,
                    fontWeight: n.read_at ? 400 : 600,
                  }}
                >
                  {n.body ?? n.message ?? 'Notification'}
                </div>
                {n.created_at && (
                  <div style={{ ...sans, fontSize: 11.5, color: C.gray500, marginTop: 3 }}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              {!n.read_at && n.id && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  style={{
                    ...sans,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: C.gray500,
                    background: 'transparent',
                    border: `1px solid ${C.softLine}`,
                    borderRadius: 6,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
