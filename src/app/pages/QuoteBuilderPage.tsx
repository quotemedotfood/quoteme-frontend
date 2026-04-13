import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Save, Filter, Plus, Minus, Edit, ChevronUp, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Loader2, X, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { isDemoMode } from '../utils/demoMode';
import { formatProductName } from '../utils/format';
import { getQuote, getGuestQuote, updateQuote, updateGuestQuote, addGuestQuoteLine, removeGuestQuoteLine, createStockQuote, getMoreMatches } from '../services/api';
import { CatalogProductSearch } from '../components/CatalogProductSearch';
import { QuoteReviewBar } from '../components/QuoteReviewBar';
import { MapComponentDrawer } from '../components/MapComponentDrawer';
import type { CatalogSearchProduct } from '../services/api';
import { Label } from '../components/ui/label';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../components/ui/drawer';

interface AlignmentCandidate {
  id: string;
  position: number;
  tier: string;
  score: number | null;
  product: {
    id: string;
    item_number: string;
    brand: string;
    product: string;
    pack_size: string;
    category: string;
  };
}

interface ProductItem {
  id: string;
  dish: string;
  component: string;
  sku: string;
  brand: string;
  product: string;
  pack: string;
  category: string;
  basePrice: number;
  currentPrice: number;
  percentChange: number;
  unmatched?: boolean;
  chefNote?: string | null;
  matchScore?: number | null;
  alignmentCandidates?: AlignmentCandidate[];
}

function getItemMatchStatus(item: ProductItem): 'Needs Your Pick' | 'Review Suggested' | null {
  if (item.unmatched) return 'Needs Your Pick';
  const score = item.matchScore != null ? Math.round(item.matchScore * 100) : null;
  if (score !== null && score < 50) return 'Needs Your Pick';
  if (score !== null && score < 70) return 'Review Suggested';
  return null;
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\b\w+/g, (word) => {
    // Keep short prepositions/articles lowercase unless first word
    const lower = word.toLowerCase();
    if (['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with'].includes(lower)) {
      return lower;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).replace(/^./, (c) => c.toUpperCase()); // Always capitalize first letter
}

export function QuoteBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { quotesRemaining } = useUser();
  const demo = isDemoMode();
  const quoteId: string | undefined = (location.state as any)?.quoteId;
  const isOpenQuote: boolean = (location.state as any)?.isOpenQuote || false;
  const locationId: string | undefined = (location.state as any)?.locationId;

  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkAdjustment, setBulkAdjustment] = useState('0');
  const [selectedItem, setSelectedItem] = useState<ProductItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [addProductDrawerOpen, setAddProductDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stockQuoteDrawerOpen, setStockQuoteDrawerOpen] = useState(false);
  const [stockQuoteName, setStockQuoteName] = useState('');
  const [stockQuoteType, setStockQuoteType] = useState('');
  const [savingStockQuote, setSavingStockQuote] = useState(false);
  const [inputMode, setInputMode] = useState<string | null>(null);
  const [detectedConcept, setDetectedConcept] = useState<string | null>(null);

  // ── Attention / match drawer state ──
  const [matchDrawerOpen, setMatchDrawerOpen] = useState(false);
  const [matchDrawerItem, setMatchDrawerItem] = useState<ProductItem | null>(null);
  const [attentionFilterActive, setAttentionFilterActive] = useState(false);

  // ── Price editing state ──
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');

  const isGuest = !localStorage.getItem('quoteme_token');
  const fetchQuote = (id: string) => isGuest ? getGuestQuote(id) : getQuote(id);
  const persistQuote = (id: string, updates: any) => isGuest ? updateGuestQuote(id, updates) : updateQuote(id, updates);

  const loadQuote = useCallback(async () => {
    if (!quoteId) {
      setError('No quote provided.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetchQuote(quoteId);
      if (res.error || !res.data) throw new Error(res.error || 'Failed to load quote');
      const data = res.data as any;
      const seenProducts = new Set<string>();
      const productItems: ProductItem[] = [];
      for (const line of (data.lines || [])) {
        const productId = line.product?.id || line.id;
        if (seenProducts.has(productId)) continue;
        seenProducts.add(productId);
        const priceDollars = (line.unit_price_cents || 0) / 100;
        const isUnmatched = line.availability_status === 'not_in_catalog';
        const bestCandidate = (line.alignment_candidates || []).find((c: AlignmentCandidate) => c.position === 1);
        productItems.push({
          id: line.id,
          dish: line.component?.source_dish || 'Unknown',
          component: line.component?.name || 'Unknown',
          sku: line.product?.item_number || '',
          brand: isUnmatched ? '' : (line.product?.brand || ''),
          product: line.product?.product || '',
          pack: line.product?.pack_size || '',
          category: line.category || 'Uncategorized',
          basePrice: priceDollars,
          currentPrice: priceDollars,
          percentChange: 0,
          unmatched: isUnmatched,
          chefNote: line.chef_note,
          matchScore: bestCandidate?.score ?? null,
          alignmentCandidates: line.alignment_candidates || [],
        });
      }
      setItems(productItems);
      if (data.input_mode) setInputMode(data.input_mode);
      if (data.detected_concept) setDetectedConcept(data.detected_concept);
      setLoading(false);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const handleMatchesUpdated = useCallback(() => {
    loadQuote();
  }, [loadQuote]);

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category))).sort()];
  const attentionItems = items.filter(i => getItemMatchStatus(i) !== null);
  const filteredItems = (() => {
    let base = categoryFilter === 'all' ? items : items.filter(i => i.category === categoryFilter);
    if (attentionFilterActive) base = base.filter(i => getItemMatchStatus(i) !== null);
    return base;
  })();

  const openMatchDrawer = (item: ProductItem) => {
    setMatchDrawerItem(item);
    setMatchDrawerOpen(true);
  };

  const handleReplaceMatchInBuilder = (componentName: string, productId: string, product?: { id: string; item_number: string; brand: string; product: string; pack_size: string; category: string }) => {
    if (!product) return;
    setItems(prev => prev.map(i => {
      if (i.component !== componentName) return i;
      return {
        ...i,
        sku: product.item_number,
        brand: product.brand,
        product: product.product,
        pack: product.pack_size,
        category: product.category,
        unmatched: false,
        matchScore: 1.0,
      };
    }));
    // Persist to backend
    if (quoteId) {
      const item = items.find(i => i.component === componentName);
      if (item) {
        const candidate = item.alignmentCandidates?.find(c => c.product.id === productId);
        const lineUpdate: any = { id: item.id };
        if (candidate) {
          lineUpdate.alignment_selected = candidate.position;
        } else {
          lineUpdate.product_id = productId;
        }
        persistQuote(quoteId, { lines: [lineUpdate] }).catch(console.error);
      }
    }
    setMatchDrawerOpen(false);
    setMatchDrawerItem(null);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortColumn) return 0;

    let aVal = a[sortColumn as keyof typeof a];
    let bVal = b[sortColumn as keyof typeof b];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (sortDirection === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    }
  });

  const applyBulkAdjustment = () => {
    const adjustment = parseFloat(bulkAdjustment) || 0;
    setItems(
      items.map((item) => {
        const newPrice = item.basePrice * (1 + adjustment / 100);
        return {
          ...item,
          currentPrice: newPrice,
          percentChange: adjustment,
        };
      })
    );
  };

  const adjustPrice = (id: string, change: number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const newPrice = Math.max(0, item.currentPrice + change);
          const percentChange = ((newPrice - item.basePrice) / item.basePrice) * 100;
          return { ...item, currentPrice: newPrice, percentChange };
        }
        return item;
      })
    );
  };

  const adjustPercentage = (id: string, change: number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const newPercentChange = item.percentChange + change;
          const newPrice = item.basePrice * (1 + newPercentChange / 100);
          return { ...item, currentPrice: Math.max(0, newPrice), percentChange: newPercentChange };
        }
        return item;
      })
    );
  };

  const handleAddProduct = async (product: CatalogSearchProduct) => {
    if (!quoteId) return;
    const isGuest = !localStorage.getItem('quoteme_token');
    try {
      // TODO: add authenticated add_line endpoint when needed
      const res = isGuest
        ? await addGuestQuoteLine(quoteId, product.id)
        : { data: null, error: 'Not implemented for authenticated users' };
      if (res.error || !res.data) {
        console.error('Failed to add line:', res.error);
        return;
      }
      const line = res.data;
      const priceDollars = (line.unit_price_cents || 0) / 100;
      const newItem: ProductItem = {
        id: line.id,
        dish: 'Manual Add',
        component: line.product?.product || product.product,
        sku: line.product?.item_number || product.item_number,
        brand: line.product?.brand || product.brand,
        product: line.product?.product || product.product,
        pack: line.product?.pack_size || product.pack_size,
        category: line.category || product.category,
        basePrice: priceDollars,
        currentPrice: priceDollars,
        percentChange: 0,
      };
      setItems(prev => [...prev, newItem]);
      setAddProductDrawerOpen(false);
    } catch (e) {
      console.error('Error adding product:', e);
    }
  };

  const handleRemoveItem = async (id: string) => {
    // Optimistic removal
    setItems(prev => prev.filter(item => item.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    // Persist to backend
    if (quoteId) {
      const isGuest = !localStorage.getItem('quoteme_token');
      try {
        if (isGuest) {
          await removeGuestQuoteLine(quoteId, id);
        }
        // TODO: add authenticated remove endpoint when needed
      } catch (e) {
        console.error('Error removing line:', e);
      }
    }
  };

  const savePrices = async () => {
    if (!quoteId) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Only send lines whose price has changed from basePrice
      const changedLines = items
        .filter(item => Math.round(item.currentPrice * 100) !== Math.round(item.basePrice * 100))
        .map(item => ({
          id: item.id,
          unit_price_cents: Math.round(item.currentPrice * 100),
        }));

      if (changedLines.length === 0) {
        setSaving(false);
        return;
      }

      const res = await persistQuote(quoteId, { lines: changedLines });
      if (res.error) {
        setSaveError(res.error);
      } else {
        // Update basePrices to match saved prices
        setItems(prev => prev.map(item => ({
          ...item,
          basePrice: item.currentPrice,
          percentChange: 0,
        })));
      }
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save prices');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFF9F3]">
        <Loader2 className="w-8 h-8 animate-spin text-[#A5CFDD]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF9F3] gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => navigate('/start-new-quote')}>Start Over</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-24 bg-[#FFF9F3] min-h-screen overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full box-border">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => navigate('/map-ingredients', { state: { quoteId, isOpenQuote, locationId } })}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl text-[#4F4F4F]">Quote Builder</h1>
              <p className="text-sm text-gray-500 truncate">Total Components: {items.length}</p>
              {inputMode === 'concept_only' && (
                <p className="text-xs text-amber-600 font-medium mt-0.5">Concept-based starting quote</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-gray-300 text-[#2A2A2A]"
              onClick={savePrices}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            {!isGuest && (
              <Button
                variant="outline"
                className="border-gray-300 text-[#2A2A2A]"
                onClick={() => setStockQuoteDrawerOpen(true)}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Stock Quote
              </Button>
            )}
            <Button
              onClick={() => navigate('/review', { state: { quoteId, isOpenQuote, locationId } })}
              className="hidden md:flex bg-[#F9A64B] hover:bg-[#E8953A] text-white"
            >
              Finish quote
            </Button>
          </div>
        </div>

        {/* Pricing Controls */}
        <div className="bg-white rounded-lg p-4 md:p-6 mb-6 shadow-sm overflow-hidden">
          <h2 className="text-lg text-[#2A2A2A] mb-1">Adjust Pricing</h2>
          <p className="text-gray-500 text-sm mb-4 md:mb-6">
            Adjust pricing for all items or edit individual prices
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <label className="text-sm text-[#2A2A2A] font-medium">% Adjustment</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const current = parseFloat(bulkAdjustment) || 0;
                  setBulkAdjustment(String(current - 1));
                }}
                className="text-[#2A2A2A] hover:text-[#4F4F4F] p-1 flex-shrink-0"
              >
                <Minus className="w-4 h-4" />
              </button>
              <Input
                type="number"
                value={bulkAdjustment}
                onChange={(e) => setBulkAdjustment(e.target.value)}
                className="w-24 sm:w-32 h-9 text-center border-gray-300 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="0"
              />
              <button
                onClick={() => {
                  const current = parseFloat(bulkAdjustment) || 0;
                  setBulkAdjustment(String(current + 1));
                }}
                className="text-[#2A2A2A] hover:text-[#4F4F4F] p-1 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-500">%</span>
            </div>
            <Button
              onClick={applyBulkAdjustment}
              className="w-full sm:w-auto bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white px-6"
            >
              Apply
            </Button>
          </div>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            Failed to save: {saveError}
          </div>
        )}

        {/* Attention Card */}
        {attentionItems.length > 0 && (
          <button
            onClick={() => setAttentionFilterActive(prev => !prev)}
            className={`w-full text-left rounded-lg px-4 py-3 mb-4 border flex items-center justify-between gap-3 transition-colors ${
              attentionFilterActive
                ? 'bg-amber-50 border-amber-300'
                : 'bg-amber-50 border-amber-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-medium text-amber-800">
                {attentionItems.length} item{attentionItems.length !== 1 ? 's' : ''} need{attentionItems.length === 1 ? 's' : ''} your attention
              </span>
              <span className="text-xs text-amber-600">
                ({attentionItems.filter(i => i.unmatched).length} unmatched, {attentionItems.filter(i => !i.unmatched && getItemMatchStatus(i) === 'Review Suggested').length} low confidence)
              </span>
            </div>
            <span className="text-xs font-medium text-amber-700 flex-shrink-0">
              {attentionFilterActive ? 'Show all' : 'Filter to these'}
            </span>
          </button>
        )}

        {/* Products Table/Cards */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-[#2A2A2A]"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none text-[#2A2A2A] border-gray-300"
                onClick={() => {
                  if (editMode) {
                    savePrices();
                  }
                  setEditMode(!editMode);
                }}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Edit className="w-4 h-4 mr-1" />}
                {editMode ? (saving ? 'Saving...' : 'Save') : 'Edit price'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none text-[#2A2A2A] border-gray-300"
                onClick={() => setAddProductDrawerOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Product
              </Button>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden px-4 py-3 overflow-hidden">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-3 cursor-pointer transition-colors ${
                  selectedItem?.id === item.id ? 'border-[#A5CFDD] bg-[#A5CFDD]/5' : ''
                }`}
              >
                {/* Header: Ingredient name + attention tag */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-base font-semibold text-[#2A2A2A]">{toTitleCase(item.component)}</h3>
                  {(() => {
                    const status = getItemMatchStatus(item);
                    if (!status) return null;
                    const isUnmatched = status === 'Needs Your Pick';
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openMatchDrawer(item);
                        }}
                        className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer transition-opacity hover:opacity-80 ${
                          isUnmatched
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })()}
                </div>
                {/* Body: Product + brand */}
                <p className={`text-sm mb-1 ${item.unmatched ? 'text-gray-400 italic' : 'text-gray-500'}`}>
                  {item.unmatched
                    ? toTitleCase(item.component)
                    : formatProductName(item.product, item.brand)}
                </p>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600 mt-2 mb-3">
                   <div className="truncate"><span className="text-gray-400">Item #:</span> {item.sku}</div>
                   <div className="truncate"><span className="text-gray-400">Category:</span> {toTitleCase(item.category)}</div>
                   <div className="truncate"><span className="text-gray-400">Pack:</span> {item.pack}</div>
                   <div className="truncate"><span className="text-gray-400">Dish:</span> {item.dish}</div>
                </div>

                {/* Price controls at bottom */}
                {editMode ? (
                  <div className="flex flex-col gap-2 mt-2 w-full">
                    <div className="w-full">
                      <span className="text-xs text-gray-400 mb-1 block">Price</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustPrice(item.id, -1);
                          }}
                          className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editingPriceId === item.id ? editingPriceValue : `$${item.currentPrice.toFixed(2)}`}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            if (editingPriceId === item.id) {
                              setEditingPriceValue(e.target.value);
                            }
                          }}
                          onFocus={(e) => {
                            setEditingPriceId(item.id);
                            setEditingPriceValue(item.currentPrice.toFixed(2));
                            setTimeout(() => e.target.select(), 0);
                          }}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                            if (!isNaN(val)) {
                              setItems((prevItems) =>
                                prevItems.map((i) => {
                                  if (i.id === item.id) {
                                    const newPrice = Math.max(0, Math.round(val * 100) / 100);
                                    const percentChange = ((newPrice - i.basePrice) / i.basePrice) * 100;
                                    return { ...i, currentPrice: newPrice, percentChange };
                                  }
                                  return i;
                                })
                              );
                            }
                            setEditingPriceId(null);
                            setEditingPriceValue('');
                          }}
                          className="min-w-0 flex-1 text-center border border-gray-300 rounded-lg px-2 py-2 text-sm text-[#2A2A2A] min-h-[44px] focus:outline-none focus:border-[#A5CFDD]"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustPrice(item.id, 1);
                          }}
                          className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="w-full">
                      <span className="text-xs text-gray-400 mb-1 block">% Adjustment</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustPercentage(item.id, -1);
                          }}
                          className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                        <span className={`min-w-0 flex-1 text-center text-sm min-h-[44px] flex items-center justify-center border border-gray-200 rounded-lg ${
                          item.percentChange > 0 ? 'text-green-600' :
                          item.percentChange < 0 ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(1)}%
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustPercentage(item.id, 1);
                          }}
                          className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200"
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">Price</span>
                    <span className="font-semibold text-[#2A2A2A] text-base">${item.currentPrice.toFixed(2)}</span>
                  </div>
                )}

                {editMode && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(item.id);
                      }}
                      className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 min-h-[48px] px-3"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('component')}>
                    Ingredient {getSortIcon('component')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('sku')}>
                    Item # {getSortIcon('sku')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('brand')}>
                    Brand {getSortIcon('brand')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('product')}>
                    Product {getSortIcon('product')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('pack')}>
                    Pack {getSortIcon('pack')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('category')}>
                    Category {getSortIcon('category')}
                  </th>
                  {editMode && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('percentChange')}>
                      % Change {getSortIcon('percentChange')}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('currentPrice')}>
                    Price {getSortIcon('currentPrice')}
                  </th>
                  {editMode && <th className="px-2 py-3 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'bg-[#A5CFDD]/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-[#2A2A2A]">
                      <div className="flex items-center gap-2">
                        <span>{toTitleCase(item.component)}</span>
                        {(() => {
                          const status = getItemMatchStatus(item);
                          if (!status) return null;
                          const isUnmatched = status === 'Needs Your Pick';
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openMatchDrawer(item);
                              }}
                              className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer transition-opacity hover:opacity-80 ${
                                isUnmatched
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {status}
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#2A2A2A]">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-[#2A2A2A]">{toTitleCase(item.brand)}</td>
                    <td className={`px-4 py-3 text-sm ${item.unmatched ? 'text-gray-400 italic' : 'text-[#2A2A2A]'}`}>
                      {toTitleCase(item.unmatched ? item.component : item.product)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.pack}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{toTitleCase(item.category)}</td>
                    {editMode && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="flex flex-col">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustPercentage(item.id, 1);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustPercentage(item.id, -1);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          <span className={`text-sm ml-1 ${
                            item.percentChange > 0 ? 'text-green-600' :
                            item.percentChange < 0 ? 'text-red-600' :
                            'text-gray-500'
                          }`}>
                            {item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-[#2A2A2A] text-right">
                      {editMode ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustPrice(item.id, -1);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editingPriceId === item.id ? editingPriceValue : `$${item.currentPrice.toFixed(2)}`}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (editingPriceId === item.id) {
                                setEditingPriceValue(e.target.value);
                              }
                            }}
                            onFocus={(e) => {
                              setEditingPriceId(item.id);
                              setEditingPriceValue(item.currentPrice.toFixed(2));
                              setTimeout(() => e.target.select(), 0);
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                              if (!isNaN(val)) {
                                setItems((prevItems) =>
                                  prevItems.map((i) => {
                                    if (i.id === item.id) {
                                      const newPrice = Math.max(0, Math.round(val * 100) / 100);
                                      const percentChange = ((newPrice - i.basePrice) / i.basePrice) * 100;
                                      return { ...i, currentPrice: newPrice, percentChange };
                                    }
                                    return i;
                                  })
                                );
                              }
                              setEditingPriceId(null);
                              setEditingPriceValue('');
                            }}
                            className="w-20 text-center border border-gray-300 rounded px-1 py-1 text-sm text-[#2A2A2A] focus:outline-none focus:border-[#A5CFDD]"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustPrice(item.id, 1);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        `$${item.currentPrice.toFixed(2)}`
                      )}
                    </td>
                    {editMode && (
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


      </div>

      {/* Floating Finish Quote button */}
      <button
        onClick={() => navigate('/review', { state: { quoteId, isOpenQuote, locationId } })}
        className="fixed bottom-[68px] right-6 bg-[#F9A64B] hover:bg-[#E8953A] text-white font-medium py-3 px-6 rounded-full shadow-lg text-base min-h-[48px] z-40"
      >
        Finish Quote
      </button>

      {quoteId && <QuoteReviewBar quoteId={quoteId} onMatchesUpdated={handleMatchesUpdated} />}

      {/* Match Selection Drawer */}
      {matchDrawerItem && (
        <MapComponentDrawer
          open={matchDrawerOpen}
          onOpenChange={(open) => {
            setMatchDrawerOpen(open);
            if (!open) setMatchDrawerItem(null);
          }}
          componentName={matchDrawerItem.component}
          candidates={matchDrawerItem.alignmentCandidates || []}
          onFindMoreMatches={quoteId ? async () => {
            const res = await getMoreMatches(quoteId, matchDrawerItem.id);
            return res.data?.candidates || [];
          } : undefined}
          quoteId={quoteId}
          onReplaceMatch={handleReplaceMatchInBuilder}
          onAddToQuote={handleReplaceMatchInBuilder}
          onManualSelect={(componentName, product) => {
            handleReplaceMatchInBuilder(componentName, product.id, {
              id: product.id,
              item_number: product.item_number,
              brand: product.brand,
              product: product.product,
              pack_size: product.pack_size,
              category: product.category,
            });
          }}
        />
      )}

      {/* Add Product Drawer */}
      <Drawer open={addProductDrawerOpen} onOpenChange={setAddProductDrawerOpen} direction="right">
        <DrawerContent className="w-full sm:max-w-lg h-full flex flex-col">
          <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-lg">Add Product</DrawerTitle>
                <DrawerDescription className="text-sm mt-1">
                  Search your catalog to add a product to the quote
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <CatalogProductSearch
              quoteId={quoteId}
              onSelect={handleAddProduct}
              placeholder="Search by name, brand, or item #..."
            />
            <p className="text-xs text-gray-400 mt-4 text-center">
              Select a product to add it to the quote
            </p>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Save as Stock Quote Drawer */}
      <Drawer open={stockQuoteDrawerOpen} onOpenChange={setStockQuoteDrawerOpen} direction="right">
        <DrawerContent className="w-full sm:max-w-md h-full flex flex-col">
          <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-lg">Save as Stock Quote</DrawerTitle>
                <DrawerDescription className="text-sm mt-1">
                  Save this quote as a reusable template
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <Label className="text-sm mb-1.5 block">Template Name *</Label>
              <Input
                value={stockQuoteName}
                onChange={(e) => setStockQuoteName(e.target.value)}
                placeholder="e.g. Italian Fine Dining"
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Restaurant Type</Label>
              <select
                value={stockQuoteType}
                onChange={(e) => setStockQuoteType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select type</option>
                {['Italian', 'Steakhouse', 'Sushi Bar', 'Bar/Grill', 'Spanish', 'Brewery', 'Coffee Shop', 'Mexican', 'Asian Fusion', 'French', 'American Casual'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium text-[#2A2A2A] mb-1">What gets saved:</p>
              <ul className="text-xs space-y-1 text-gray-500">
                <li>{items.length} line items with current pricing</li>
                <li>All product matches and quantities</li>
              </ul>
            </div>
          </div>
          <DrawerFooter className="border-t border-gray-200 flex-shrink-0">
            <Button
              onClick={async () => {
                if (!stockQuoteName.trim()) return;
                setSavingStockQuote(true);
                const quoteData = {
                  dishes: items.map(i => ({
                    name: i.dish,
                    components: [i.component],
                  })),
                  items: items.map(i => ({
                    product_id: i.id,
                    name: i.product,
                    brand: i.brand,
                    pack_size: i.pack,
                    quantity: 1,
                    unit_price_cents: Math.round(i.currentPrice * 100),
                  })),
                };
                await createStockQuote({
                  name: stockQuoteName,
                  restaurant_type: stockQuoteType,
                  quote_data: quoteData,
                });
                setSavingStockQuote(false);
                setStockQuoteDrawerOpen(false);
                setStockQuoteName('');
                setStockQuoteType('');
              }}
              disabled={!stockQuoteName.trim() || savingStockQuote}
              className="w-full bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
            >
              {savingStockQuote ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Template'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
