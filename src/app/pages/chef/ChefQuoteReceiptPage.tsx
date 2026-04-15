import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getGuestQuote, acceptChefQuote, sendChefQuestion } from '../../services/api';
import type { QuoteResponse, QuoteLineResponse } from '../../services/api';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

function toTitleCase(str: string): string {
  if (!str) return '';
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

  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [sending, setSending] = useState(false);
  const [questionSent, setQuestionSent] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getGuestQuote(id).then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setQuote(res.data);
      }
      setLoading(false);
    });
  }, [id]);

  async function handleAccept() {
    if (!id) return;
    setAccepting(true);
    const res = await acceptChefQuote(id);
    if (res.data?.order_guide_id) {
      navigate(`/chef/order-guide/${res.data.order_guide_id}`);
    } else {
      // Accepted but no order guide yet — stay and show success state
      setAccepting(false);
    }
  }

  async function handleSendQuestion() {
    if (!id || !questionText.trim()) return;
    setSending(true);
    await sendChefQuestion(id, questionText.trim());
    setSending(false);
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

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <p className="text-[#4F4F4F] text-base">Quote not found.</p>
      </div>
    );
  }

  // ── Derive display values ──────────────────────────────────────────────────

  const matchedLines = quote.lines.filter(
    (l) => l.availability_status === 'available' && l.product,
  );
  const hasUnmatched = quote.lines.some(
    (l) => l.availability_status === 'not_in_catalog' || !l.product,
  );

  const grouped = groupByCategory(matchedLines);

  // Rep info — from the quote's `rep` string and the first contact with an email
  const repName = quote.rep || null;
  const repContact = quote.contacts?.find((c) => c.email) || null;
  const repEmail = repContact?.email || null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-xl">

        {/* ── 1. Header block ───────────────────────────────────────────── */}
        <div className="mb-10">
          {/* Restaurant name in small caps */}
          {quote.restaurant && (
            <p
              className="text-xs text-[#9E9E9E] tracking-widest mb-3"
              style={{ fontVariant: 'small-caps', textTransform: 'uppercase' }}
            >
              {quote.restaurant}
            </p>
          )}

          {/* Headline */}
          <h1
            className="text-4xl font-bold text-[#2A2A2A] mb-4 leading-tight"
            style={headlineStyle}
          >
            Your Quote
          </h1>

          {/* Date */}
          <p className="text-sm text-[#9E9E9E]">
            {formatDate(quote.created_at)}
          </p>

          {/* Rep line */}
          {(repName || repEmail) && (
            <p className="text-sm text-[#9E9E9E] mt-1">
              Prepared by{repName ? ` ${repName}` : ''}
              {repEmail && (
                <>
                  {repName ? ' · ' : ' '}
                  <a
                    href={`mailto:${repEmail}`}
                    className="underline underline-offset-2 hover:text-[#4F4F4F] transition-colors"
                  >
                    {repEmail}
                  </a>
                </>
              )}
            </p>
          )}
        </div>

        {/* ── 2. Line items grouped by category ─────────────────────────── */}
        <div className="mb-8 flex flex-col gap-8">
          {Array.from(grouped.entries()).map(([category, lines]) => (
            <div key={category}>
              {/* Category heading */}
              <p
                className="text-xs font-semibold text-[#9E9E9E] tracking-widest uppercase mb-3 pb-2 border-b border-[#F0F0F0]"
              >
                {toTitleCase(category)}
              </p>

              {/* Lines */}
              <div className="flex flex-col gap-4">
                {lines.map((line) => (
                  <div key={line.id} className="flex items-start justify-between gap-4">
                    {/* Left: product name + brand */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[#2A2A2A] text-base font-medium leading-snug">
                        {toTitleCase(line.product.product)}
                      </span>
                      {line.product.brand && (
                        <span className="text-xs text-[#BDBDBD]">
                          {toTitleCase(line.product.brand)}
                        </span>
                      )}
                    </div>

                    {/* Right: pack size */}
                    {line.product.pack_size && (
                      <span className="text-sm text-[#9E9E9E] whitespace-nowrap shrink-0 mt-0.5">
                        {line.product.pack_size}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── 3. Gap acknowledgment ─────────────────────────────────────── */}
        {hasUnmatched && (
          <p className="text-sm italic text-[#BDBDBD] mb-8">
            Some items will be handled directly by your rep.
          </p>
        )}

        {/* ── 4. Decision actions ───────────────────────────────────────── */}
        <div className="border-t border-[#F0F0F0] pt-8 flex flex-col gap-3">

          {/* Question sent confirmation */}
          {questionSent && (
            <p className="text-sm text-green-600 mb-1">
              Your question has been sent. Your rep will be in touch.
            </p>
          )}

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
            {accepting ? 'Setting up your order guide…' : 'Looks good'}
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

          {/* Save for later */}
          <button
            onClick={() => navigate(-1)}
            className="w-full text-[#9E9E9E] hover:text-[#4F4F4F] px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Save for later
          </button>

        </div>
      </div>
    </div>
  );
}
