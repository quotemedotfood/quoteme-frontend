import { useState, useEffect, useCallback } from 'react';
import { CategoryEntry } from '../services/api';

interface CategoryExclusionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  excludedCategories: string[];
  availableCategories: CategoryEntry[];
  onSave: (excluded: string[]) => Promise<void>;
  loading?: boolean;
}

export default function CategoryExclusionDrawer({
  isOpen,
  onClose,
  excludedCategories,
  availableCategories,
  onSave,
  loading = false,
}: CategoryExclusionDrawerProps) {
  const [excluded, setExcluded] = useState<string[]>(excludedCategories);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setExcluded(excludedCategories);
  }, [excludedCategories]);

  const included = availableCategories.filter((c) => !excluded.includes(c.key));
  const excludedEntries = availableCategories.filter((c) => excluded.includes(c.key));

  const exclude = useCallback((key: string) => {
    setExcluded((prev) => [...prev, key]);
  }, []);

  const include = useCallback((key: string) => {
    setExcluded((prev) => prev.filter((k) => k !== key));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(excluded);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [excluded, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Category Exclusions
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading categories...</div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* Included column */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wide">Included</h3>
                <div className="space-y-2">
                  {included.length === 0 && (
                    <p className="text-sm text-gray-400 italic">All categories excluded</p>
                  )}
                  {included.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => exclude(cat.key)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors text-left"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                        <span className="text-xs text-gray-400 ml-2">({cat.product_count})</span>
                      </div>
                      <span className="text-gray-300 text-xs">&#x2192;</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Excluded column */}
              <div>
                <h3 className="text-sm font-medium text-red-600 mb-3 uppercase tracking-wide">Excluded</h3>
                <div className="space-y-2">
                  {excludedEntries.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No categories excluded</p>
                  )}
                  {excludedEntries.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => include(cat.key)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:border-gray-300 hover:bg-white transition-colors text-left"
                    >
                      <span className="text-xs text-gray-300">&#x2190;</span>
                      <div>
                        <span className="text-sm font-medium text-red-700">{cat.label}</span>
                        <span className="text-xs text-red-400 ml-2">({cat.product_count})</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-[#8B2131] text-white rounded-lg hover:bg-[#6d1a27] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
