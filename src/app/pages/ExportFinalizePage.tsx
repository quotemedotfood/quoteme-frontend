import { Button } from '../components/ui/button';
import { ArrowLeft, FileText, Download, Mail, MessageSquare, Check, ThumbsUp, ThumbsDown, Link as LinkIcon, Info, Edit, X, Loader2, Eye, RefreshCw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '../components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { getQuote, getGuestQuote, downloadQuotePdf, downloadOrderGuide, sendQuote, sendQuoteSms, acknowledgeUnmatchedLines } from '../services/api';
import { useUser } from '../contexts/UserContext';
import type { QuoteResponse, QuoteLineResponse } from '../services/api';
import { useAsyncMutation } from '../hooks/useAsyncMutation';
import { isDemoMode, PROD_SIGNUP_URL } from '../utils/demoMode';
import { latestChefQuestion } from '../utils/chefQuestion';
import { categoryLabel } from '../utils/categoryLabel';


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

export const FROM_DISPLAY_ADDRESS = 'quotes@quoteme.food';

export function isOpenQuoteSendDisabled(
  effectiveOpenQuote: boolean,
  manualEmail: string,
  contactEmail: string | null
): boolean {
  if (!effectiveOpenQuote) return false;
  return !manualEmail?.trim() && !contactEmail?.trim();
}

/** Sentinel: true once Success Drawer + Email Drawer have visible dismiss controls (B-101). */
export const DISMISS_ENABLED = true;

/** B-102: Pure function for opening the edit drawer — testable outside the component. */
export function openEditDrawerSafe(
  setShowEditDrawer: (v: boolean) => void,
  setTempContactIds: (ids: string[]) => void,
  selectedContactIds: string[]
): void {
  setTempContactIds(selectedContactIds);
  setShowEditDrawer(true);
}

/** B-108c: Returns the PDF Quote button label based on download state. */
export function getPdfButtonLabel(downloadingPdf: boolean): string {
  return downloadingPdf ? 'Generating PDF...' : 'PDF Quote';
}

/** B-115: Returns the tooltip/title for the "Convert to Order Guide" button when disabled. */
export function getOrderGuideDisabledReason(isFinalized: boolean, quoteId: string | undefined): string | null {
  if (!isFinalized) return 'Sign up to unlock order guide export.';
  if (!quoteId) return 'No quote loaded.';
  return null;
}

/** B-114: Returns the tooltip/title for the sticky "Send Quote" button when disabled. */
export const SEND_QUOTE_DISABLED_REASON = 'Enter a recipient email above to send.';

/** B-168: Inline/tooltip reason shown when export+send are gated on extraction review. */
export const REVIEW_REQUIRED_REASON = 'Review the extracted menu before sending.';

/**
 * B-168: Mirrors the backend send_quote rep-review gate on the FE.
 *
 * Backend (quotes_controller#send_quote) blocks send unless:
 *   rep_reviewed_at.present? OR state IN (distributor_quote, confirmed)
 *
 * The serializer now exposes rep_reviewed_at (ISO 8601 timestamp or null).
 * A quote passes the gate when rep_reviewed_at is present (truthy) OR its
 * state has cleared rep mediation (distributor_quote/confirmed). When neither
 * holds, the menu hasn't cleared review and export/send must be blocked.
 *
 * Returns true when export/send should be BLOCKED (i.e. NOT reviewed).
 */
export function isExportBlockedUnreviewed(
  repReviewedAt: string | null | undefined,
  state: string | null | undefined
): boolean {
  if (repReviewedAt) return false;
  if (state === 'distributor_quote' || state === 'confirmed') return false;
  return true;
}

/**
 * BUG #23: an unmatched line has no product, so it can never go through the
 * alignment "Edit Matches" correction flow. Acknowledging it (Rep will
 * handle / Can't source) is the only rep-side action available for it. This
 * mirrors the backend's rep_handled column.
 */
export function isLineAcknowledged(line: Pick<QuoteLineResponse, 'availability_status' | 'rep_handled'>): boolean {
  return line.availability_status !== 'not_in_catalog' || !!line.rep_handled;
}

/** BUG #21: unmatched lines still waiting on a rep acknowledgment. */
export function unacknowledgedUnmatchedLines(lines: QuoteLineResponse[]): QuoteLineResponse[] {
  return lines.filter(l => l.availability_status === 'not_in_catalog' && !l.rep_handled);
}

/**
 * BUG #21: the send/order-guide gate must never fail silently. Mirrors the
 * backend send_quote error copy exactly so the rep sees the same reason in
 * both places: when N unmatched items are still unacknowledged, name the
 * count; otherwise fall back to the generic review-required reason.
 */
export function getBlockedSendReason(
  blocked: boolean,
  lines: QuoteLineResponse[]
): string | null {
  if (!blocked) return null;
  const count = unacknowledgedUnmatchedLines(lines).length;
  if (count > 0) {
    return `${count} item${count === 1 ? '' : 's'} still ${count === 1 ? 'needs' : 'need'} you to choose ` +
      `Rep will handle or Can't source before you can send.`;
  }
  return REVIEW_REQUIRED_REASON;
}

// Mock data for premium onboarding features
const onboardingDocuments = [
  { id: 'doc1', name: 'New Customer Application (PDF)', type: 'document' },
  { id: 'doc2', name: 'Tax Exemption Form (PDF)', type: 'document' },
  { id: 'doc3', name: 'Terms of Service (PDF)', type: 'document' },
];

const onboardingLinks = [
  { id: 'link1', name: 'Online Credit Application', type: 'link' },
  { id: 'link2', name: 'Digital Signature Portal', type: 'link' },
];

export function ExportFinalizePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const quoteId: string | undefined = (location.state as any)?.quoteId || searchParams.get('quoteId') || undefined;
  const isOpenQuote: boolean = (location.state as any)?.isOpenQuote || searchParams.get('isOpenQuote') === 'true' || false;

  const { incrementQuoteCount } = useUser();
  const isAuthenticated = !!localStorage.getItem('quoteme_token');
  const [isFinalized, setIsFinalized] = useState(isAuthenticated);
  const [showSuccessDrawer, setShowSuccessDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);

  // Quote data
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingOrderGuide, setDownloadingOrderGuide] = useState(false);

  // Premium feature state
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);

  // PDF preview modal state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);

  // Load quote data
  const isGuest = !isAuthenticated;
  const fetchQuote = (id: string) => isGuest ? getGuestQuote(id) : getQuote(id);

  useEffect(() => {
    if (!quoteId) return;
    async function load() {
      const res = await fetchQuote(quoteId!);
      if (res.data) setQuoteData(res.data as QuoteResponse);
    }
    load();
  }, [quoteId]);

  // Deduplicate lines by product ID for export
  function deduplicatedLines(lines: QuoteLineResponse[]): QuoteLineResponse[] {
    const seen = new Set<string>();
    return lines.filter(line => {
      const key = line.product?.id || line.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Partition lines: matched items sorted by category, then unmatched at bottom
  function partitionLines(lines: QuoteLineResponse[]) {
    const deduped = deduplicatedLines(lines);
    const matched = deduped
      .filter(l => l.availability_status !== 'not_in_catalog')
      .sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    const unmatched = deduped.filter(l => l.availability_status === 'not_in_catalog');

    // Group produce unmatched into one summary
    const produceNames: string[] = [];
    const otherUnmatched: QuoteLineResponse[] = [];
    for (const line of unmatched) {
      const cat = (line.category || '').toLowerCase();
      if (cat.includes('produce') || cat.includes('fruit') || cat.includes('vegetable')) {
        produceNames.push((line.component?.name || 'Unknown').toLowerCase());
      } else {
        otherUnmatched.push(line);
      }
    }

    return { matched, produceNames: [...new Set(produceNames)], otherUnmatched };
  }

  // BUG #23: rep-side acknowledgment for unmatched lines ("Rep will handle" /
  // "Can't source"). This is the missing review action — unmatched lines
  // have no product and so can never go through Edit Matches / MatchCorrection.
  const [ackingLineIds, setAckingLineIds] = useState<string[]>([]);
  const [ackError, setAckError] = useState<string | null>(null);

  async function handleAcknowledgeUnmatched(lineIds: string[], reason: 'rep_will_handle' | 'cant_source') {
    if (!quoteId || lineIds.length === 0) return;
    setAckingLineIds(prev => [...prev, ...lineIds]);
    setAckError(null);
    try {
      const res = await acknowledgeUnmatchedLines(quoteId, lineIds, reason);
      if (res.error) {
        setAckError(res.error);
      } else if (res.data) {
        setQuoteData(res.data);
      }
    } finally {
      setAckingLineIds(prev => prev.filter(id => !lineIds.includes(id)));
    }
  }

  // CSV download
  async function handleCsvDownload() {
    if (!quoteData) return;
    setDownloadingCsv(true);
    try {
      const { matched, produceNames, otherUnmatched } = partitionLines(quoteData.lines || []);
      const headers = ['Category', 'Item #', 'Brand', 'Product', 'Pack Size', 'Qty', 'Unit Price'];
      const escCsv = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };
      const rows = matched.map(line => [
        escCsv(line.category || ''),
        escCsv(line.product?.item_number || ''),
        escCsv(line.product?.brand || ''),
        escCsv(line.product?.product || ''),
        escCsv(line.product?.pack_size || ''),
        String(line.quantity),
        line.unit_price || '',
      ].join(','));

      const csvParts = [headers.join(','), ...rows];

      if (produceNames.length > 0 || otherUnmatched.length > 0) {
        csvParts.push('');
        csvParts.push('Items Not in Distributor Catalog');
        if (produceNames.length > 0) {
          csvParts.push(escCsv(`Fresh produce: source externally (${produceNames.join(', ')})`));
        }
        for (const line of otherUnmatched) {
          csvParts.push(escCsv(line.component?.name || 'Unknown'));
        }
      }

      const csv = csvParts.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${quoteId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setHasInteracted(true);
      setShowSuccessDrawer(true);
    } finally {
      setDownloadingCsv(false);
    }
  }

  // PDF download
  async function handlePdfDownload() {
    if (!quoteId) return;
    setDownloadingPdf(true);
    try {
      const result = await downloadQuotePdf(quoteId);
      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quote-${quoteId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setHasInteracted(true);
        setShowSuccessDrawer(true);
      }
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleOrderGuideDownload() {
    if (!quoteId) return;
    setDownloadingOrderGuide(true);
    setOrderGuideError(null);
    try {
      const result = await downloadOrderGuide(quoteId);
      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-guide-${quoteId}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (result.error) {
        // B-115: Set dedicated orderGuideError so it renders inline near the button,
        // not inside the closed PDF preview modal.
        setOrderGuideError(result.error);
        console.error('Order guide download error:', result.error);
      }
    } finally {
      setDownloadingOrderGuide(false);
    }
  }

  // PDF error state
  const [pdfError, setPdfError] = useState<string | null>(null);

  // B-115: Order guide error state — rendered inline near the button (not inside the PDF modal)
  const [orderGuideError, setOrderGuideError] = useState<string | null>(null);

  // Open PDF preview modal — always fetch fresh to avoid caching issues
  const handleOpenPdfPreview = useCallback(async () => {
    if (!quoteId) return;
    // Revoke any existing blob URL before fetching a new one
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    setLoadingPdfPreview(true);
    setPdfError(null);
    setShowPdfModal(true);
    try {
      const result = await downloadQuotePdf(quoteId);
      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        setPdfBlobUrl(url);
      } else {
        setPdfError(result.error || 'Failed to build PDF. Please try again.');
      }
    } catch {
      setPdfError('Network error loading PDF.');
    } finally {
      setLoadingPdfPreview(false);
    }
  }, [quoteId, pdfBlobUrl]);

  // Retry PDF preview
  const handleRetryPdf = useCallback(() => {
    setPdfBlobUrl(null);
    setPdfError(null);
    handleOpenPdfPreview();
  }, [handleOpenPdfPreview]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  // Send state
  const [emailSent, setEmailSent] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);

  // Reset email drawer state when it closes so the button label doesn't
  // persist as stale state on reopen. sendingEmail/sendError are now owned
  // by useAsyncMutation (see sendEmailMutation below), which already clears
  // its own error at the start of the next run().
  useEffect(() => {
    if (!showEmailDrawer) {
      setEmailSent(false);
    }
  }, [showEmailDrawer]);

  // Manual send inputs (for open quotes)
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [sendNote, setSendNote] = useState('');

  // Derive primary contact from quote data
  const primaryContact = quoteData?.contacts?.find(c => c.is_primary) || quoteData?.contacts?.[0] || null;

  // Determine if this is effectively an open quote (either explicitly or no restaurant/contacts)
  const effectiveOpenQuote = isOpenQuote || (!quoteData?.restaurant && !quoteData?.contacts?.length);

  // B-168: Extraction Review gate — mirror the backend send_quote rep-review gate.
  // Block Send Quote + Convert to Order Guide until the quote has cleared review.
  // Only applies once quote data has loaded (don't pre-block while loading).
  const exportBlockedUnreviewed =
    !!quoteData && isExportBlockedUnreviewed(quoteData.rep_reviewed_at, quoteData.state);

  // BUG #21: never fail silently — name WHY when blocked (unacknowledged
  // unmatched items vs. the generic review-required reason).
  const blockedSendReason = getBlockedSendReason(exportBlockedUnreviewed, quoteData?.lines || []);
  const unacknowledgedUnmatched = quoteData ? unacknowledgedUnmatchedLines(quoteData.lines || []) : [];

  // Customer & Contact State (fallback to quote data when available)
  const customerName = effectiveOpenQuote ? 'Open Quote' : (quoteData?.restaurant || 'Loading...');
  const contactEmail = effectiveOpenQuote ? (manualEmail || null) : (primaryContact?.email || null);
  const contactPhone = effectiveOpenQuote ? (manualPhone || null) : (primaryContact?.phone || null);
  const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : null;
  const contacts = quoteData?.contacts || [];

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Auto-select contacts when quote data loads
  useEffect(() => {
    if (quoteData?.contacts?.length) {
      setSelectedContactIds(quoteData.contacts.map(c => c.id));
    }
  }, [quoteData]);

  // Temporary State for Edit Drawer
  const [tempContactIds, setTempContactIds] = useState<string[]>(selectedContactIds);

  // BUG #31/#32/#33: send email routed through the shared useAsyncMutation
  // hook so success ALWAYS does resync + close together, in one place, and a
  // second click while a send is in flight is ignored synchronously.
  const sendEmailMutation = useAsyncMutation(
    async () => {
      if (!quoteId) return { error: 'No quote loaded.' };
      const emailToSend = manualEmail || contactEmail || undefined;
      return sendQuote(quoteId, emailToSend || undefined, sendNote || undefined);
    },
    {
      onSuccess: async () => {
        setEmailSent(true);
        setHasInteracted(true);
        setShowSuccessDrawer(true);
        // BUG #32/#33: close the email drawer on success, in the same place
        // the resync happens, instead of leaving it to the call site.
        setShowEmailDrawer(false);
        incrementQuoteCount();
        // BUG #31: resync quoteData so the status badge reflects "sent"
        // instead of staying on the stale pre-send status (e.g. "draft").
        if (quoteId) {
          const res = await fetchQuote(quoteId);
          if (res.data) setQuoteData(res.data as QuoteResponse);
        }
      },
    }
  );

  async function handleSendEmail(): Promise<boolean> {
    return sendEmailMutation.run();
  }

  // Send SMS
  async function handleSendSms() {
    if (!quoteId) return;
    const phone = contactPhone;
    if (!phone) {
      setSmsError('No phone number: enter one or add a contact.');
      return;
    }
    setSendingSms(true);
    setSmsError(null);
    try {
      const res = await sendQuoteSms(quoteId, phone);
      if (res.error) {
        setSmsError(res.error);
      } else {
        setSmsSent(true);
        setHasInteracted(true);
        setShowSuccessDrawer(true);
        incrementQuoteCount();
      }
    } finally {
      setSendingSms(false);
    }
  }

  const handleSubmitFeedback = () => {
    setHasInteracted(true);
    setShowSuccessDrawer(false);
    // Reset form after a delay to allow animation to finish
    setTimeout(() => {
      setRating(null);
      setFeedback('');
    }, 300);
  };

  const handleDone = () => {
    if (!hasInteracted) {
      setShowSuccessDrawer(true);
    } else {
      navigate('/');
    }
  };

  const openEditDrawer = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    openEditDrawerSafe(setShowEditDrawer, setTempContactIds, selectedContactIds);
  };

  const handleSaveEdit = () => {
    setSelectedContactIds(tempContactIds);
    setShowEditDrawer(false);
  };

  const handleTempContactToggle = (contactId: string) => {
    setTempContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const currentContacts = contacts.filter(c => selectedContactIds.includes(c.id));

  return (
    <div className="p-4 md:p-8 bg-[#FFF9F3] min-h-screen pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/quote-builder', { state: { quoteId, isOpenQuote } })}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl text-[#4F4F4F]">Review & Send</h1>
              {quoteData?.input_mode === 'concept_only' && (
                <p className="text-xs text-amber-600 font-medium mt-0.5">Concept-based starting quote</p>
              )}
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <Button
              variant="outline"
              className="text-[#2A2A2A] border-gray-300"
              onClick={() => navigate('/map-ingredients', { state: { quoteId, isOpenQuote } })}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Matches
            </Button>
            <Button
              variant="outline"
              className="text-[#2A2A2A] border-gray-300"
              onClick={() => navigate('/quote-builder', { state: { quoteId, isOpenQuote } })}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Pricing
            </Button>
          </div>
        </div>

        {/* Source Confidence Strip */}
        {quoteData && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 border-b border-gray-200 pb-3 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <span>Catalog: {(quoteData as any).catalog_source || 'own'}</span>
            <span className="text-gray-300">|</span>
            {/* B-159: "unreviewed" links to the review flow; "reviewed" is plain text (non-interactive). */}
            {(quoteData as any).menu_reviewed ? (
              <span>Menu: reviewed</span>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/map-ingredients', { state: { quoteId, isOpenQuote } })}
                className="text-[#4A90D9] hover:text-[#3a7bc8] underline underline-offset-2 cursor-pointer"
                data-testid="menu-review-link"
              >
                Menu: unreviewed, review now
              </button>
            )}
            <span className="text-gray-300">|</span>
            <span>Status: {(quoteData as any).quote_status_label || quoteData.status}</span>
          </div>
        )}

        {/* Chef question banner — attention signal, not a metric. Surfaces the
            chef's most recent question so the rep knows to reply before
            sending, per Justin's attention-signal-not-metrics doctrine
            (BUG #30). */}
        {quoteData && quoteData.chef_questions && quoteData.chef_questions.length > 0 && (() => {
          const question = latestChefQuestion(quoteData.chef_questions);
          if (!question) return null;
          return (
            <div
              className={`w-full rounded-lg px-4 py-3 mb-6 border flex items-start gap-3 ${
                quoteData.has_unanswered_chef_question
                  ? 'bg-[#A5CFDD]/10 border-[#A5CFDD]/40'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#7FAEC2] flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#2A2A2A]">
                  {quoteData.has_unanswered_chef_question ? 'The chef asked a question' : 'Chef question'}
                </p>
                <p className="text-sm text-gray-600 mt-0.5 break-words">{question.body}</p>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Quote Summary */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg text-[#2A2A2A] mb-1">Quote Summary</h2>
                  <p className="text-gray-500 text-sm">Review before finalizing</p>
                </div>
                {!effectiveOpenQuote && <Button
                  variant="outline"
                  size="sm"
                  data-testid="edit-quote-details"
                  className="text-[#A5CFDD] border-[#A5CFDD]/30 hover:bg-[#A5CFDD]/10"
                  onClick={(e) => openEditDrawer(e)}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#2A2A2A] font-medium block mb-2">
                    Customer Name
                  </label>
                  <div className="bg-gray-50 rounded-md px-4 py-2.5 text-sm text-gray-500">
                    {customerName}
                  </div>
                </div>

                {/* Contacts Section */}
                {effectiveOpenQuote ? (
                  <div>
                    <label className="text-sm text-[#2A2A2A] font-medium block mb-2">
                      Recipient
                    </label>
                    <div className="text-sm text-gray-500 bg-amber-50 px-4 py-3 rounded-md border border-amber-200">
                      Open Quote: enter recipient details in the Send to Customer section below, or export the quote to yourself.
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-[#2A2A2A] font-medium block mb-2">
                      Contacts
                    </label>
                    {currentContacts.length > 0 ? (
                      <div className="space-y-2">
                        {currentContacts.map((contact) => (
                          <div key={contact.id} className="bg-gray-50 rounded-md px-4 py-3 border border-gray-100">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                                <p className="text-xs text-gray-500">{contact.role}</p>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 grid grid-cols-1 sm:grid-cols-2 gap-1">
                              <span className="flex items-center gap-1">
                                {contact.email}
                              </span>
                              <span className="flex items-center gap-1">
                                {contact.phone}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic bg-gray-50 px-4 py-3 rounded-md border border-dashed border-gray-200">
                        {contacts.length === 0 ? 'No contacts on file, add contacts from the Customers page' : 'No contacts selected'}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Products:</span>
                    <span className="text-sm text-[#2A2A2A] font-medium">{quoteData ? partitionLines(quoteData.lines || []).matched.length : '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BUG #23: rep-side acknowledgment for unmatched lines — the missing
                review action. Unmatched lines have no product, so they can never
                go through Edit Matches / MatchCorrection; this is their only path
                to being reviewed. Acknowledging every line here clears the
                send-quote gate (BUG #21). Chef-side "Items your rep will handle"
                contract is untouched. */}
            {quoteData && (() => {
              const allUnmatched = deduplicatedLines(quoteData.lines || [])
                .filter(l => l.availability_status === 'not_in_catalog');
              if (allUnmatched.length === 0) return null;
              const outstanding = allUnmatched.filter(l => !l.rep_handled);

              return (
                <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-amber-200">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg text-[#2A2A2A]">Items Needing Your Input</h2>
                    {outstanding.length > 0 ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {outstanding.length} remaining
                      </span>
                    ) : (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mb-4">
                    These items were not found in the distributor catalog. Choose how you will handle each one before sending.
                  </p>
                  {ackError && (
                    <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                      {ackError}
                    </div>
                  )}
                  <div className="space-y-2">
                    {allUnmatched.map(line => {
                      const acked = !!line.rep_handled;
                      const busy = ackingLineIds.includes(line.id);
                      return (
                        <div
                          key={line.id}
                          className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 ${acked ? 'bg-green-50 border-green-100' : 'bg-amber-50/50 border-amber-100'}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#2A2A2A] truncate">
                              {toTitleCase(line.component?.name || 'Unknown')}
                            </p>
                            <p className="text-xs text-gray-400">{categoryLabel(line.category || '')}</p>
                          </div>
                          {acked ? (
                            <span className="text-xs text-green-700 flex items-center gap-1 shrink-0" data-testid={`ack-done-${line.id}`}>
                              <Check className="w-3.5 h-3.5" /> Acknowledged
                            </span>
                          ) : (
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAcknowledgeUnmatched([line.id], 'rep_will_handle')}
                                className="text-xs px-2.5 py-1.5 rounded-md border border-[#A5CFDD] text-[#2A5F6F] hover:bg-[#A5CFDD]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                data-testid={`ack-rep-will-handle-${line.id}`}
                              >
                                Rep will handle
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAcknowledgeUnmatched([line.id], 'cant_source')}
                                className="text-xs px-2.5 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                data-testid={`ack-cant-source-${line.id}`}
                              >
                                Can't source
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {outstanding.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeUnmatched(outstanding.map(l => l.id), 'rep_will_handle')}
                      disabled={ackingLineIds.length > 0}
                      className="mt-3 text-xs text-[#4A90D9] hover:text-[#3a7bc8] underline underline-offset-2 disabled:opacity-50"
                      data-testid="ack-all-rep-will-handle"
                    >
                      Mark all {outstanding.length} as Rep will handle
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Premium: Append Onboarding Documents and Links */}
            {/* B-160: PREMIUM is an inline badge beside the heading (not an absolute corner
                overlay that collided with the product-count slot). */}
            <div className="bg-[#A5CFDD]/10 rounded-lg p-6 shadow-sm border border-[#A5CFDD]">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg text-[#2A2A2A] font-medium">Supporting Documents & Links</h2>
                <span className="bg-[#F2993D] text-white text-xs font-bold px-2 py-0.5 rounded">
                  PREMIUM
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                Attach supporting documents to your quote.
              </p>

              <div className="bg-orange-50 border border-orange-100 rounded-md p-4 mb-6">
                <div className="flex gap-2">
                  <div className="text-orange-600 shrink-0 mt-0.5">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="text-sm text-gray-700 space-y-2">
                    <p>
                      Select the documents or links you'd like to include. Documents will be appended to the PDF, and links will be listed at the bottom under <strong>"Click Here To Start Your Account Setup"</strong>.
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      Note: These additions will not appear inside of a CSV export.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Documents */}
                <div>
                  <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Documents
                  </h3>
                  <div className="space-y-3 pl-1">
                    {onboardingDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center space-x-3">
                        <Checkbox 
                          id={doc.id} 
                          checked={selectedDocs.includes(doc.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDocs([...selectedDocs, doc.id]);
                            } else {
                              setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                            }
                          }}
                          className="border-gray-300 data-[state=checked]:bg-[#7FAEC2] data-[state=checked]:border-[#7FAEC2]"
                        />
                        <label
                          htmlFor={doc.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 cursor-pointer"
                        >
                          {doc.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Links */}
                <div>
                  <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-gray-500" />
                    Links
                  </h3>
                  <div className="space-y-3 pl-1">
                    {onboardingLinks.map((link) => (
                      <div key={link.id} className="flex items-center space-x-3">
                        <Checkbox 
                          id={link.id}
                          checked={selectedLinks.includes(link.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLinks([...selectedLinks, link.id]);
                            } else {
                              setSelectedLinks(selectedLinks.filter(id => id !== link.id));
                            }
                          }}
                          className="border-gray-300 data-[state=checked]:bg-[#7FAEC2] data-[state=checked]:border-[#7FAEC2]"
                        />
                        <label
                          htmlFor={link.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 cursor-pointer"
                        >
                          {link.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Preview */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-[#2A2A2A]">Quote Preview</h2>
                <button
                  onClick={handleOpenPdfPreview}
                  disabled={!quoteId}
                  className="text-xs text-[#4A90D9] hover:text-[#3a7bc8] flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Full PDF
                </button>
              </div>
              <p className="text-gray-500 text-sm mb-4">Click to preview the exact PDF that will be exported</p>

              {/* Mobile quote preview - card based */}
              <div className="md:hidden space-y-3 mb-4">
                {quoteData && (() => {
                  const { matched, produceNames, otherUnmatched } = partitionLines(quoteData.lines || []);
                  return (
                    <>
                      {matched.map((line) => (
                        <div key={line.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#2A2A2A] truncate">
                                {toTitleCase(line.product?.product || 'Unknown')}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {toTitleCase(line.product?.brand || '')} {line.product?.pack_size ? `· ${line.product.pack_size}` : ''}
                              </p>
                              <p className="text-xs text-gray-400">{categoryLabel(line.category || '')}</p>
                            </div>
                            <div className="text-right ml-3 shrink-0">
                              <p className="text-sm font-semibold text-[#2A2A2A]">{line.unit_price || '-'}</p>
                              <p className="text-xs text-gray-400">×{line.quantity}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(produceNames.length > 0 || otherUnmatched.length > 0) && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-gray-500 mb-2">Items Not in Distributor Catalog</p>
                          {produceNames.length > 0 && (
                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 mb-2">
                              <p className="text-xs text-amber-700">
                                Fresh produce not carried by this distributor: source externally ({produceNames.join(', ')})
                              </p>
                            </div>
                          )}
                          {otherUnmatched.map((line) => (
                            <div key={line.id} className="bg-gray-50 rounded-lg p-2 border border-gray-100 mb-1">
                              <p className="text-xs text-gray-600">{toTitleCase(line.component?.name || 'Unknown')}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
                {!quoteData && <p className="text-sm text-gray-400 text-center py-4">Loading...</p>}
              </div>

              <button
                onClick={handleOpenPdfPreview}
                disabled={!quoteId}
                className="w-full text-left cursor-pointer hover:shadow-md transition-shadow rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                  {/* Mini PDF replica */}
                  <div className="bg-white rounded shadow-sm p-5 max-w-md mx-auto" style={{ fontSize: '0.65rem', lineHeight: '1.4' }}>
                    {/* Header */}
                    <div className="mb-3">
                      <span className="text-base font-bold" style={{ color: '#1A1A2E' }}>Quote</span>
                      <span className="text-base font-bold" style={{ color: '#4A90D9' }}>Me</span>
                      <div className="mt-1 border-t-2" style={{ borderColor: '#4A90D9' }} />
                    </div>

                    {/* Metadata */}
                    <div className="space-y-0.5 mb-3">
                      {!effectiveOpenQuote && customerName !== 'Loading...' && (
                        <div>
                          <span className="text-gray-400">Restaurant: </span>
                          <span className="font-semibold text-gray-700">{customerName}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Quote #: </span>
                        <span className="font-semibold text-gray-700">{quoteId ? quoteId.split('-')[0].toUpperCase() : '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Quote Date: </span>
                        <span className="font-semibold text-gray-700">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Mini table */}
                    <div className="border border-gray-200 rounded overflow-hidden mb-3">
                      <div className="grid grid-cols-6 gap-0 text-[0.5rem] font-bold" style={{ backgroundColor: '#F0F4F8', color: '#1A1A2E' }}>
                        <div className="px-1.5 py-1">Category</div>
                        <div className="px-1.5 py-1">Item #</div>
                        <div className="px-1.5 py-1">Brand</div>
                        <div className="px-1.5 py-1 col-span-2">Product</div>
                        <div className="px-1.5 py-1 text-right">Price</div>
                      </div>
                      {quoteData && (() => {
                        const { matched, produceNames, otherUnmatched } = partitionLines(quoteData.lines || []);
                        const previewLines = matched.slice(0, 4);
                        const remaining = matched.length - 4;
                        const hasUnmatched = produceNames.length > 0 || otherUnmatched.length > 0;
                        return (
                          <>
                            {previewLines.map((line, i) => (
                              <div
                                key={line.id}
                                className="grid grid-cols-6 gap-0 text-[0.5rem] border-t border-gray-100"
                                style={{ backgroundColor: i % 2 === 1 ? '#F9FAFB' : 'white' }}
                              >
                                <div className="px-1.5 py-0.5 truncate text-gray-600">{categoryLabel(line.category || '') || '-'}</div>
                                <div className="px-1.5 py-0.5 truncate text-gray-600">{line.product?.item_number || '-'}</div>
                                <div className="px-1.5 py-0.5 truncate text-gray-600">{toTitleCase(line.product?.brand || '') || '-'}</div>
                                <div className="px-1.5 py-0.5 truncate text-gray-600 col-span-2">{toTitleCase(line.product?.product || '') || '-'}</div>
                                <div className="px-1.5 py-0.5 text-right text-gray-600">{line.unit_price || '-'}</div>
                              </div>
                            ))}
                            {remaining > 0 && (
                              <div className="text-center text-[0.5rem] text-gray-400 py-1 border-t border-gray-100">
                                + {remaining} more items
                              </div>
                            )}
                            {hasUnmatched && (
                              <div className="text-[0.45rem] text-amber-600 px-1.5 py-1 border-t border-gray-100 bg-amber-50/50">
                                + {produceNames.length + otherUnmatched.length} items not in catalog
                              </div>
                            )}
                          </>
                        );
                      })()}
                      {!quoteData && (
                        <div className="text-center text-[0.5rem] text-gray-400 py-2">Loading...</div>
                      )}
                    </div>

                    {/* Item count */}
                    <div className="flex justify-end items-center gap-2 pt-1 border-t border-gray-200">
                      <span className="text-gray-400 text-[0.6rem]">
                        {quoteData ? partitionLines(quoteData.lines || []).matched.length : 0} items
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Finalize and Sign Up */}
            {isGuest && (
            <div className={`bg-white rounded-lg p-6 shadow-sm border-2 ${isFinalized ? 'border-green-500 bg-green-50' : 'border-[#A5CFDD]'}`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-[#2A2A2A]">Sign up to keep building quotes</h2>
                {isFinalized && <Check className="w-5 h-5 text-green-600" />}
              </div>
              <p className="text-gray-500 text-sm mb-6">Create your account to save and send this quote</p>

              {!isFinalized ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name" className="text-sm text-[#2A2A2A] font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="text-sm text-[#2A2A2A] font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-company" className="text-sm text-[#2A2A2A] font-medium">
                      Company Name
                    </Label>
                    <Input
                      id="signup-company"
                      type="text"
                      placeholder="Enter your company name"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="text-sm text-[#2A2A2A] font-medium">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-confirm-password" className="text-sm text-[#2A2A2A] font-medium">
                      Confirm Password
                    </Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      className="mt-1.5 border-gray-300"
                    />
                  </div>

                  <Button
                    className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white h-12 mt-4"
                    onClick={() => setIsFinalized(true)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save and Sign up
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    By signing up, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              ) : (
                <div className="bg-green-100 text-green-800 p-4 rounded text-sm text-center">
                  <p className="font-medium mb-2">You're in! You can now download or send your quote.</p>
                  <p className="text-xs text-green-700 border-t border-green-200 pt-2 mt-1">
                    You have 4 more free quotes. <a href="#" onClick={(e) => { e.preventDefault(); navigate('/settings/billing'); }} className="underline font-semibold hover:text-green-900">View plan options</a> for unlimited.
                  </p>
                </div>
              )}
            </div>
            )}

            {/* Download Quote */}
            <div className={`bg-white rounded-lg p-6 shadow-sm transition-opacity ${!isFinalized ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg text-[#2A2A2A]">Download Quote</h2>
                {!isFinalized && isGuest && <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Sign up first</div>}
              </div>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-gray-300 text-[#2A2A2A] h-12"
                  disabled={!isFinalized || downloadingCsv || !quoteData}
                  onClick={handleCsvDownload}
                >
                  {downloadingCsv ? (
                    <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-3" />
                  )}
                  CSV Export
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-gray-300 text-[#2A2A2A] h-12"
                  disabled={!isFinalized || downloadingPdf || !quoteId}
                  onClick={handlePdfDownload}
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-3" />
                  )}
                  {getPdfButtonLabel(downloadingPdf)}
                </Button>
                <Button
                  className="w-full justify-start bg-[#F2993D] hover:bg-[#E8953A] text-white h-12"
                  disabled={!isFinalized || downloadingOrderGuide || !quoteId || exportBlockedUnreviewed}
                  title={exportBlockedUnreviewed ? (blockedSendReason ?? undefined) : (getOrderGuideDisabledReason(isFinalized, quoteId) ?? undefined)}
                  onClick={handleOrderGuideDownload}
                >
                  {downloadingOrderGuide ? (
                    <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-3" />
                  )}
                  Convert to Order Guide
                </Button>
                {/* B-168/BUG#21: Inline reason when blocked on extraction review — always
                    names WHY (unacknowledged unmatched items or the generic reason), never silent. */}
                {exportBlockedUnreviewed && (
                  <p className="text-xs text-amber-600 mt-1" data-testid="order-guide-review-required">
                    {blockedSendReason}
                  </p>
                )}
                {/* B-115: Inline error — visible on the main page, not buried in the PDF modal */}
                {orderGuideError && (
                  <p className="text-xs text-red-500 mt-1" data-testid="order-guide-error">
                    {orderGuideError}
                  </p>
                )}
              </div>
            </div>

            {/* Send to Customer */}
            <div className={`bg-white rounded-lg p-6 shadow-sm transition-opacity ${!isFinalized ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-[#2A2A2A]">Send to Customer</h2>
                {!isFinalized && isGuest && <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Sign up first</div>}
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Emails will be sent via {FROM_DISPLAY_ADDRESS} with your email CC'd
              </p>

              {(sendEmailMutation.error || smsError) && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                  {sendEmailMutation.error || smsError}
                </div>
              )}

              {effectiveOpenQuote && (
                <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Enter recipient details</p>
                  <div>
                    <Label htmlFor="manual-email" className="text-sm mb-1.5 block text-gray-600">Email</Label>
                    <Input
                      id="manual-email"
                      type="email"
                      placeholder="customer@example.com"
                      className="bg-white border-gray-300"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-phone" className="text-sm mb-1.5 block text-gray-600">Phone</Label>
                    <Input
                      id="manual-phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="bg-white border-gray-300"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* BUG #33: this card used to have its own "Email Quote to Chef"
                    button that opened the same drawer as the sticky "Send Quote"
                    footer button below (see the TODO this replaced). Consolidated
                    to a single "Email Quote to Chef" affordance, kept on the
                    sticky footer since it already carries the full send gating
                    (extraction review gate, recipient-required gate). */}
                <Button
                  variant="outline"
                  className="w-full justify-start border-gray-200 text-gray-400 h-12 cursor-not-allowed"
                  disabled
                >
                  <MessageSquare className="w-4 h-4 mr-3" />
                  Text Quote to Chef
                  <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Coming Soon</span>
                </Button>

                {effectiveOpenQuote && (
                  isDemoMode() ? (
                    <div className="w-full border border-dashed border-gray-300 rounded-lg px-4 py-3 text-center">
                      <p className="text-sm text-gray-500">
                        <a href={PROD_SIGNUP_URL} className="text-[#7FAEC2] font-medium hover:underline">Sign up</a> to send quotes to yourself
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-300 text-[#2A2A2A] h-12"
                      disabled={!isFinalized || sendEmailMutation.loading}
                      onClick={handleSendEmail}
                    >
                      <Mail className="w-4 h-4 mr-3" />
                      Send to myself
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Mode: Sticky floating sign-up button */}
      {isDemoMode() && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
          <a
            href={PROD_SIGNUP_URL}
            className="block w-full md:w-auto md:min-w-[300px] md:mx-auto text-center bg-[#F2993D] hover:bg-[#E8953A] text-white font-medium py-3 px-6 rounded-lg text-base min-h-[48px] leading-[48px]"
          >
            Sign up to send quote
          </a>
        </div>
      )}

      {/* Authenticated mode: Sticky floating Email Quote to Chef button.
          BUG #33: this used to be labeled "Send Quote" and duplicated the
          "Email Quote to Chef" button that lived in the Send to Customer
          card above (both opened the same email drawer). Consolidated to
          this one button, kept here because it already carries the full
          send gating (extraction review gate + recipient-required gate). */}
      {!isDemoMode() && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-gray-200 p-4 z-40">
          {/* B-168/BUG#21: Review gate takes precedence — block + always explain WHY
              (never silent) before the email hint */}
          {exportBlockedUnreviewed ? (
            <p className="text-xs text-center text-amber-600 mb-1" data-testid="send-quote-review-required">
              {blockedSendReason}
            </p>
          ) : (
            /* B-114: Show helper text when button is disabled because no recipient email was entered */
            isOpenQuoteSendDisabled(effectiveOpenQuote, manualEmail, contactEmail) && (
              <p className="text-xs text-center text-gray-500 mb-1" data-testid="send-quote-disabled-hint">
                {SEND_QUOTE_DISABLED_REASON}
              </p>
            )
          )}
          <button
            onClick={() => setShowEmailDrawer(true)}
            disabled={exportBlockedUnreviewed || isOpenQuoteSendDisabled(effectiveOpenQuote, manualEmail, contactEmail)}
            title={
              exportBlockedUnreviewed
                ? (blockedSendReason ?? undefined)
                : (isOpenQuoteSendDisabled(effectiveOpenQuote, manualEmail, contactEmail) ? SEND_QUOTE_DISABLED_REASON : undefined)
            }
            className="w-full md:w-auto md:min-w-[200px] md:mx-auto md:block bg-[#F2993D] hover:bg-[#E8953A] text-white font-medium py-2.5 px-5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Email Quote to Chef
          </button>
        </div>
      )}

      {/* Success Drawer */}
      <Drawer open={showSuccessDrawer} onOpenChange={setShowSuccessDrawer} direction="right" handleOnly>
        <DrawerContent>
          <div className="w-full h-full p-6 flex flex-col">
            <DrawerHeader className="px-0">
              <div className="flex justify-between items-start">
                <DrawerTitle className="text-2xl font-bold text-[#F2993D]">Success!</DrawerTitle>
                <DrawerClose className="text-gray-400 hover:text-gray-600 -mt-1">
                  <X className="w-5 h-5" />
                </DrawerClose>
              </div>
              <DrawerDescription>
                Your action has been completed successfully. We'd love your feedback!
              </DrawerDescription>
            </DrawerHeader>
            
            <div className="flex-1 space-y-8 mt-6">
              {/* Question 1 */}
              <div>
                <label className="block text-base font-medium text-[#2A2A2A] mb-4">
                  How would you rate your quote building experience today?
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setRating('up')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                      rating === 'up' 
                        ? 'border-[#F2993D] bg-orange-50 text-[#F2993D]' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <ThumbsUp className="w-10 h-10" />
                    <span className="font-medium">Great</span>
                  </button>
                  <button
                    onClick={() => setRating('down')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                      rating === 'down' 
                        ? 'border-[#F2993D] bg-orange-50 text-[#F2993D]' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <ThumbsDown className="w-10 h-10" />
                    <span className="font-medium">Not Good</span>
                  </button>
                </div>
              </div>

              {/* Question 2 */}
              <div>
                <label className="block text-base font-medium text-[#2A2A2A] mb-4">
                  Is there anything about QuoteMe that you'd like to see us improve?
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what you think..."
                  className="min-h-[150px] text-base resize-none border-gray-300 focus:border-[#F2993D] focus:ring-[#F2993D]"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                onClick={handleSubmitFeedback}
                className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white h-14 text-lg font-medium"
              >
                Submit Feedback
              </Button>
              <DrawerClose asChild>
                <button className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                  Skip
                </button>
              </DrawerClose>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-[85vw] w-[85vw] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="text-lg text-[#2A2A2A]">Quote PDF Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 pb-6">
            {loadingPdfPreview ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#F2993D] mx-auto" />
                  <p className="text-sm text-gray-500">Loading PDF preview...</p>
                </div>
              </div>
            ) : pdfBlobUrl ? (
              <object
                data={pdfBlobUrl}
                type="application/pdf"
                className="w-full h-full rounded border border-gray-200"
              >
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-sm text-gray-500">Unable to display PDF inline.</p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(pdfBlobUrl, '_blank')}
                  >
                    Open in New Tab
                  </Button>
                </div>
              </object>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-sm text-red-500">{pdfError || 'Failed to load PDF preview.'}</p>
                <Button
                  variant="outline"
                  onClick={handleRetryPdf}
                  className="text-[#7FAEC2]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Quote Drawer */}
      <Drawer open={showEmailDrawer} onOpenChange={setShowEmailDrawer} direction="right" handleOnly>
        <DrawerContent className="w-full sm:w-[500px]">
          <div className="w-full h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <DrawerTitle className="text-base font-semibold">Email Quote to Chef</DrawerTitle>
                <DrawerDescription className="text-sm text-gray-500 mt-0.5">Send the quote PDF via email</DrawerDescription>
              </div>
              <DrawerClose className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </DrawerClose>
            </div>
            <div className="flex-1 p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">To</Label>
                <Input
                  type="email"
                  placeholder="chef@restaurant.com"
                  value={manualEmail || contactEmail || ''}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</Label>
                <Input
                  type="text"
                  value={`Your quote from ${quoteData?.rep || 'us'}`}
                  readOnly
                  className="border-gray-300 bg-gray-50"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Add a note (optional)</Label>
                <Textarea
                  placeholder="Include a personal message with your quote..."
                  value={sendNote}
                  onChange={(e) => setSendNote(e.target.value)}
                  className="border-gray-300 min-h-[100px]"
                />
              </div>
              {sendEmailMutation.error && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3">
                  {sendEmailMutation.error}
                </div>
              )}
            </div>
            <DrawerFooter className="border-t border-gray-200">
              <div className="flex gap-3">
                <DrawerClose asChild>
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-600 h-12"
                  >
                    Cancel
                  </Button>
                </DrawerClose>
                <Button
                  onClick={() => sendEmailMutation.run()}
                  disabled={sendEmailMutation.loading || (!contactEmail && !manualEmail)}
                  className="flex-1 bg-[#A5CFDD] hover:bg-[#8db9c9] text-white min-h-[48px]"
                >
                  {sendEmailMutation.loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  {emailSent ? 'Email Sent!' : 'Send Email'}
                </Button>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit Quote Details Drawer */}
      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer} direction="right" handleOnly>
        <DrawerContent className="w-full sm:w-[500px]">
          <div className="w-full h-full flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <DrawerTitle className="text-xl font-bold text-[#2A2A2A]">Edit Quote Details</DrawerTitle>
              <DrawerClose className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </DrawerClose>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Customer Name (read-only, from quote) */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Customer
                  </Label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700">
                    {customerName}
                  </div>
                </div>

                {/* Contacts Selection */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="mb-3">
                    <Label className="text-sm font-medium text-gray-700">Select Contacts</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose which contacts should appear on this quote.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {contacts.length === 0 && (
                      <div className="text-center py-4 text-gray-400">
                        <p className="text-sm">No contacts on file.</p>
                        <p className="text-xs mt-1">Add contacts from the Customers page to include them on quotes.</p>
                      </div>
                    )}
                    {contacts.map((contact) => (
                      <div key={contact.id} className="flex items-start space-x-3 bg-white p-3 rounded border border-gray-100 shadow-sm">
                        <Checkbox
                          id={`edit-${contact.id}`}
                          checked={tempContactIds.includes(contact.id)}
                          onCheckedChange={() => handleTempContactToggle(contact.id)}
                          className="mt-1 border-gray-300 data-[state=checked]:bg-[#7FAEC2] data-[state=checked]:border-[#7FAEC2]"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <label
                              htmlFor={`edit-${contact.id}`}
                              className="text-sm font-medium text-gray-900 cursor-pointer"
                            >
                              {contact.first_name} {contact.last_name}
                            </label>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                              {contact.role}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 grid grid-cols-1 gap-1">
                            <span>{contact.email}</span>
                            <span>{contact.phone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#A5CFDD]/10 p-4 rounded-md border border-[#A5CFDD]/20 flex gap-3">
                  <Info className="w-5 h-5 text-[#A5CFDD] shrink-0" />
                  <p className="text-sm text-[#2A5F6F]">
                    Changing the customer or contacts will only affect this quote. Your existing catalog selections and pricing will remain saved.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEditDrawer(false)}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white h-11 px-8"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}