import { useState, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchCatalogProducts, CatalogSearchProduct } from '../services/api';

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

interface CatalogProductSearchProps {
  quoteId?: string;
  onSelect: (product: CatalogSearchProduct) => void;
  placeholder?: string;
}

export function CatalogProductSearch({
  quoteId,
  onSelect,
  placeholder = 'Search catalog by name, brand, or item #...',
}: CatalogProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogSearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchCatalogProducts(query.trim(), quoteId);
      if (res.data) {
        setResults(res.data);
        setShowDropdown(true);
      }
      setLoading(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, quoteId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (product: CatalogSearchProduct) => {
    onSelect(product);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-md text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#A5CFDD] focus:border-transparent"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2A2A2A] truncate">
                    {toTitleCase(product.product?.toLowerCase().startsWith(product.brand?.toLowerCase()) ? product.product : `${product.brand} ${product.product}`)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Item #{product.item_number} &middot; {toTitleCase(product.pack_size)}
                  </p>
                </div>
                <span className="text-xs text-gray-400 ml-2 shrink-0">{toTitleCase(product.category)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.trim().length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-4 py-3">
          <p className="text-sm text-gray-400 italic">No products found</p>
        </div>
      )}
    </div>
  );
}
