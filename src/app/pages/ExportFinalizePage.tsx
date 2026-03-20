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
import { getQuote, getGuestQuote, downloadQuotePdf, downloadOrderGuide, sendQuote, sendQuoteSms } from '../services/api';
import type { QuoteResponse, QuoteLineResponse } from '../services/api';
import { isDemoMode, PROD_SIGNUP_URL } from '../utils/demoMode';


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

  // CSV download
  async function handleCsvDownload() {
    if (!quoteData) return;
    setDownloadingCsv(true);
    try {
      const lines = deduplicatedLines(quoteData.lines || []);
      const headers = ['Category', 'Item #', 'Brand', 'Product', 'Pack Size', 'Qty', 'Unit Price'];
      const escCsv = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };
      const rows = lines.map(line => [
        escCsv(line.category || ''),
        escCsv(line.product?.item_number || ''),
        escCsv(line.product?.brand || ''),
        escCsv(line.product?.product || ''),
        escCsv(line.product?.pack_size || ''),
        String(line.quantity),
        line.unit_price || '',
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
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
    try {
      const result = await downloadOrderGuide(quoteId);
      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-guide-${quoteId}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setDownloadingOrderGuide(false);
    }
  }

  // PDF error state
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Open PDF preview modal
  const handleOpenPdfPreview = useCallback(async () => {
    if (!quoteId) return;
    // Reuse existing blob if we already fetched it
    if (pdfBlobUrl) {
      setShowPdfModal(true);
      return;
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
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Manual send inputs (for open quotes)
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Derive primary contact from quote data
  const primaryContact = quoteData?.contacts?.find(c => c.is_primary) || quoteData?.contacts?.[0] || null;

  // Determine if this is effectively an open quote (either explicitly or no restaurant/contacts)
  const effectiveOpenQuote = isOpenQuote || (!quoteData?.restaurant && !quoteData?.contacts?.length);

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

  // Send email
  async function handleSendEmail() {
    if (!quoteId) return;
    setSendingEmail(true);
    setSendError(null);
    try {
      const res = await sendQuote(quoteId);
      if (res.error) {
        setSendError(res.error);
      } else {
        setEmailSent(true);
        setHasInteracted(true);
        setShowSuccessDrawer(true);
      }
    } finally {
      setSendingEmail(false);
    }
  }

  // Send SMS
  async function handleSendSms() {
    if (!quoteId) return;
    setSendingSms(true);
    setSendError(null);
    try {
      const res = await sendQuoteSms(quoteId);
      if (res.error) {
        setSendError(res.error);
      } else {
        setSmsSent(true);
        setHasInteracted(true);
        setShowSuccessDrawer(true);
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

  const openEditDrawer = () => {
    setTempContactIds(selectedContactIds);
    setShowEditDrawer(true);
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
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl text-[#4F4F4F]">Review & Send</h1>
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
            <span>Menu: {(quoteData as any).menu_reviewed ? 'reviewed' : 'unreviewed'}</span>
            <span className="text-gray-300">|</span>
            <span>Status: {(quoteData as any).quote_status_label || quoteData.status}</span>
          </div>
        )}

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
                  className="text-[#A5CFDD] border-[#A5CFDD]/30 hover:bg-[#A5CFDD]/10"
                  onClick={openEditDrawer}
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
                      Open Quote — enter recipient details in the Send to Customer section below, or export the quote to yourself.
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
                        {contacts.length === 0 ? 'No contacts on file — add contacts from the Customers page' : 'No contacts selected'}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Products:</span>
                    <span className="text-sm text-[#2A2A2A] font-medium">{quoteData ? deduplicatedLines(quoteData.lines || []).length : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium: Append Onboarding Documents and Links */}
            <div className="bg-[#A5CFDD]/10 rounded-lg p-6 shadow-sm border border-[#A5CFDD] relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#F2993D] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                PREMIUM
              </div>
              
              <h2 className="text-lg text-[#2A2A2A] mb-1 font-medium">Add Onboarding Documents & Links</h2>
              <p className="text-gray-500 text-sm mb-4">
                Automatically include onboarding materials with your quote.
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
                    Onboarding Documents
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
                    Onboarding Links
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
                {quoteData && deduplicatedLines(quoteData.lines || []).map((line) => (
                  <div key={line.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2A2A2A] truncate">
                          {toTitleCase(line.product?.product || line.component?.name || 'Unknown')}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {toTitleCase(line.product?.brand || '')} {line.product?.pack_size ? `· ${line.product.pack_size}` : ''}
                        </p>
                        <p className="text-xs text-gray-400">{toTitleCase(line.category || '')}</p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-semibold text-[#2A2A2A]">{line.unit_price || '—'}</p>
                        <p className="text-xs text-gray-400">×{line.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
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
                        <span className="font-semibold text-gray-700">{quoteId ? quoteId.split('-')[0].toUpperCase() : '—'}</span>
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
                      {quoteData && deduplicatedLines(quoteData.lines || []).slice(0, 4).map((line, i) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-6 gap-0 text-[0.5rem] border-t border-gray-100"
                          style={{ backgroundColor: i % 2 === 1 ? '#F9FAFB' : 'white' }}
                        >
                          <div className="px-1.5 py-0.5 truncate text-gray-600">{toTitleCase(line.category || '') || '—'}</div>
                          <div className="px-1.5 py-0.5 truncate text-gray-600">{line.product?.item_number || '—'}</div>
                          <div className="px-1.5 py-0.5 truncate text-gray-600">{toTitleCase(line.product?.brand || '') || '—'}</div>
                          <div className="px-1.5 py-0.5 truncate text-gray-600 col-span-2">{toTitleCase(line.product?.product || '') || '—'}</div>
                          <div className="px-1.5 py-0.5 text-right text-gray-600">{line.unit_price || '—'}</div>
                        </div>
                      ))}
                      {quoteData && deduplicatedLines(quoteData.lines || []).length > 4 && (
                        <div className="text-center text-[0.5rem] text-gray-400 py-1 border-t border-gray-100">
                          + {deduplicatedLines(quoteData.lines || []).length - 4} more items
                        </div>
                      )}
                      {!quoteData && (
                        <div className="text-center text-[0.5rem] text-gray-400 py-2">Loading...</div>
                      )}
                    </div>

                    {/* Item count */}
                    <div className="flex justify-end items-center gap-2 pt-1 border-t border-gray-200">
                      <span className="text-gray-400 text-[0.6rem]">
                        {quoteData ? deduplicatedLines(quoteData.lines || []).length : 0} items
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
                  PDF Quote
                </Button>
                <Button
                  className="w-full justify-start bg-[#F9A64B] hover:bg-[#E8953A] text-white h-12"
                  disabled={!isFinalized || downloadingOrderGuide || !quoteId}
                  onClick={handleOrderGuideDownload}
                >
                  {downloadingOrderGuide ? (
                    <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-3" />
                  )}
                  Convert to Order Guide
                </Button>
              </div>
            </div>

            {/* Send to Customer */}
            <div className={`bg-white rounded-lg p-6 shadow-sm transition-opacity ${!isFinalized ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-[#2A2A2A]">Send to Customer</h2>
                {!isFinalized && isGuest && <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Sign up first</div>}
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Emails will be sent via Quotes@Quote-me.com with your email CC'd
              </p>

              {sendError && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                  {sendError}
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
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#A5CFDD] text-[#A5CFDD] h-12"
                  disabled={!isFinalized}
                  onClick={() => setShowEmailDrawer(true)}
                >
                  <Mail className="w-4 h-4 mr-3" />
                  Email Quote to Chef
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start border-[#A5CFDD] text-[#A5CFDD] h-12"
                  disabled={!isFinalized || sendingSms}
                  onClick={handleSendSms}
                >
                  <MessageSquare className="w-4 h-4 mr-3" />
                  {sendingSms ? 'Sending...' : smsSent ? 'Text Sent!' : 'Text Quote to Chef'}
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
                      disabled={!isFinalized || sendingEmail}
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
            className="block w-full md:w-auto md:min-w-[300px] md:mx-auto text-center bg-[#F9A64B] hover:bg-[#E8953A] text-white font-medium py-3 px-6 rounded-lg text-base min-h-[48px] leading-[48px]"
          >
            Sign up to send quote
          </a>
        </div>
      )}

      {/* Authenticated mode: Sticky floating Send Quote button */}
      {!isDemoMode() && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-gray-200 p-4 z-40">
          <button
            onClick={() => setShowEmailDrawer(true)}
            className="w-full md:w-auto md:min-w-[200px] md:mx-auto md:block bg-[#F9A64B] hover:bg-[#E8953A] text-white font-medium py-2.5 px-5 rounded-lg text-sm"
          >
            Send Quote
          </button>
        </div>
      )}

      {/* Success Drawer */}
      <Drawer open={showSuccessDrawer} onOpenChange={setShowSuccessDrawer} direction="right">
        <DrawerContent>
          <div className="w-full h-full p-6 flex flex-col">
            <DrawerHeader className="px-0">
              <DrawerTitle className="text-2xl font-bold text-[#F2993D]">Success!</DrawerTitle>
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

            <div className="mt-6">
              <Button
                onClick={handleSubmitFeedback}
                className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white h-14 text-lg font-medium"
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 flex flex-col">
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
      <Drawer open={showEmailDrawer} onOpenChange={setShowEmailDrawer} direction="right">
        <DrawerContent className="w-full sm:w-[500px]">
          <div className="w-full h-full flex flex-col">
            <DrawerHeader className="border-b border-gray-200">
              <DrawerTitle>Email Quote to Chef</DrawerTitle>
              <DrawerDescription>Send the quote PDF via email</DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">To</Label>
                <Input
                  type="email"
                  placeholder="chef@restaurant.com"
                  value={effectiveOpenQuote ? manualEmail : (contactEmail || '')}
                  onChange={(e) => effectiveOpenQuote && setManualEmail(e.target.value)}
                  readOnly={!effectiveOpenQuote}
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
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Note (optional)</Label>
                <Textarea
                  placeholder="Add a personal note..."
                  className="border-gray-300 min-h-[100px]"
                />
              </div>
              {sendError && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3">
                  {sendError}
                </div>
              )}
            </div>
            <DrawerFooter className="border-t border-gray-200">
              <Button
                onClick={() => { handleSendEmail(); setShowEmailDrawer(false); }}
                disabled={sendingEmail || (!contactEmail && !manualEmail)}
                className="w-full bg-[#A5CFDD] hover:bg-[#8db9c9] text-white min-h-[48px]"
              >
                {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                {emailSent ? 'Email Sent!' : 'Send Email'}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit Quote Details Drawer */}
      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer} direction="right">
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