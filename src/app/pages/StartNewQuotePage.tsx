import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Upload, Link as LinkIcon, X, Loader2, FileText, Camera, RefreshCw, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Checkbox } from '../components/ui/checkbox';
import { useUser } from '../contexts/UserContext';
import { UpgradeDrawer } from '../components/UpgradeDrawer';
import { createMenu, createGuestQuote, extractMenuText, getCatalogs, uploadCatalogFile, getRestaurants, getRestaurant, getStockQuotes, generateFromStockQuote, getDemoDistributor } from '../services/api';
import type { CatalogSummary, RestaurantSummary, RestaurantDetail, StockQuoteResponse } from '../services/api';
import { isDemoMode, isLiquorDemo, demoType } from '../utils/demoMode';

// --- Types for ingredient editing ---
interface ParsedIngredient {
  id: string;
  name: string;
  confidence: number;
}

interface ParsedDish {
  id: string;
  name: string;
  ingredients: ParsedIngredient[];
}

// --- Simple client-side menu parser ---
function parseMenuText(text: string): ParsedDish[] {
  if (!text.trim()) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const dishes: ParsedDish[] = [];
  let currentDish: ParsedDish | null = null;
  let dishCounter = 0;
  let ingCounter = 0;

  for (const line of lines) {
    // Heuristic: lines that are short, don't contain commas, and look like headers → dish names
    const isHeader = line.length < 60 && !line.includes(',') && (
      /^[A-Z]/.test(line) || /^\d+[\.\)]\s/.test(line) || line.endsWith(':')
    );

    if (isHeader && line.length < 50) {
      dishCounter++;
      currentDish = {
        id: `dish-${dishCounter}`,
        name: line.replace(/[:]+$/, '').trim(),
        ingredients: [],
      };
      dishes.push(currentDish);
    } else {
      if (!currentDish) {
        dishCounter++;
        currentDish = {
          id: `dish-${dishCounter}`,
          name: 'Menu Items',
          ingredients: [],
        };
        dishes.push(currentDish);
      }
      // Split by commas or treat whole line as ingredient
      const parts = line.includes(',') ? line.split(',') : [line];
      for (const part of parts) {
        const name = part.trim().replace(/^[-•*]\s*/, '');
        if (name.length > 1 && name.length < 80) {
          ingCounter++;
          currentDish.ingredients.push({
            id: `ing-${ingCounter}`,
            name,
            confidence: 0.85,
          });
        }
      }
    }
  }
  return dishes;
}

function reconstructText(dishes: ParsedDish[]): string {
  return dishes.map(dish => {
    const header = dish.name !== 'Menu Items' ? dish.name + '\n' : '';
    const ings = dish.ingredients.map(i => i.name).join(', ');
    return header + ings;
  }).join('\n\n');
}

let nextIngId = 1000;

export function StartNewQuotePage() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [skipIngredientReview, setSkipIngredientReview] = useState(true);

  // Catalog state
  const [catalogs, setCatalogs] = useState<CatalogSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogUploading, setCatalogUploading] = useState(false);
  const [catalogUploadResult, setCatalogUploadResult] = useState<{ message: string; isError: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingCatalog, setIsDraggingCatalog] = useState(false);
  const catalogFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [catalogUploadExpanded, setCatalogUploadExpanded] = useState(
    !!(location.state as any)?.expandCatalog
  );

  // Stock quotes
  const [stockQuotes, setStockQuotes] = useState<StockQuoteResponse[]>([]);
  const [selectedStockType, setSelectedStockType] = useState('');
  const [generatingStock, setGeneratingStock] = useState(false);

  // Parsed ingredients for right panel
  const [parsedDishes, setParsedDishes] = useState<ParsedDish[]>([]);
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingToDish, setAddingToDish] = useState<string | null>(null);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [isExtractingPreview, setIsExtractingPreview] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Liquor demo state
  const liquorDemo = isLiquorDemo();
  const [demoDistributorId, setDemoDistributorId] = useState<string | null>(null);

  // Resolve liquor demo distributor on mount
  useEffect(() => {
    if (liquorDemo) {
      getDemoDistributor('liquor').then(res => {
        if (res.data) setDemoDistributorId(res.data.distributor_id);
      });
    }
  }, [liquorDemo]);

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

  function cleanCatalogName(cat: CatalogSummary): string {
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

  // Loading phases
  useEffect(() => {
    if (!isCreatingQuote) { setLoadingPhase(0); return; }
    const delays = [4000, 4000, 4000, 4000, 30000, 0];
    let current = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const advance = () => {
      if (current < 5) {
        current++;
        setLoadingPhase(current);
        if (delays[current] > 0) timeout = setTimeout(advance, delays[current]);
      }
    };
    timeout = setTimeout(advance, delays[0]);
    return () => clearTimeout(timeout);
  }, [isCreatingQuote]);

  // Load catalogs, restaurants, stock quotes on mount
  useEffect(() => {
    const token = localStorage.getItem('quoteme_token');
    if (!token) return;
    setCatalogLoading(true);
    getCatalogs().then(res => { if (res.data) setCatalogs(res.data); setCatalogLoading(false); });
    setRestaurantsLoading(true);
    getRestaurants().then(res => { if (res.data) setRestaurants(res.data); setRestaurantsLoading(false); });
    getStockQuotes().then(res => { if (res.data) setStockQuotes(res.data); });
  }, []);

  // Auto-extraction: debounce paste text → parse into dishes/ingredients
  useEffect(() => {
    if (!pasteText.trim()) {
      setParsedDishes([]);
      return;
    }
    setIsExtractingPreview(true);
    const timer = setTimeout(() => {
      const stripped = stripPrices(pasteText);
      setMenuPreviewText(stripped);
      setParsedDishes(parseMenuText(stripped));
      setIsExtractingPreview(false);
    }, 1500);
    return () => { clearTimeout(timer); setIsExtractingPreview(false); };
  }, [pasteText]);

  // --- Handlers ---

  const stripPrices = (text: string): string => {
    return text
      .replace(/\$\d+(?:\.\d{1,2})?/g, '')
      .replace(/(?<=\s|^)\d{1,3}\.\d{2}(?=\s|$)/gm, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/^\s+$/gm, '')
      .trim();
  };

  const handleFileSelect = (file: File) => {
    if (menuPreviewText && !confirm('You have a menu in progress. Replace it with this new file?')) return;
    setUploadedFile(file);
    setExtractError(null);
    // Create image preview URL for image files
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    if (file.type.startsWith('image/')) {
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImagePreviewUrl(null);
    }
    const ext = file.name.toLowerCase();
    if (ext.endsWith('.csv') || ext.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setPasteText(text);
        const stripped = stripPrices(text);
        setMenuPreviewText(stripped);
        setParsedDishes(parseMenuText(stripped));
      };
      reader.readAsText(file);
    } else {
      handleFileExtract(file);
    }
  };

  async function handleFileExtract(file: File) {
    setIsExtracting(true);
    setExtractError(null);
    setIsExtractingPreview(true);
    try {
      const res = await extractMenuText({ file });
      if (res.error) {
        setExtractError(isServiceBusyError(res.error)
          ? 'Our menu analysis service is temporarily busy. Please try again in a few seconds.'
          : res.error);
      } else if (res.data?.text) {
        const stripped = stripPrices(res.data.text);
        setPasteText(res.data.text);
        setMenuPreviewText(stripped);
        setParsedDishes(parseMenuText(stripped));
      }
    } catch (e: any) {
      setExtractError(e.message || 'Failed to extract text');
    } finally {
      setIsExtracting(false);
      setIsExtractingPreview(false);
    }
  }

  async function handleUrlExtract() {
    if (!menuUrl.trim()) return;
    setIsExtracting(true);
    setExtractError(null);
    setIsExtractingPreview(true);
    try {
      let url = menuUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
      const res = await extractMenuText({ url });
      if (res.error) {
        setExtractError(isServiceBusyError(res.error)
          ? 'Our menu analysis service is temporarily busy. Please try again in a few seconds.'
          : res.error);
      } else if (res.data?.text) {
        const stripped = stripPrices(res.data.text);
        setPasteText(res.data.text);
        setMenuPreviewText(stripped);
        setParsedDishes(parseMenuText(stripped));
      }
    } catch (e: any) {
      setExtractError(e.message || 'Failed to extract text from URL');
    } finally {
      setIsExtracting(false);
      setIsExtractingPreview(false);
    }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
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

  // Catalog upload
  const handleCatalogFileSelect = async (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      setCatalogUploadResult({ message: 'Unsupported file type. Please upload a CSV or Excel file.', isError: true });
      return;
    }
    setCatalogUploading(true);
    setCatalogUploadResult(null);
    if (isGuest && !localStorage.getItem('quoteme_guest_token')) await initGuestSession();
    const res = await uploadCatalogFile(file);
    if (res.error) {
      setCatalogUploadResult({ message: res.error, isError: true });
    } else if (res.data) {
      setCatalogUploadResult({ message: res.data.message, isError: false });
      if (!isGuest) {
        const listRes = await getCatalogs();
        if (listRes.data) setCatalogs(listRes.data);
      } else {
        setCatalogs([{ id: res.data.id, status: 'active', row_count: res.data.item_count, created_at: new Date().toISOString() } as CatalogSummary]);
      }
    }
    setCatalogUploading(false);
  };

  const handleCatalogDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingCatalog(true); };
  const handleCatalogDragLeave = () => setIsDraggingCatalog(false);
  const handleCatalogDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingCatalog(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCatalogFileSelect(file);
  };

  // Ingredient editing
  const handleRemoveIngredient = (dishId: string, ingId: string) => {
    setParsedDishes(prev => prev.map(d =>
      d.id === dishId ? { ...d, ingredients: d.ingredients.filter(i => i.id !== ingId) } : d
    ));
  };

  const handleStartEdit = (ingId: string, name: string) => {
    setEditingIngredient(ingId);
    setEditValue(name);
  };

  const handleSaveEdit = (dishId: string, ingId: string) => {
    if (!editValue.trim()) return;
    setParsedDishes(prev => prev.map(d =>
      d.id === dishId ? {
        ...d,
        ingredients: d.ingredients.map(i => i.id === ingId ? { ...i, name: editValue.trim() } : i)
      } : d
    ));
    setEditingIngredient(null);
    setEditValue('');
  };

  const handleAddIngredient = (dishId: string) => {
    if (!newIngredientName.trim()) return;
    nextIngId++;
    setParsedDishes(prev => prev.map(d =>
      d.id === dishId ? {
        ...d,
        ingredients: [...d.ingredients, { id: `ing-new-${nextIngId}`, name: newIngredientName.trim(), confidence: 0.85 }]
      } : d
    ));
    setNewIngredientName('');
    setAddingToDish(null);
  };

  // Quote creation
  const handleContinueToQuoteBuilder = async () => {
    const menuText = parsedDishes.length > 0 ? reconstructText(parsedDishes) : (pasteText || menuPreviewText);
    if (!menuText) { setError('Please paste or parse menu text before continuing.'); return; }
    if (!hasQuotesRemaining()) { setIsUpgradeDrawerOpen(true); return; }

    setIsCreatingQuote(true);
    setServiceBusy(false);
    setLastAction('match');
    setError(null);
    try {
      if (profile.isGuest || localStorage.getItem('quoteme_token') === null) {
        if (!localStorage.getItem('quoteme_guest_token')) await initGuestSession();
        if (!localStorage.getItem('quoteme_guest_token')) {
          setError('Failed to start guest session. Please try again.');
          setIsCreatingQuote(false);
          return;
        }
        const payload = { raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' };
        const distId = demoDistributorId || undefined;
        let response = await createGuestQuote(payload, distId);
        if (response.error && (response.error.includes('401') || response.error.includes('expired') || response.error.includes('not found') || response.error.includes('Session'))) {
          localStorage.removeItem('quoteme_guest_token');
          await initGuestSession();
          if (!localStorage.getItem('quoteme_guest_token')) {
            setError('Failed to start guest session. Please try again.');
            setIsCreatingQuote(false);
            return;
          }
          response = await createGuestQuote(payload, distId);
        }
        if (response.error) {
          if (isServiceBusyError(response.error)) { setServiceBusy(true); return; }
          setError(`Failed to create quote: ${response.error}`);
          return;
        }
        if (response.data) {
          incrementQuoteCount();
          navigate('/map-ingredients', {
            state: { quoteId: response.data.quote_id, menuId: response.data.menu_id, isOpenQuote: isQuoteOpened }
          });
        }
      } else {
        const response = await createMenu({ raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' });
        if (response.error) {
          if (isServiceBusyError(response.error)) { setServiceBusy(true); return; }
          setError(`Failed to create quote: ${response.error}`);
          return;
        }
        if (response.data) {
          incrementQuoteCount();
          navigate('/map-ingredients', {
            state: { quoteId: response.data.quote_id, menuId: response.data.menu_id, isOpenQuote: isQuoteOpened }
          });
        }
      }
    } catch (error) {
      setError('Failed to create quote. Please try again.');
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleSkipToExport = async () => {
    const menuText = parsedDishes.length > 0 ? reconstructText(parsedDishes) : (pasteText || menuPreviewText);
    if (!menuText) { setError('Please paste or parse menu text before skipping.'); return; }
    if (!hasQuotesRemaining()) { setIsUpgradeDrawerOpen(true); return; }

    setIsCreatingQuote(true);
    setServiceBusy(false);
    setLastAction('skip');
    setError(null);
    try {
      if (profile.isGuest || localStorage.getItem('quoteme_token') === null) {
        if (!localStorage.getItem('quoteme_guest_token')) await initGuestSession();
        if (!localStorage.getItem('quoteme_guest_token')) {
          setError('Failed to start guest session. Please try again.');
          setIsCreatingQuote(false);
          return;
        }
        const skipDistId = demoDistributorId || undefined;
        let response = await createGuestQuote({ raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' }, skipDistId);
        if (response.error && (response.error.includes('401') || response.error.includes('expired') || response.error.includes('not found') || response.error.includes('Session'))) {
          localStorage.removeItem('quoteme_guest_token');
          await initGuestSession();
          if (!localStorage.getItem('quoteme_guest_token')) {
            setError('Failed to start guest session. Please try again.');
            setIsCreatingQuote(false);
            return;
          }
          response = await createGuestQuote({ raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' }, skipDistId);
        }
        if (response.error) {
          if (isServiceBusyError(response.error)) { setServiceBusy(true); return; }
          setError(`Failed to create quote: ${response.error}`);
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
          setError(`Failed to create quote: ${response.error}`);
          return;
        }
        if (response.data) {
          incrementQuoteCount();
          navigate('/export-finalize', { state: { quoteId: response.data.quote_id, isOpenQuote: isQuoteOpened } });
        }
      }
    } catch (error) {
      setError('Failed to create quote. Please try again.');
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleRestaurantChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'add-new') {
      setIsAddRestaurantOpen(true);
      e.target.value = '';
    } else if (e.target.value) {
      const res = await getRestaurant(e.target.value);
      if (res.data) {
        setSelectedRestaurant(res.data);
        // Auto-select the contact when there's only one
        if (res.data.contacts.length === 1) {
          setSelectedContactIds([res.data.contacts[0].id]);
        } else {
          setSelectedContactIds([]);
        }
      } else {
        setSelectedRestaurant(null);
        setSelectedContactIds([]);
      }
    } else {
      setSelectedRestaurant(null);
      setSelectedContactIds([]);
    }
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    );
  };

  const handleClearResults = () => {
    setMenuPreviewText('');
    setPasteText('');
    setUploadedFile(null);
    setMenuUrl('');
    setExtractError(null);
    setParsedDishes([]);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confidence pill color
  const getConfidenceColor = (c: number) => {
    if (c >= 0.9) return 'bg-green-100 text-green-800 border-green-300';
    if (c >= 0.7) return 'bg-[#A5CFDD]/20 text-[#2A5F6F] border-[#A5CFDD]';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  // Loading overlay
  if (isCreatingQuote) {
    return (
      <div className="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#A5CFDD] mb-4" />
        <p className="text-lg font-medium text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {['Reading menu...', 'Extracting ingredients...', 'Matching to catalog...', 'Building your quote...', 'Almost there...', 'So close...'][loadingPhase]}
        </p>
        <p className="text-sm text-gray-400 mt-2">This usually takes 15-30 seconds</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {error && (
          <div className="mx-0 mt-0 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className="mb-8">
          <h1
            className="text-3xl md:text-4xl mb-2"
            style={{ fontFamily: "'Playfair Display', serif", color: '#A5CFDD' }}
          >
            {liquorDemo ? 'Start New Beverage Quote' : 'Start New Quote'}
          </h1>
          <p className="text-gray-600" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {liquorDemo ? 'Paste a drink menu, upload a photo, or type your list.' : 'Paste a menu, upload a photo, or type ingredients.'}
          </p>

          {/* Five-step guide — demo flow */}
          {isDemoMode() && (
            <div className="mt-4 bg-[#A5CFDD]/10 border border-[#A5CFDD]/30 rounded-lg px-5 py-4">
              <p className="text-xs font-semibold text-[#2A5F6F] mb-2 uppercase tracking-wide">How it works</p>
              <ol className="list-decimal list-inside text-sm text-[#2A2A2A] space-y-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <li>Drop in the restaurant's menu</li>
                <li>QuoteMe matches ingredients to your catalog</li>
                <li>Dial in the quote if needed</li>
                <li>Send the quote to the chef</li>
                <li>Turn the quote into the order guide</li>
              </ol>
            </div>
          )}
        </div>

        {/* ── Upload Zone ── */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.pdf,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }}
          />

          {/* Camera button — mobile only */}
          {hasCamera && (
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isExtracting}
              className="w-full flex items-center justify-center gap-3 mb-4 py-3 rounded-lg border-2 border-[#A5CFDD] bg-white hover:bg-[#A5CFDD]/10 transition-colors md:hidden"
            >
              <Camera className="w-5 h-5 text-[#A5CFDD]" />
              <span className="text-sm font-medium text-[#A5CFDD]">Take Photo of Menu</span>
            </button>
          )}

          {/* Drag/drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-[#7FAEC2] bg-[#A5CFDD]/10' : 'border-[#A5CFDD] hover:border-[#7FAEC2]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isExtracting ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#A5CFDD]" />
                <p className="text-sm text-gray-600">Reading menu...</p>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-[#A5CFDD] mx-auto mb-2" />
                <p className="text-sm text-gray-700 mb-1">Drag files here or click to browse</p>
                <p className="text-xs text-gray-400">PDF, image, CSV, or text file</p>
              </>
            )}
          </div>

          {uploadedFile && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
              <FileText className="w-3.5 h-3.5" />
              <span>{uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}

          {extractError && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3 mt-4">
              {extractError}
            </div>
          )}
        </div>


        {/* ── Restaurant Type + URL Row ── */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Restaurant Type */}
            <div className="flex-1">
              <Label className="text-sm mb-2 block text-gray-700 font-medium">
                Restaurant Type - Fill In Quote
              </Label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                  value={selectedStockType}
                  onChange={(e) => setSelectedStockType(e.target.value)}
                >
                  <option value="">Select restaurant type</option>
                  {(() => {
                    const types = [...new Set(stockQuotes.map(sq => sq.restaurant_type).filter(Boolean))];
                    const fallbackTypes = liquorDemo
                      ? ['Cocktail Bar', 'Wine Bar', 'Hotel Bar', 'Restaurant Bar Program', 'Nightclub']
                      : ['Bar/Grill', 'Spanish', 'Italian', 'Brewery', 'Coffee Shop'];
                    return types.length > 0
                      ? types.map(t => <option key={t} value={t!}>{t}</option>)
                      : fallbackTypes.map(t =>
                          <option key={t} value={t}>{t}</option>
                        );
                  })()}
                </select>
                <Button
                  className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white shrink-0"
                  disabled={!selectedStockType || generatingStock}
                  onClick={async () => {
                    const match = stockQuotes.find(sq => sq.restaurant_type === selectedStockType);
                    if (!match) return;
                    setGeneratingStock(true);
                    const res = await generateFromStockQuote(match.id);
                    setGeneratingStock(false);
                    if (res.data) navigate('/map-ingredients', { state: { menuId: res.data.menu_id, isOpenQuote: isQuoteOpened } });
                  }}
                >
                  {generatingStock ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Start Quote
                </Button>
              </div>
            </div>

            {/* Right: Menu URL */}
            <div className="flex-1">
              <Label className="text-sm mb-2 block text-gray-700 font-medium">Menu URL</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="www.example.com/menu"
                  className="bg-gray-50 flex-1"
                  value={menuUrl}
                  onChange={(e) => setMenuUrl(e.target.value)}
                />
                <Button
                  className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white shrink-0"
                  onClick={handleUrlExtract}
                  disabled={!menuUrl.trim() || isExtracting}
                >
                  {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                </Button>
              </div>
              <button
                className="text-xs text-[#A5CFDD] hover:text-[#7FAEC2] mt-1.5"
                onClick={() => {
                  if (selectedRestaurant?.website) setMenuUrl(selectedRestaurant.website);
                }}
                disabled={!selectedRestaurant}
              >
                Click to Link from Customer Profile
              </button>
            </div>
          </div>
        </div>

        {/* ── OR PASTE TEXT Divider ── */}
        <div className="relative flex py-4 items-center mb-6">
          <div className="flex-grow border-t border-gray-300" />
          <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wide font-medium">
            OR PASTE TEXT
          </span>
          <div className="flex-grow border-t border-gray-300" />
        </div>

        {/* ── Side-by-side Panels ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Left Panel — Menu Text (45%) */}
            <div className="w-full md:w-[45%] p-6 md:border-r border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Pencil className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Menu Text</h3>
              </div>
              {uploadedFile && !pasteText ? (
                <div className="border border-gray-200 rounded-lg min-h-[300px] bg-gray-50 flex flex-col items-center justify-center text-center overflow-hidden">
                  {imagePreviewUrl ? (
                    <div className="w-full">
                      <img
                        src={imagePreviewUrl}
                        alt="Menu preview"
                        className="w-full max-h-[280px] object-contain"
                      />
                      <div className="p-3 border-t border-gray-200 bg-white">
                        <p className="text-xs text-gray-500">{uploadedFile.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <FileText className="w-10 h-10 text-[#A5CFDD] mb-3 mx-auto" />
                      <p className="text-sm text-gray-600 font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  )}
                  {isExtracting && (
                    <div className="p-3 flex items-center gap-2 justify-center bg-white border-t border-gray-200 w-full">
                      <Loader2 className="w-4 h-4 animate-spin text-[#A5CFDD]" />
                      <span className="text-xs text-gray-500">Extracting text...</span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Textarea
                    className="bg-gray-50 min-h-[300px] resize-none text-sm"
                    placeholder="Paste or type your menu here..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    maxLength={5000}
                  />
                  <div className="text-right mt-1">
                    <span className="text-xs text-gray-400">
                      {pasteText.length} / 5,000 characters
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Right Panel — Extracted Ingredients (55%) */}
            <div className="w-full md:w-[55%] p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Extracted Ingredients</h3>

              {isExtractingPreview ? (
                /* Skeleton loading */
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4].map(j => (
                          <div key={j} className="h-7 bg-gray-100 rounded-full w-20" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : parsedDishes.length > 0 ? (
                <div className="space-y-5">
                  {parsedDishes.map(dish => (
                    <div key={dish.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-medium text-[#2A2A2A]">{dish.name}</h4>
                        <span className="text-xs text-gray-400">({dish.ingredients.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {dish.ingredients.map(ing => (
                          editingIngredient === ing.id ? (
                            <div key={ing.id} className="flex items-center gap-1">
                              <input
                                type="text"
                                className="text-xs border border-[#A5CFDD] rounded-full px-3 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-[#A5CFDD]"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(dish.id, ing.id);
                                  if (e.key === 'Escape') setEditingIngredient(null);
                                }}
                                autoFocus
                                onBlur={() => handleSaveEdit(dish.id, ing.id)}
                              />
                            </div>
                          ) : (
                            <span
                              key={ing.id}
                              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors hover:shadow-sm ${getConfidenceColor(ing.confidence)}`}
                              onClick={() => handleStartEdit(ing.id, ing.name)}
                            >
                              {ing.name}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveIngredient(dish.id, ing.id); }}
                                className="ml-0.5 hover:text-red-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )
                        ))}
                      </div>
                      {addingToDish === dish.id ? (
                        <div className="flex items-center gap-1 mt-2">
                          <input
                            type="text"
                            className="text-xs border border-gray-300 rounded-full px-3 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-[#A5CFDD]"
                            placeholder="Ingredient name"
                            value={newIngredientName}
                            onChange={(e) => setNewIngredientName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddIngredient(dish.id);
                              if (e.key === 'Escape') { setAddingToDish(null); setNewIngredientName(''); }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddIngredient(dish.id)}
                            className="text-xs text-[#A5CFDD] hover:text-[#7FAEC2] font-medium"
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingToDish(dish.id)}
                          className="text-xs text-[#A5CFDD] hover:text-[#7FAEC2] mt-2"
                        >
                          + Add ingredient
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[300px]">
                  <p className="text-gray-400 text-sm">Your parsed menu will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Service Busy Banner */}
        {serviceBusy && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              Our menu analysis service is temporarily busy. This usually resolves in a few seconds.
            </p>
            <Button
              onClick={handleRetry}
              size="sm"
              className="ml-4 bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white flex-shrink-0"
            >
              <RefreshCw size={14} className="mr-1" /> Try Again
            </Button>
          </div>
        )}

        {/* ── Action Bar ── */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex flex-col sm:flex-row justify-center gap-3 w-full">
            <Button
              className="bg-[#F9A64B] hover:bg-[#E8953A] text-white px-6"
              onClick={handleSkipToExport}
              disabled={isCreatingQuote || (!pasteText && !menuPreviewText)}
            >
              Skip to Quote
            </Button>
            <Button
              className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white px-8 py-2.5 text-base font-medium"
              onClick={handleContinueToQuoteBuilder}
              disabled={isCreatingQuote || (!pasteText && !menuPreviewText)}
            >
              Match to Catalog
            </Button>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
              onClick={handleClearResults}
            >
              Clear Results
            </Button>
          </div>
          <button
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={() => {
              setSkipIngredientReview(true);
              handleContinueToQuoteBuilder();
            }}
          >
            Skip review, match now
          </button>
        </div>

        {/* ── Customer Information ── */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          {isDemoMode() ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-semibold text-[#2A2A2A]">Customer Information</h2>
                <span className="text-xs px-3 py-1 bg-[#A5CFDD]/20 text-[#2A5F6F] rounded-full font-medium">
                  Open Quote - no restaurant selected
                </span>
              </div>
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">Demo Mode - Log in to tie quote to restaurant</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-[#2A2A2A]">Customer Information</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[#A5CFDD] border-[#A5CFDD] hover:bg-[#A5CFDD]/10 text-sm"
                  onClick={() => setIsQuoteOpened(!isQuoteOpened)}
                >
                  {isQuoteOpened ? 'Select Customer' : 'Open Quote'}
                </Button>
              </div>

              {isQuoteOpened ? (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-sm">Open Quote - No Customer Details Needed</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="restaurant" className="text-sm mb-2 block">Customer</Label>
                      <select
                        id="restaurant"
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                        onChange={handleRestaurantChange}
                      >
                        <option value="">Select a customer</option>
                        {restaurants.map(restaurant => (
                          <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                        ))}
                        <option value="add-new">+ Add new</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="group" className="text-sm mb-2 block">Customer Group</Label>
                      <select
                        id="group"
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                        onChange={(e) => {
                          if (e.target.value === 'add-new') { setIsAddGroupOpen(true); e.target.value = ''; }
                        }}
                      >
                        <option>Select a group</option>
                        <option value="add-new">+ Add new</option>
                      </select>
                    </div>
                  </div>

                  {/* Contacts */}
                  {selectedRestaurant && (
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <Label className="text-sm font-medium text-gray-700">Select Contacts for Quote</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[#A5CFDD] hover:bg-[#A5CFDD]/10 text-xs px-2 border border-[#A5CFDD]"
                          onClick={() => setIsAddContactOpen(true)}
                        >
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
                              className="mt-1 border-gray-300 data-[state=checked]:bg-[#A5CFDD] data-[state=checked]:border-[#A5CFDD]"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <label htmlFor={contact.id} className="text-sm font-medium text-gray-900 cursor-pointer">
                                  {contact.first_name} {contact.last_name}
                                </label>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                                  {contact.role}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-gray-500 grid grid-cols-2 gap-2">
                                <span>{contact.email}</span>
                                <span>{contact.phone}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected restaurant details */}
                  {selectedRestaurant ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1 block text-gray-500">Restaurant Name</Label>
                        <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block text-gray-500">Address</Label>
                        <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.address_line_1 || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block text-gray-500">City</Label>
                        <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.city || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block text-gray-500">State</Label>
                        <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.state || '-'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <p className="text-sm">Select a customer to view details</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ── Catalog Section ── */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-[#2A2A2A] mb-1">Catalog</h2>

          <div className="mb-4">
            {isGuest && catalogs.length === 0 ? (
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-lg">&#10003;</span>
                  <div>
                    <p className="text-sm font-medium text-[#2A2A2A]">Demo Catalog Active</p>
                    <p className="text-xs text-gray-500">Upload your own catalog below, or continue with the demo.</p>
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
                      className="text-xs text-[#A5CFDD] hover:text-[#7FAEC2] flex items-center gap-1"
                    >
                      {catalogUploadExpanded ? (
                        <>Hide <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Upload Custom Catalog <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic py-2">No catalogs uploaded yet</p>
            )}
          </div>

          {/* Upload section */}
          <div className={catalogs.some(c => c.status === 'active') && !catalogUploadExpanded ? 'hidden' : ''}>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {catalogs.length > 0 ? 'Upload New Catalog' : 'Upload Your Catalog'}
            </h3>
            <input
              ref={catalogFileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCatalogFileSelect(file); e.target.value = ''; }}
            />
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDraggingCatalog ? 'border-[#7FAEC2] bg-[#A5CFDD]/10' : 'border-[#A5CFDD] hover:border-[#7FAEC2]'
              }`}
              onClick={() => !catalogUploading && catalogFileInputRef.current?.click()}
              onDragOver={handleCatalogDragOver}
              onDragLeave={handleCatalogDragLeave}
              onDrop={handleCatalogDrop}
            >
              {catalogUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#A5CFDD]" />
                  <p className="text-sm text-gray-500">Uploading and processing catalog...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-[#A5CFDD] mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Drag a file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">CSV or Excel (.csv, .xlsx, .xls)</p>
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

      {/* ── Drawers ── */}

      {/* Add Restaurant Drawer */}
      {isAddRestaurantOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsAddRestaurantOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl text-[#2A2A2A]">Add New Restaurant</h2>
              <button onClick={() => setIsAddRestaurantOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="new-restaurant-name" className="text-sm mb-2 block">Restaurant Name *</Label>
                <Input id="new-restaurant-name" type="text" placeholder="Enter restaurant name" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="new-business-name" className="text-sm mb-2 block">Business Name</Label>
                <Input id="new-business-name" type="text" placeholder="Enter business name" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="new-restaurant-group" className="text-sm mb-2 block">Restaurant Group</Label>
                <select
                  id="new-restaurant-group"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                  onChange={(e) => { if (e.target.value === 'add-new') { setIsAddGroupOpen(true); e.target.value = ''; } }}
                >
                  <option>Select a group</option>
                  <option value="add-new">+ Add new Group</option>
                </select>
              </div>
              <div>
                <Label htmlFor="new-contact-name" className="text-sm mb-2 block">Contact Name</Label>
                <Input id="new-contact-name" type="text" placeholder="Enter contact name" className="bg-gray-50" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-email" className="text-sm mb-2 block">Email *</Label>
                  <Input id="new-email" type="email" placeholder="email@example.com" className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="new-phone" className="text-sm mb-2 block">Phone</Label>
                  <Input id="new-phone" type="tel" placeholder="(555) 555-5555" className="bg-gray-50" />
                </div>
              </div>
              <div>
                <Label htmlFor="new-street-address" className="text-sm mb-2 block">Street Address</Label>
                <Input id="new-street-address" type="text" placeholder="123 Main St" className="bg-gray-50" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="new-city" className="text-sm mb-2 block">City</Label>
                  <Input id="new-city" type="text" placeholder="City" className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="new-state" className="text-sm mb-2 block">State</Label>
                  <Input id="new-state" type="text" placeholder="State" className="bg-gray-50" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-zip" className="text-sm mb-2 block">ZIP Code</Label>
                  <Input id="new-zip" type="text" placeholder="12345" className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="new-country" className="text-sm mb-2 block">Country</Label>
                  <Input id="new-country" type="text" placeholder="USA" className="bg-gray-50" />
                </div>
              </div>
              <div>
                <Label htmlFor="new-website" className="text-sm mb-2 block">Website</Label>
                <Input id="new-website" type="text" placeholder="www.example.com" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="new-restaurant-type" className="text-sm mb-2 block">Restaurant Type</Label>
                <select id="new-restaurant-type" className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm">
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
                <Label htmlFor="new-cuisine" className="text-sm mb-2 block">Cuisine Type</Label>
                <Input id="new-cuisine" type="text" placeholder="e.g., Italian, Japanese, American" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="new-notes" className="text-sm mb-2 block">Notes</Label>
                <Textarea id="new-notes" placeholder="Additional notes about the restaurant" className="bg-gray-50 h-24" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsAddRestaurantOpen(false)}>Cancel</Button>
              <Button className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white" onClick={() => setIsAddRestaurantOpen(false)}>
                Save Restaurant
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add Contact Drawer */}
      {isAddContactOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsAddContactOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl text-[#2A2A2A]">Add New Contact</h2>
              <button onClick={() => setIsAddContactOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="contact-name" className="text-sm mb-2 block">Name *</Label>
                <Input id="contact-name" type="text" placeholder="Enter contact name" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="contact-email" className="text-sm mb-2 block">Contact Email *</Label>
                <Input id="contact-email" type="email" placeholder="email@example.com" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="contact-phone" className="text-sm mb-2 block">Contact Phone</Label>
                <Input id="contact-phone" type="tel" placeholder="(555) 555-5555" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="contact-position" className="text-sm mb-2 block">Position</Label>
                <Input id="contact-position" type="text" placeholder="e.g., Head Chef, Manager, Owner" className="bg-gray-50" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsAddContactOpen(false)}>Cancel</Button>
              <Button className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white" onClick={() => setIsAddContactOpen(false)}>
                Save Contact
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add Group Drawer */}
      {isAddGroupOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsAddGroupOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl text-[#2A2A2A]">Add New Restaurant Group</h2>
              <button onClick={() => setIsAddGroupOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="group-name" className="text-sm mb-2 block">Group Name *</Label>
                <Input id="group-name" type="text" placeholder="Enter group name" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="group-primary-contact-name" className="text-sm mb-2 block">Primary Contact Name *</Label>
                <Input id="group-primary-contact-name" type="text" placeholder="Enter primary contact name" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="group-primary-contact-email" className="text-sm mb-2 block">Primary Contact Email *</Label>
                <Input id="group-primary-contact-email" type="email" placeholder="email@example.com" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="group-primary-contact-phone" className="text-sm mb-2 block">Primary Contact Phone</Label>
                <Input id="group-primary-contact-phone" type="tel" placeholder="(555) 555-5555" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="group-office-address" className="text-sm mb-2 block">Office Address *</Label>
                <Input id="group-office-address" type="text" placeholder="123 Main St, City, State, ZIP" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="group-restaurant-types" className="text-sm mb-2 block">Restaurant Types</Label>
                <select id="group-restaurant-types" className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm">
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
                <Label htmlFor="group-internal-notes" className="text-sm mb-2 block">Internal Rep Notes</Label>
                <Textarea id="group-internal-notes" placeholder="Internal notes for sales reps" className="bg-gray-50 h-24" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsAddGroupOpen(false)}>Cancel</Button>
              <Button className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white" onClick={() => setIsAddGroupOpen(false)}>
                Save Group
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Upgrade Drawer */}
      <UpgradeDrawer isOpen={isUpgradeDrawerOpen} onClose={() => setIsUpgradeDrawerOpen(false)} />
    </div>
  );
}
