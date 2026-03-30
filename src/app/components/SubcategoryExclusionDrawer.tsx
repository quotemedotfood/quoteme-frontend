import { useState, useCallback } from 'react';
import { SubcategoryCategoryGroup, SubcategoryEntry, SubcategoryExclusionsResponse } from '../services/api';

interface SubcategoryExclusionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: SubcategoryExclusionsResponse | null;
  onSave: (actions: { confirm?: string[]; exclude?: string[]; include?: string[]; confirm_all?: boolean }) => Promise<void>;
  loading?: boolean;
}

export default function SubcategoryExclusionDrawer({
  isOpen,
  onClose,
  data,
  onSave,
  loading = false,
}: SubcategoryExclusionDrawerProps) {
  const [pendingActions, setPendingActions] = useState<{
    confirm: Set<string>;
    exclude: Set<string>;
    include: Set<string>;
  }>({ confirm: new Set(), exclude: new Set(), include: new Set() });
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const getEffectiveStatus = useCallback((sub: SubcategoryEntry): string => {
    if (pendingActions.include.has(sub.id)) return 'included';
    if (pendingActions.exclude.has(sub.id)) return 'excluded';
    if (pendingActions.confirm.has(sub.id)) return 'excluded';
    return sub.status;
  }, [pendingActions]);

  const toggleSubcategory = useCallback((sub: SubcategoryEntry) => {
    setPendingActions((prev) => {
      const next = {
        confirm: new Set(prev.confirm),
        exclude: new Set(prev.exclude),
        include: new Set(prev.include),
      };

      next.confirm.delete(sub.id);
      next.exclude.delete(sub.id);
      next.include.delete(sub.id);

      const effectiveStatus = (() => {
        if (prev.include.has(sub.id)) return 'included';
        if (prev.exclude.has(sub.id)) return 'excluded';
        if (prev.confirm.has(sub.id)) return 'excluded';
        return sub.status;
      })();

      if (effectiveStatus === 'included' || effectiveStatus === 'suggested') {
        if (sub.status === 'suggested') {
          next.confirm.add(sub.id);
        } else {
          next.exclude.add(sub.id);
        }
      } else {
        next.include.add(sub.id);
      }

      return next;
    });
  }, []);

  const confirmAll = useCallback(() => {
    if (!data) return;
    setPendingActions((prev) => {
      const next = { confirm: new Set(prev.confirm), exclude: new Set(prev.exclude), include: new Set(prev.include) };
      data.categories.forEach((cat) => {
        cat.subcategories.forEach((sub) => {
          if (sub.status === 'suggested') {
            next.confirm.add(sub.id);
            next.include.delete(sub.id);
          }
        });
      });
      return next;
    });
  }, [data]);

  const hasPendingChanges = pendingActions.confirm.size > 0 || pendingActions.exclude.size > 0 || pendingActions.include.size > 0;

  const suggestedCount = data?.categories.reduce(
    (acc, cat) => acc + cat.subcategories.filter((s) => s.status === 'suggested').length,
    0
  ) ?? 0;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave({
        confirm: Array.from(pendingActions.confirm),
        exclude: Array.from(pendingActions.exclude),
        include: Array.from(pendingActions.include),
      });
      setPendingActions({ confirm: new Set(), exclude: new Set(), include: new Set() });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [pendingActions, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Subcategory Exclusions
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Suggestion banner */}
        {suggestedCount > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <span className="text-sm text-amber-800">
              {suggestedCount} subcategor{suggestedCount === 1 ? 'y' : 'ies'} not found in your catalog
            </span>
            <button
              onClick={confirmAll}
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
            >
              Exclude all suggested
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <div className="space-y-2">
              {data?.categories.map((cat) => (
                <div key={cat.key} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                      <span className="text-xs text-gray-400">({cat.total_product_count} products)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {cat.subcategories.some((s) => s.status === 'suggested') && (
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                          suggestions
                        </span>
                      )}
                      {cat.subcategories.some((s) => s.status === 'excluded') && (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                          {cat.subcategories.filter((s) => s.status === 'excluded').length} excluded
                        </span>
                      )}
                      <span className="text-gray-400 text-xs">
                        {expandedCategories.has(cat.key) ? '\u25B2' : '\u25BC'}
                      </span>
                    </div>
                  </button>

                  {expandedCategories.has(cat.key) && (
                    <div className="divide-y divide-gray-100">
                      {cat.subcategories.map((sub) => {
                        const effectiveStatus = getEffectiveStatus(sub);
                        const isPending = pendingActions.confirm.has(sub.id) || pendingActions.exclude.has(sub.id) || pendingActions.include.has(sub.id);

                        return (
                          <button
                            key={sub.id}
                            onClick={() => toggleSubcategory(sub)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                              effectiveStatus === 'excluded'
                                ? 'bg-red-50 hover:bg-red-100'
                                : effectiveStatus === 'suggested'
                                ? 'bg-amber-50 hover:bg-amber-100'
                                : 'hover:bg-gray-50'
                            } ${isPending ? 'ring-1 ring-inset ring-blue-300' : ''}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${
                                effectiveStatus === 'excluded' ? 'text-red-700' : 'text-gray-700'
                              }`}>
                                {sub.label}
                              </span>
                              <span className="text-xs text-gray-400">({sub.product_count})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {effectiveStatus === 'suggested' && (
                                <span className="text-xs text-amber-600">0 products found</span>
                              )}
                              {effectiveStatus === 'excluded' && (
                                <span className="text-xs text-red-600">excluded</span>
                              )}
                              {effectiveStatus === 'included' && sub.product_count > 0 && (
                                <span className="text-xs text-green-600">active</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasPendingChanges}
            className="px-4 py-2 text-sm bg-[#8B2131] text-white rounded-lg hover:bg-[#6d1a27] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
