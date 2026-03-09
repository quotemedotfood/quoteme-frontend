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
import { X, Loader2 } from 'lucide-react';
import { CatalogProductSearch } from './CatalogProductSearch';
import type { CatalogSearchProduct } from '../services/api';

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
}

function tierLabel(tier: string, position: number): string {
  if (position === 1) return 'Best Match';
  if (tier === 'premium') return 'Premium';
  return 'Alternate';
}

function tierColor(position: number): string {
  if (position === 1) return 'bg-green-100 text-green-700';
  if (position === 2) return 'bg-blue-100 text-blue-700';
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
}: MapComponentDrawerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [extraCandidates, setExtraCandidates] = useState<AlignmentCandidate[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [manualPick, setManualPick] = useState<CatalogSearchProduct | null>(null);

  const handleToggle = (productId: string) => {
    setSelectedIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleApply = () => {
    if (manualPick && onManualSelect) {
      onManualSelect(componentName, manualPick);
    } else if (onApplyMapping) {
      onApplyMapping(componentName, selectedIds);
    }
    onOpenChange(false);
    setSelectedIds([]);
    setNotes('');
    setExtraCandidates([]);
    setManualPick(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedIds([]);
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-lg h-full flex flex-col">
        <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg">Select Match for {componentName}</DrawerTitle>
              <DrawerDescription className="text-sm mt-1">
                Choose alternate products from your catalog
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
                      {bestMatch.product.brand} {bestMatch.product.product}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{bestMatch.product.pack_size}</p>
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
                    {bestMatch.product.category}
                  </span>
                  {bestMatch.score != null && (
                    <span className={`font-medium ${
                      Math.round(bestMatch.score * 100) >= 70 ? 'text-green-600' :
                      Math.round(bestMatch.score * 100) >= 40 ? 'text-yellow-600' :
                      'text-red-500'
                    }`}>
                      {(bestMatch.score * 100).toFixed(0)}% match
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {allAlternates.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">No alternate matches found</p>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-[#2A2A2A] mb-3">
                Alternate Products ({allAlternates.length})
              </h3>
              <div className="space-y-3">
                {allAlternates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(candidate.product.id)}
                        onChange={() => handleToggle(candidate.product.id)}
                        className="mt-1 rounded border-gray-300 text-[#A5CFDD] focus:ring-[#A5CFDD]"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-[#2A2A2A]">
                              {candidate.product.brand} {candidate.product.product}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{candidate.product.pack_size}</p>
                          </div>
                          <div className="text-right ml-4">
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
                            {candidate.product.category}
                          </span>
                          {candidate.score != null && (
                            <span className={`font-medium ${
                              Math.round(candidate.score * 100) >= 70 ? 'text-green-600' :
                              Math.round(candidate.score * 100) >= 40 ? 'text-yellow-600' :
                              'text-red-500'
                            }`}>
                              {(candidate.score * 100).toFixed(0)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
              onSelect={(product) => setManualPick(product)}
            />
            {manualPick && (
              <div className="mt-3 border-2 border-[#A5CFDD] rounded-lg p-4 bg-blue-50/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-[#2A2A2A]">
                      {manualPick.brand} {manualPick.product}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Item #{manualPick.item_number} &middot; {manualPick.pack_size}
                    </p>
                  </div>
                  <button
                    onClick={() => setManualPick(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-[#A5CFDD]/30 text-[#2A2A2A]">
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
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A5CFDD] focus:border-transparent"
            />
          </div>
        </div>

        <DrawerFooter className="border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#A5CFDD] hover:bg-[#8db9c9] text-[#2A2A2A]"
              onClick={handleApply}
            >
              {manualPick ? 'Use Selected Product' : `Add to Quote (${selectedIds.length} products)`}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
