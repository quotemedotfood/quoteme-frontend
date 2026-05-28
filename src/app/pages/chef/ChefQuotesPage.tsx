// ChefQuotesPage — /chef/quotes
// Full quote index list. Sits inside ChefShellLayout — content-only, no chrome.

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getChefQuotes, type ChefQuoteRow, type ChefQuotesIndexResponse } from '../../services/api';
import { PreviewPill } from '../../components/chef/PreviewPill';
import { QuoteStatusPill } from '../../components/chef/QuoteStatusPill';

const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
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

// StatusPill extracted to ../../components/chef/QuoteStatusPill (PR-redo for #50)

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

function EmptyState() {
  return (
    <div className="text-center py-16">
      <p
        className="max-w-md mx-auto"
        style={{ ...sans, fontSize: 14, color: C.gray700, lineHeight: 1.6 }}
      >
        No quotes yet. Once your rep sends you a quote, it'll show up here.
      </p>
    </div>
  );
}

function QuoteRow({ q }: { q: ChefQuoteRow }) {
  return (
    <Link
      to={`/chef/quotes/${q.id}`}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit', borderBottom: `1px solid ${C.softLine}` }}
      className="py-3 px-1 hover:bg-gray-50"
    >
      {/* Label row */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1 flex items-baseline gap-2">
          <span
            className="truncate"
            style={{ ...sans, fontSize: 14, fontWeight: 500, color: C.charcoal }}
          >
            {q.label}
          </span>
          {q.preview && <PreviewPill size="xs" />}
        </div>
        <QuoteStatusPill status={q.status} />
      </div>
      {/* B5 meta line */}
      <div
        className="mt-0.5"
        style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.4, fontVariantNumeric: 'tabular-nums' }}
      >
        {q.quote_number} · {q.distributor?.name ?? 'Unaffiliated'} · {formatDate(q.created_at)} · {q.item_count} {q.item_count === 1 ? 'item' : 'items'} · {money(q.total_cents)}
      </div>
    </Link>
  );
}

export function ChefQuotesPage() {
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

  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-12" style={{ ...sans, color: C.charcoal }}>
      {state === 'loading' && <LoadingRow />}
      {state === 'error' && <ErrorRow message={errorMsg} />}
      {state === 'ready' && (
        <>
          <div className="mb-6 pb-5" style={{ borderBottom: `1px solid ${C.softLine}` }}>
            <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
              Your quotes
            </h1>
          </div>
          {quotes.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ borderTop: `1px solid ${C.softLine}` }}>
              {quotes.map((q) => (
                <QuoteRow key={q.id} q={q} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
