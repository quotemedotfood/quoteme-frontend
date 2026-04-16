import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { RefreshCw, Pencil, Trash2, Plus, Search, PlayCircle, Zap } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  BrandRule,
  BrandAuditResult,
  getAdminBrandRules,
  createAdminBrandRule,
  updateAdminBrandRule,
  deleteAdminBrandRule,
  auditBrandRules,
  seedBrandRules,
} from '../../services/adminApi';

// ─── Category color mapping ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  seafood: 'bg-blue-100 text-blue-700',
  meat: 'bg-red-100 text-red-700',
  cheese: 'bg-amber-100 text-amber-700',
  dry_goods: 'bg-stone-100 text-stone-700',
  produce: 'bg-green-100 text-green-700',
  dairy: 'bg-sky-100 text-sky-700',
  bakery: 'bg-orange-100 text-orange-700',
  beverages: 'bg-purple-100 text-purple-700',
  sauces: 'bg-yellow-100 text-yellow-700',
  oils: 'bg-lime-100 text-lime-700',
  spices: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-600',
};

function categoryBadgeClass(cat: string): string {
  const key = cat?.toLowerCase().replace(/\s+/g, '_');
  return CATEGORY_COLORS[key] || 'bg-gray-100 text-gray-600';
}

// ─── Rule type helpers ─────────────────────────────────────────────────────────

const RULE_TYPE_BADGE: Record<string, string> = {
  lock: 'bg-green-100 text-green-700',
  bias: 'bg-blue-100 text-blue-700',
  none: 'bg-gray-100 text-gray-600',
};

const RULE_TYPE_CYCLE: Record<string, BrandRule['rule_type']> = {
  lock: 'bias',
  bias: 'none',
  none: 'lock',
};

// ─── Add Rule Modal ────────────────────────────────────────────────────────────

interface AddRuleModalProps {
  onClose: () => void;
  onSaved: (rule: BrandRule) => void;
}

function AddRuleModal({ onClose, onSaved }: AddRuleModalProps) {
  const [brandName, setBrandName] = useState('');
  const [ruleType, setRuleType] = useState<string>('bias');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim() || !category.trim()) {
      setError('Brand name and category are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createAdminBrandRule({ brand_name: brandName.trim(), rule_type: ruleType, category: category.trim(), notes: notes.trim() || undefined });
    if (res.data) {
      onSaved(res.data);
    } else {
      setError(res.error || 'Failed to create rule');
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          Add Brand Rule
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Brand Name</label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Sysco Imperial" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Rule Type</label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]"
            >
              <option value="lock">Lock</option>
              <option value="bias">Bias</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Category</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. seafood" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Notes (optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving} className="bg-[#7FAEC2] hover:bg-[#6a9ab5] text-white">
              {saving ? 'Saving…' : 'Save Rule'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function QMAdminBrandRules() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<BrandAuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [parentPickerId, setParentPickerId] = useState<string | null>(null);
  const [parentSearch, setParentSearch] = useState('');

  const lockCount = rules.filter((r) => r.rule_type === 'lock').length;
  const biasCount = rules.filter((r) => r.rule_type === 'bias').length;

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: { rule_type?: string; q?: string } = {};
    if (filterType !== 'all') params.rule_type = filterType;
    if (search.trim()) params.q = search.trim();
    const res = await getAdminBrandRules(params);
    if (res.data) setRules(res.data);
    else setError(res.error || 'Failed to load brand rules');
    setLoading(false);
  }, [filterType, search]);

  useEffect(() => {
    const t = setTimeout(() => loadRules(), 250);
    return () => clearTimeout(t);
  }, [loadRules]);

  // Auto-populate from catalogs on first load if no rules exist
  const [autoAuditDone, setAutoAuditDone] = useState(false);
  useEffect(() => {
    if (!loading && rules.length === 0 && !autoAuditDone && !auditLoading) {
      setAutoAuditDone(true);
      handleRunAudit();
    }
  }, [loading, rules.length, autoAuditDone, auditLoading]);

  async function handleCycleRuleType(rule: BrandRule) {
    const next = RULE_TYPE_CYCLE[rule.rule_type] ?? 'none';
    const res = await updateAdminBrandRule(rule.id, { rule_type: next });
    if (res.data) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? res.data! : r)));
    }
  }

  async function handleSaveCategory(rule: BrandRule) {
    const res = await updateAdminBrandRule(rule.id, { category: editCategory.trim() });
    if (res.data) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? res.data! : r)));
    }
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await deleteAdminBrandRule(id);
    if (res.data?.deleted || res.data) {
      setRules((prev) => prev.filter((r) => r.id !== id));
    }
    setDeletingId(null);
  }

  async function handleRunAudit() {
    setAuditLoading(true);
    setAuditError(null);
    setAuditResult(null);
    const res = await auditBrandRules();
    if (res.data) setAuditResult(res.data);
    else setAuditError(res.error || 'Audit failed');
    setAuditLoading(false);
  }

  async function handleSeed() {
    setSeedLoading(true);
    setSeedMsg(null);
    const res = await seedBrandRules();
    if (res.data) {
      setSeedMsg(`Seeded ${res.data.seeded} rules (${res.data.total} total)`);
      loadRules();
    } else {
      setSeedMsg(res.error || 'Seed failed');
    }
    setSeedLoading(false);
  }

  async function handleSetParent(childId: string, parentId: string | null) {
    const res = await updateAdminBrandRule(childId, { parent_brand_id: parentId } as any);
    if (res.data) {
      setRules((prev) => prev.map((r) => (r.id === childId ? res.data! : r)));
    }
    setParentPickerId(null);
    setParentSearch('');
  }

  async function handleRemoveParent(childId: string) {
    handleSetParent(childId, null);
  }

  // Canonical brands (no parent) for the parent picker
  const canonicalBrands = rules.filter((r) => !(r as any).parent_brand_id);

  const displayedRules = rules;

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[#2A2A2A]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Ingestion Rules
          </h1>
          <p className="text-sm text-[#4F4F4F] mt-1">
            {lockCount} lock{lockCount !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; {biasCount} bias{biasCount !== 1 ? 'es' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            className="gap-2 text-sm"
            onClick={handleRunAudit}
            disabled={auditLoading}
          >
            <PlayCircle className={`w-4 h-4 ${auditLoading ? 'animate-pulse' : ''}`} />
            {auditLoading ? 'Auditing…' : 'Run Audit'}
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-sm"
            onClick={handleSeed}
            disabled={seedLoading}
          >
            <Zap className="w-4 h-4" />
            {seedLoading ? 'Seeding…' : 'Seed from Code'}
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-sm"
            onClick={loadRules}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            className="gap-2 text-sm bg-[#7FAEC2] hover:bg-[#6a9ab5] text-white"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Audit result card */}
      {auditResult && (
        <div className="mb-5 rounded-xl border border-[#7FAEC2]/40 bg-[#7FAEC2]/5 px-5 py-4">
          <p className="font-semibold text-[#2A2A2A] text-sm mb-1">Audit Complete</p>
          <p className="text-sm text-[#4F4F4F]">
            {auditResult.total_brands} brands audited &mdash;&nbsp;
            {auditResult.locks} auto-locked, {auditResult.biases} set as bias.
          </p>
          {auditResult.brands.length > 0 && (
            <div className="mt-3 space-y-1 max-h-48 overflow-y-auto pr-1">
              {auditResult.brands.map((b, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-[#4F4F4F]">
                  <span className="font-medium text-[#2A2A2A] w-40 truncate">{b.brand}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RULE_TYPE_BADGE[b.suggested_type] || 'bg-gray-100 text-gray-600'}`}>
                    {b.suggested_type}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${categoryBadgeClass(b.suggested_category)}`}>
                    {b.suggested_category}
                  </span>
                  <span>{b.product_count} products</span>
                  {b.existing_rule && <span className="text-green-600">existing</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {auditError && <p className="text-sm text-red-500 mb-4">{auditError}</p>}

      {/* Seed feedback */}
      {seedMsg && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {seedMsg}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {['all', 'lock', 'bias', 'none'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                filterType === t
                  ? 'bg-[#7FAEC2] text-white'
                  : 'bg-gray-100 text-[#4F4F4F] hover:bg-gray-200'
              }`}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-9 text-sm"
            placeholder="Search brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Error / empty states */}
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      {loading && <p className="text-sm text-gray-400 py-8">Loading brand rules…</p>}

      {/* Table */}
      {!loading && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-[#2A2A2A]">Brand Name</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Parent</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Rule Type</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Category</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Products</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Category Distribution</TableHead>
                <TableHead className="font-semibold text-[#2A2A2A]">Last Audited</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-gray-400 py-10">
                    No brand rules found.
                  </TableCell>
                </TableRow>
              )}
              {displayedRules.map((rule) => (
                <TableRow key={rule.id} className="hover:bg-gray-50/60 transition-colors">
                  {/* Brand Name */}
                  <TableCell className="font-medium text-[#2A2A2A]">
                    {(rule as any).parent_brand_name && (
                      <span className="text-xs text-gray-400 mr-1">↳</span>
                    )}
                    {rule.brand_name}
                    {(rule as any).child_brands?.length > 0 && (
                      <span className="text-xs text-gray-400 ml-1">({(rule as any).child_brands.length} variants)</span>
                    )}
                  </TableCell>

                  {/* Parent — set or remove */}
                  <TableCell>
                    {parentPickerId === rule.id ? (
                      <div className="relative">
                        <Input
                          autoFocus
                          className="h-7 text-xs w-32"
                          placeholder="Search parent..."
                          value={parentSearch}
                          onChange={(e) => setParentSearch(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Escape') { setParentPickerId(null); setParentSearch(''); } }}
                        />
                        <div className="absolute z-10 top-8 left-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {canonicalBrands
                            .filter((b) => b.id !== rule.id && b.brand_name.toLowerCase().includes(parentSearch.toLowerCase()))
                            .slice(0, 8)
                            .map((b) => (
                              <button
                                key={b.id}
                                onClick={() => handleSetParent(rule.id, b.id)}
                                className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-[#2A2A2A]"
                              >
                                {b.brand_name}
                              </button>
                            ))}
                          {canonicalBrands.filter((b) => b.id !== rule.id && b.brand_name.toLowerCase().includes(parentSearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-xs text-gray-400">No matches</p>
                          )}
                        </div>
                      </div>
                    ) : (rule as any).parent_brand_name ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#7FAEC2] font-medium">{(rule as any).parent_brand_name}</span>
                        <button
                          onClick={() => handleRemoveParent(rule.id)}
                          className="text-xs text-gray-400 hover:text-red-500"
                          title="Remove parent"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setParentPickerId(rule.id); setParentSearch(''); }}
                        className="text-xs text-gray-400 hover:text-[#7FAEC2]"
                      >
                        Set parent
                      </button>
                    )}
                  </TableCell>

                  {/* Rule Type — click to cycle */}
                  <TableCell>
                    <button
                      onClick={() => handleCycleRuleType(rule)}
                      title="Click to cycle: lock → bias → none"
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize cursor-pointer transition-opacity hover:opacity-80 ${RULE_TYPE_BADGE[rule.rule_type] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {rule.rule_type}
                    </button>
                  </TableCell>

                  {/* Category — click to edit */}
                  <TableCell>
                    {editingId === rule.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          className="h-7 text-xs w-28"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCategory(rule);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveCategory(rule)}
                          className="text-xs text-[#7FAEC2] hover:underline"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(rule.id); setEditCategory(rule.category); }}
                        title="Click to edit category"
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize cursor-pointer hover:opacity-80 ${categoryBadgeClass(rule.category)}`}
                      >
                        {rule.category || '—'}
                      </button>
                    )}
                  </TableCell>

                  {/* Product count */}
                  <TableCell className="text-sm text-[#4F4F4F]">{rule.product_count ?? '—'}</TableCell>

                  {/* Category distribution */}
                  <TableCell>
                    {rule.category_distribution && Object.keys(rule.category_distribution).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(rule.category_distribution)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 4)
                          .map(([cat, count]) => (
                            <button
                              key={cat}
                              onClick={() => navigate(`/qm-admin/matching-engine?tab=catalogs&brand=${encodeURIComponent(rule.brand_name)}&category=${encodeURIComponent(cat)}`)}
                              className={`px-1.5 py-0.5 rounded text-xs cursor-pointer hover:ring-2 hover:ring-[#7FAEC2] hover:ring-offset-1 transition-all ${categoryBadgeClass(cat)}`}
                              title={`View ${rule.brand_name} ${cat} products in Matching Engine`}
                            >
                              {cat} ({count})
                            </button>
                          ))}
                        {Object.keys(rule.category_distribution).length > 4 && (
                          <span className="text-xs text-gray-400">+{Object.keys(rule.category_distribution).length - 4}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </TableCell>

                  {/* Last audited */}
                  <TableCell className="text-xs text-[#4F4F4F]">
                    {rule.last_audited_at
                      ? new Date(rule.last_audited_at).toLocaleDateString()
                      : <span className="text-gray-300">Never</span>}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingId(rule.id); setEditCategory(rule.category); }}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#7FAEC2] transition-colors"
                        title="Edit category"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={deletingId === rule.id}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Rule Modal */}
      {showAddModal && (
        <AddRuleModal
          onClose={() => setShowAddModal(false)}
          onSaved={(rule) => {
            setRules((prev) => [rule, ...prev]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

export default QMAdminBrandRules;
