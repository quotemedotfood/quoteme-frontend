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
import { Input } from './ui/input';
import { X, Sparkles } from 'lucide-react';

interface MapComponentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentName: string;
  onApplyMapping?: (componentName: string, skuIds: string[]) => void;
}

interface SuggestedSKU {
  id: string;
  name: string;
  price: number;
  unit: string;
  sku: string;
  inStock: boolean;
  category: string;
}

// Sample SKUs for demonstration
const sampleSKUs: SuggestedSKU[] = [
  {
    id: '1',
    name: 'De Cecco Orecchiette Pasta',
    price: 28.0,
    unit: '12/1 lb box',
    sku: 'PST-601',
    inStock: true,
    category: 'Pasta',
  },
  {
    id: '2',
    name: 'Rustichella Artisan Orecchiette',
    price: 42.0,
    unit: '12/500g bag',
    sku: 'PST-602',
    inStock: true,
    category: 'Pasta',
  },
  {
    id: '3',
    name: 'Barilla Orecchiette Pugliesi',
    price: 24.50,
    unit: '12/1 lb box',
    sku: 'PST-603',
    inStock: true,
    category: 'Pasta',
  },
  {
    id: '4',
    name: 'Garofalo Organic Orecchiette',
    price: 38.75,
    unit: '12/500g bag',
    sku: 'PST-604',
    inStock: false,
    category: 'Pasta',
  },
  {
    id: '5',
    name: 'Benedetto Cavalieri Orecchiette',
    price: 52.00,
    unit: '12/500g bag',
    sku: 'PST-605',
    inStock: true,
    category: 'Pasta',
  },
  {
    id: '6',
    name: 'Pastificio dei Campi Orecchiette',
    price: 35.25,
    unit: '10/1 lb box',
    sku: 'PST-606',
    inStock: true,
    category: 'Pasta',
  },
  {
    id: '7',
    name: 'La Molisana Orecchiette',
    price: 26.50,
    unit: '12/1 lb box',
    sku: 'PST-607',
    inStock: true,
    category: 'Pasta',
  },
  {
    id: '8',
    name: 'Setaro Orecchiette Artigianale',
    price: 48.00,
    unit: '12/500g bag',
    sku: 'PST-608',
    inStock: false,
    category: 'Pasta',
  },
];

export function MapComponentDrawer({
  open,
  onOpenChange,
  componentName,
  onApplyMapping,
}: MapComponentDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSKUs, setSelectedSKUs] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [visibleCount, setVisibleCount] = useState(2);

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 3);
  };

  const visibleSKUs = sampleSKUs.slice(0, visibleCount);
  const hasMoreSKUs = visibleCount < sampleSKUs.length;

  const handleToggleSKU = (skuId: string) => {
    if (selectedSKUs.includes(skuId)) {
      setSelectedSKUs(selectedSKUs.filter((id) => id !== skuId));
    } else {
      setSelectedSKUs([...selectedSKUs, skuId]);
    }
  };

  const handleApply = () => {
    console.log('Applying SKUs:', { selectedSKUs, notes });
    // Call the callback with the mapping data before resetting
    if (onApplyMapping) {
      onApplyMapping(componentName, selectedSKUs);
    }
    onOpenChange(false);
    // Reset state
    setSelectedSKUs([]);
    setNotes('');
    setSearchQuery('');
    setVisibleCount(2);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset state
    setSelectedSKUs([]);
    setNotes('');
    setSearchQuery('');
    setVisibleCount(2);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-lg h-full flex flex-col">
        <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg">Select Match for {componentName}</DrawerTitle>
              <DrawerDescription className="text-sm mt-1">
                Choose products from your catalog
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
          {/* Search Section */}
          <div>
            <label className="text-sm font-medium text-[#2A2A2A] block mb-2">
              Search Catalog Products
            </label>
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Try: parm, calabrian, evoo, 18mo, orecch..."
                className="pl-10 bg-white border-gray-300"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Supports chef shorthand, brand names, and regional terminology
            </p>
          </div>

          {/* Suggested Products */}
          <div>
            <h3 className="text-sm font-medium text-[#2A2A2A] mb-3">
              Add Product to Quote ({sampleSKUs.length})
            </h3>
            <div className="space-y-3">
              {visibleSKUs.map((sku) => (
                <div
                  key={sku.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSKUs.includes(sku.id)}
                      onChange={() => handleToggleSKU(sku.id)}
                      className="mt-1 rounded border-gray-300 text-[#A5CFDD] focus:ring-[#A5CFDD]"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-[#2A2A2A]">
                            {sku.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{sku.unit}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-[#2A2A2A]">
                            ${sku.price.toFixed(2)}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                            {sku.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          <span className="font-medium">SKU:</span> {sku.sku}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${sku.inStock ? 'bg-green-500' : 'bg-red-500'}`} />
                          {sku.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {hasMoreSKUs && (
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-[#2A2A2A] hover:bg-gray-50"
                  onClick={handleShowMore}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Show More Products
                </Button>
              )}
            </div>
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
              Add to Quote ({selectedSKUs.length} products)
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}