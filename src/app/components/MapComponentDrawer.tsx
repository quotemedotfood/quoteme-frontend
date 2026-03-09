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
import { X } from 'lucide-react';

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
}: MapComponentDrawerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const handleToggle = (productId: string) => {
    setSelectedIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleApply = () => {
    if (onApplyMapping) {
      onApplyMapping(componentName, selectedIds);
    }
    onOpenChange(false);
    setSelectedIds([]);
    setNotes('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedIds([]);
    setNotes('');
  };

  // Show alternates (skip position 1 which is already the main match)
  const alternates = candidates.filter(c => c.position > 1);

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
          {alternates.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">No alternate matches found</p>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-[#2A2A2A] mb-3">
                Alternate Products ({alternates.length})
              </h3>
              <div className="space-y-3">
                {alternates.map((candidate) => (
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
                            <span className="text-gray-400">
                              Score: {(candidate.score * 100).toFixed(0)}%
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
              Add to Quote ({selectedIds.length} products)
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
