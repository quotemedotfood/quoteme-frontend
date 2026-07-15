// BrandNotificationsPage — /brand/notifications
//
// Reskinned per handoff/desi-brand-suite-060626/src/screens-brand.jsx
// (BrandNotificationsBody). All API wiring (getNotifications,
// markNotificationRead) and mark-read flow preserved.
//
// Read-only surface — nothing to action here except mark-read.
// Doctrine: no incoming-quotes surface.

import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead } from '../../services/api';
import { NpIcon } from '../../components/newspaper/NewspaperShell';

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
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
  };

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <>
      {/* ── Header ── */}
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.15 }}>Notifications</h1>
        <p className="mt-1 ink-faint" style={{ fontSize: 13.5 }}>
          Where every package you've sent stands. Read-only, nothing to action here.
        </p>
      </div>

      <div className="mt-6">
        <div className="qm-eyebrow" style={{ fontSize: 10 }}>
          {unread > 0 ? `${unread} UNREAD` : 'ALL NOTIFICATIONS'}
        </div>
        <div className="mt-2 doc-divider-thick" />

        {loading ? (
          <div className="py-4 text-[14px] ink-faint" style={{ fontFamily: 'var(--qm-sans)' }}>Loading…</div>
        ) : notifications.length === 0 ? (
          <div
            className="py-6 text-[13px] ink-faint text-center rounded-md mt-2"
            style={{ background: 'var(--qm-warm-paper)', border: '1px solid var(--qm-soft-line)' }}
          >
            No notifications yet.
          </div>
        ) : (
          notifications.map((n: any, i: number) => (
            <div
              key={n.id ?? i}
              className="doc-divider py-3.5"
              style={{ background: n.read_at ? 'transparent' : 'var(--qm-warm-paper)', margin: '0 -4px', padding: '12px 4px' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[14px] leading-snug"
                    style={{
                      color: 'var(--qm-charcoal)',
                      fontWeight: n.read_at ? 400 : 500,
                      fontFamily: 'var(--qm-sans)',
                    }}
                  >
                    {n.body ?? n.message ?? 'Notification'}
                  </div>
                  {n.created_at && (
                    <div className="text-[11.5px] ink-faint num mt-1">
                      {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
                {!n.read_at && n.id && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n.id)}
                    className="qm-btn qm-btn-outline shrink-0"
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 text-[11.5px] ink-soft" style={{ borderTop: '1px solid var(--qm-soft-line)', paddingTop: 12 }}>
        <NpIcon name="bell" size={14} color="var(--accent)" />
        <div>You'll be notified as each package advances. Quotes are between chefs and distributors, they never come to you.</div>
      </div>
    </>
  );
}
