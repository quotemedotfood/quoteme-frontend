// RepIncomingQuotePage — `/rep/quotes/:id`
//
// The core rep quote view. Shows the full quote document with coverage signals,
// D5 icons per line, and state-aware CTA strip.
//
// EMPTY-MENU path: when quote has no lines + a chef_request_message, renders
// the request mode surface (message prominent, "No menu yet" copy, Ask-the-chef
// action). Coverage / pricing CTAs are hidden in this state.
//
// ?mode=pricing query param switches to RepPricingOnlyView on all viewports.
// ?mode=review switches to RepReviewThreePanelDesktop.
//
// Doctrine compliance:
//   - Q3 LOCKED: NO qty column anywhere in pricing
//   - Sacred Orange = var(--primary)
//   - Coverage dots = var(--accent)
//   - No catalog name — distributor name only
//   - No marketing copy
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · RepIncomingQuotePage
// + RepPricingOnlyView + RepReviewThreePanelDesktop.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router';
import { categoryLabel } from '../../utils/categoryLabel';
import { ChevronLeft, SquarePen, DollarSign, Search, X, Flag, Bookmark, MessageCircle, Pencil } from 'lucide-react';

import { RepMatchStateBadge } from '../../components/rep/RepMatchStateBadge';
import type { RepMatchState } from '../../components/rep/RepMatchStateBadge';
import { QuoteCoverageLabelRep } from '../../components/rep/QuoteCoverageLabelRep';
import { deriveRepMatchState } from '../../utils/repCoverageState';
import { LineCoverageDot } from '../../components/rep/CoverageDots';
import { ItemsToConfirm } from '../../components/rep/ItemsToConfirm';
import { RepCtaStrip } from '../../components/rep/RepCtaStrip';
import { CatalogConfirmBanner } from '../../components/rep/CatalogConfirmBanner';
import { getRepQuote, repPriceQuote, repConfirmQuote } from '../../services/api';
import type { QuoteResponse, QuoteLineResponse, QuoteRestaurantContact } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

import { RepPricingOnlyView } from './RepPricingOnlyView';
import { RepReviewThreePanelDesktop } from './RepReviewThreePanelDesktop';
import { RepReviewMobileFallback } from './RepReviewMobileFallback';
import { useIsMobile } from '../../components/ui/use-mobile';
import { stripSeedPrefix } from '../../utils/format';

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
  amber: '#C99A3F',
  success: '#2F8F4F',
} as const;

function eyebrow(size = 10): React.CSSProperties {
  return {
    ...sans, fontSize: size, fontWeight: 600,
    letterSpacing: '.12em', textTransform: 'uppercase', color: C.gray700,
  };
}

// Contact chip — shows primary contact name + email (or phone) if present
function ContactChip({ contact }: { contact: QuoteRestaurantContact }) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  const reach = contact.email || contact.phone || null;
  if (!name && !reach) return null;
  return (
    <div style={{ ...sans, fontSize: 11.5, color: C.gray700, marginTop: 4, lineHeight: 1.4 }}>
      {name && <span style={{ color: C.charcoal }}>{name}</span>}
      {name && reach && <span style={{ color: C.gray500 }}> · </span>}
      {reach && <span>{reach}</span>}
    </div>
  );
}

type SortBy = 'category' | 'component' | 'match';

type FlowState = 'first-arrival' | 'auto-fired';

// B-45: deriveMatchState is replaced by deriveRepMatchState from repCoverageState util.
// It enforces a minimum-component threshold before any positive coverage signal can fire.
// Importing directly — no local copy to avoid drift.

// Group lines by category
function groupByCategory(lines: QuoteLineResponse[]): { cat: string; items: QuoteLineResponse[] }[] {
  const map = new Map<string, QuoteLineResponse[]>();
  for (const line of lines) {
    const cat = line.category || 'Other';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(line);
  }
  return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
}

export function RepIncomingQuotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const { user } = useAuth();
  const backTo: string = (location.state as { from?: string } | null)?.from ?? '/rep/quotes/inbound';
  // P7: CatalogConfirmBanner is admin-only — never shown to pure reps.
  const isDistributorAdmin = user?.role === 'distributor_admin';

  const isMobile = useIsMobile();

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [flowState, setFlowState] = useState<FlowState>('first-arrival');
  const [sortBy, setSortBy] = useState<SortBy>('category');
  const [showAutoFireToast, setShowAutoFireToast] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getRepQuote(id).then((res) => {
      if (res.data) setQuote(res.data);
      setLoading(false);
    });
  }, [id]);

  const lines = useMemo(() => quote?.lines ?? [], [quote]);
  const matchState = useMemo(() => deriveRepMatchState(lines), [lines]);
  const groups = useMemo(() => groupByCategory(lines), [lines]);

  const pricedLines = lines.filter((l) => l.unit_price_cents != null && l.unit_price_cents > 0);
  const unpricedCount = lines.length - pricedLines.length;
  const missingLines = lines.filter((l) => l.availability_status === 'not_in_catalog' || !l.product);
  const partial = matchState !== 'ready';

  // Empty-menu: no lines + chef_request_message present (Request mode)
  // The shape comes from the QuoteResponse — check for zero lines and a stored note.
  // We look at the quote's input_mode or lines length.
  const chefRequestMessage = (quote as (QuoteResponse & { chef_request_message?: string | null }) | null)?.chef_request_message;
  const isEmptyMenu = lines.length === 0 && !!chefRequestMessage;

  const nav = (dest: string, opts?: { quoteId?: string }) => {
    if (dest === 'rep-triage' || dest === 'rep-quotes-inbound') navigate('/rep/quotes/inbound');
    else if (dest === 'rep-quotes-history') navigate('/rep/quotes/history');
    else if (dest === 'rep-incoming') navigate(`/rep/quotes/${opts?.quoteId || id}`);
    else if (dest === 'rep-pricing') navigate(`/rep/quotes/${opts?.quoteId || id}?mode=pricing`);
    else if (dest === 'rep-review') navigate(`/rep/quotes/${opts?.quoteId || id}?mode=review`);
    else if (dest === 'rep-catalog') navigate('/distributor-admin/catalog');
    else if (dest === 'rep-settings') navigate('/settings');
  };

  const handleUseCatalogPrices = async () => {
    if (!id) return;
    setFlowState('auto-fired');
    setShowAutoFireToast(true);
    setTimeout(() => setShowAutoFireToast(false), 3000);
    // Notify BE to apply catalog prices
    const catalogLines = lines
      .filter((l) => l.product && l.unit_price_cents == null)
      .map((l) => ({ id: l.id, unit_price_cents: 0 })); // BE resolves from catalog
    if (catalogLines.length > 0) {
      await repPriceQuote(id, catalogLines);
    }
  };

  const handleConfirmSend = async () => {
    if (!id || saving) return;
    setSaving(true);
    const res = await repConfirmQuote(id);
    if (res.data) {
      setQuote(res.data);
      navigate('/rep/quotes/inbound');
    }
    setSaving(false);
  };

  // Pricing mode — mobile
  if (mode === 'pricing') {
    return <RepPricingOnlyView quoteId={id!} />;
  }

  // Review mode — desktop: three-panel (locked); mobile: single-panel swap-drawer fallback
  if (mode === 'review') {
    if (isMobile) {
      return <RepReviewMobileFallback quoteId={id!} />;
    }
    return <RepReviewThreePanelDesktop quoteId={id!} />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `3px solid ${C.softLine}`,
            borderTopColor: 'var(--primary)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const sentAt = quote?.sent_at ? new Date(quote.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const mobileBody = (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Nav bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: `1px solid ${C.softLine}`,
          background: '#fff',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(backTo)}
          style={{ ...sans, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.gray700, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ChevronLeft size={13} strokeWidth={1.8} /> {backTo.includes('command-center') ? 'Command Center' : 'Inbound'}
        </button>
        {sentAt && <span style={{ ...sans, fontSize: 11, color: C.gray500 }}>{sentAt}</span>}
      </div>

      <div style={{ overflowY: 'auto' }}>
        {/* Catalog banner — first quote receipt only; P7: admin-only */}
        {isDistributorAdmin && !bannerDismissed && (
          <div style={{ padding: '12px 20px 0' }}>
            <CatalogConfirmBanner
              onReview={() => nav('rep-catalog')}
              onDismiss={() => setBannerDismissed(true)}
            />
          </div>
        )}

        {/* Masthead */}
        <div style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={eyebrow(10)}>INCOMING QUOTE · {stripSeedPrefix(quote?.working_label) || id}</div>
          </div>
          <h1 style={{ ...serif, fontSize: 24, fontWeight: 600, color: C.charcoal, marginTop: 4, lineHeight: 1.15 }}>
            {quote?.restaurant || quote?.contact_name || '—'}
          </h1>
          {quote?.restaurant_contact && (
            <ContactChip contact={quote.restaurant_contact} />
          )}
          <div style={{ ...sans, fontSize: 12.5, color: C.gray700, marginTop: 4, lineHeight: 1.5 }}>
            From <span style={{ color: C.charcoal }}>{quote?.rep || '—'}</span>
          </div>

          {/* Coverage label */}
          <div style={{ marginTop: 12 }}>
            <RepMatchStateBadge state={matchState} missingCount={missingLines.length || undefined} />
          </div>
          <div style={{ marginTop: 8 }}>
            <QuoteCoverageLabelRep state={matchState} />
          </div>
        </div>

        {/* Empty-menu path — Request mode */}
        {isEmptyMenu && (
          <div style={{ padding: '0 20px 20px' }}>
            <div
              style={{
                background: C.warmPaper,
                border: `1px solid ${C.softLine}`,
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div style={eyebrow(9.5)}>CHEF REQUEST</div>
              <div style={{ ...sans, fontSize: 14, color: C.charcoal, marginTop: 8, lineHeight: 1.6 }}>
                {chefRequestMessage}
              </div>
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: `1px solid ${C.softLine}`,
                  ...sans, fontSize: 12, color: C.gray700, lineHeight: 1.5,
                }}
              >
                No menu yet — start the conversation.
              </div>
              <button
                type="button"
                style={{
                  ...sans,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 12, padding: '9px 14px',
                  fontSize: 12.5, color: C.charcoal,
                  background: '#fff', border: `1px solid ${C.softLine}`,
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                <MessageCircle size={13} color={C.charcoal} strokeWidth={1.8} />
                Ask the chef
              </button>
            </div>
          </div>
        )}

        {/* Normal quote path */}
        {!isEmptyMenu && (
          <>
            {/* Partial coverage note */}
            {partial && (
              <div
                style={{
                  margin: '0 20px 12px',
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: C.warmPaper,
                  border: `1px solid ${C.softLine}`,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                <Search size={13} color={C.charcoal} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...sans, fontSize: 12, color: C.charcoal, lineHeight: 1.4 }}>
                    {matchState === 'coverage'
                      ? `${missingLines.length} items aren't in your catalog yet.`
                      : `${missingLines.length} items — matcher wasn't sure.`}
                  </div>
                  <div style={{ ...sans, fontSize: 11, color: C.gray700, marginTop: 2, lineHeight: 1.4 }}>
                    {matchState === 'coverage'
                      ? 'Add them to your catalog, swap to a substitute, or skip the line.'
                      : 'Often a spelling or SKU variant. Search your catalog on each flagged line.'}
                  </div>
                </div>
              </div>
            )}

            {/* CTA strip */}
            <div style={{ padding: '0 20px 8px' }}>
              <RepCtaStrip
                flowState={flowState}
                unpricedCount={unpricedCount}
                totalCount={lines.length}
                partialCoverage={partial}
                onUseCatalogPrices={handleUseCatalogPrices}
                onReview={() => nav('rep-review')}
                onGoPricing={() => nav('rep-pricing')}
                onSendToChef={handleConfirmSend}
              />
            </div>

            {/* Auto-fire toast */}
            {showAutoFireToast && (
              <div
                style={{
                  margin: '0 20px 8px',
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: C.warmPaper,
                  border: `1px solid ${C.charcoal}`,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                <div style={{ ...sans, fontSize: 12, color: C.charcoal, lineHeight: 1.4 }}>
                  {pricedLines.length} of {lines.length} priced from your catalog
                  {unpricedCount > 0 ? ' — review before sending.' : ' — ready to send.'}
                </div>
              </div>
            )}

            {/* Sort toolbar */}
            <div
              style={{
                padding: '8px 20px 12px',
                borderBottom: `1px solid ${C.softLine}`,
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}
            >
              <div style={eyebrow(9.5)}>SORT</div>
              {([
                { id: 'category', label: 'Category' },
                { id: 'component', label: 'Component' },
                { id: 'match', label: 'Match strength' },
              ] as { id: SortBy; label: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  style={{
                    ...sans,
                    padding: '3px 10px',
                    fontSize: 11,
                    borderRadius: 999,
                    border: `1px solid ${C.charcoal}`,
                    background: sortBy === opt.id ? C.charcoal : 'transparent',
                    color: sortBy === opt.id ? '#fff' : C.charcoal,
                    fontWeight: sortBy === opt.id ? 500 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Line items */}
            <div style={{ padding: '0 20px 24px' }}>
              <LineItemsSection
                groups={groups}
                allLines={lines}
                sortBy={sortBy}
                matchState={matchState}
                nav={nav}
                quoteId={id!}
              />
            </div>

            {/* Items to confirm */}
            {partial && missingLines.length > 0 && (
              <div style={{ margin: '0 20px 16px' }}>
                <ItemsToConfirm
                  count={missingLines.length}
                  mode={matchState === 'coverage' ? 'coverage' : 'review'}
                  onSearchCatalog={() => nav('rep-catalog')}
                  onMarkUnavailable={() => {}}
                  onFlagManager={() => {}}
                />
              </div>
            )}

            {/* Quote-level actions */}
            <div
              style={{
                margin: '0 20px 16px',
                paddingTop: 12,
                borderTop: `1px solid ${C.softLine}`,
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
                ...sans, fontSize: 12, color: C.gray700,
              }}
            >
              <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.gray700, ...sans, fontSize: 12 }}>
                <Bookmark size={12} color={C.gray700} strokeWidth={1.8} />
                Save for later
              </button>
              <span style={{ color: C.gray500 }}>·</span>
              <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.gray700, ...sans, fontSize: 12 }}>
                <MessageCircle size={12} color={C.gray700} strokeWidth={1.8} />
                Ask the chef
              </button>
              <span style={{ color: C.gray500 }}>·</span>
              <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.gray700, ...sans, fontSize: 12 }}>
                <Pencil size={12} color={C.gray700} strokeWidth={1.8} />
                Add notes for chef
              </button>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 20px 32px',
                borderTop: `1px solid ${C.softLine}`,
                ...sans, fontSize: 11, color: C.gray500, lineHeight: 1.5,
              }}
            >
              Reply to the chef when you've got prices in. We'll stamp the quote as confirmed and email them a copy.
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Desktop: RepLayout provides shell + sidebar. Render content body directly.
  return (
    <>
      <div className="hidden md:block">
        {/* RepLayout supplies the sidebar + main chrome; render content body bare */}
        <RepDesktopQuoteView
          quote={quote}
          quoteId={id!}
          lines={lines}
          groups={groups}
          matchState={matchState}
          missingLines={missingLines}
          partial={partial}
          flowState={flowState}
          unpricedCount={unpricedCount}
          handleUseCatalogPrices={handleUseCatalogPrices}
          handleConfirmSend={handleConfirmSend}
          saving={saving}
          nav={nav}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sentAt={sentAt}
          bannerDismissed={bannerDismissed}
          setBannerDismissed={setBannerDismissed}
          showCatalogBanner={isDistributorAdmin}
          showAutoFireToast={showAutoFireToast}
          pricedLines={pricedLines}
          isEmptyMenu={isEmptyMenu}
          chefRequestMessage={chefRequestMessage}
          restaurantContact={quote?.restaurant_contact ?? null}
        />
      </div>
      <div className="block md:hidden">
        {mobileBody}
      </div>
    </>
  );
}

// ─── Desktop quote view (inner body inside shell) ──────────────────────────
function RepDesktopQuoteView({
  quote,
  quoteId,
  lines,
  groups,
  matchState,
  missingLines,
  partial,
  flowState,
  unpricedCount,
  handleUseCatalogPrices,
  handleConfirmSend,
  saving,
  nav,
  sortBy,
  setSortBy,
  sentAt,
  bannerDismissed,
  setBannerDismissed,
  showCatalogBanner,
  showAutoFireToast,
  pricedLines,
  isEmptyMenu,
  chefRequestMessage,
  restaurantContact,
}: {
  quote: QuoteResponse | null;
  quoteId: string;
  lines: QuoteLineResponse[];
  groups: { cat: string; items: QuoteLineResponse[] }[];
  matchState: RepMatchState;
  missingLines: QuoteLineResponse[];
  partial: boolean;
  flowState: FlowState;
  unpricedCount: number;
  handleUseCatalogPrices: () => void;
  handleConfirmSend: () => void;
  saving: boolean;
  nav: (dest: string, opts?: { quoteId?: string }) => void;
  sortBy: SortBy;
  setSortBy: (s: SortBy) => void;
  sentAt: string;
  bannerDismissed: boolean;
  setBannerDismissed: (v: boolean) => void;
  showCatalogBanner?: boolean;
  showAutoFireToast: boolean;
  pricedLines: QuoteLineResponse[];
  isEmptyMenu: boolean;
  chefRequestMessage?: string | null;
  restaurantContact?: QuoteRestaurantContact | null;
}) {
  return (
    <div style={{ maxWidth: 900 }}>
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate(backTo)}
        style={{ ...sans, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: C.gray700, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}
      >
        <ChevronLeft size={14} strokeWidth={1.8} /> {backTo.includes('command-center') ? 'Command Center' : 'Triage'}
      </button>

      {/* Catalog banner — P7: admin-only, never shown to pure reps */}
      {showCatalogBanner && !bannerDismissed && (
        <div style={{ marginBottom: 16 }}>
          <CatalogConfirmBanner
            onReview={() => nav('rep-catalog')}
            onDismiss={() => setBannerDismissed(true)}
          />
        </div>
      )}

      {/* Masthead */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={eyebrow(10)}>INCOMING QUOTE · {stripSeedPrefix(quote?.working_label) || quoteId}</div>
          <h1 style={{ ...serif, fontSize: 32, fontWeight: 600, color: C.charcoal, marginTop: 4, lineHeight: 1.1 }}>
            {quote?.restaurant || quote?.contact_name || '—'}
          </h1>
          {restaurantContact && <ContactChip contact={restaurantContact} />}
          <div style={{ ...sans, fontSize: 13, color: C.gray700, marginTop: 4, lineHeight: 1.5 }}>
            From <span style={{ color: C.charcoal }}>{quote?.rep || '—'}</span>
            {sentAt && <span style={{ color: C.gray500 }}> · {sentAt}</span>}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <RepMatchStateBadge state={matchState} missingCount={missingLines.length || undefined} />
            <QuoteCoverageLabelRep state={matchState} />
          </div>
        </div>

        {/* Desktop action strip */}
        {!isEmptyMenu && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => nav('rep-review', { quoteId })}
              style={{
                ...sans, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 14px', fontSize: 13, color: C.charcoal,
                background: '#fff', border: `1px solid ${C.softLine}`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              <SquarePen size={13} color={C.charcoal} strokeWidth={1.8} />
              Review the quote
            </button>
            <button
              type="button"
              onClick={() => nav('rep-pricing', { quoteId })}
              style={{
                ...sans, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', fontSize: 13, color: '#fff',
                background: 'var(--primary)', border: 'none',
                borderRadius: 6, cursor: 'pointer', fontWeight: 500,
              }}
            >
              <DollarSign size={13} color="#fff" strokeWidth={1.8} />
              Go to pricing
            </button>
          </div>
        )}
      </div>

      {/* Empty-menu / request mode */}
      {isEmptyMenu ? (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              background: C.warmPaper,
              border: `1px solid ${C.softLine}`,
              borderRadius: 8,
              padding: 24,
              maxWidth: 560,
            }}
          >
            <div style={eyebrow(9.5)}>CHEF REQUEST</div>
            <div style={{ ...sans, fontSize: 14, color: C.charcoal, marginTop: 8, lineHeight: 1.7 }}>
              {chefRequestMessage}
            </div>
            <div style={{ ...sans, fontSize: 12, color: C.gray700, marginTop: 12, lineHeight: 1.5 }}>
              No menu yet — start the conversation.
            </div>
            <button
              type="button"
              style={{
                ...sans,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 12, padding: '9px 14px',
                fontSize: 12.5, color: C.charcoal,
                background: '#fff', border: `1px solid ${C.softLine}`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              <MessageCircle size={13} color={C.charcoal} strokeWidth={1.8} />
              Ask the chef
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Auto-fire toast */}
          {showAutoFireToast && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 6,
                background: C.warmPaper,
                border: `1px solid ${C.charcoal}`,
                display: 'inline-flex', alignItems: 'center', gap: 10,
                ...sans, fontSize: 12, color: C.charcoal,
              }}
            >
              {pricedLines.length} of {lines.length} priced from your catalog
              {unpricedCount > 0 ? ' — review before sending.' : ' — ready to send.'}
            </div>
          )}

          {/* Table-style line items for desktop */}
          <div style={{ marginTop: 24 }}>
            {/* Sort toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={eyebrow(9.5)}>SORT</div>
              {([
                { id: 'category', label: 'Category' },
                { id: 'component', label: 'Component' },
                { id: 'match', label: 'Match strength' },
              ] as { id: SortBy; label: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  style={{
                    ...sans, padding: '3px 10px', fontSize: 11, borderRadius: 999,
                    border: `1px solid ${C.charcoal}`,
                    background: sortBy === opt.id ? C.charcoal : 'transparent',
                    color: sortBy === opt.id ? '#fff' : C.charcoal,
                    fontWeight: sortBy === opt.id ? 500 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <LineItemsSection
              groups={groups}
              allLines={lines}
              sortBy={sortBy}
              matchState={matchState}
              nav={nav}
              quoteId={quoteId}
            />
          </div>

          {/* Items to confirm */}
          {partial && missingLines.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <ItemsToConfirm
                count={missingLines.length}
                mode={matchState === 'coverage' ? 'coverage' : 'review'}
                onSearchCatalog={() => nav('rep-catalog')}
                onMarkUnavailable={() => {}}
                onFlagManager={() => {}}
              />
            </div>
          )}

          {/* Quote actions */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.softLine}`, display: 'flex', flexWrap: 'wrap', gap: 16, ...sans, fontSize: 12, color: C.gray700 }}>
            <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.gray700, ...sans, fontSize: 12 }}>
              <Bookmark size={12} color={C.gray700} strokeWidth={1.8} />
              Save for later
            </button>
            <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.gray700, ...sans, fontSize: 12 }}>
              <MessageCircle size={12} color={C.gray700} strokeWidth={1.8} />
              Ask the chef
            </button>
            <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.gray700, ...sans, fontSize: 12 }}>
              <Pencil size={12} color={C.gray700} strokeWidth={1.8} />
              Add notes for chef
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Line items section ────────────────────────────────────────────────────
function LineItemsSection({
  groups,
  allLines,
  sortBy,
  matchState,
  nav,
  quoteId,
}: {
  groups: { cat: string; items: QuoteLineResponse[] }[];
  allLines: QuoteLineResponse[];
  sortBy: SortBy;
  matchState: RepMatchState;
  nav: (dest: string, opts?: { quoteId?: string }) => void;
  quoteId: string;
}) {
  const partial = matchState !== 'ready';

  if (sortBy === 'category') {
    return (
      <>
        {groups.map((g) => (
          <div key={g.cat} style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h3 style={{ ...serif, fontSize: 13.5, fontWeight: 500, color: C.charcoal, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                {categoryLabel(g.cat)}
              </h3>
              <span style={{ ...sans, fontSize: 11, color: C.gray500 }}>{g.items.length} items</span>
            </div>
            {g.items.map((line, ii) => (
              <QuoteLine
                key={line.id}
                line={line}
                partial={partial}
                trueMiss={matchState === 'coverage'}
                nav={nav}
                quoteId={quoteId}
              />
            ))}
          </div>
        ))}
      </>
    );
  }

  const sorted = [...allLines].sort((a, b) => {
    if (sortBy === 'component') {
      return (a.component?.name || '').localeCompare(b.component?.name || '');
    }
    // match: missing first
    const aMiss = !a.product || a.availability_status === 'not_in_catalog' ? 0 : 1;
    const bMiss = !b.product || b.availability_status === 'not_in_catalog' ? 0 : 1;
    return aMiss - bMiss;
  });

  return (
    <div style={{ marginTop: 16 }}>
      {sorted.map((line) => (
        <QuoteLine
          key={line.id}
          line={line}
          partial={partial}
          trueMiss={matchState === 'coverage'}
          nav={nav}
          quoteId={quoteId}
          showCat
        />
      ))}
    </div>
  );
}

// ─── Single line row ───────────────────────────────────────────────────────
function QuoteLine({
  line,
  partial,
  trueMiss,
  nav,
  quoteId,
  showCat,
}: {
  line: QuoteLineResponse;
  partial: boolean;
  trueMiss: boolean;
  nav: (dest: string, opts?: { quoteId?: string }) => void;
  quoteId: string;
  showCat?: boolean;
}) {
  const missing = !line.product || line.availability_status === 'not_in_catalog';
  const strength = missing ? (trueMiss ? 'thin' : 'partial') : 'strong';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 0',
        borderBottom: `1px solid ${C.softLine}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <LineCoverageDot strength={strength} />
          <span style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.35 }}>
            {line.component?.name || line.product?.product || '—'}
          </span>
        </div>
        <div style={{ ...sans, fontSize: 11, color: C.gray500, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {line.product?.pack_size || ''}
          {line.chef_note ? ` · ${line.chef_note}` : ''}
          {showCat && line.category ? <span style={{ color: C.gray500 }}> · {categoryLabel(line.category)}</span> : null}
        </div>
        {missing && (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...serif, fontSize: 10.5, color: C.charcoal, fontStyle: 'italic', lineHeight: 1.35 }}>
              {trueMiss ? 'Not in your catalog yet.' : 'Matcher unsure — confirm or swap.'}
            </span>
            <button
              type="button"
              style={{
                ...sans, display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10.5, color: C.charcoal,
                background: 'none', border: 'none', cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              <Search size={10} color={C.charcoal} strokeWidth={1.8} />
              Search your catalog
            </button>
          </div>
        )}
      </div>

      {/* D5 icons — always visible per row */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 2 }}>
        <RowIcon
          onClick={() => nav('rep-review', { quoteId })}
          bg="rgba(127,174,194,.10)"
          border="rgba(127,174,194,.55)"
          title="Review this line"
          icon={<SquarePen size={13} color="var(--accent, #7FAEC2)" strokeWidth={1.8} />}
        />
        <RowIcon
          onClick={() => nav('rep-pricing', { quoteId })}
          bg="var(--primary)"
          border="var(--primary)"
          title="Price this line"
          icon={<DollarSign size={13} color="#fff" strokeWidth={1.8} />}
        />
      </span>
    </div>
  );
}

function RowIcon({ onClick, bg, border, title, icon }: { onClick: () => void; bg: string; border: string; title: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 26, height: 26,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%',
        background: bg,
        border: `1px solid ${border}`,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );
}
