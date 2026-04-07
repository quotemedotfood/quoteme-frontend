import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Loader2, AlertTriangle, Send, Mail, MessageSquare, Download, X, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { getQuote, getGuestQuote, sendQuote, sendQuoteSms, downloadQuotePdf } from '../services/api';
import type { QuoteResponse, QuoteLineResponse } from '../services/api';
import { isDemoMode, PROD_SIGNUP_URL } from '../utils/demoMode';
import { useUser } from '../contexts/UserContext';

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

function matchLabel(score: number): { text: string; cls: string } {
  if (score >= 0.9) return { text: 'Strong Match', cls: 'bg-green-100 text-green-700' };
  if (score >= 0.7) return { text: 'Good Match', cls: 'bg-[#A5CFDD]/20 text-[#2A5F6F]' };
  if (score >= 0.5) return { text: 'Review Suggested', cls: 'bg-amber-100 text-amber-700' };
  return { text: 'Needs Your Pick', cls: 'bg-red-100 text-red-700' };
}

export function QuoteReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const quoteId: string | undefined = (location.state as any)?.quoteId;
  const isOpenQuote: boolean = (location.state as any)?.isOpenQuote || false;
  const locationId: string | undefined = (location.state as any)?.locationId;

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Send drawer state
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [sendToSelf, setSendToSelf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingText, setSendingText] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const { quotesRemaining } = useUser();

  // Editable summary cards
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editCardValue, setEditCardValue] = useState('');

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterQuality, setFilterQuality] = useState('all');

  const isGuest = !localStorage.getItem('quoteme_token');
  const demo = isDemoMode();

  // Load Google Fonts
  useEffect(() => {
    if (!document.getElementById('quoteme-fonts')) {
      const link = document.createElement('link');
      link.id = 'quoteme-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

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
        const q = res.data as QuoteResponse;
        setQuote(q);
        // Pre-fill email/phone from contacts
        const primaryContact = q.contacts?.find(c => c.is_primary) || q.contacts?.[0];
        if (primaryContact?.email) setSendEmail(primaryContact.email);
        if (primaryContact?.phone) setSendPhone(primaryContact.phone);
      }
      setLoading(false);
    }
    load();
  }, [quoteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#A5CFDD]" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-3">
        <p className="text-gray-400">{error || 'Quote not found.'}</p>
        <Button
          onClick={() => navigate('/start-new-quote')}
          className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
        >
          Start New Quote
        </Button>
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
  const unmatchedLines = lines.filter(l => !l.product);
  const matchedLines = lines.filter(l => l.product);
  const totalCents = matchedLines.reduce((sum, l) => sum + (l.unit_price_cents || 0) * (l.quantity || 1), 0);

  // Identify lines needing review
  const flaggedLines = lines.filter(l => {
    if (!l.product) return true;
    const bestCandidate = l.alignment_candidates?.find(c => c.position === 1);
    if (bestCandidate?.score != null && bestCandidate.score < 0.7) return true;
    return false;
  });

  const summaryCards = [
    { label: 'Restaurant', value: isOpenQuote ? 'Open Quote' : (quote.restaurant || '--') },
    { label: 'Distributor', value: (quote as any).distributor || (demo ? 'Demo' : '--') },
    { label: 'Rep', value: quote.rep || (demo ? 'Demo User' : '--') },
    { label: 'Line Items', value: String(totalItems) },
  ];

  const categories = ['all', ...new Set(lines.map(l => l.category).filter(Boolean))];

  // Send handlers
  const handleSendEmail = async () => {
    if (!quoteId || !sendEmail.trim()) return;
    setSendingEmail(true);
    setSendSuccess(null);
    try {
      const res = await sendQuote(quoteId);
      if (res.error) throw new Error(res.error);
      setSendSuccess(`Quote sent to ${sendEmail}`);
    } catch (e: any) {
      setSendSuccess(`Error: ${e.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendText = async () => {
    if (!quoteId || !sendPhone.trim()) return;
    setSendingText(true);
    setSendSuccess(null);
    try {
      const res = await sendQuoteSms(quoteId, sendPhone.trim());
      if (res.error) throw new Error(res.error);
      setSendSuccess(`Quote texted to ${sendPhone}`);
    } catch (e: any) {
      setSendSuccess(`Error: ${e.message}`);
    } finally {
      setSendingText(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quoteId) return;
    setDownloadingPdf(true);
    try {
      const res = await downloadQuotePdf(quoteId);
      if (res.blob) {
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quote-${quoteId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error('PDF download failed:', e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const filteredLines = lines.filter(l => {
    if (filterCategory !== 'all' && l.category !== filterCategory) return false;
    if (filterQuality !== 'all') {
      const bestCandidate = l.alignment_candidates?.find(c => c.position === 1);
      const score = bestCandidate?.score ?? 0;
      if (filterQuality === 'strong' && score < 0.9) return false;
      if (filterQuality === 'good' && (score < 0.7 || score >= 0.9)) return false;
      if (filterQuality === 'review' && (score < 0.5 || score >= 0.7)) return false;
      if (filterQuality === 'needs' && score >= 0.5) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-2xl md:text-3xl"
              style={{ fontFamily: "'Playfair Display', serif", color: '#A5CFDD' }}
            >
              Review Quote
            </h1>
            <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Review before sending to{' '}
              {isOpenQuote ? 'customer' : (quote.restaurant || 'restaurant')}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryCards.map((card) => (
              <button
                key={card.label}
                className="bg-white border border-gray-200 rounded-xl p-4 text-left active:bg-gray-50 transition-colors min-h-[48px]"
                onClick={() => {
                  if (card.label === 'Line Items') return; // not editable
                  setEditingCard(card.label);
                  setEditCardValue(card.value);
                }}
              >
                <p className="text-xs text-gray-400 uppercase tracking-wide">{card.label}</p>
                {editingCard === card.label ? (
                  <input
                    type="text"
                    value={editCardValue}
                    onChange={(e) => setEditCardValue(e.target.value)}
                    onBlur={() => setEditingCard(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingCard(null); }}
                    autoFocus
                    className="text-sm font-semibold text-[#2A2A2A] mt-1 w-full border-b border-[#A5CFDD] outline-none bg-transparent"
                  />
                ) : (
                  <p className="text-sm font-semibold text-[#2A2A2A] mt-1 truncate">{card.value}</p>
                )}
              </button>
            ))}
          </div>

          {/* Flagged Items Warning */}
          {flaggedLines.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {flaggedLines.length} item{flaggedLines.length > 1 ? 's' : ''} need{flaggedLines.length === 1 ? 's' : ''} attention
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {unmatchedLines.length > 0
                    ? `${unmatchedLines.length} unmatched, ${flaggedLines.length - unmatchedLines.length} low-confidence matches`
                    : `${flaggedLines.length} low-confidence match${flaggedLines.length > 1 ? 'es' : ''} — consider reviewing`}
                </p>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-[#2A2A2A] min-h-[48px]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : toTitleCase(cat)}</option>
              ))}
            </select>
            <select
              value={filterQuality}
              onChange={(e) => setFilterQuality(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-[#2A2A2A] min-h-[48px]"
            >
              <option value="all">All Quality</option>
              <option value="strong">Strong Match</option>
              <option value="good">Good Match</option>
              <option value="review">Review Suggested</option>
              <option value="needs">Needs Your Pick</option>
            </select>
          </div>

          {/* Line Items */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {filteredLines.map((line) => {
                const isUnmatched = (line as any).availability_status === 'not_in_catalog';
                const bestCandidate = line.alignment_candidates?.find(c => c.position === 1);
                const score = bestCandidate?.score;
                const label = score != null ? matchLabel(score) : null;

                return (
                  <div key={line.id} className={`bg-white rounded-xl border p-4 ${isUnmatched ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-semibold text-[#2A2A2A]">{toTitleCase(line.component?.name || '--')}</p>
                      {label && <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${label.cls}`}>{label.text}</span>}
                    </div>
                    {isUnmatched ? (
                      <p className="text-xs text-gray-400 italic">{toTitleCase(line.component?.name || '--')}</p>
                    ) : (
                      <>
                        <p className="text-sm text-[#2A2A2A]">{toTitleCase(line.product.product)}</p>
                        <p className="text-xs text-gray-500">{toTitleCase(line.product.brand)} · {line.product.pack_size}</p>
                      </>
                    )}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">{toTitleCase(line.category || '')}</span>
                      <span className="text-sm font-semibold text-[#2A2A2A]">
                        {isUnmatched ? '--' : `$${((line.unit_price_cents || 0) / 100).toFixed(2)}`}
                        <span className="text-xs text-gray-400 ml-1">×{line.quantity || 1}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ingredient</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Brand</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide hidden lg:table-cell">Pack</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.map((line) => {
                    const isUnmatched = (line as any).availability_status === 'not_in_catalog';
                    const bestCandidate = line.alignment_candidates?.find(c => c.position === 1);
                    const score = bestCandidate?.score;
                    const needsReview = isUnmatched || (score != null && score < 0.7);
                    const label = score != null ? matchLabel(score) : null;

                    return (
                      <tr
                        key={line.id}
                        className={`border-b border-gray-50 ${
                          isUnmatched ? 'bg-amber-50/50' : needsReview ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-[#2A2A2A]">
                          <div className="flex items-center gap-2">
                            <span>{toTitleCase(line.component?.name || '--')}</span>
                            {label && needsReview && (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${label.cls}`}>
                                {label.text}
                              </span>
                            )}
                          </div>
                          {line.component?.source_dish && (
                            <span className="block text-xs text-gray-400">
                              {toTitleCase(line.component.source_dish)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isUnmatched ? (
                            <span className="text-gray-400 italic text-xs">{toTitleCase(line.component?.name || '--')}</span>
                          ) : (
                            <span className="text-[#2A2A2A]">{toTitleCase(line.product.product)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                          {isUnmatched ? '--' : toTitleCase(line.product.brand)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                          {isUnmatched ? '--' : line.product.pack_size}
                        </td>
                        <td className="px-4 py-3 text-right text-[#2A2A2A]">{line.quantity || 1}</td>
                        <td className="px-4 py-3 text-right text-[#2A2A2A] font-medium">
                          {isUnmatched
                            ? '--'
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
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-gray-200 px-6 py-4 z-40">
        {demo && (
          <p className="text-center text-xs text-gray-500 mb-2 md:hidden">
            {quotesRemaining > 0
              ? `${quotesRemaining} free quote${quotesRemaining !== 1 ? 's' : ''} left`
              : 'No free quotes left'}
          </p>
        )}
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/quote-builder', { state: { quoteId, isOpenQuote, locationId } })}
            className="hidden md:flex text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Builder
          </Button>

          {demo ? (
            <a
              href={PROD_SIGNUP_URL || 'https://prod.quoteme.food/auth'}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-white font-medium bg-[#F9A64B] hover:bg-[#E8953A] transition-colors w-full md:w-auto min-h-[48px]"
            >
              <Send size={16} /> Sign up to send quotes
            </a>
          ) : (
            <Button
              onClick={() => setSendDrawerOpen(true)}
              className="bg-[#F9A64B] hover:bg-[#E8953A] text-white px-6 w-full md:w-auto min-h-[48px]"
            >
              <Send size={16} className="mr-2" /> Send Quote
            </Button>
          )}
        </div>
      </div>

      {/* Send Drawer */}
      {sendDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSendDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-xl z-50 overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#2A2A2A]">Send Quote</h2>
              <button
                onClick={() => setSendDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-6">
              {sendSuccess && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  sendSuccess.startsWith('Error')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {sendSuccess}
                </div>
              )}

              {/* Send via Email */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#A5CFDD]" />
                  <h3 className="text-sm font-semibold text-[#2A2A2A]">Send via Email</h3>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Recipient Email</Label>
                  <Input
                    type="email"
                    placeholder="chef@restaurant.com"
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                    className="bg-gray-50"
                  />
                </div>
                <Button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !sendEmail.trim()}
                  className="w-full bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
                >
                  {sendingEmail ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Mail className="w-4 h-4 mr-2" /> Send Email</>
                  )}
                </Button>
              </div>

              <div className="border-t border-gray-100" />

              {/* Send via Text */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#A5CFDD]" />
                  <h3 className="text-sm font-semibold text-[#2A2A2A]">Send via Text</h3>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Recipient Phone</Label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={sendPhone}
                    onChange={(e) => setSendPhone(e.target.value)}
                    className="bg-gray-50"
                  />
                </div>
                <Button
                  onClick={handleSendText}
                  disabled={sendingText || !sendPhone.trim()}
                  className="w-full bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
                >
                  {sendingText ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><MessageSquare className="w-4 h-4 mr-2" /> Send Text</>
                  )}
                </Button>
              </div>

              <div className="border-t border-gray-100" />

              {/* Send to Myself */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="send-to-self"
                  checked={sendToSelf}
                  onChange={(e) => setSendToSelf(e.target.checked)}
                  className="rounded border-gray-300 text-[#A5CFDD] focus:ring-[#A5CFDD]"
                />
                <label htmlFor="send-to-self" className="text-sm text-gray-600 cursor-pointer">
                  Send to myself
                </label>
              </div>

              <div className="border-t border-gray-100" />

              {/* Download PDF */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#A5CFDD]" />
                  <h3 className="text-sm font-semibold text-[#2A2A2A]">Download</h3>
                </div>
                <Button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  variant="outline"
                  className="w-full border-[#A5CFDD] text-[#A5CFDD] hover:bg-[#A5CFDD]/10"
                >
                  {downloadingPdf ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PDF...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" /> Download PDF</>
                  )}
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setSendDrawerOpen(false)}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
