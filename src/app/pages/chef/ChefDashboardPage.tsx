// V2 W4 inc 4 — ChefDashboardPage  (/dashboard for chef role)
//
// Mounted by DashboardRoleRouter when the authenticated user's role is
// "chef". Returning chefs land here after sign-in; first-arrival chefs
// land on /chef/welcome first and continue to a specific quote, not
// here.
//
// Three surfaces stacked:
//   1. Quote count indicator — "N of 5 free quotes" (Moose Q5: per-chef
//      across all restaurants).
//   2. Previous Questions strip — receipt-only summary of recent
//      questions the chef has sent. Out: no live thread, no compose UI.
//   3. Quote history — reverse-chronological list. Tap → quote receipt.
//
// Empty state for V2 launch is the single "no quotes yet" copy. The
// four design-spec'd empty states (no rep / no catalog / expired link /
// stuck processing) layer on top in a follow-up commit.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getChefQuotes, type ChefQuoteRow, type ChefQuotesIndexResponse } from '../../services/api';

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
  warning: '#D97706',
};
const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

export function ChefDashboardPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<ChefQuotesIndexResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getChefQuotes();
      if (cancelled) return;
      if (res.data) {
        setData(res.data);
        setState('ready');
      } else {
        setErrorMsg(res.error || 'Could not load your quotes');
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const quotes = data?.quotes ?? [];
  const count = data?.count ?? 0;
  const limit = data?.free_tier_limit ?? 5;
  const questionsWithText = quotes.filter((q) => q.latest_question);

  // RootLayout renders the ChefTopbar for chef-role users; this page no
  // longer needs its own header chrome.
  return (
    <div className="flex flex-col" style={{ color: C.charcoal }}>
      <div className="flex-1">
        <div className="max-w-2xl mx-auto px-5 pt-6 pb-12">
          {state === 'loading' && <LoadingRow />}
          {state === 'error' && <ErrorRow message={errorMsg} />}

          {state === 'ready' && quotes.length === 0 && <EmptyState />}

          {state === 'ready' && quotes.length > 0 && (
            <>
              <QuoteCount count={count} limit={limit} />
              {questionsWithText.length > 0 && (
                <PreviousQuestions
                  quotes={questionsWithText.slice(0, 3)}
                  onPick={(q) => navigate(`/chef/quotes/${q.id}`)}
                />
              )}
              <QuoteHistory quotes={quotes} onPick={(q) => navigate(`/chef/quotes/${q.id}`)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function QuoteCount({ count, limit }: { count: number; limit: number }) {
  const remaining = Math.max(0, limit - count);
  return (
    <div
      className="mb-6 pb-5"
      style={{ borderBottom: `1px solid ${C.softLine}` }}
    >
      <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
        Your quotes
      </h1>
      <p
        className="mt-1"
        style={{ ...sans, fontSize: 12, color: C.gray700, lineHeight: 1.5 }}
      >
        {count} of {limit} free quotes used · {remaining} remaining
      </p>
    </div>
  );
}

function PreviousQuestions({
  quotes,
  onPick,
}: {
  quotes: ChefQuoteRow[];
  onPick: (q: ChefQuoteRow) => void;
}) {
  return (
    <section className="mb-7">
      <div
        style={{ ...sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gray700 }}
      >
        Recent questions you've sent
      </div>
      <div className="mt-2 space-y-2">
        {quotes.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onPick(q)}
            className="w-full text-left bg-white rounded-lg p-3.5 transition-shadow hover:shadow-sm"
            style={{ border: `1px solid ${C.softLine}` }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div
                className="min-w-0"
                style={{ ...sans, fontSize: 12, fontWeight: 500, color: C.gray700 }}
              >
                {q.distributor?.name || 'Distributor'} · {q.label}
              </div>
              <div
                className="shrink-0"
                style={{ ...sans, fontSize: 11, color: C.gray500 }}
              >
                {formatDate(q.sent_at || q.created_at)}
              </div>
            </div>
            <div
              className="mt-1.5"
              style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.45 }}
            >
              “{q.latest_question}”
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function QuoteHistory({
  quotes,
  onPick,
}: {
  quotes: ChefQuoteRow[];
  onPick: (q: ChefQuoteRow) => void;
}) {
  return (
    <section>
      <div
        style={{ ...sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gray700 }}
      >
        All quotes
      </div>
      <div className="mt-2 divide-y" style={{ borderTop: `1px solid ${C.softLine}`, borderBottom: `1px solid ${C.softLine}` }}>
        {quotes.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onPick(q)}
            className="w-full text-left bg-white px-3.5 py-3.5 transition-colors hover:bg-[#FBFAF7] flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div
                className="flex items-baseline gap-2"
                style={{ ...sans, fontSize: 14, fontWeight: 500, color: C.charcoal }}
              >
                <span className="truncate">{q.distributor?.name || 'Distributor'}</span>
                <StatusPill status={q.status} hasOG={q.has_order_guide} />
              </div>
              <div
                className="mt-0.5"
                style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.4, fontVariantNumeric: 'tabular-nums' }}
              >
                {q.label} · {q.item_count} {q.item_count === 1 ? 'item' : 'items'} · {formatDate(q.sent_at || q.created_at)}
              </div>
            </div>
            <div
              className="shrink-0 text-right"
              style={{ ...serif, fontSize: 15, fontWeight: 500, color: C.charcoal, fontVariantNumeric: 'tabular-nums' }}
            >
              {money(q.total_cents)}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ status, hasOG }: { status: string; hasOG: boolean }) {
  let label = status;
  let bg = '#F3F4F6';
  let color = C.gray700;

  if (status === 'won' && hasOG) { label = 'Ordered'; bg = '#DCFCE7'; color = '#166534'; }
  else if (status === 'won') { label = 'Accepted'; bg = '#DCFCE7'; color = '#166534'; }
  else if (status === 'pending') { label = 'Ready'; bg = 'rgba(127,174,194,.2)'; color = '#2A5F6F'; }
  else if (status === 'sent') { label = 'Sent'; bg = 'rgba(127,174,194,.2)'; color = '#2A5F6F'; }
  else if (status === 'draft') { label = 'Processing'; bg = '#FEF3C7'; color = '#92400E'; }
  else if (status === 'expired') { label = 'Expired'; bg = '#F3F4F6'; color = C.gray500; }
  else if (status === 'lost') { label = 'Closed'; bg = '#F3F4F6'; color = C.gray500; }

  return (
    <span
      className="inline-flex items-center"
      style={{
        ...sans,
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
        No quotes yet.
      </h1>
      <p
        className="mt-3 max-w-md mx-auto"
        style={{ ...sans, fontSize: 14, color: C.gray700, lineHeight: 1.55 }}
      >
        Once your rep sends you a quote, it'll show up here. They can build one from a menu in a
        minute — ask them to send it from QuoteMe.
      </p>
    </div>
  );
}

function LoadingRow() {
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

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal }}>
        Couldn't load your quotes.
      </div>
      <p
        className="mt-2 max-w-md mx-auto"
        style={{ ...sans, fontSize: 13, color: C.gray700, lineHeight: 1.55 }}
      >
        {message || 'Try again in a moment.'}
      </p>
    </div>
  );
}
