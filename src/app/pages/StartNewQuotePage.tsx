import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ExternalLink, Upload, Plus, Link as LinkIcon, X, PlusCircle, Loader2, FileText, Camera, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Checkbox } from '../components/ui/checkbox';
import { useUser } from '../contexts/UserContext';
import { UpgradeDrawer } from '../components/UpgradeDrawer';
import { createMenu, createGuestQuote, extractMenuText, getCatalogs, uploadCatalogFile, getRestaurants, getRestaurant, getStockQuotes, generateFromStockQuote } from '../services/api';
import type { CatalogSummary, RestaurantSummary, RestaurantDetail, StockQuoteResponse } from '../services/api';
import { isDemoMode } from '../utils/demoMode';

export function StartNewQuotePage() {
  const navigate = useNavigate();
  const [isAddRestaurantOpen, setIsAddRestaurantOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantDetail | null>(null);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [menuPreviewText, setMenuPreviewText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [menuUrl, setMenuUrl] = useState('');
  const [isQuoteOpened, setIsQuoteOpened] = useState(isDemoMode());
  const [isUpgradeDrawerOpen, setIsUpgradeDrawerOpen] = useState(false);
  const { hasQuotesRemaining, incrementQuoteCount, quotesRemaining, profile, initGuestSession } = useUser();
  const isGuest = profile.isGuest || localStorage.getItem('quoteme_token') === null;
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [serviceBusy, setServiceBusy] = useState(false);
  const [lastAction, setLastAction] = useState<'match' | 'skip' | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Catalog upload state
  const [catalogs, setCatalogs] = useState<CatalogSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogUploading, setCatalogUploading] = useState(false);
  const [catalogUploadResult, setCatalogUploadResult] = useState<{ message: string; isError: boolean } | null>(null);
  const [isDraggingCatalog, setIsDraggingCatalog] = useState(false);
  const catalogFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [catalogUploadExpanded, setCatalogUploadExpanded] = useState(false);
  const [skipIngredientReview, setSkipIngredientReview] = useState(false);

  // Stock quotes state
  const [stockQuotes, setStockQuotes] = useState<StockQuoteResponse[]>([]);
  const [selectedStockType, setSelectedStockType] = useState('');
  const [generatingStock, setGeneratingStock] = useState(false);

  function cleanCatalogName(cat: CatalogSummary): string {
    // Show a clean name instead of raw filename
    const count = cat.row_count;
    if (count >= 1000) {
      return `Product Catalog (${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}k products)`;
    }
    return `Product Catalog (${count.toLocaleString()} products)`;
  }

  // Detect touch device with camera
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    navigator.mediaDevices?.enumerateDevices().then(devices => {
      const cam = devices.some(d => d.kind === 'videoinput');
      setHasCamera(cam);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isCreatingQuote) {
      setLoadingPhase(0);
      return;
    }
    const phases = [0, 1, 2, 3, 4, 5];
    const delays = [4000, 4000, 4000, 4000, 30000, 0];
    let current = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const advance = () => {
      if (current < phases.length - 1) {
        current++;
        setLoadingPhase(current);
        if (delays[current] > 0) {
          timeout = setTimeout(advance, delays[current]);
        }
      }
    };
    timeout = setTimeout(advance, delays[0]);
    return () => clearTimeout(timeout);
  }, [isCreatingQuote]);

  // Load existing catalogs and restaurants on mount
  useEffect(() => {
    const token = localStorage.getItem('quoteme_token');
    if (!token) return;
    setCatalogLoading(true);
    getCatalogs().then(res => {
      if (res.data) setCatalogs(res.data);
      setCatalogLoading(false);
    });
    setRestaurantsLoading(true);
    getRestaurants().then(res => {
      if (res.data) setRestaurants(res.data);
      setRestaurantsLoading(false);
    });
    // Load stock quotes
    getStockQuotes().then(res => {
      if (res.data) setStockQuotes(res.data);
    });
  }, []);

  // Catalog file upload handler
  const handleCatalogFileSelect = async (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      setCatalogUploadResult({ message: 'Unsupported file type. Please upload a CSV or Excel file.', isError: true });
      return;
    }
    setCatalogUploading(true);
    setCatalogUploadResult(null);
    // Ensure guest session exists for guest uploads
    if (isGuest && !localStorage.getItem('quoteme_guest_token')) {
      await initGuestSession();
    }
    const res = await uploadCatalogFile(file);
    if (res.error) {
      setCatalogUploadResult({ message: res.error, isError: true });
    } else if (res.data) {
      setCatalogUploadResult({ message: res.data.message, isError: false });
      if (!isGuest) {
        // Refresh catalog list for logged-in users
        const listRes = await getCatalogs();
        if (listRes.data) setCatalogs(listRes.data);
      } else {
        // Show the uploaded catalog info for guests
        setCatalogs([{ id: res.data.id, status: 'active', row_count: res.data.item_count, created_at: new Date().toISOString() } as CatalogSummary]);
      }
    }
    setCatalogUploading(false);
  };

  const handleCatalogDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingCatalog(true); };
  const handleCatalogDragLeave = () => setIsDraggingCatalog(false);
  const handleCatalogDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCatalog(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCatalogFileSelect(file);
  };

  // Strip standalone prices (e.g. "$12.99", "12.50", "$8") from menu text
  // but keep numbers that are part of ingredient names (e.g. "7-grain", "100% beef")
  const stripPrices = (text: string): string => {
    return text
      .replace(/\$\d+(?:\.\d{1,2})?/g, '')        // $12.99, $8
      .replace(/(?<=\s|^)\d{1,3}\.\d{2}(?=\s|$)/gm, '') // 12.99 standalone
      .replace(/[ \t]{2,}/g, ' ')                   // collapse extra spaces
      .replace(/^\s+$/gm, '')                       // remove blank lines
      .trim();
  };

  const handleParseMenu = () => {
    if (pasteText) {
      setMenuPreviewText(stripPrices(pasteText));
    } else if (uploadedFile) {
      handleFileExtract(uploadedFile);
    } else if (menuUrl) {
      handleUrlExtract();
    }
  };

  // Handle file selection (from picker or drop)
  const handleFileSelect = (file: File) => {
    // If there's already parsed menu content, confirm replacement
    if (menuPreviewText && !confirm('You have a menu in progress. Replace it with this new file?')) {
      return;
    }
    setUploadedFile(file);
    setExtractError(null);

    // CSV/text files — read directly client-side
    const ext = file.name.toLowerCase();
    if (ext.endsWith('.csv') || ext.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setPasteText(text);
        setMenuPreviewText(stripPrices(text));
      };
      reader.readAsText(file);
    } else {
      // Image/PDF — extract via backend
      handleFileExtract(file);
    }
  };

  // Extract text from uploaded image/PDF via backend
  async function handleFileExtract(file: File) {
    setIsExtracting(true);
    setExtractError(null);
    try {
      const res = await extractMenuText({ file });
      if (res.error) {
        if (isServiceBusyError(res.error)) {
          setExtractError('Our menu analysis service is temporarily busy. Please try again in a few seconds.');
        } else {
          setExtractError(res.error);
        }
      } else if (res.data?.text) {
        setPasteText(res.data.text);
        setMenuPreviewText(stripPrices(res.data.text));
      }
    } catch (e: any) {
      setExtractError(e.message || 'Failed to extract text');
    } finally {
      setIsExtracting(false);
    }
  }

  // Extract text from URL via backend
  async function handleUrlExtract() {
    if (!menuUrl.trim()) return;
    setIsExtracting(true);
    setExtractError(null);
    try {
      // Ensure URL has protocol
      let url = menuUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const res = await extractMenuText({ url });
      if (res.error) {
        if (isServiceBusyError(res.error)) {
          setExtractError('Our menu analysis service is temporarily busy. Please try again in a few seconds.');
        } else {
          setExtractError(res.error);
        }
      } else if (res.data?.text) {
        setPasteText(res.data.text);
        setMenuPreviewText(stripPrices(res.data.text));
      }
    } catch (e: any) {
      setExtractError(e.message || 'Failed to extract text from URL');
    } finally {
      setIsExtracting(false);
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  function isServiceBusyError(errorStr: string | undefined): boolean {
    return errorStr === 'service_busy' || (errorStr?.includes('service_busy') ?? false);
  }

  const handleRetry = () => {
    setServiceBusy(false);
    if (lastAction === 'match') handleContinueToQuoteBuilder();
    else if (lastAction === 'skip') handleSkipToExport();
  };

  const handleContinueToQuoteBuilder = async () => {
    const menuText = pasteText || menuPreviewText;
    if (!menuText) {
      alert('Please paste or parse menu text before continuing.');
      return;
    }

    if (!hasQuotesRemaining()) {
      setIsUpgradeDrawerOpen(true);
      return;
    }

    console.log('profile:', profile);

    setIsCreatingQuote(true);
    setServiceBusy(false);
    setLastAction('match');
    try {
      if (profile.isGuest || localStorage.getItem('quoteme_token') === null) {
        // Ensure guest session exists — always try to init if no token
        if (!localStorage.getItem('quoteme_guest_token')) {
          await initGuestSession();
        }
        // Verify token was actually created
        if (!localStorage.getItem('quoteme_guest_token')) {
          alert('Failed to start guest session. Please try again.');
          setIsCreatingQuote(false);
          return;
        }
        const guestQuotePayload = { raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' };
        console.log('createGuestQuote payload:', JSON.stringify(guestQuotePayload, null, 2));
        let response = await createGuestQuote(guestQuotePayload);
        // If 401/session expired, clear stale token and retry with a fresh session
        if (response.error && (response.error.includes('401') || response.error.includes('expired') || response.error.includes('not found') || response.error.includes('Session'))) {
          console.log('Guest session expired, creating new session...');
          localStorage.removeItem('quoteme_guest_token');
          await initGuestSession();
          if (!localStorage.getItem('quoteme_guest_token')) {
            alert('Failed to start guest session. Please try again.');
            setIsCreatingQuote(false);
            return;
          }
          response = await createGuestQuote(guestQuotePayload);
        }
        if (response.error) {
          if (isServiceBusyError(response.error)) { setServiceBusy(true); return; }
          console.error('createGuestQuote error:', response.error);
          alert(`Failed to create quote: ${response.error}`);
          return;
        }
        if (response.data) {
          incrementQuoteCount();
          navigate(skipIngredientReview ? '/map-ingredients' : '/correction', { state: { quoteId: response.data.quote_id, menuId: response.data.menu_id, isOpenQuote: isQuoteOpened } });
        }
      } else {
        const response = await createMenu({ raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' });
        if (response.error) {
          if (isServiceBusyError(response.error)) { setServiceBusy(true); return; }
          console.error('createMenu error:', response.error);
          alert(`Failed to create quote: ${response.error}`);
          return;
        }
        if (response.data) {
          incrementQuoteCount();
          navigate(skipIngredientReview ? '/map-ingredients' : '/correction', { state: { quoteId: response.data.quote_id, menuId: response.data.menu_id, isOpenQuote: isQuoteOpened } });
        }
      }
    } catch (error) {
      console.error('Failed to create quote:', error);
      alert('Failed to create quote. Please try again.');
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleSkipToExport = async () => {
    const menuText = pasteText || menuPreviewText;
    if (!menuText) {
      alert('Please paste or parse menu text before skipping.');
      return;
    }

    if (!hasQuotesRemaining()) {
      setIsUpgradeDrawerOpen(true);
      return;
    }

    setIsCreatingQuote(true);
    setServiceBusy(false);
    setLastAction('skip');
    try {
      if (profile.isGuest || localStorage.getItem('quoteme_token') === null) {
        if (!localStorage.getItem('quoteme_guest_token')) {
          await initGuestSession();
        }
        if (!localStorage.getItem('quoteme_guest_token')) {
          alert('Failed to start guest session. Please try again.');
          setIsCreatingQuote(false);
          return;
        }
        let response = await createGuestQuote({ raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' });
        // If 401/session expired, clear stale token and retry with a fresh session
        if (response.error && (response.error.includes('401') || response.error.includes('expired') || response.error.includes('not found') || response.error.includes('Session'))) {
          console.log('Guest session expired, creating new session...');
          localStorage.removeItem('quoteme_guest_token');
          await initGuestSession();
          if (!localStorage.getItem('quoteme_guest_token')) {
            alert('Failed to start guest session. Please try again.');
            setIsCreatingQuote(false);
            return;
          }
          response = await createGuestQuote({ raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' });
        }
        if (response.error) {
          if (isServiceBusyError(response.error)) { setServiceBusy(true); return; }
          console.error('createGuestQuote error:', response.error);
          alert(`Failed to create quote: ${response.error}`);
          return;
        }
        if (response.data) {
          incrementQuoteCount();
          navigate('/export-finalize', { state: { quoteId: response.data.quote_id, isOpenQuote: isQuoteOpened } });
        }
      } else {
        const response = await createMenu({ raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' });
        if (response.error) {
          if (isServiceBusyError(response.error)) { setServiceBusy(true); return; }
          console.error('createMenu error:', response.error);
          alert(`Failed to create quote: ${response.error}`);
          return;
        }
        if (response.data) {
          incrementQuoteCount();
          navigate('/export-finalize', { state: { quoteId: response.data.quote_id, isOpenQuote: isQuoteOpened } });
        }
      }
    } catch (error) {
      console.error('Failed to create quote:', error);
      alert('Failed to create quote. Please try again.');
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleRestaurantChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'add-new') {
      setIsAddRestaurantOpen(true);
      e.target.value = ''; // Reset the select
    } else if (e.target.value) {
      setSelectedContactIds([]); // Reset contacts when restaurant changes
      const res = await getRestaurant(e.target.value);
      if (res.data) {
        setSelectedRestaurant(res.data);
      } else {
        setSelectedRestaurant(null);
      }
    } else {
      setSelectedRestaurant(null);
      setSelectedContactIds([]);
    }
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl mb-1 text-[#4F4F4F]">Start New Quote</h1>
          <p className="text-[#4F4F4F] text-sm">
            Create a new quote for a restaurant customer
          </p>
        </div>

        {/* Upload or Paste Menu — moved to top */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-1">Upload Menu</h2>
          <p className="text-gray-500 text-sm mb-4 font-bold">
            PDF Image or screenshot taken from Epo.txt Device
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.pdf,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {hasCamera && (
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isExtracting}
              className="w-full flex items-center justify-center gap-3 mb-4 py-4 rounded-lg border-2 border-[#F2993D] bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <Camera className="w-6 h-6 text-[#F2993D]" />
              <span className="text-sm font-medium text-[#F2993D]">Take Photo of Menu</span>
            </button>
          )}

          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center mb-4 cursor-pointer transition-colors ${
              isDragging
                ? 'border-[#F2993D] bg-orange-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isExtracting ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#F2993D]" />
                <p className="text-sm text-gray-600">Reading menu...</p>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm mb-1">Drag files here or click to browse</p>
                <p className="text-xs text-gray-500 font-bold">PDF, image, CSV, or text file</p>
              </>
            )}
          </div>

          {extractError && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              {extractError}
            </div>
          )}

          <button
            type="button"
            onClick={() => setSkipIngredientReview(!skipIngredientReview)}
            className={`flex items-center gap-2 mt-3 mb-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full justify-center ${
              skipIngredientReview
                ? 'bg-[#F2993D] text-white shadow-sm'
                : 'bg-[#F2993D]/10 text-[#F2993D] border-2 border-[#F2993D] hover:bg-[#F2993D]/20'
            }`}
          >
            {skipIngredientReview ? '✓ ' : ''}Skip ingredient review — go straight to matching
          </button>

          <div className="flex justify-between items-center text-xs text-gray-500 font-bold">
            {uploadedFile ? (
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
              </span>
            ) : (
              <span>NO FILE PICKED</span>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">OR USE A MENU URL</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Menu URLs */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg">Menu URLs</h2>
              <Button variant="ghost" size="sm" className="text-blue-600">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <div className="flex items-start gap-2">

                <div className="flex-1">
                  <h3 className="text-sm mb-1">
                    Restaurant Type - Auto-Populate Quote
                  </h3>
                  <p className="text-xs text-gray-600 mb-2 font-bold">
                    Select a restaurant type to auto-populate the quote with relevant
                    catalog items
                  </p>
                  <select
                    className="w-48 px-3 py-1.5 border border-blue-200 rounded-md bg-white text-xs"
                    value={selectedStockType}
                    onChange={(e) => setSelectedStockType(e.target.value)}
                  >
                    <option value="">Select restaurant type</option>
                    {(() => {
                      const types = [...new Set(stockQuotes.map(sq => sq.restaurant_type).filter(Boolean))];
                      return types.length > 0
                        ? types.map(t => <option key={t} value={t!}>{t}</option>)
                        : ['Bar/Grill', 'Spanish', 'Italian', 'Brewery', 'Coffee Shop'].map(t =>
                            <option key={t} value={t}>{t}</option>
                          );
                    })()}
                  </select>
                  <Button
                    size="sm"
                    className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    disabled={!selectedStockType || generatingStock}
                    onClick={async () => {
                      const match = stockQuotes.find(sq => sq.restaurant_type === selectedStockType);
                      if (!match) return;
                      setGeneratingStock(true);
                      const res = await generateFromStockQuote(match.id);
                      setGeneratingStock(false);
                      if (res.data) {
                        navigate('/map-ingredients', { state: { menuId: res.data.menu_id, isOpenQuote: isQuoteOpened } });
                      }
                    }}
                  >
                    {generatingStock ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Make Stock Quote
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="menu-name" className="text-sm mb-2 block">
                  Menu URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="menu-name"
                    type="text"
                    placeholder="www.example.com/menu"
                    className="bg-gray-50 flex-1"
                    value={menuUrl}
                    onChange={(e) => setMenuUrl(e.target.value)}
                  />
                  <Button
                    className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white shrink-0"
                    onClick={handleUrlExtract}
                    disabled={!menuUrl.trim() || isExtracting}
                  >
                    {isExtracting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Fetch'
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm mb-2 block">Click to Link from Customer Profile</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    if (selectedRestaurant?.website) {
                      setMenuUrl(selectedRestaurant.website);
                    }
                  }}
                  disabled={!selectedRestaurant}
                  title={!selectedRestaurant ? "Select a customer first" : "Use customer's website"}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  {selectedRestaurant ? 'Link Profile URL' : 'Select Customer First'}
                </Button>
              </div>
            </div>

            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">OR PASTE TEXT</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div className="mt-2">
              <Label className="text-sm mb-2 block">Paste menu text here...</Label>
              <Textarea
                className="bg-gray-50 h-32"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                maxLength={5000}
              />
              <div className="text-right mt-1">
                <span className="text-xs text-gray-500">
                  {pasteText.length} / 5,000 characters
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">CLICK HERE TO PREVIEW MENU</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Parse Button Moved Here */}
            <div className="flex justify-center gap-3 mt-2">
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white px-8"
                onClick={handleParseMenu}
                disabled={isExtracting || (!pasteText && !uploadedFile && !menuUrl)}
              >
                {isExtracting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reading menu...</>
                ) : (
                  'Parse Menu'
                )}
              </Button>
            </div>
          </div>

          {/* Menu Preview */}
          <div>
            <h2 className="text-lg mb-1 mt-6">Menu Preview</h2>
            <p className="text-gray-500 text-sm mb-4 font-bold">See menu on the preview (You can manually add additional dishes or components in the next step).</p>

            <div className="border border-gray-200 rounded-lg p-6 min-h-[200px] bg-gray-50 text-left whitespace-pre-wrap">
               {isExtracting ? (
                   <div className="text-center pt-10 flex flex-col items-center gap-3">
                     <Loader2 className="w-6 h-6 animate-spin text-[#F2993D]" />
                     <p className="text-gray-500 text-sm">Reading menu from {uploadedFile ? 'file' : 'URL'}...</p>
                   </div>
               ) : menuPreviewText ? (
                   <p className="text-sm text-[#2A2A2A]">{menuPreviewText}</p>
               ) : (
                   <div className="text-center pt-10">
                        <p className="text-gray-400 font-bold">Your parsed menu will appear here</p>
                   </div>
               )}
            </div>

            {/* Service Busy Banner */}
            {serviceBusy && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                <p className="text-sm text-amber-800">
                  Our menu analysis service is temporarily busy. This usually resolves in a few seconds — please try again.
                </p>
                <Button
                  onClick={handleRetry}
                  size="sm"
                  className="ml-4 bg-[#F2993D] hover:bg-[#E08A2E] text-white flex-shrink-0"
                >
                  <RefreshCw size={14} className="mr-1" /> Try Again
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                <Button
                    className="w-full sm:w-auto bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                    onClick={handleSkipToExport}
                    disabled={isCreatingQuote || (!pasteText && !menuPreviewText)}
                >
                    {isCreatingQuote ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Building quote...
                      </>
                    ) : (
                      'Skip To Quote'
                    )}
                </Button>
                <Button
                    className="w-full sm:w-auto bg-[#A5CFDD] hover:bg-[#8db9c9] text-[#2A2A2A]"
                    onClick={handleContinueToQuoteBuilder}
                    disabled={isCreatingQuote}
                >
                    {isCreatingQuote ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {['Reading menu…', 'Extracting ingredients…', 'Matching to catalog…', 'Building your quote…', 'Almost there…', 'So close…'][loadingPhase]}
                      </>
                    ) : (
                      'Match Ingredients to Catalog'
                    )}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                      setMenuPreviewText('');
                      setPasteText('');
                      setUploadedFile(null);
                      setMenuUrl('');
                      setExtractError(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="w-full sm:w-auto text-sm"
                >
                    Clear Results
                </Button>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          {isDemoMode() ? (
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg">Customer Information</h2>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                Open Quote — no restaurant selected
              </span>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg">Customer Information</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 text-sm"
                  onClick={() => setIsQuoteOpened(!isQuoteOpened)}
                >
                  {isQuoteOpened ? 'Back to Customer Info' : 'Open quote'}
                </Button>
              </div>
              <p className="text-gray-500 text-sm mb-4 font-bold">
                For customer intake and information
              </p>
            </>
          )}
          {isDemoMode() && (
            <div className="text-center py-6 text-gray-400">
              <p className="text-sm">Demo mode — quotes are not tied to a customer account.</p>
            </div>
          )}

          {!isDemoMode() && (<><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="restaurant" className="text-sm mb-2 block">Customer</Label>
              <div className="relative">
                <select
                  id="restaurant"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm appearance-none pr-8"
                  onChange={handleRestaurantChange}
                >
                  <option value="">Select a customer</option>
                  {restaurants.map(restaurant => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                  <option value="add-new" className="text-[#F2993D]">+ Add new</option>
                </select>
                <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 font-bold" />
              </div>
            </div>
            <div>
              <Label htmlFor="group" className="text-sm mb-2 block">Customer Group</Label>
              <div className="relative">
                <select
                  id="group"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm appearance-none pr-8"
                  onChange={(e) => {
                    if (e.target.value === 'add-new') {
                      setIsAddGroupOpen(true);
                      e.target.value = ''; // Reset the select
                    }
                  }}
                >
                  <option>Select a group</option>
                  <option value="add-new" className="text-[#F2993D]">+ Add new</option>
                </select>
                <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 font-bold" />
              </div>
            </div>
          </div>

          {/* Contacts Section */}
          {selectedRestaurant && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium text-gray-700">
                  Select Contacts for Quote
                </Label>
                <Button variant="ghost" size="sm" className="h-6 text-[#F2993D] hover:text-[#E08935] hover:bg-orange-50 text-xs px-2 border border-[#F2993D]"
                  onClick={() => setIsAddContactOpen(true)}
                >
                  <PlusCircle className="w-3 h-3 mr-1" />
                  Add Contact
                </Button>
              </div>
              
              <div className="space-y-3">
                {selectedRestaurant.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start space-x-3 bg-white p-3 rounded border border-gray-100 shadow-sm">
                    <Checkbox 
                      id={contact.id}
                      checked={selectedContactIds.includes(contact.id)}
                      onCheckedChange={() => handleContactToggle(contact.id)}
                      className="mt-1 border-gray-300 data-[state=checked]:bg-[#7FAEC2] data-[state=checked]:border-[#7FAEC2]"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <label
                          htmlFor={contact.id}
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {contact.first_name} {contact.last_name}
                        </label>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 font-bold">
                          {contact.role}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 grid grid-cols-2 gap-2 font-bold">
                        <span>{contact.email}</span>
                        <span>{contact.phone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {selectedRestaurant ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Restaurant Name
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Address
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.address_line_1 || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      City
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      State
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.state || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      ZIP Code
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.zip || '-'}</p>
                  </div>
                  {selectedRestaurant.website && (
                    <div>
                      <Label className="text-sm mb-2 block text-gray-600 font-bold">
                        Website
                      </Label>
                      <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.website}</p>
                    </div>
                  )}
                </div>

                {selectedRestaurant.phone && (
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Phone
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.phone}</p>
                  </div>
                )}

                {selectedRestaurant.restaurant_group && (
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Restaurant Group
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.restaurant_group.name}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm font-bold">{isQuoteOpened ? 'Open Quote - No Customer Details Needed' : 'Select a customer to view details'}</p>
              </div>
            )}
          </div>
          </>)}
        </div>

        {/* Upload Catalog */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-1">Catalog</h2>
          <p className="text-gray-500 text-sm mb-4">
            Upload your distributor's product catalog. Accepted formats: CSV, XLS, XLSX.
          </p>

          {/* Active / Recent Catalogs */}
          <div className="mb-4">
            {isGuest && catalogs.length === 0 ? (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-[#2A2A2A]">Demo Catalog Active</p>
                    <p className="text-xs text-gray-500">Upload your own catalog below, or continue with the demo</p>
                  </div>
                </div>
              </div>
            ) : catalogLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading catalogs...
              </div>
            ) : catalogs.length > 0 ? (
              <div className="space-y-2">
                {catalogs.filter(c => c.status === 'active').slice(0, 1).map(cat => (
                  <div key={cat.id} className="border border-green-200 rounded-lg p-4 flex items-center justify-between bg-green-50">
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 text-lg">&#10003;</span>
                      <div>
                        <p className="text-sm font-medium text-[#2A2A2A]">
                          Active Catalog: {cleanCatalogName(cat)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cat.row_count.toLocaleString()} products &middot; uploaded {new Date(cat.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCatalogUploadExpanded(!catalogUploadExpanded)}
                      className="text-xs text-[#7FAEC2] hover:underline"
                    >
                      {catalogUploadExpanded ? 'Hide' : 'Upload New Catalog'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic py-2">No catalogs uploaded yet</p>
            )}
          </div>

          {/* Upload New Catalog — collapsed if active catalog exists */}
          <div className={catalogs.some(c => c.status === 'active') && !catalogUploadExpanded ? 'hidden' : ''}>
            <h3 className="text-sm mb-2">Upload {catalogs.length > 0 ? 'New' : 'Your'} Catalog</h3>
            <input
              ref={catalogFileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCatalogFileSelect(file);
                e.target.value = '';
              }}
            />
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDraggingCatalog
                  ? 'border-[#F2993D] bg-orange-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
              onClick={() => !catalogUploading && catalogFileInputRef.current?.click()}
              onDragOver={handleCatalogDragOver}
              onDragLeave={handleCatalogDragLeave}
              onDrop={handleCatalogDrop}
            >
              {catalogUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#F2993D]" />
                  <p className="text-sm text-gray-500">Uploading and processing catalog...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Drag a file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">
                    CSV or Excel (.csv, .xlsx, .xls)
                  </p>
                </>
              )}
            </div>
            {catalogUploadResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                catalogUploadResult.isError
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {catalogUploadResult.message}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Restaurant Drawer */}
      {isAddRestaurantOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsAddRestaurantOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl text-[#4F4F4F]">Add New Restaurant</h2>
              <button
                onClick={() => setIsAddRestaurantOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="new-restaurant-name" className="text-sm mb-2 block">
                  Restaurant Name *
                </Label>
                <Input
                  id="new-restaurant-name"
                  type="text"
                  placeholder="Enter restaurant name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="new-business-name" className="text-sm mb-2 block">
                  Business Name
                </Label>
                <Input
                  id="new-business-name"
                  type="text"
                  placeholder="Enter business name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="new-restaurant-group" className="text-sm mb-2 block">
                  Restaurant Group
                </Label>
                <select
                  id="new-restaurant-group"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                  onChange={(e) => {
                    if (e.target.value === 'add-new') {
                      setIsAddGroupOpen(true);
                      e.target.value = ''; // Reset the select
                    }
                  }}
                >
                  <option>Select a group</option>
                  <option>Premium Dining Partners</option>
                  <option>Local Restaurant Network</option>
                  <option>Casual Dining Collective</option>
                  <option>Independent Restaurants</option>
                  <option>Chain Restaurant Group</option>
                  <option value="add-new" className="text-[#F2993D]">+ Add new Group</option>
                </select>
              </div>

              <div>
                <Label htmlFor="new-contact-name" className="text-sm mb-2 block">
                  Contact Name
                </Label>
                <Input
                  id="new-contact-name"
                  type="text"
                  placeholder="Enter contact name"
                  className="bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-email" className="text-sm mb-2 block">
                    Email *
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="email@example.com"
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="new-phone" className="text-sm mb-2 block">
                    Phone
                  </Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    placeholder="(555) 555-5555"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="new-street-address" className="text-sm mb-2 block">
                  Street Address
                </Label>
                <Input
                  id="new-street-address"
                  type="text"
                  placeholder="123 Main St"
                  className="bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="new-city" className="text-sm mb-2 block">
                    City
                  </Label>
                  <Input
                    id="new-city"
                    type="text"
                    placeholder="City"
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="new-state" className="text-sm mb-2 block">
                    State
                  </Label>
                  <Input
                    id="new-state"
                    type="text"
                    placeholder="State"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-zip" className="text-sm mb-2 block">
                    ZIP Code
                  </Label>
                  <Input
                    id="new-zip"
                    type="text"
                    placeholder="12345"
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="new-country" className="text-sm mb-2 block">
                    Country
                  </Label>
                  <Input
                    id="new-country"
                    type="text"
                    placeholder="USA"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="new-website" className="text-sm mb-2 block">
                  Website
                </Label>
                <Input
                  id="new-website"
                  type="text"
                  placeholder="www.example.com"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="new-restaurant-type" className="text-sm mb-2 block">
                  Restaurant Type
                </Label>
                <select
                  id="new-restaurant-type"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                >
                  <option>Select type</option>
                  <option>Fine Dining</option>
                  <option>Casual Dining</option>
                  <option>Fast Casual</option>
                  <option>Cafe</option>
                  <option>Bar & Grill</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="new-cuisine" className="text-sm mb-2 block">
                  Cuisine Type
                </Label>
                <Input
                  id="new-cuisine"
                  type="text"
                  placeholder="e.g., Italian, Japanese, American"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="new-notes" className="text-sm mb-2 block">
                  Notes
                </Label>
                <Textarea
                  id="new-notes"
                  placeholder="Additional notes about the restaurant"
                  className="bg-gray-50 h-24"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAddRestaurantOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                onClick={() => {
                  // Handle save logic here
                  setIsAddRestaurantOpen(false);
                }}
              >
                Save Restaurant
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add Contact Drawer */}
      {isAddContactOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsAddContactOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl text-[#4F4F4F]">Add New Contact</h2>
              <button
                onClick={() => setIsAddContactOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="contact-name" className="text-sm mb-2 block">
                  Name *
                </Label>
                <Input
                  id="contact-name"
                  type="text"
                  placeholder="Enter contact name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="contact-email" className="text-sm mb-2 block">
                  Contact Email *
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="email@example.com"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="contact-phone" className="text-sm mb-2 block">
                  Contact Phone
                </Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="contact-position" className="text-sm mb-2 block">
                  Position
                </Label>
                <Input
                  id="contact-position"
                  type="text"
                  placeholder="e.g., Head Chef, Manager, Owner"
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAddContactOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                onClick={() => {
                  // Handle save logic here
                  setIsAddContactOpen(false);
                }}
              >
                Save Contact
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add Group Drawer */}
      {isAddGroupOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsAddGroupOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl text-[#4F4F4F]">Add New Restaurant Group</h2>
              <button
                onClick={() => setIsAddGroupOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="group-name" className="text-sm mb-2 block">
                  Group Name *
                </Label>
                <Input
                  id="group-name"
                  type="text"
                  placeholder="Enter group name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-primary-contact-name" className="text-sm mb-2 block">
                  Primary Contact Name *
                </Label>
                <Input
                  id="group-primary-contact-name"
                  type="text"
                  placeholder="Enter primary contact name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-primary-contact-email" className="text-sm mb-2 block">
                  Primary Contact Email *
                </Label>
                <Input
                  id="group-primary-contact-email"
                  type="email"
                  placeholder="email@example.com"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-primary-contact-phone" className="text-sm mb-2 block">
                  Primary Contact Phone
                </Label>
                <Input
                  id="group-primary-contact-phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-office-address" className="text-sm mb-2 block">
                  Office Address *
                </Label>
                <Input
                  id="group-office-address"
                  type="text"
                  placeholder="123 Main St, City, State, ZIP"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-restaurant-types" className="text-sm mb-2 block">
                  Restaurant Types
                </Label>
                <select
                  id="group-restaurant-types"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                >
                  <option>Select type</option>
                  <option>Restaurant</option>
                  <option>Hotel</option>
                  <option>Catering</option>
                  <option>Venue</option>
                  <option>Healthcare</option>
                  <option>Multi-Unit</option>
                </select>
              </div>

              <div>
                <Label htmlFor="group-internal-notes" className="text-sm mb-2 block">
                  Internal Rep Notes
                </Label>
                <Textarea
                  id="group-internal-notes"
                  placeholder="Internal notes for sales reps"
                  className="bg-gray-50 h-24"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAddGroupOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                onClick={() => {
                  // Handle save logic here
                  setIsAddGroupOpen(false);
                }}
              >
                Save Group
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Upgrade Drawer */}
      <UpgradeDrawer
        isOpen={isUpgradeDrawerOpen}
        onClose={() => setIsUpgradeDrawerOpen(false)}
      />
    </div>
  );
}