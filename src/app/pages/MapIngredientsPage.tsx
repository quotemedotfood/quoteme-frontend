import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { ArrowLeft, ChevronRight, ChevronDown, Plus, X, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useUser } from '../contexts/UserContext';
import { isDemoMode } from '../utils/demoMode';
import { toTitleCase, formatProductName } from '../utils/format';
import { MapComponentDrawer } from '../components/MapComponentDrawer';
import {
  createMenu,
  getMenuStatus,
  createQuote,
  getQuote,
  getGuestQuote,
  getMoreMatches,
} from '../services/api';

// ─── Types (matching backend API responses) ──────────────────────────────────

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

interface QuoteLine {
  id: string;
  position: number;
  component: {
    id: string;
    name: string;
    source_dish: string;
  } | null;
  product: {
    id: string;
    item_number: string;
    brand: string;
    product: string;
    pack_size: string;
    category: string;
  };
  quantity: number;
  unit_price: string | null;
  unit_price_cents: number | null;
  category: string;
  alignment_selected: number;
  chef_note: string | null;
  alignment_candidates: AlignmentCandidate[];
}

interface QuoteData {
  id: string;
  status: string;
  working_label: string;
  lines: QuoteLine[];
}

interface Dish {
  id: string;
  name: string;
  components: string[];
  componentLines: Record<string, QuoteLine>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MapIngredientsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { quotesRemaining } = useUser();
  const demo = isDemoMode();

  // Router state passed from StartNewQuotePage
  const routerMenuId: string | undefined = (location.state as any)?.menuId;
  const routerQuoteId: string | undefined = (location.state as any)?.quoteId;
  const isOpenQuote: boolean = (location.state as any)?.isOpenQuote || false;

  // ── Core state ──
  const [quoteId, setQuoteId] = useState<string | null>(routerQuoteId || null);
  const [menuId, setMenuId] = useState<string | null>(routerMenuId || null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Processing menu…');
  const [error, setError] = useState<string | null>(null);

  // ── Tab / drawer state ──
  const [selectedTab, setSelectedTab] = useState<'dishes' | 'categories' | 'match-strength'>('categories');
  const [strengthFilters, setStrengthFilters] = useState<Set<string>>(new Set(['no-match', 'needs-review']));
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState('');
  const [mappedComponents, setMappedComponents] = useState<Record<string, string[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isDishListDrawerOpen, setIsDishListDrawerOpen] = useState(false);

  const [isAddDishDrawerOpen, setIsAddDishDrawerOpen] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishComponents, setNewDishComponents] = useState('');
  const [addDishLoading, setAddDishLoading] = useState(false);

  // ── Additions tracking (manually added dishes + "Add to Quote" products) ──
  const [additions, setAdditions] = useState<Array<{
    id: string;
    componentName: string;
    sourceDish: string;
    product: { id: string; brand: string; product: string; item_number: string; pack_size: string; category: string };
    type: 'added_dish' | 'add_to_quote';
  }>>([]);


  // ─── Build dish list from quote lines ─────────────────────────────────────

  function buildDishesFromLines(lines: QuoteLine[]): Dish[] {
    const dishMap: Record<string, Dish> = {};
    for (const line of lines) {
      const comp = line.component;
      if (!comp) continue;
      const dishKey = comp.source_dish || 'Unknown Dish';
      if (!dishMap[dishKey]) {
        dishMap[dishKey] = { id: dishKey, name: dishKey, components: [], componentLines: {} };
      }
      dishMap[dishKey].components.push(comp.name);
      dishMap[dishKey].componentLines[comp.name] = line;
    }
    return Object.values(dishMap);
  }

  const isGuest = !localStorage.getItem('quoteme_token');
  const fetchQuote = (id: string) => isGuest ? getGuestQuote(id) : getQuote(id);

  // ─── Poll menu status then load quote ─────────────────────────────────────

  useEffect(() => {
    if (!menuId && !quoteId) {
      setLoading(false);
      setError('No menu provided. Please start a new quote.');
      return;
    }

    let cancelled = false;

    async function pollAndLoad() {
      try {
        // If we already have a quoteId, just load it
        if (quoteId) {
          setLoadingStatus('Loading matches…');
          const res = await fetchQuote(quoteId);
          if (cancelled) return;
          if (res.error || !res.data) throw new Error(res.error || 'Failed to load quote');
          const built = buildDishesFromLines((res.data as QuoteData).lines || []);
          setDishes(built);
          setSelectedDish(built[0] || null);
          setLoading(false);
          return;
        }

        // Poll menu status until quote is ready
        setLoadingStatus('Processing menu…');
        let attempts = 0;
        let resolvedQuoteId: string | null = null;
        while (attempts < 30) {
          if (cancelled) return;
          const statusRes = await getMenuStatus(menuId!);
          if (statusRes.error) throw new Error(statusRes.error);
          const statusData = statusRes.data;
          if (statusData?.status === 'processed' || statusData?.status === 'completed') {
            resolvedQuoteId = statusData.quote_id || null;
            break;
          }
          if (statusData?.status === 'failed') throw new Error('Menu processing failed. Please try again.');
          await new Promise(r => setTimeout(r, 2000));
          attempts++;
        }
        if (attempts >= 30) throw new Error('Menu processing timed out. Please try again.');

        if (!resolvedQuoteId) {
          // Fallback: create quote from menu
          setLoadingStatus('Building quote…');
          const quoteRes = await createQuote(menuId!);
          if (cancelled) return;
          if (quoteRes.error || !quoteRes.data) throw new Error(quoteRes.error || 'Failed to create quote');
          resolvedQuoteId = quoteRes.data.id;
        }
        setQuoteId(resolvedQuoteId);

        // Load full quote with lines
        setLoadingStatus('Loading matches…');
        const fullQuote = await fetchQuote(resolvedQuoteId);
        if (cancelled) return;
        if (fullQuote.error || !fullQuote.data) throw new Error(fullQuote.error || 'Failed to load quote');
        const built = buildDishesFromLines((fullQuote.data as QuoteData).lines || []);
        setDishes(built);
        setSelectedDish(built[0] || null);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Something went wrong');
          setLoading(false);
        }
      }
    }

    pollAndLoad();
    return () => { cancelled = true; };
  }, [menuId, quoteId]);

  // ─── Add dish manually ────────────────────────────────────────────────────

  async function handleAlignWithCatalog() {
    if (!newDishComponents.trim()) return;
    setAddDishLoading(true);
    try {
      const components = newDishComponents.split('\n').map(c => c.trim()).filter(Boolean);
      const text = newDishName
        ? `${newDishName}\n${components.join('\n')}`
        : components.join('\n');

      const menuRes = await createMenu({ raw_text: text, name: newDishName || 'Manual Dish' });
      if (menuRes.error || !menuRes.data) throw new Error(menuRes.error || 'Failed to create menu');
      const newQId = menuRes.data.quote_id;

      const fullQuote = await fetchQuote(newQId);
      if (fullQuote.error || !fullQuote.data) throw new Error(fullQuote.error);
      const newLines = (fullQuote.data as QuoteData).lines || [];
      const newDishes = buildDishesFromLines(newLines);

      // Merge new dishes into existing dish list
      setDishes(prev => [...prev, ...newDishes]);
      setSelectedDish(newDishes[0] || selectedDish);
      setSelectedTab('dishes');

      // Track as additions for sidebar
      for (const line of newLines) {
        if (line.product) {
          setAdditions(prev => [...prev, {
            id: `add-dish-${line.id}`,
            componentName: line.component?.name || 'Unknown',
            sourceDish: newDishName || 'Manual Dish',
            product: line.product,
            type: 'added_dish' as const,
          }]);
        }
      }

      if (!quoteId) setQuoteId(newQId);
    } catch (e: any) {
      console.error('Add dish error:', e.message);
    } finally {
      setAddDishLoading(false);
      setIsAddDishDrawerOpen(false);
      setIsDishListDrawerOpen(false);
      setNewDishName('');
      setNewDishComponents('');
    }
  }


  // ─── Helpers ──────────────────────────────────────────────────────────────

  const [selectedLine, setSelectedLine] = useState<QuoteLine | null>(null);

  const handleMapComponent = (componentName: string) => {
    // Check all dishes for the component line, not just selected dish
    let line: QuoteLine | null = null;
    if (selectedDish?.componentLines[componentName]) {
      line = selectedDish.componentLines[componentName];
    } else {
      for (const dish of dishes) {
        if (dish.componentLines[componentName]) {
          line = dish.componentLines[componentName];
          break;
        }
      }
    }
    setSelectedComponent(componentName);
    setSelectedLine(line);
    setMapDrawerOpen(true);
  };

  const handleApplyMapping = (componentName: string, skuIds: string[]) => {
    if (skuIds.length > 0) {
      setMappedComponents(prev => ({ ...prev, [componentName]: skuIds }));
    }
  };

  const handleReplaceMatch = (componentName: string, productId: string, product?: { id: string; item_number: string; brand: string; product: string; pack_size: string; category: string }) => {
    // Find product info from candidates or use the passed product data
    const allCandidates = selectedLine?.alignment_candidates || [];
    const candidateProduct = allCandidates.find(c => c.product.id === productId)?.product || product;
    if (candidateProduct) {
      // Update the dish's component line with the new product
      setDishes(prev => prev.map(dish => {
        if (dish.componentLines[componentName]) {
          const updatedLine = { ...dish.componentLines[componentName], product: candidateProduct };
          return {
            ...dish,
            componentLines: { ...dish.componentLines, [componentName]: updatedLine },
          };
        }
        return dish;
      }));
    }
    setMappedComponents(prev => ({ ...prev, [componentName]: [productId] }));
  };

  const handleAddToQuote = (componentName: string, productId: string, product?: { id: string; item_number: string; brand: string; product: string; pack_size: string; category: string }) => {
    // Find the product from candidates or use the passed product data
    const allCandidates = selectedLine?.alignment_candidates || [];
    const candidateProduct = allCandidates.find(c => c.product.id === productId)?.product || product;
    if (candidateProduct) {
      setAdditions(prev => [...prev, {
        id: `atq-${Date.now()}-${productId}`,
        componentName,
        sourceDish: selectedDish?.name || 'Unknown Dish',
        product: candidateProduct,
        type: 'add_to_quote' as const,
      }]);
    }
    setMappedComponents(prev => ({ ...prev, [componentName]: [...(prev[componentName] || []), productId] }));
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // ─── Loading screen ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FFF9F3]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#F2993D] mx-auto" />
          <p className="text-sm text-gray-500">{loadingStatus}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FFF9F3]">
        <div className="text-center space-y-4 max-w-sm px-4">
          <p className="text-red-500 text-sm">{error}</p>
          <Button
            onClick={() => navigate('/start-new-quote')}
            className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
          >
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render component row ─────────────────────────────────────────────────

  const renderComponentRow = (component: string, line?: QuoteLine) => {
    const bestMatch = line?.product;
    const bestCandidate = line?.alignment_candidates?.find(c => c.position === 1);
    const confidence = bestCandidate?.score != null ? Math.round(bestCandidate.score * 100) : null;
    const isMapped = mappedComponents[component]?.length > 0;

    const badge = isMapped
      ? { text: 'Your Pick', cls: 'bg-green-100 text-green-700' }
      : confidence != null
        ? confidence >= 90 ? { text: 'Strong Match', cls: 'bg-green-100 text-green-700' }
          : confidence >= 70 ? { text: 'Good Match', cls: 'bg-[#A5CFDD]/20 text-[#2A5F6F]' }
          : confidence >= 50 ? { text: 'Review Suggested', cls: 'bg-amber-100 text-amber-700' }
          : { text: 'Needs Your Pick', cls: 'bg-red-100 text-red-700' }
        : !bestMatch ? { text: 'Needs Your Pick', cls: 'bg-red-100 text-red-700' }
        : null;

    return (
      <div key={component} className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
        {/* Left: ingredient name */}
        <span className="text-sm font-medium text-[#2A2A2A] truncate">{toTitleCase(component)}</span>

        {/* Center: matched product info + badge */}
        <div className="min-w-0">
          {bestMatch ? (
            <div className="text-xs text-gray-500">
              <p className="font-medium truncate">{formatProductName(bestMatch.product, bestMatch.brand)}</p>
              <p className="text-gray-400 truncate">{bestMatch.item_number} &middot; {bestMatch.pack_size}</p>
              {badge && (
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                  {badge.text}
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs">
              <span className="italic text-gray-400">No match found</span>
              {badge && (
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                  {badge.text}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: action button */}
        <Button
          size="sm"
          className={`text-xs px-3 py-1 whitespace-nowrap ${isMapped ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-[#A5CFDD] hover:bg-[#8db9c9] text-[#2A2A2A]'}`}
          onClick={() => handleMapComponent(component)}
        >
          {isMapped ? 'Change Match' : 'Add Match'}
        </Button>
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#FFF9F3]">
      {/* Left Sidebar */}
      <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">DISHES</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {dishes.map((dish) => (
            <button
              key={dish.id}
              onClick={() => { setSelectedDish(dish); setSelectedTab('dishes'); }}
              className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedDish?.id === dish.id ? 'bg-[#A5CFDD]/10 border-l-4 border-l-[#A5CFDD]' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked readOnly />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2A2A2A]">{dish.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{dish.components.length} ingredients</p>
                </div>
              </div>
            </button>
          ))}
          {/* Additions Section */}
          {additions.length > 0 && (
            <div className="border-t border-gray-200">
              <div className="p-4 pb-2">
                <h3 className="text-sm font-medium text-gray-500">ADDITIONS ({additions.length})</h3>
              </div>
              <div className="px-4 pb-2 space-y-1">
                {additions.map((addition) => (
                  <div
                    key={addition.id}
                    className="flex items-center justify-between py-2 px-2 rounded-md bg-green-50 border border-green-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#2A2A2A] truncate">
                        {toTitleCase(addition.product.brand)} {toTitleCase(addition.product.product)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {addition.type === 'add_to_quote' ? `+ ${toTitleCase(addition.componentName)}` : toTitleCase(addition.sourceDish)}
                      </p>
                    </div>
                    <button
                      onClick={() => setAdditions(prev => prev.filter(a => a.id !== addition.id))}
                      className="ml-2 text-gray-400 hover:text-red-500 shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4">
            <Button
              onClick={() => setIsAddDishDrawerOpen(true)}
              className="w-full h-auto py-3 bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white whitespace-normal text-center"
            >
              <Plus className="w-4 h-4 mr-2 shrink-0" />
              Manually Add A Dish or Ingredient
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/start-new-quote')}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl text-[#4F4F4F]">Match Ingredients</h1>
                <p className="text-sm text-gray-500">Select product matches for each ingredient</p>
              </div>
            </div>
            {/* Single Adjust Pricing button is in the sticky footer */}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 md:p-6">
            {/* Mobile Dish Selector */}
            <div className="md:hidden mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <label className="text-sm font-medium text-gray-500 mb-2 block">Current Dish</label>
              <button
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-[#2A2A2A]"
                onClick={() => setIsDishListDrawerOpen(true)}
              >
                <span className="truncate font-medium">{selectedDish?.name || 'Select a dish'}</span>
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="text-xs">({selectedDish?.components.length ?? 0})</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* Main Card with Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="flex border-b border-gray-200">
                {([
                  { key: 'categories', label: 'Categories' },
                  { key: 'dishes', label: 'Dishes' },
                  { key: 'match-strength', label: 'Match Strength' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key)}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                      selectedTab === tab.key
                        ? 'border-[#A5CFDD] text-[#A5CFDD]'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {selectedTab === 'dishes' ? (
                  <div>
                    <h2 className="text-lg font-medium text-[#4F4F4F] mb-2">
                      {selectedDish?.name || 'No dish selected'}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Select a match for each ingredient from your distributor's catalog
                    </p>
                    <div className="space-y-3">
                      {(selectedDish?.components || []).map(component =>
                        renderComponentRow(component, selectedDish?.componentLines[component])
                      )}
                    </div>
                  </div>
                ) : selectedTab === 'match-strength' ? (
                  /* Match Strength — group by match quality */
                  <div>
                    <h2 className="text-lg font-medium text-[#4F4F4F] mb-2">By Match Strength</h2>
                    <p className="text-sm text-gray-500 mb-4">Focus on ingredients that need the most attention</p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {([
                        { key: 'no-match', label: 'No Match', cls: 'bg-gray-100 text-gray-700 border-gray-300' },
                        { key: 'needs-review', label: 'Needs Review', cls: 'bg-amber-50 text-amber-700 border-amber-300' },
                        { key: 'good-match', label: 'Good Match', cls: 'bg-[#A5CFDD]/10 text-[#2A5F6F] border-[#A5CFDD]' },
                        { key: 'strong-match', label: 'Strong Match', cls: 'bg-green-50 text-green-700 border-green-300' },
                      ] as const).map(filter => {
                        const active = strengthFilters.has(filter.key);
                        return (
                          <button
                            key={filter.key}
                            onClick={() => setStrengthFilters(prev => {
                              const next = new Set(prev);
                              next.has(filter.key) ? next.delete(filter.key) : next.add(filter.key);
                              return next;
                            })}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              active ? filter.cls : 'bg-white text-gray-400 border-gray-200'
                            }`}
                          >
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        type StrengthGroup = { key: string; label: string; badgeCls: string; items: { component: string; line: QuoteLine }[] };
                        const groups: StrengthGroup[] = [
                          { key: 'no-match', label: 'No Match', badgeCls: 'bg-gray-100 text-gray-600', items: [] },
                          { key: 'needs-review', label: 'Needs Review', badgeCls: 'bg-amber-100 text-amber-700', items: [] },
                          { key: 'good-match', label: 'Good Match', badgeCls: 'bg-[#A5CFDD]/20 text-[#2A5F6F]', items: [] },
                          { key: 'strong-match', label: 'Strong Match', badgeCls: 'bg-green-100 text-green-700', items: [] },
                        ];

                        const seenProducts = new Set<string>();
                        for (const dish of dishes) {
                          for (const comp of dish.components) {
                            const line = dish.componentLines[comp];
                            const productKey = line?.product?.id || comp;
                            if (seenProducts.has(productKey)) continue;
                            seenProducts.add(productKey);

                            const bestCandidate = line?.alignment_candidates?.find(c => c.position === 1);
                            const score = bestCandidate?.score != null ? Math.round(bestCandidate.score * 100) : null;

                            if (!line?.product || score === null || score < 50) {
                              groups[0].items.push({ component: comp, line });
                            } else if (score < 70) {
                              groups[1].items.push({ component: comp, line });
                            } else if (score < 90) {
                              groups[2].items.push({ component: comp, line });
                            } else {
                              groups[3].items.push({ component: comp, line });
                            }
                          }
                        }

                        const filtered = groups.filter(g => strengthFilters.has(g.key) && g.items.length > 0);

                        if (filtered.length === 0) {
                          return (
                            <p className="text-sm text-gray-400 text-center py-8">
                              No ingredients match the selected filters
                            </p>
                          );
                        }

                        return filtered.map(group => (
                          <div key={group.key} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-gray-50">
                              <div className="flex items-center gap-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${group.badgeCls}`}>
                                  {group.label}
                                </span>
                                <span className="text-sm text-gray-500">{group.items.length} ingredient{group.items.length !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <div className="border-t border-gray-200">
                              {group.items.map(({ component, line }) => (
                                <div key={component} className="pl-4">
                                  {renderComponentRow(component, line)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ) : (
                  /* Categories — group all components by product category */
                  <div>
                    <h2 className="text-lg font-medium text-[#4F4F4F] mb-2">By Category</h2>
                    <p className="text-sm text-gray-500 mb-6">Ingredients organized by product category</p>
                    <div className="space-y-2">
                      {(() => {
                        const categoryMap: Record<string, { component: string; line: QuoteLine }[]> = {};
                        const seenProducts = new Set<string>();
                        for (const dish of dishes) {
                          for (const comp of dish.components) {
                            const line = dish.componentLines[comp];
                            const productKey = line?.product?.id || comp;
                            if (seenProducts.has(productKey)) continue;
                            seenProducts.add(productKey);
                            const cat = line?.category || 'Uncategorized';
                            if (!categoryMap[cat]) categoryMap[cat] = [];
                            categoryMap[cat].push({ component: comp, line });
                          }
                        }
                        const sortedCategories = Object.keys(categoryMap).sort();
                        return sortedCategories.map(cat => {
                          const items = categoryMap[cat];
                          const isExpanded = expandedCategories.includes(cat);
                          const mappedCount = items.filter(i => mappedComponents[i.component]?.length > 0).length;
                          return (
                            <div key={cat} className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleCategory(cat)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400">
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </div>
                                  <span className="text-sm font-medium text-[#2A2A2A]">
                                    {toTitleCase(cat)} ({mappedCount}/{items.length})
                                  </span>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              {isExpanded && (
                                <div className="border-t border-gray-200 bg-gray-50">
                                  {items.map(({ component, line }) =>
                                    <div key={component} className="pl-8">
                                      {renderComponentRow(component, line)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Match Ingredient Drawer */}
      <MapComponentDrawer
        open={mapDrawerOpen}
        onOpenChange={setMapDrawerOpen}
        componentName={selectedComponent}
        onApplyMapping={handleApplyMapping}
        candidates={selectedLine?.alignment_candidates || []}
        onFindMoreMatches={quoteId && selectedLine ? async () => {
          const res = await getMoreMatches(quoteId, selectedLine.id);
          return res.data?.candidates || [];
        } : undefined}
        quoteId={quoteId || undefined}
        onManualSelect={(componentName, product) => {
          setMappedComponents(prev => ({ ...prev, [componentName]: [product.id] }));
        }}
        onReplaceMatch={handleReplaceMatch}
        onAddToQuote={handleAddToQuote}
      />

      {/* Mobile Dish List Drawer */}
      {isDishListDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/20" onClick={() => setIsDishListDrawerOpen(false)} />
          <div className="relative w-full max-w-xs bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#2A2A2A]">Select Dish</h2>
              <button onClick={() => setIsDishListDrawerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {dishes.map(dish => (
                <button
                  key={dish.id}
                  onClick={() => { setSelectedDish(dish); setIsDishListDrawerOpen(false); }}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 ${selectedDish?.id === dish.id ? 'bg-[#A5CFDD]/10 border-l-4 border-l-[#A5CFDD]' : ''}`}
                >
                  <p className="text-sm font-medium text-[#2A2A2A]">{dish.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{dish.components.length} ingredients</p>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <Button onClick={() => setIsAddDishDrawerOpen(true)} className="w-full bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white">
                <Plus className="w-4 h-4 mr-2" /> Manually Add A Dish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dish Drawer */}
      {isAddDishDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/20" onClick={() => setIsAddDishDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#2A2A2A]">Manually Add Dish</h2>
              <button onClick={() => setIsAddDishDrawerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dish-name">Dish Name (Optional)</Label>
                <Input
                  id="dish-name"
                  placeholder="e.g. Spaghetti Carbonara"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dish-components">List Ingredients</Label>
                <p className="text-xs text-gray-500">Enter each ingredient on a new line.</p>
                <Textarea
                  id="dish-components"
                  placeholder={"Spaghetti\nPancetta\nEggs\nParmesan cheese\nBlack pepper"}
                  className="min-h-[200px]"
                  value={newDishComponents}
                  onChange={(e) => setNewDishComponents(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <Button
                onClick={handleAlignWithCatalog}
                className="w-full bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                disabled={!newDishComponents.trim() || addDishLoading}
              >
                {addDishLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Matching…</>
                ) : 'Match With Catalog'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom CTA - mobile and desktop */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-gray-200 p-4 z-40">
        {demo && (
          <p className="text-center text-xs text-gray-500 mb-2 md:hidden">
            {quotesRemaining > 0
              ? `${quotesRemaining} free quote${quotesRemaining !== 1 ? 's' : ''} left`
              : 'No free quotes left'}
          </p>
        )}
        <button
          onClick={() => navigate('/quote-builder', { state: { quoteId, isOpenQuote } })}
          className="w-full md:w-auto md:min-w-[200px] md:mx-auto md:block bg-[#F9A64B] hover:bg-[#E8953A] text-white font-medium py-3 px-6 rounded-lg text-base min-h-[48px]"
        >
          Adjust Pricing
        </button>
      </div>

    </div>
  );
}
