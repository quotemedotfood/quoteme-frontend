import { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { Button } from './ui/button';
import { X, Loader2, ArrowRightLeft, Plus } from 'lucide-react';
import { CatalogProductSearch } from './CatalogProductSearch';
import type { CatalogSearchProduct } from '../services/api';
import { toTitleCase, formatProductName } from '../utils/format';

interface CandidateProduct {
  id: string;
  item_number: string;
  brand: string;
  product: string;
  pack_size: string;
  category: string;
}

interface AlignmentCandidate {
  id: string;
  position: number;
  tier: string;
  score: number | null;
  product: CandidateProduct;
}

interface MapComponentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentName: string;
  onApplyMapping?: (componentName: string, skuIds: string[]) => void;
  candidates?: AlignmentCandidate[];
  onFindMoreMatches?: () => Promise<AlignmentCandidate[]>;
  quoteId?: string;
  onManualSelect?: (componentName: string, product: CatalogSearchProduct) => void;
  onReplaceMatch?: (componentName: string, productId: string, product?: CandidateProduct) => void;
  onAddToQuote?: (componentName: string, productId: string, product?: CandidateProduct) => void;
}

function tierLabel(tier: string, position: number): string {
  if (position === 1) return 'Best Match';
  if (tier === 'premium') return 'Premium';
  return 'Alternate';
}

function tierColor(position: number): string {
  if (position === 1) return 'bg-green-100 text-green-700';
  if (position === 2) return 'bg-[#A5CFDD]/20 text-[#2A5F6F]';
  return 'bg-gray-100 text-gray-600';
}

export function MapComponentDrawer({
  open,
  onOpenChange,
  componentName,
  onApplyMapping,
  candidates = [],
  onFindMoreMatches,
  quoteId,
  onManualSelect,
  onReplaceMatch,
  onAddToQuote,
}: MapComponentDrawerProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [extraCandidates, setExtraCandidates] = useState<AlignmentCandidate[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [manualPick, setManualPick] = useState<CatalogSearchProduct | null>(null);

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(prev => prev === productId ? null : productId);
    setManualPick(null);
  };

  const handleSelectManual = (product: CatalogSearchProduct) => {
    setManualPick(product);
    setSelectedProductId(null);
  };

  const handleReplaceMatch = () => {
    const productId = manualPick?.id || selectedProductId;
    if (!productId) return;

    // Build product info from manual pick or from candidates
    const productInfo: CandidateProduct | undefined = manualPick
      ? { id: manualPick.id, item_number: manualPick.item_number, brand: manualPick.brand, product: manualPick.product, pack_size: manualPick.pack_size, category: manualPick.category }
      : [...candidates, ...extraCandidates].find(c => c.product.id === productId)?.product;

    if (onReplaceMatch) {
      onReplaceMatch(componentName, productId, productInfo);
    } else if (manualPick && onManualSelect) {
      onManualSelect(componentName, manualPick);
    } else if (onApplyMapping) {
      onApplyMapping(componentName, [productId]);
    }
    closeAndReset();
  };

  const handleAddToQuote = () => {
    const productId = manualPick?.id || selectedProductId;
    if (!productId) return;

    const productInfo: CandidateProduct | undefined = manualPick
      ? { id: manualPick.id, item_number: manualPick.item_number, brand: manualPick.brand, product: manualPick.product, pack_size: manualPick.pack_size, category: manualPick.category }
      : [...candidates, ...extraCandidates].find(c => c.product.id === productId)?.product;

    if (onAddToQuote) {
      onAddToQuote(componentName, productId, productInfo);
    } else if (manualPick && onManualSelect) {
      onManualSelect(componentName, manualPick);
    } else if (onApplyMapping) {
      onApplyMapping(componentName, [productId]);
    }
    closeAndReset();
  };

  const closeAndReset = () => {
    onOpenChange(false);
    setSelectedProductId(null);
    setNotes('');
    setExtraCandidates([]);
    setManualPick(null);
  };

  const handleFindMore = async () => {
    if (!onFindMoreMatches) return;
    setLoadingMore(true);
    try {
      const more = await onFindMoreMatches();
      setExtraCandidates(prev => [...prev, ...more]);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  };

  const bestMatch = candidates.find(c => c.position === 1);
  const allAlternates = [...candidates.filter(c => c.position > 1), ...extraCandidates];
  const hasSelection = !!selectedProductId || !!manualPick;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-lg h-full flex flex-col">
        <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg">Select Match for {toTitleCase(componentName)}</DrawerTitle>
              <DrawerDescription className="text-sm mt-1">
                Choose a product, then replace or add to quote
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {/* Current Best Match */}
          {bestMatch && (
            <div>
              <h3 className="text-sm font-medium text-[#2A2A2A] mb-3">Current Match</h3>
              <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-[#2A2A2A]">
                      {formatProductName(bestMatch.product.product, bestMatch.product.brand)}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{toTitleCase(bestMatch.product.pack_size)}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">
                      Best Match
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    <span className="font-medium">Item #:</span> {bestMatch.product.item_number}
                  </span>
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                    {toTitleCase(bestMatch.product.category)}
                  </span>
                  {bestMatch.score != null && (() => {
                    const s = Math.round(bestMatch.score * 100);
                    const label = s >= 90 ? { text: 'Strong Match', cls: 'text-green-600' }
                      : s >= 70 ? { text: 'Good Match', cls: 'text-[#2A5F6F]' }
                      : s >= 50 ? { text: 'Review Suggested', cls: 'text-amber-600' }
                      : { text: 'Needs Your Pick', cls: 'text-red-500' };
                    return <span className={`font-medium ${label.cls}`}>{label.text}</span>;
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Alternate Products — single select */}
          {allAlternates.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">No alternate matches found</p>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-[#2A2A2A] mb-3">
                Alternate Products ({allAlternates.length})
              </h3>
              <div className="space-y-2">
                {allAlternates.map((candidate) => {
                  const isSelected = selectedProductId === candidate.product.id;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => handleSelectProduct(candidate.product.id)}
                      className={`w-full text-left border rounded-lg p-4 transition-all ${
                        isSelected
                          ? 'border-[#7FAEC2] bg-[#7FAEC2]/5 ring-2 ring-[#7FAEC2]/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-[#2A2A2A]">
                            {formatProductName(candidate.product.product, candidate.product.brand)}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{toTitleCase(candidate.product.pack_size)}</p>
                        </div>
                        <div className="text-right ml-4 flex items-center gap-2">
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#7FAEC2] flex items-center justify-center">
                              <span className="text-white text-xs">&#10003;</span>
                            </span>
                          )}
                          <span className={`inline-block px-2 py-0.5 text-xs rounded ${tierColor(candidate.position)}`}>
                            {tierLabel(candidate.tier, candidate.position)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          <span className="font-medium">Item #:</span> {candidate.product.item_number}
                        </span>
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {toTitleCase(candidate.product.category)}
                        </span>
                        {candidate.score != null && (() => {
                          const s = Math.round(candidate.score * 100);
                          const label = s >= 90 ? { text: 'Strong Match', cls: 'text-green-600' }
                            : s >= 70 ? { text: 'Good Match', cls: 'text-[#2A5F6F]' }
                            : s >= 50 ? { text: 'Review Suggested', cls: 'text-amber-600' }
                            : { text: 'Needs Your Pick', cls: 'text-red-500' };
                          return <span className={`font-medium ${label.cls}`}>{label.text}</span>;
                        })()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Find More Matches */}
          {onFindMoreMatches && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                className="text-[#2A2A2A] border-gray-300"
                onClick={handleFindMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finding matches...</>
                ) : (
                  'Find 2 more matches'
                )}
              </Button>
            </div>
          )}

          {/* Manual Catalog Search */}
          <div>
            <h3 className="text-sm font-medium text-[#2A2A2A] mb-3">Search Catalog Manually</h3>
            <CatalogProductSearch
              quoteId={quoteId}
              onSelect={handleSelectManual}
            />
            {manualPick && (
              <div className="mt-3 border-2 border-[#7FAEC2] rounded-lg p-4 bg-[#7FAEC2]/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-[#2A2A2A]">
                      {formatProductName(manualPick.product, manualPick.brand)}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Item #{manualPick.item_number} &middot; {toTitleCase(manualPick.pack_size)}
                    </p>
                  </div>
                  <button
                    onClick={() => setManualPick(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-[#7FAEC2]/20 text-[#2A2A2A]">
                  Manual selection
                </span>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div>
            <label className="text-sm font-medium text-[#2A2A2A] block mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add chef notes, pack size details, or selling points..."
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] focus:border-transparent"
            />
          </div>
        </div>

        <DrawerFooter className="border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleReplaceMatch}
              disabled={!hasSelection}
              className="flex-1 bg-[#F2993D] hover:bg-[#E08A2E] text-white disabled:opacity-40"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Replace Match
            </Button>
            <Button
              type="button"
              onClick={handleAddToQuote}
              disabled={!hasSelection}
              className="flex-1 bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white disabled:opacity-40"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Quote
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
