// ChefDistributorDetailPage — /chef/distributor/:id
//
// V1 detail surface for a distributor the chef is linked to.
// Sits inside ChefShellLayout (sidebar + tab chrome via <Outlet />).
//
// Sections:
//   Header    — distributor name + claim status badge
//   Reps      — rep name / email / phone (single rep; BE returns first)
//   Quotes    — recent quotes (from /api/v1/chef/quotes, filtered by
//               distributor.id client-side) — click → /chef/quotes/:id
//   Catalog   — catalog_state pill + SKU count + last-updated
//   CTA       — Sacred Orange "Request fresh catalog" →
//               POST /api/v1/chef/catalog_upload_links (BE-3 endpoint)
//
// Composition strategy:
//   1. GET /api/v1/chef/distributors/:id   → distributor detail + rep + catalogs + recent_quote
//   2. GET /api/v1/chef/quotes             → filter client-side by distributor.id for recent list
//   Both fire in parallel on mount.
//
// B3b atomic — structure over visual polish. Route:
//   { path: 'chef/distributor/:id', element: <ChefDistributorDetailPage /> }
// Note: 'chef/distributor/new' is a static segment that takes precedence over
// :id in react-router, so there is no collision.

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  getChefDistributorDetail,
  getChefQuotes,
  getChefStack,
  requestCatalogUploadLink,
  type ChefDistributorDetail,
  type ChefQuoteRow,
  type ChefStackResponse,
} from '../../services/api';
import { PinToStackButton } from '../../components/chef/PinToStackButton';

// ─── Color constants (matches ChefDashboardPage / ChefQuotesPage convention) ──
const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  lightBlue: '#A5CFDD',
  hoverBlue: '#7FAEC2',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  errorRed: '#DC2626',
  errorBg: '#FEE2E2',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const eyebrow: React.CSSProperties = {
  ...sans,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: C.gray500,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      style={{
        ...sans,
        fontSize: 12.5,
        color: C.gray500,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Distributors
    </button>
  );
}

function ClaimStatusPill({ status }: { status: string }) {
  const claimed = status === 'active';
  return (
    <span
      style={{
        ...sans,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 999,
        background: claimed ? C.successBg : C.warningBg,
        color: claimed ? C.success : C.warning,
      }}
    >
      {claimed ? 'Claimed' : 'Unclaimed'}
    </span>
  );
}

function CatalogStatePill({ state }: { state: string | null | undefined }) {
  const s = state ?? 'discovery';
  const styleMap: Record<string, { bg: string; color: string }> = {
    discovery: { bg: C.warningBg, color: C.warning },
    provisional: { bg: '#EDE9FE', color: '#7C3AED' },
    verified: { bg: C.successBg, color: C.success },
    pending: { bg: C.warningBg, color: C.warning },
    stale: { bg: C.errorBg, color: C.errorRed },
  };
  const st = styleMap[s] ?? { bg: C.softLine, color: C.gray700 };
  return (
    <span
      style={{
        ...sans,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 999,
        background: st.bg,
        color: st.color,
        textTransform: 'capitalize',
      }}
    >
      {s}
    </span>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={eyebrow}>{label}</div>
      <div style={{ borderTop: `2px solid ${C.charcoal}`, marginTop: 4 }} />
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div
        className="w-8 h-8 rounded-full border-4"
        style={{ borderColor: C.softLine, borderTopColor: C.orange, animation: 'spin 1s linear infinite' }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal }}>
        Couldn't load distributor.
      </div>
      <p className="mt-2" style={{ ...sans, fontSize: 13, color: C.gray700, lineHeight: 1.55 }}>
        {message || 'Try again in a moment.'}
      </p>
    </div>
  );
}

// ─── Main page component ───────────────────────────────────────────────────────

export function ChefDistributorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ChefDistributorDetail | null>(null);
  const [quotes, setQuotes] = useState<ChefQuoteRow[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Stack data for pin affordance. null = loading; undefined = no stack yet.
  const [stackData, setStackData] = useState<ChefStackResponse | null | undefined>(null);

  const loadStack = useCallback(() => {
    getChefStack().then((res) => {
      setStackData(res.data ?? undefined);
    });
  }, []);

  // Sacred Orange CTA state
  const [ctaState, setCtaState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [ctaError, setCtaError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    loadStack();

    async function load() {
      // Parallel: detail + quotes
      const [detailRes, quotesRes] = await Promise.all([
        getChefDistributorDetail(id!),
        getChefQuotes(),
      ]);
      if (cancelled) return;

      if (detailRes.error || !detailRes.data) {
        setErrorMsg(detailRes.error ?? 'Not found');
        setLoadState('error');
        return;
      }

      setDetail(detailRes.data);

      // Filter quotes by this distributor client-side
      const allQuotes = quotesRes.data?.quotes ?? [];
      const distQuotes = allQuotes
        .filter((q) => q.distributor?.id === id)
        .slice(0, 10); // cap at 10 for V1
      setQuotes(distQuotes);

      setLoadState('ready');
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  async function handleRequestCatalog() {
    if (!id || ctaState === 'loading') return;
    setCtaState('loading');
    setCtaError('');
    const res = await requestCatalogUploadLink(id);
    if (res.error || !res.data) {
      setCtaError(res.error ?? 'Request failed. Try again.');
      setCtaState('error');
    } else {
      setCtaState('sent');
    }
  }

  if (loadState === 'loading') return <Spinner />;
  if (loadState === 'error' || !detail) return <ErrorState message={errorMsg} />;

  const primaryCatalog = detail.catalogs[0] ?? null;

  return (
    <div style={{ background: C.warmPaper, minHeight: '100%', color: C.charcoal, ...sans }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 48px' }}>

        {/* Back nav */}
        <div style={{ marginBottom: 16 }}>
          <BackLink />
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ ...serif, fontSize: 28, fontWeight: 600, color: C.charcoal, lineHeight: 1.15, margin: 0 }}>
              {detail.name}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ClaimStatusPill status={detail.status} />
            {/* Pin-to-stack affordance */}
            {id && (
              <PinToStackButton
                distributorId={id}
                distributorName={detail.name}
                stackData={stackData}
                onStackChange={loadStack}
              />
            )}
          </div>
        </div>

        {/* ── Rep section ─────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 28 }}>
          <SectionHeader label="Your rep" />
          {detail.rep ? (
            <div style={{ padding: '14px 0', borderBottom: `1px solid ${C.softLine}` }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
                {detail.rep.name}
              </div>
              {detail.rep.email && (
                <a
                  href={`mailto:${detail.rep.email}`}
                  style={{ ...sans, fontSize: 12.5, color: C.gray700, textDecoration: 'underline', lineHeight: 1.4, display: 'block', marginTop: 3 }}
                >
                  {detail.rep.email}
                </a>
              )}
              {detail.rep.phone && (
                <div style={{ ...sans, fontSize: 12.5, color: C.gray500, lineHeight: 1.4, marginTop: 2 }}>
                  {detail.rep.phone}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '14px 0', fontSize: 13, color: C.gray500, lineHeight: 1.5 }}>
              No rep assigned yet.{' '}
              <button
                type="button"
                onClick={() => navigate('/chef/distributor/new')}
                style={{ ...sans, fontSize: 13, color: C.gray700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Add one
              </button>
            </div>
          )}
        </section>

        {/* ── Catalog section ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: 28 }}>
          <SectionHeader label="Catalog" />
          {primaryCatalog ? (
            <div style={{ padding: '14px 0', borderBottom: `1px solid ${C.softLine}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <CatalogStatePill state={primaryCatalog.catalog_state} />
                <span style={{ ...sans, fontSize: 12.5, color: C.gray500 }}>
                  {primaryCatalog.sku_count.toLocaleString()} SKUs
                </span>
                <span style={{ ...sans, fontSize: 12.5, color: C.gray400 }}>
                  · updated {formatDate(primaryCatalog.created_at)}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '14px 0', fontSize: 13, color: C.gray500, lineHeight: 1.5 }}>
              No catalog on file.
            </div>
          )}
        </section>

        {/* ── Sacred Orange CTA — Request fresh catalog ─────────────────── */}
        <section style={{ marginBottom: 28 }}>
          {ctaState === 'sent' ? (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                background: C.successBg,
                border: `1px solid ${C.success}`,
                ...sans,
                fontSize: 13,
                color: C.success,
                lineHeight: 1.55,
              }}
            >
              Request sent. Your rep will be notified to forward the catalog upload link.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRequestCatalog}
                disabled={ctaState === 'loading'}
                style={{
                  ...sans,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  fontSize: 13.5,
                  fontWeight: 600,
                  background: ctaState === 'loading' ? '#F5C07A' : C.orange,
                  color: C.charcoal,
                  border: 'none',
                  borderRadius: 7,
                  cursor: ctaState === 'loading' ? 'wait' : 'pointer',
                  opacity: ctaState === 'loading' ? 0.8 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {ctaState === 'loading' ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: `2px solid ${C.charcoal}`,
                        borderTopColor: 'transparent',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Sending request…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Request fresh catalog
                  </>
                )}
              </button>
              {ctaState === 'error' && ctaError && (
                <p style={{ ...sans, fontSize: 12, color: C.errorRed, marginTop: 6 }}>{ctaError}</p>
              )}
              <p style={{ ...sans, fontSize: 11.5, color: C.gray500, marginTop: 6, lineHeight: 1.45 }}>
                Sends your rep a link to upload their latest price list directly.
              </p>
            </>
          )}
        </section>

        {/* ── Recent quotes section ───────────────────────────────────────── */}
        <section>
          <SectionHeader label={`Quotes from ${detail.name}`} />
          {quotes.length === 0 ? (
            <div style={{ padding: '14px 0', fontSize: 13, color: C.gray500, lineHeight: 1.5 }}>
              No quotes from this distributor yet.
            </div>
          ) : (
            <div>
              {quotes.map((q) => (
                <QuoteRow key={q.id} q={q} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Quote row (click → /chef/quotes/:id) ─────────────────────────────────────

function quoteStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    won: 'Accepted',
    lost: 'Declined',
    expired: 'Expired',
    pending_requote: 'Refresh Requested',
  };
  return map[status] ?? status;
}

function quoteStatusColor(status: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    won: { bg: '#DCFCE7', color: '#16A34A' },
    sent: { bg: '#EFF6FF', color: '#2563EB' },
    expired: { bg: '#FEE2E2', color: '#DC2626' },
    lost: { bg: '#FEE2E2', color: '#DC2626' },
  };
  return map[status] ?? { bg: C.softLine, color: C.gray700 };
}

function QuoteRow({ q }: { q: ChefQuoteRow }) {
  const { bg, color } = quoteStatusColor(q.status);
  const total = q.total_cents > 0 ? money(q.total_cents) : null;

  return (
    <Link
      to={`/chef/quotes/${q.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 0',
        borderBottom: `1px solid ${C.softLine}`,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...sans, fontSize: 13.5, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
          {q.label}
        </div>
        <div style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.3, marginTop: 2 }}>
          {formatDate(q.created_at)}
          {total && ` · ${total}`}
          {q.item_count > 0 && ` · ${q.item_count} items`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span
          style={{
            ...sans,
            fontSize: 10,
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: 999,
            background: bg,
            color,
          }}
        >
          {quoteStatusLabel(q.status)}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}
