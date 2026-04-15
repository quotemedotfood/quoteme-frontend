import { useState, useEffect } from 'react';
import { getFlaggedProducts, reviewCategories, approveAllCategories } from '../services/api';
import type { FlaggedProduct } from '../services/api';
import { Loader2, Check } from 'lucide-react';

const CATEGORY_OPTIONS = [
  'cheese', 'protein', 'seafood', 'meat', 'poultry', 'produce', 'dairy',
  'dry_goods', 'oils_condiments', 'spice', 'beverage_bar', 'bakery',
  'prepared', 'tomatoes', 'sauce', 'frozen', 'other'
];

function titleCase(s: string) {
  const normalized = s.replace(/_/g, ' ');
  if (/[^\x00-\x7F]/.test(normalized)) return normalized;
  return normalized.replace(/\b\w/g, c => c.toUpperCase());
}

interface Props {
  catalogId: string;
  onDone: (remaining: number) => void;
}

export function CategoryReviewPanel({ catalogId, onDone }: Props) {
  const [products, setProducts] = useState<FlaggedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFlagged();
  }, [catalogId]);

  const loadFlagged = async () => {
    setLoading(true);
    const res = await getFlaggedProducts(catalogId);
    if (res.data) {
      setProducts(res.data.products);
    }
    setLoading(false);
  };

  const handleCategoryChange = (productId: string, category: string) => {
    setEdits(prev => ({ ...prev, [productId]: category }));
  };

  const handleSaveAll = async () => {
    const updates = Object.entries(edits).map(([id, category]) => ({ id, category }));
    if (updates.length === 0) {
      // No edits — approve all as-is
      setSaving(true);
      const res = await approveAllCategories(catalogId);
      setSaving(false);
      onDone(0);
      return;
    }

    setSaving(true);
    const res = await reviewCategories(catalogId, updates);
    setSaving(false);

    if (res.data) {
      // If there were products we didn't edit, approve the rest
      if (res.data.remaining_flagged > 0) {
        await approveAllCategories(catalogId);
      }
      onDone(0);
    }
  };

  const handleApproveAll = async () => {
    setSaving(true);
    await approveAllCategories(catalogId);
    setSaving(false);
    onDone(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading flagged products...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600">All categories look good!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3 mb-6">
        {products.map(product => (
          <div key={product.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {titleCase(product.product_name)}
                </p>
                {product.brand && (
                  <p className="text-xs text-gray-500">{titleCase(product.brand)}</p>
                )}
                {product.pack_size && (
                  <p className="text-xs text-gray-400">{product.pack_size}</p>
                )}
              </div>
              <select
                value={edits[product.id] ?? product.category}
                onChange={(e) => handleCategoryChange(product.id, e.target.value)}
                className={`text-xs px-2 py-1.5 border rounded-md ${
                  edits[product.id] && edits[product.id] !== product.category
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>{titleCase(cat)}</option>
                ))}
              </select>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                AI suggested: {titleCase(product.category)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4 flex gap-3">
        <button
          onClick={handleApproveAll}
          disabled={saving}
          className="flex-1 text-sm py-2 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Approve All As-Is
        </button>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex-1 text-sm py-2 px-4 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {Object.keys(edits).length > 0 ? `Save ${Object.keys(edits).length} Changes` : 'Approve All'}
        </button>
      </div>
    </div>
  );
}
