import { useParams } from 'react-router';
import { useState, useEffect } from 'react';
import { getQuotePreview } from '../services/api';
import type { QuotePreviewResponse } from '../services/api';
import logoSquare from '/src/assets/e549e7d27b183e98e791f43494c715b8cc6ce7e9.png';

function toTitleCase(str: string): string {
  if (!str) return '';
  if (/[^\x00-\x7F]/.test(str)) return str;
  return str.replace(/\b\w+/g, (word) => {
    const lower = word.toLowerCase();
    if (['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with'].includes(lower)) {
      return lower;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).replace(/^./, (c) => c.toUpperCase());
}

export function QuotePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuotePreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getQuotePreview(id).then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setQuote(res.data);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7FAEC2] border-t-transparent" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <img src={logoSquare} alt="QuoteMe" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Quote Not Found</h1>
          <p className="text-gray-500">{error || 'This quote could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <img src={logoSquare} alt="QuoteMe" className="w-10 h-10" />
          <span className="text-xs text-gray-400">Powered by QuoteMe</span>
        </div>

        {/* Quote info */}
        <div className="mb-8">
          {quote.restaurant && (
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {toTitleCase(quote.restaurant)}
            </h1>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm text-gray-500 mt-2">
            {quote.date && <span>{quote.date}</span>}
            {quote.rep && <span>Rep: {quote.rep}</span>}
            {quote.distributor && <span>{quote.distributor}</span>}
          </div>
        </div>

        {quote.note && (
          <div className="mb-6 p-4 bg-[#F0F7FA] rounded-lg text-sm text-gray-700">
            {quote.note}
          </div>
        )}

        {/* Line items table -- desktop */}
        <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#7FAEC2] text-white">
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">Brand</th>
                <th className="text-left px-4 py-3 font-medium">Pack</th>
                <th className="text-right px-4 py-3 font-medium">Qty</th>
                <th className="text-right px-4 py-3 font-medium">Price</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((line, i) => (
                <tr key={line.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-900">{toTitleCase(line.product)}</td>
                  <td className="px-4 py-3 text-gray-600">{toTitleCase(line.brand || '')}</td>
                  <td className="px-4 py-3 text-gray-600">{line.pack_size || ''}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{line.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{line.unit_price}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">{line.line_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Line items -- mobile cards */}
        <div className="sm:hidden space-y-3 mb-6">
          {quote.lines.map((line) => (
            <div key={line.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">{toTitleCase(line.product)}</p>
                  {line.brand && <p className="text-xs text-gray-500">{toTitleCase(line.brand)}</p>}
                </div>
                <p className="font-medium text-gray-900">{line.line_total}</p>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                {line.pack_size && <span>Pack: {line.pack_size}</span>}
                <span>Qty: {line.quantity}</span>
                <span>{line.unit_price} ea</span>
              </div>
            </div>
          ))}
        </div>

        {/* Grand total */}
        <div className="flex justify-end">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-4 text-right">
            <p className="text-sm text-gray-500 mb-1">Grand Total</p>
            <p className="text-2xl font-bold text-gray-900">{quote.total}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Generated by QuoteMe &mdash; quoteme.food
          </p>
        </div>
      </div>
    </div>
  );
}
