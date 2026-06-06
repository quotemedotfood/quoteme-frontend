// BrandDashboardPage — /brand (index)
//
// Reskinned per handoff/desi-brand-suite-060626/src/screens-brand.jsx
// (BrandDashboardBody). All API wiring, loading/empty/error states
// from the previous functional scaffold are preserved.
//
// Doctrine: ONE orange CTA per page. No inbox. No incoming-quotes surface.
// Prices never shown. No gradient colors.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import {
  getBrandCatalog,
  getBrandPackages,
  getNotifications,
} from '../../services/api';
import type { BrandPackageSummary } from '../../services/api';
import { NpIcon } from '../../components/newspaper/NewspaperShell';
import { NotifyStatusBadge, BrandMark } from '../../components/brand/BrandPrimitives';

export function BrandDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [itemCount, setItemCount]         = useState<number | null>(null);
  const [packages, setPackages]           = useState<BrandPackageSummary[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [catalogName, setCatalogName]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBrandCatalog(), getBrandPackages(), getNotifications()]).then(
      ([catRes, pkgRes, notifRes]) => {
        if (cancelled) return;
        const cat = catRes.data?.catalog;
        setItemCount(cat?.item_count ?? null);
        setCatalogName(cat?.brand?.name ?? null);
        setPackages(pkgRes.data ?? []);
        setNotifications(notifRes.data?.notifications?.slice(0, 5) ?? []);
        setLoading(false);
      },
    );
    return () => { cancelled = true; };
  }, []);

  const brandName = user?.brand?.name ?? user?.first_name ?? 'Brand';
  const brandMono = brandName.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();
  const brandCategory = user?.brand?.category ?? null;

  const recentPackages = [...packages]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  const pkgSentCount = packages.filter((p) => p.status === 'sent').length;

  return (
    <div>
      {/* ── Header ── */}
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 34, lineHeight: 1.12 }}>
          Hi, {brandName.split(' ')[0]}.
        </h1>
        <p className="ink-faint mt-1 num" style={{ fontSize: 14 }}>
          {brandName}{brandCategory ? ` · ${brandCategory}` : ''}
        </p>
      </div>

      {loading ? (
        <div className="mt-8 text-[14px] ink-faint" style={{ fontFamily: 'var(--qm-sans)' }}>Loading…</div>
      ) : (
        <div className="mt-7" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
          {/* ── Main column ── */}
          <div>
            {/* CATALOG STATUS */}
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>YOUR CATALOG</div>
            <button
              onClick={() => navigate('/brand/catalog')}
              className="mt-2 w-full text-left bg-white border hairline rounded-xl hover:shadow-sm transition-shadow"
              style={{ padding: 22 }}
            >
              <div className="flex items-start gap-4">
                <BrandMark mono={brandMono} size={50} />
                <div className="min-w-0 flex-1">
                  <div className="serif font-medium ink leading-snug" style={{ fontSize: 18 }}>
                    {catalogName ? `${catalogName} catalog` : 'Your catalog'}
                  </div>
                  <div className="ink-soft mt-1 num" style={{ fontSize: 13 }}>
                    {itemCount != null ? `${itemCount.toLocaleString()} products` : 'No catalog uploaded'}
                  </div>
                  <div className="mt-2">
                    <span
                      className="qm-pill"
                      style={{
                        background: itemCount ? 'rgba(127,174,194,.22)' : 'var(--qm-gray-100)',
                        color: itemCount ? '#2A5F6F' : 'var(--qm-gray-500)',
                        fontSize: 10,
                        padding: '2px 8px',
                        gap: 5,
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: itemCount ? 'var(--accent)' : 'var(--qm-gray-400)', display: 'inline-block' }} />
                      {itemCount ? 'Active' : 'No catalog'}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* ONE ORANGE CTA — capture → package */}
            <button
              onClick={() => navigate('/brand/capture')}
              className="qm-btn qm-btn-orange qm-btn-full mt-4"
              style={{ padding: '14px 18px', fontSize: 15 }}
            >
              <NpIcon name="scan-line" size={17} color="#fff" />
              Capture a menu &amp; build a package
            </button>
            <div className="mt-2 text-[11.5px] ink-faint">
              Paste a menu, match it to your line, and send the right products to a distributor.
            </div>

            {/* RECENT PACKAGES */}
            <div className="mt-8">
              <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
                <span>RECENT PACKAGES</span>
                <button
                  onClick={() => navigate('/brand/packages')}
                  className="ink-faint"
                  style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400, background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 'unset' }}
                >
                  See all →
                </button>
              </div>
              <div className="mt-2 doc-divider-thick" />

              {recentPackages.length === 0 ? (
                <div className="py-4 text-[13px] ink-faint">No packages yet.</div>
              ) : (
                recentPackages.map((p, i) => (
                  <button
                    key={p.id ?? i}
                    onClick={() => navigate(p.status === 'draft' ? `/brand/packages/${p.id}` : '/brand/notifications')}
                    className="w-full text-left doc-divider py-3 flex items-center gap-3 hover:opacity-90"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="ink leading-snug" style={{ fontSize: 13.5 }}>{p.title}</div>
                      <div className="text-[11px] ink-faint num leading-snug">
                        {p.items_count} product{p.items_count !== 1 ? 's' : ''}
                        {p.target_distributor ? ` · ${p.target_distributor.name}` : ' · no distributor selected'}
                      </div>
                    </div>
                    <NotifyStatusBadge status={p.status === 'draft' ? 'draft' : 'sent'} />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Right rail ── */}
          <div>
            {/* Notifications rail */}
            <div className="px-4 py-4 rounded-md bg-white border hairline">
              <div className="qm-eyebrow" style={{ fontSize: 10 }}>WHERE YOUR LINE STANDS</div>
              <p className="mt-1 text-[11.5px] ink-faint leading-snug">
                {pkgSentCount} active package{pkgSentCount !== 1 ? 's' : ''} sent to distributors. Quotes go to distributors, never to you.
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                {packages.slice(0, 4).map((p, i) => (
                  <div key={p.id ?? i} className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] ink leading-snug truncate">{p.title}</span>
                    <NotifyStatusBadge status={p.status === 'draft' ? 'draft' : 'sent'} />
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/brand/notifications')}
                className="mt-3 text-[11.5px] ink-soft underline inline-flex items-center gap-1"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 'unset' }}
              >
                Track all notifications <NpIcon name="arrow-right" size={12} />
              </button>
            </div>

            {/* Recent notifications */}
            {notifications.length > 0 && (
              <div className="mt-4">
                <div className="qm-eyebrow" style={{ fontSize: 10 }}>RECENT NOTIFICATIONS</div>
                <div className="mt-2 doc-divider-thick" />
                {notifications.map((n: any, i: number) => (
                  <div
                    key={n.id ?? i}
                    className="doc-divider py-2.5"
                    style={{ background: n.read_at ? 'transparent' : 'var(--qm-warm-paper)', margin: '0 -4px', padding: '8px 4px' }}
                  >
                    <div style={{ fontSize: 12.5, color: 'var(--qm-charcoal)', fontFamily: 'var(--qm-sans)' }}>
                      {n.body ?? n.message ?? 'Notification'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 px-4 py-4 rounded-md" style={{ background: 'var(--qm-warm-paper)', border: '1px solid var(--qm-soft-line)' }}>
              <div className="qm-eyebrow" style={{ fontSize: 10 }}>GROW YOUR REACH</div>
              <div className="serif font-medium ink mt-1" style={{ fontSize: 14.5, lineHeight: 1.3 }}>Bring on another distributor.</div>
              <button
                onClick={() => navigate('/brand/distributors')}
                className="mt-2 text-[11.5px] ink-soft underline inline-flex items-center gap-1"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 'unset' }}
              >
                See distributors <NpIcon name="arrow-right" size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
