import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { getGuestQuote, getChefQuote, acceptChefQuote, sendChefQuestion } from '../../services/api';
import { acceptCaptureAuthUrl } from '../../utils/captureFlow';
import type { QuoteResponse, QuoteLineResponse } from '../../services/api';
import {
  QuoteStateDocument,
  stateFromQuoteState,
  type QuoteDocGroup,
} from '../../components/chef/QuoteStateDocument';
import { categoryLabel } from '../../utils/categoryLabel';
import { isLockedQuoteState } from '../../utils/quoteStatusLabel';

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// Group matched lines by category, preserving insertion order
function groupByCategory(lines: QuoteLineResponse[]): Map<string, QuoteLineResponse[]> {
  const map = new Map<string, QuoteLineResponse[]>();
  for (const line of lines) {
    const cat = line.product?.category || line.category || 'Other';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(line);
  }
  return map;
}

// ─── ChefQuoteReceiptPage ──────────────────────────────────────────────────────

export function ChefQuoteReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [sending, setSending] = useState(false);
  const [questionSent, setQuestionSent] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedForLater, setSavedForLater] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // Prefer the chef-scoped endpoint when a Bearer token is present
    // (authenticated chef session). The chef endpoint is scoped by
    // RestaurantContact join so existence is never leaked to wrong chefs.
    // Fall back to the guest endpoint when only an X-Guest-Token is
    // present (true guest preview-link arrival, no account yet).
    const bearerToken = localStorage.getItem('quoteme_token');
    const fetchFn = bearerToken ? getChefQuote : getGuestQuote;
    fetchFn(id).then((res) => {
      if (res.error) {
        setError(res.error);
        setErrorStatus(res.status ?? null);
      } else if (res.data) {
        setQuote(res.data);
      }
      setLoading(false);
    });
  }, [id]);

  const [searchParams] = useSearchParams();
  const autoAcceptedRef = useRef(false);

  async function handleAccept() {
    if (!id) return;
    // P0: accept 404s for an unauthenticated guest. Capture them first — sign up
    // (which claims this quote), then auto-fire accept on return (intent=accept).
    if (!localStorage.getItem('quoteme_token')) {
      navigate(acceptCaptureAuthUrl(id));
      return;
    }
    setActionError(null);
    setAccepting(true);
    const res = await acceptChefQuote(id);
    if (res.error) {
      setActionError(res.error);
      setAccepting(false);
      return;
    }
    if (res.data?.order_guide_id) {
      navigate(`/chef/order-guide/${res.data.order_guide_id}`);
    } else {
      setAccepting(false);
    }
  }

  // P0: on return from the capture flow (?intent=accept), once authenticated and the
  // quote has loaded, auto-fire accept exactly once. The ref guards against re-runs.
  useEffect(() => {
    if (autoAcceptedRef.current) return;
    if (searchParams.get('intent') !== 'accept') return;
    if (!localStorage.getItem('quoteme_token')) return;
    if (!quote) return;
    if (quote.status === 'won' || quote.state === 'accepted') return;
    autoAcceptedRef.current = true;
    handleAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, quote]);

  async function handleSendQuestion() {
    if (!id || !questionText.trim()) return;
    setActionError(null);
    setSending(true);
    const res = await sendChefQuestion(id, questionText.trim());
    setSending(false);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setQuestionSent(true);
    setQuestionOpen(false);
    setQuestionText('');
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-4 border-[#E0E0E0] border-t-[#2A2A2A]"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  // Status-aware copy. The receipt endpoint can return:
  //   401 → auth expired or chef arrived without a valid magic-link session
  //   404 → quote actually missing (rare; ID typo or quote deleted)
  //   any other → generic retry. Base44-compliant: no banned verbs, framing
  //   as an operational document, no SaaS-funnel "sign in" language.
  if (error || !quote) {
    const { title, body } = receiptErrorCopy(errorStatus);
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1
            className="text-2xl font-semibold text-[#2A2A2A] mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title}
          </h1>
          <p className="text-[#4F4F4F] text-sm leading-relaxed">{body}</p>
        </div>
      </div>
    );
  }

  // ── Derive display values ──────────────────────────────────────────────────

  const matchedLines = quote.lines.filter(
    (l) => l.availability_status === 'available' && l.product,
  );
  const unmatchedLines = quote.lines.filter(
    (l) => l.availability_status === 'not_in_catalog' || !l.product,
  );

  const grouped = groupByCategory(matchedLines);

  // Rep info — from the quote's `rep` string and the first contact with an email
  const repName = quote.rep || null;
  const repContact = quote.contacts?.find((c) => c.email) || null;
  const repEmail = repContact?.email || null;

  // ── Terminal-state lock ───────────────────────────────────────────────────────
  // Once a quote reaches a terminal state (won/lost on the BE status axis, or
  // accepted/declined/expired on the J1 state axis) the chef should not be
  // able to trigger "Looks good", "I have questions", or "Save for later" —
  // the action has already been recorded or the quote is no longer actionable.
  // H-2/H-5: shared isLockedQuoteState() from quoteStatusLabel utils.
  const isLocked = isLockedQuoteState(quote);

  // ── D6 QuoteStateDocument props ──────────────────────────────────────────────
  // The document body (header + priced matched lines + totals) is now the
  // state-driven QuoteStateDocument. The unmatched-lines section + decision
  // actions below stay (Justin no-silent-drops + core chef flow).
  const docState = quote.state
    ? stateFromQuoteState(quote.state)
    : quote.preview
      ? 'preview'
      : 'confirmed';
  const docGroups: QuoteDocGroup[] = Array.from(grouped.entries()).map(([category, lines]) => ({
    cat: categoryLabel(category),
    items: lines.map((l) => ({
      name: toTitleCase(l.product.product),
      pack: l.product.pack_size || undefined,
      note: l.product.brand ? toTitleCase(l.product.brand) : undefined,
      qty: l.quantity,
      unit: l.unit_price_cents != null ? l.unit_price_cents / 100 : undefined,
    })),
  }));
  const pricedCount = matchedLines.filter((l) => l.unit_price_cents != null).length;
  const confirmedDate = formatDate(quote.sent_at || quote.created_at);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-xl">

        {/* ── 1+2. Document — D6 state-driven chrome (replaces the legacy header,
            PreviewPill, and price-less grouped line list). Other pill contexts
            and the match-state badge below stay untouched (Justin c11 Q7). */}
        <div className="mb-8 overflow-hidden rounded-lg" style={{ border: '1px solid #E8E8E8' }}>
          <QuoteStateDocument
            state={docState}
            restaurant={quote.restaurant}
            quoteDate={formatDate(quote.created_at)}
            rep={repName || 'your rep'}
            repPhone={repContact?.phone || undefined}
            distributorShort={quote.distributor?.name ?? undefined}
            groups={docGroups}
            pricedCount={pricedCount}
            totalCount={matchedLines.length}
            lastUpdated={confirmedDate}
            confirmedAt={confirmedDate}
          />
        </div>

        {/* ── 3. Items your rep will handle ─────────────────────────────── */}
        {/* Justin's law: every typed ingredient surfaces — matched as products
            above, unmatched here. No silent drops, no generic legend that
            hides what the chef actually sent. */}
        {unmatchedLines.length > 0 && (
          <div className="mb-8">
            <p
              className="text-xs font-semibold text-[#9E9E9E] tracking-widest uppercase mb-3 pb-2 border-b border-[#F0F0F0]"
            >
              Items your rep will handle
            </p>
            {/* B-110(a): on locked/accepted quotes, show a single "Your rep will handle this"
                note at the section level rather than repeating the pill on every line item. */}
            {isLocked && (
              <p className="text-xs text-[#92400E] bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                Your rep will handle these items directly.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {unmatchedLines.map((line) => (
                <div key={line.id} className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#2A2A2A] text-base font-medium leading-snug">
                      {toTitleCase(line.component?.name || line.category || 'Item')}
                    </span>
                    {/* H-2: on a confirmed/accepted quote do NOT show the per-item pill —
                        the single section note above covers it. On pending quotes show
                        the resolution label (or fallback) as a per-item pill. */}
                    {!isLocked && (
                      <span className="inline-flex self-start bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-xs">
                        {(line as any).resolution_label || 'Awaiting rep review'}
                      </span>
                    )}
                  </div>
                  {line.category && line.component?.name && (
                    <span className="text-sm text-[#9E9E9E] whitespace-nowrap shrink-0 mt-0.5">
                      {categoryLabel(line.category)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. Decision actions ───────────────────────────────────────── */}
        <div className="border-t border-[#F0F0F0] pt-8 flex flex-col gap-3">

          {/* Question sent confirmation */}
          {questionSent && (
            <p className="text-sm text-[#2A5F6F] mb-1">
              Your question has been sent. Your rep will be in touch.
            </p>
          )}

          {/* Action error — surfaced on accept/question failure so the chef
              sees a real problem instead of a silent drop. */}
          {actionError && (
            <p className="text-sm text-red-600 mb-1">
              We couldn't complete that action ({actionError}). Please try again or contact your rep directly.
            </p>
          )}

          {/* Terminal-state status line — replaces action buttons when the quote
              is in a final state so the chef sees a clear, quiet confirmation
              rather than disabled buttons with no explanation. */}
          {isLocked ? (
            <p className="text-sm text-[#4F4F4F] px-1 py-2">
              {quote.state === 'accepted' || quote.status === 'won'
                ? 'This quote is accepted.'
                : quote.state === 'declined'
                  ? 'This quote has been declined.'
                  : 'This quote is no longer active.'}
            </p>
          ) : (
            <>
              {/* Inline question box */}
              {questionOpen && (
                <div className="flex flex-col gap-3 mb-1">
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="What would you like to ask your rep?"
                    rows={4}
                    className="border border-[#E0E0E0] rounded-lg px-4 py-3 text-sm text-[#2A2A2A] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2A2A2A]/10 focus:border-[#2A2A2A] resize-none leading-relaxed"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendQuestion}
                      disabled={!questionText.trim() || sending}
                      className="flex-1 bg-[#2A2A2A] hover:bg-[#1A1A1A] text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                    <button
                      onClick={() => {
                        setQuestionOpen(false);
                        setQuestionText('');
                      }}
                      className="px-5 py-2.5 text-sm font-medium text-[#9E9E9E] hover:text-[#4F4F4F] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Looks good */}
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-[#2A2A2A] hover:bg-[#1A1A1A] text-white rounded-lg px-6 py-3.5 text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accepting ? 'Building your order guide…' : 'Looks good'}
              </button>

              {/* I have questions */}
              {!questionOpen && (
                <button
                  onClick={() => setQuestionOpen(true)}
                  className="w-full border border-[#E0E0E0] hover:border-[#BDBDBD] text-[#4F4F4F] rounded-lg px-6 py-3.5 text-base font-medium transition-colors"
                >
                  I have questions
                </button>
              )}
            </>
          )}

          {/* H-5: Save for later is only meaningful when the chef hasn't yet
              acted. Hide it on accepted/confirmed/won quotes — show post-
              acceptance CTAs (PDF download) instead if available. */}
          {!isLocked && (
            savedForLater ? (
              <p className="text-sm text-[#4F4F4F] px-6 py-2.5 text-center">
                Saved. You can return to this quote anytime.
              </p>
            ) : (
              <button
                onClick={() => setSavedForLater(true)}
                className="w-full text-[#9E9E9E] hover:text-[#4F4F4F] px-6 py-2.5 text-sm font-medium transition-colors"
              >
                Save for later
              </button>
            )
          )}
          {/* Post-acceptance CTA: PDF download when available on an accepted quote */}
          {isLocked && (quote.status === 'won' || quote.state === 'accepted') && quote.pdf_url && (
            <a
              href={quote.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full border border-[#E0E0E0] hover:border-[#BDBDBD] text-[#4F4F4F] rounded-lg px-6 py-3.5 text-base font-medium transition-colors text-center"
            >
              Download PDF
            </a>
          )}

        </div>
      </div>
    </div>
  );
}

// Status-coded error copy for the receipt mount. Per Base44 Guardrails:
// no "sign in", "log in", "create account" verbs in chef-facing surfaces.
// 401 → likely a stale/missing magic-link session, route the chef back to
//        their rep (only durable recovery path — the chef has no password).
// 404 → quote actually missing (ID typo, deleted record).
// other → generic retry.
function receiptErrorCopy(status: number | null): { title: string; body: string } {
  if (status === 401) {
    return {
      title: "We couldn't open this quote.",
      body: "Your link may have expired or moved on. Ask your rep for a fresh quote link — they can resend in a moment.",
    };
  }
  if (status === 404) {
    return {
      title: "This quote isn't available.",
      body: "The quote may have been removed or the link is mistyped. Reach out to your rep if you need a new copy.",
    };
  }
  return {
    title: "Something went wrong.",
    body: "Try again in a moment, or reach out to your rep if it keeps happening.",
  };
}
