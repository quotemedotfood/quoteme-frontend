// ChefPullReceiptPage — /chef/pull/receipt/:id
//
// Receipt-style summary of a completed pull quote.
//
// Primary CTA:
//   Affiliated:   "Send to [Rep Name]" — mailto to rep's email
//   Unaffiliated: (no CTA — share flow not yet built)
//
// The distributor anchor at top persists so the chef always sees context.
// Line items are grouped by category. Unmatched items surface in a
// "Items to confirm" section — no silent drops.
//
// Copy doctrine: calm, operational.
// BANNED: AI, intelligent, automated, platform, ecosystem, seamless.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { getPullQuote, type PullQuoteResponse, type PullQuoteDistributor } from '../../services/api';
import type { QuoteLineResponse } from '../../services/api';
import { PullDistributorAnchor } from '../../components/chef/PullDistributorAnchor';
import {
  QuoteStateDocument,
  stateFromQuoteState,
  type QuoteDocGroup,
} from '../../components/chef/QuoteStateDocument';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

function toTitleCase(str: string): string {
  if (!str) return '';
  if (/[^\x00-\x7F]/.test(str)) return str;
  return str
    .replace(/\b\w+/g, (word) => {
      const lower = word.toLowerCase();
      if (['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with'].includes(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .replace(/^./, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function groupByCategory(lines: QuoteLineResponse[]): Map<string, QuoteLineResponse[]> {
  const map = new Map<string, QuoteLineResponse[]>();
  for (const line of lines) {
    const cat = line.product?.category || line.category || 'Other';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(line);
  }
  return map;
}

// ─── ChefPullReceiptPage ───────────────────────────────────────────────────────

export function ChefPullReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Distributor context from router state (passed by ChefPullStatusPage)
  const locationState = location.state as {
    distributor?: PullQuoteDistributor;
  } | null;

  const [quote, setQuote] = useState<PullQuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const distributor: PullQuoteDistributor | null =
    quote?.distributor ?? locationState?.distributor ?? null;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPullQuote(id).then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setQuote(res.data);
      }
      setLoading(false);
    });
  }, [id]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFAF7] flex flex-col">
        <PullDistributorAnchor distributor={locationState?.distributor ?? null} />
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border-4 border-[#E0E0E0] border-t-[#E5A84B]"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-[#FBFAF7] flex flex-col">
        <PullDistributorAnchor distributor={distributor} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1
              className="text-2xl font-semibold text-[#2A2A2A] mb-3"
              style={headlineStyle}
            >
              Something went wrong.
            </h1>
            <p className="text-[#4F4F4F] text-sm leading-relaxed mb-6">
              {error ?? 'The quote could not be loaded. Try again in a moment.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/chef/pull/entry', { state: locationState })}
              className="text-sm text-[#2B2B2B] underline underline-offset-2"
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Derive display values ──────────────────────────────────────────────────

  const lines = quote.lines ?? [];
  const matchedLines = lines.filter(
    (l) => l.availability_status === 'available' && l.product,
  );
  const unmatchedLines = lines.filter(
    (l) => l.availability_status === 'not_in_catalog' || !l.product,
  );
  const grouped = groupByCategory(matchedLines);

  const affiliated = distributor?.affiliated ?? false;
  const rep = distributor?.rep ?? null;

  // ── D6 QuoteStateDocument props (replaces the inline header + line list) ──────
  const docState = quote.state ? stateFromQuoteState(quote.state) : 'preview';
  const docGroups: QuoteDocGroup[] = Array.from(grouped.entries()).map(([category, catLines]) => ({
    cat: toTitleCase(category),
    items: catLines.map((l) => ({
      name: toTitleCase(l.product.product),
      pack: l.product.pack_size || undefined,
      note: l.product.brand ? toTitleCase(l.product.brand) : undefined,
      qty: l.quantity,
      unit: (l.unit_price_cents ?? 0) / 100,
    })),
  }));
  const pricedCount = matchedLines.filter((l) => l.unit_price_cents != null).length;
  const docDate = formatDate(quote.created_at);

  // ── Send handler ──────────────────────────────────────────────────────────
  async function handleSendToRep() {
    if (!rep?.email) return;
    const subject = encodeURIComponent('Quote ready for review');
    const shareLink = quote?.share_url ?? window.location.href;
    const body = encodeURIComponent(
      `Hi${rep.first_name ? ` ${rep.first_name}` : ''} — a new quote is ready for your review.\n\n${shareLink}`,
    );
    window.location.href = `mailto:${rep.email}?subject=${subject}&body=${body}`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FBFAF7] flex flex-col">
      {/* Anchor strip */}
      <PullDistributorAnchor distributor={distributor} />

      <div className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-xl">

          {/* ── 1+3. Document — D6 state-driven chrome (replaces the inline
              header + price-less grouped line list). Anchor strip, "Items to
              confirm" (unmatched), and CTAs below stay. */}
          {quote.restaurant && (
            <div
              className="mb-8 overflow-hidden rounded-lg"
              style={{ border: '1px solid #E8E8E8' }}
            >
              <QuoteStateDocument
                state={docState}
                restaurant={quote.restaurant}
                quoteDate={docDate}
                rep={rep?.name || 'your rep'}
                distributorShort={distributor?.name}
                groups={docGroups}
                pricedCount={pricedCount}
                totalCount={matchedLines.length}
                lastUpdated={docDate}
                confirmedAt={docDate}
              />
            </div>
          )}

          {/* ── 2. Empty state ───────────────────────────────────────────── */}
          {lines.length === 0 && (
            <div className="mb-8 border border-[#F0EDE7] rounded-xl px-5 py-6 bg-white text-center">
              <p className="text-[#4F4F4F] text-sm">
                No line items yet. The quote may still be processing — check back in a moment.
              </p>
            </div>
          )}

          {/* ── 4. Unmatched items ───────────────────────────────────────── */}
          {unmatchedLines.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-[#9E9E9E] tracking-widest uppercase mb-3 pb-2 border-b border-[#F0EDE7]">
                Items to confirm
              </p>
              <div className="flex flex-col gap-3">
                {unmatchedLines.map((line) => (
                  <div key={line.id} className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[#2A2A2A] text-base font-medium leading-snug">
                        {toTitleCase(line.component?.name || line.category || 'Item')}
                      </span>
                      {docState !== 'preview' && (
                        <span className="inline-flex self-start bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-xs">
                          {(line as { resolution_label?: string }).resolution_label ?? 'Not in catalog'}
                        </span>
                      )}
                    </div>
                    {line.category && line.component?.name && (
                      <span className="text-sm text-[#9E9E9E] whitespace-nowrap shrink-0 mt-0.5">
                        {toTitleCase(line.category)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 5. Primary CTA ───────────────────────────────────────────── */}
          <div className="border-t border-[#F0EDE7] pt-8 flex flex-col gap-3">

            {affiliated && rep && (
              // Affiliated: send directly to the rep
              <button
                type="button"
                onClick={handleSendToRep}
                className="w-full bg-[#2A2A2A] hover:bg-[#1A1A1A] text-white rounded-lg px-6 py-3.5 text-base font-medium transition-colors"
              >
                Send to {rep.first_name ?? rep.name}
              </button>
            )}

            {/* Pull another quote */}
            <button
              type="button"
              onClick={() =>
                navigate('/chef/pull/entry', {
                  state: { distributor },
                })
              }
              className="w-full border border-[#E0E0E0] hover:border-[#BDBDBD] text-[#4F4F4F] rounded-lg px-6 py-3.5 text-base font-medium transition-colors"
            >
              Pull another quote
            </button>

            {/* Back to quotes */}
            <button
              type="button"
              onClick={() => navigate('/chef/quotes')}
              className="w-full text-[#9E9E9E] hover:text-[#4F4F4F] px-6 py-2.5 text-sm font-medium transition-colors"
            >
              Back to quotes
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
