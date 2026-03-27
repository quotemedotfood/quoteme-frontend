import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Loader2, RefreshCw, Check, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCatalogs,
  getCatalogStats,
  getCatalogProducts,
  getClassificationStatus,
  reviewCategories,
  reclassifyOthers,
  type CatalogStatsResponse,
  type CatalogProductsResponse,
  type ClassificationStatusResponse,
} from '../services/api';

const VALID_CATEGORIES = [
  'cheese', 'protein', 'dry_goods', 'dairy', 'produce', 'oils_condiments',
  'spice', 'beverage_bar', 'prepared', 'tomatoes', 'seafood', 'meat',
  'poultry', 'bakery', 'frozen', 'sauce', 'other',
];

const CATEGORY_COLORS: Record<string, string> = {
  protein: 'bg-red-100 text-red-700',
  seafood: 'bg-blue-100 text-blue-700',
  cheese: 'bg-yellow-100 text-yellow-700',
  dairy: 'bg-yellow-50 text-yellow-600',
  produce: 'bg-green-100 text-green-700',
  dry_goods: 'bg-amber-100 text-amber-700',
  oils_condiments: 'bg-orange-100 text-orange-700',
  spice: 'bg-rose-100 text-rose-700',
  beverage_bar: 'bg-purple-100 text-purple-700',
  bakery: 'bg-pink-100 text-pink-700',
  prepared: 'bg-teal-100 text-teal-700',
  tomatoes: 'bg-red-50 text-red-600',
  sauce: 'bg-orange-50 text-orange-600',
  frozen: 'bg-cyan-100 text-cyan-700',
  meat: 'bg-red-100 text-red-700',
  poultry: 'bg-red-50 text-red-600',
  other: 'bg-gray-100 text-gray-500',
};

function formatCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function CatalogManagePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const distributorName = user?.distributor?.name || user?.distributor_name || 'Your';

  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [stats, setStats] = useState<CatalogStatsResponse | null>(null);
  const [products, setProducts] = useState<CatalogProductsResponse | null>(null);
  const [classStatus, setClassStatus] = useState<ClassificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyMsg, setReclassifyMsg] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [saving, setSaving] = useState(false);

  // Load fonts
  useEffect(() => {
    if (!document.getElementById('quoteme-fonts')) {
      const link = document.createElement('link');
      link.id = 'quoteme-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    const catRes = await getCatalogs();
    const activeCatalog = catRes.data?.find((c: any) => c.status === 'active');
    if (!activeCatalog) {
      setLoading(false);
      return;
    }
    setCatalogId(activeCatalog.id);

    const [statsRes, classRes] = await Promise.all([
      getCatalogStats(activeCatalog.id),
      getClassificationStatus(activeCatalog.id),
    ]);
    if (statsRes.data) setStats(statsRes.data);
    if (classRes.data) setClassStatus(classRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // Load products when filter or page changes
  useEffect(() => {
    if (!catalogId) return;
    (async () => {
      const res = await getCatalogProducts(catalogId, page, 50);
      if (res.data) setProducts(res.data);
    })();
  }, [catalogId, page]);

  // Poll classification status when classifying
  useEffect(() => {
    if (!catalogId || classStatus?.status !== 'classifying') return;
    const interval = setInterval(async () => {
      const res = await getClassificationStatus(catalogId);
      if (res.data) {
        setClassStatus(res.data);
        if (res.data.status === 'complete') {
          clearInterval(interval);
          setReclassifying(false);
          setReclassifyMsg('');
          // Reload stats
          const statsRes = await getCatalogStats(catalogId);
          if (statsRes.data) setStats(statsRes.data);
          // Reload current product page
          const prodRes = await getCatalogProducts(catalogId, page, 50);
          if (prodRes.data) setProducts(prodRes.data);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [catalogId, classStatus?.status, page]);

  const handleReclassify = async () => {
    if (!catalogId) return;
    setReclassifying(true);
    setReclassifyMsg('Reclassifying...');
    const res = await reclassifyOthers(catalogId);
    if (res.data) {
      setReclassifyMsg(`Reclassifying ${res.data.other_count} products...`);
      setClassStatus({ catalog_id: catalogId, status: 'classifying', progress: 0, total: res.data.other_count, flagged_count: 0 });
    } else {
      setReclassifyMsg(res.error || 'Failed');
      setReclassifying(false);
    }
  };

  const handleSaveCategory = async (productId: string, newCategory: string) => {
    if (!catalogId) return;
    setSaving(true);
    const res = await reviewCategories(catalogId, [{ id: productId, category: newCategory }]);
    if (!res.error) {
      // Update local state
      if (products) {
        setProducts({
          ...products,
          products: products.products.map(p =>
            p.id === productId ? { ...p, category: newCategory } : p
          ),
        });
      }
      // Refresh stats
      const statsRes = await getCatalogStats(catalogId);
      if (statsRes.data) setStats(statsRes.data);
    }
    setSaving(false);
    setEditingId(null);
  };

  const otherCount = stats?.by_category?.other || 0;
  const totalProducts = stats?.total_products || 0;
  const isClassifying = classStatus?.status === 'classifying';

  // Sort categories: "other" last, rest by count desc
  const sortedCategories = stats?.by_category
    ? Object.entries(stats.by_category).sort((a, b) => {
        if (a[0] === 'other') return 1;
        if (b[0] === 'other') return -1;
        return b[1] - a[1];
      })
    : [];

  // Filtered products
  const displayProducts = filterCategory
    ? products?.products.filter(p => p.category === filterCategory)
    : products?.products;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!catalogId) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <p className="text-gray-500 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>No active catalog found.</p>
        <Button onClick={() => navigate('/distributor-admin')} className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1
        className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {distributorName} Catalog
      </h1>
      <p className="text-sm text-[#4F4F4F] mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {totalProducts.toLocaleString()} products &middot; Uploaded {stats?.last_uploaded_at ? new Date(stats.last_uploaded_at).toLocaleDateString() : ''}
      </p>

      {/* Classification status banner */}
      {isClassifying && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />
          <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <p className="text-sm font-medium text-blue-800">
              Classifying products... {classStatus?.progress || 0} / {classStatus?.total || 0}
            </p>
            {reclassifyMsg && <p className="text-xs text-blue-600">{reclassifyMsg}</p>}
          </div>
        </div>
      )}

      {/* Category breakdown visual */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Category Breakdown
          </h2>
          {filterCategory && (
            <button
              onClick={() => { setFilterCategory(null); setPage(1); }}
              className="text-xs text-[#A5CFDD] hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filter
            </button>
          )}
        </div>

        {/* Stacked bar */}
        {totalProducts > 0 && (
          <div className="flex h-8 rounded-lg overflow-hidden mb-4">
            {sortedCategories.map(([cat, count]) => {
              const pct = (count / totalProducts) * 100;
              if (pct < 0.5) return null;
              const colors = CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-500';
              const bgClass = colors.split(' ')[0];
              return (
                <div
                  key={cat}
                  className={`${bgClass} cursor-pointer hover:opacity-80 transition-opacity relative group`}
                  style={{ width: `${pct}%` }}
                  onClick={() => { setFilterCategory(cat === filterCategory ? null : cat); setPage(1); }}
                  title={`${formatCategory(cat)}: ${count} (${pct.toFixed(1)}%)`}
                >
                  {pct > 8 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium truncate px-1">
                      {formatCategory(cat)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {sortedCategories.map(([cat, count]) => {
            const colors = CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-500';
            const isActive = filterCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => { setFilterCategory(cat === filterCategory ? null : cat); setPage(1); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${colors} ${isActive ? 'ring-2 ring-[#A5CFDD] ring-offset-1' : 'hover:opacity-80'}`}
              >
                {formatCategory(cat)}
                <span className="font-semibold">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Reclassify "other" button */}
        {otherCount > 0 && !isClassifying && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <span className="font-medium text-[#2A2A2A]">{otherCount}</span> products still categorized as "other"
            </p>
            <Button
              onClick={handleReclassify}
              disabled={reclassifying}
              className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-sm"
            >
              {reclassifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Reclassify "Other" Products
            </Button>
          </div>
        )}
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {filterCategory ? `${formatCategory(filterCategory)} Products` : 'All Products'}
            {displayProducts && (
              <span className="text-gray-400 font-normal ml-2">
                ({filterCategory ? displayProducts.length : products?.total || 0})
              </span>
            )}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Pack Size</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayProducts?.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-[#2A2A2A] font-medium">{product.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{product.brand || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{product.pack_size || '—'}</td>
                  <td className="px-4 py-3">
                    {editingId === product.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#A5CFDD]"
                        >
                          {VALID_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{formatCategory(cat)}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSaveCategory(product.id, editCategory)}
                          disabled={saving || editCategory === product.category}
                          className="text-green-600 hover:text-green-800 disabled:opacity-40"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[product.category] || 'bg-gray-100 text-gray-500'}`}>
                        {formatCategory(product.category)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId !== product.id && (
                      <button
                        onClick={() => { setEditingId(product.id); setEditCategory(product.category); }}
                        className="text-gray-300 hover:text-[#A5CFDD] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!displayProducts || displayProducts.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!filterCategory && products && products.total_pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Page {products.page} of {products.total_pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(products.total_pages, p + 1))}
                disabled={page >= products.total_pages}
                className="h-7 px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
