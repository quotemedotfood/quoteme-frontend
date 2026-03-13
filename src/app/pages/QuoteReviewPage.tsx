import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Loader2, AlertTriangle, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getQuote, getGuestQuote } from '../services/api';
import type { QuoteResponse, QuoteLineResponse } from '../services/api';

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\b\w+/g, (word) => {
    const lower = word.toLowerCase();
    if (['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with'].includes(lower)) {
      return lower;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).replace(/^./, (c) => c.toUpperCase());
}

export function QuoteReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const quoteId: string | undefined = (location.state as any)?.quoteId;
  const isOpenQuote: boolean = (location.state as any)?.isOpenQuote || false;

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGuest = !localStorage.getItem('quoteme_token');

  useEffect(() => {
    if (!quoteId) {
      setError('No quote provided.');
      setLoading(false);
      return;
    }
    async function load() {
      const res = isGuest ? await getGuestQuote(quoteId!) : await getQuote(quoteId!);
      if (res.error || !res.data) {
        setError(res.error || 'Failed to load quote');
      } else {
        setQuote(res.data as QuoteResponse);
      }
      setLoading(false);
    }
    load();
  }, [quoteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#7FAEC2]" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">{error || 'Quote not found.'}</p>
      </div>
    );
  }

  // Deduplicate lines by product ID
  const seenProducts = new Set<string>();
  const lines: QuoteLineResponse[] = [];
  for (const line of quote.lines || []) {
    const key = line.product?.id || line.id;
    if (seenProducts.has(key)) continue;
    seenProducts.add(key);
    lines.push(line);
  }

  const totalItems = lines.length;
  const unmatchedLines = lines.filter((l) => !l.product);
  const matchedLines = lines.filter((l) => l.product);
  const totalCents = matchedLines.reduce((sum, l) => sum + (l.unit_price_cents || 0) * (l.quantity || 1), 0);

  // Summary card data — Restaurant, Distributor, Rep, Line Items (no Total)
  const summaryCards = [
    {
      label: 'Restaurant',
      value: isOpenQuote ? 'Open Quote' : (quote.restaurant || '—'),
      clickable: true,
      onClick: () => {/* future: open restaurant edit */},
    },
    {
      label: 'Distributor',
      value: (quote as any).distributor || '—',
      clickable: false,
    },
    {
      label: 'Rep',
      value: quote.rep || '—',
      clickable: true,
      onClick: () => {/* future: open rep edit */},
    },
    {
      label: 'Line Items',
      value: String(totalItems),
      clickable: true,
      onClick: () => navigate('/quote-builder', { state: { quoteId, isOpenQuote } }),
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1
          className="text-xl font-bold text-[#2A2A2A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Review Quote
        </h1>
        <p className="text-sm text-[#4F4F4F] mt-1">
          Review before sending to{' '}
          {isOpenQuote ? 'customer' : (quote.restaurant || 'restaurant')}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryCards.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={card.clickable ? card.onClick : undefined}
                disabled={!card.clickable}
                className={`bg-white border border-gray-200 rounded-xl p-4 text-left transition-all ${
                  card.clickable
                    ? 'hover:border-[#7FAEC2] hover:shadow-sm cursor-pointer'
                    : 'cursor-default'
                }`}
              >
                <p className="text-xs text-gray-400 uppercase tracking-wide">{card.label}</p>
                <p className="text-sm font-semibold text-[#2A2A2A] mt-1 truncate">{card.value}</p>
                {card.clickable && (
                  <p className="text-[10px] text-[#7FAEC2] mt-1">
                    {card.label === 'Line Items' ? 'Edit pricing' : 'Edit'}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Flagged Items Warning */}
          {unmatchedLines.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {unmatchedLines.length} unmatched ingredient{unmatchedLines.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  These items had no catalog match and won't appear on the final quote.
                </p>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ingredient</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Matched Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Brand</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">Pack</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const isUnmatched = !line.product;
                    return (
                      <tr
                        key={line.id}
                        className={`border-b border-gray-50 ${isUnmatched ? 'bg-amber-50/50' : ''}`}
                      >
                        <td className="px-4 py-3 text-[#2A2A2A]">
                          {toTitleCase(line.component?.name || '—')}
                          {line.component?.source_dish && (
                            <span className="block text-xs text-gray-400">
                              {toTitleCase(line.component.source_dish)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isUnmatched ? (
                            <span className="text-amber-600 text-xs flex items-center gap-1">
                              <AlertTriangle size={12} /> No catalog match
                            </span>
                          ) : (
                            <span className="text-[#2A2A2A]">{toTitleCase(line.product.product)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                          {isUnmatched ? '—' : toTitleCase(line.product.brand)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                          {isUnmatched ? '—' : line.product.pack_size}
                        </td>
                        <td className="px-4 py-3 text-right text-[#2A2A2A]">{line.quantity || 1}</td>
                        <td className="px-4 py-3 text-right text-[#2A2A2A] font-medium">
                          {isUnmatched
                            ? '—'
                            : `$${((line.unit_price_cents || 0) / 100).toFixed(2)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/50">
                    <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-[#2A2A2A]">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#2A2A2A]">
                      ${(totalCents / 100).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/quote-builder', { state: { quoteId, isOpenQuote } })}
          className="text-[#4F4F4F] hover:text-[#2A2A2A]"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Builder
        </Button>
        <Button
          onClick={() => navigate('/export-finalize', { state: { quoteId, isOpenQuote } })}
          className="bg-[#F2993D] hover:bg-[#E08A2E] text-white px-6"
        >
          <Send size={16} className="mr-2" /> Send Quote
        </Button>
      </div>
    </div>
  );
}
