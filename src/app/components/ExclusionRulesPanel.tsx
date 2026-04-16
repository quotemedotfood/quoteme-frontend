import { useState, useEffect } from 'react';
import { Check, X, Plus, Loader2, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  getExclusionRules,
  createExclusionRule,
  deleteExclusionRule,
  approveExclusionRule,
  rejectExclusionRule,
  applyAllExclusionRules,
  ExclusionRule,
  AuditLogEntry,
  ExclusionRulesResponse,
} from '../services/adminApi';

const CATEGORIES = [
  'produce', 'dairy', 'meat', 'poultry', 'seafood',
  'dry_goods', 'bakery', 'prepared', 'frozen', 'cheese', 'beverage', 'other',
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ExclusionRulesPanel() {
  const [data, setData] = useState<ExclusionRulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ moved: number } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ produce: true, dairy: true });
  const [showRecentChanges, setShowRecentChanges] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newWord, setNewWord] = useState('');
  const [newToCategory, setNewToCategory] = useState('dry_goods');
  const [applyNow, setApplyNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRules() {
    setLoading(true);
    const res = await getExclusionRules();
    if (res.data) setData(res.data);
    else setError(res.error || 'Failed to load rules');
    setLoading(false);
  }

  useEffect(() => { loadRules(); }, []);

  async function handleApprove(id: string) {
    const res = await approveExclusionRule(id);
    if (res.data) loadRules();
  }

  async function handleReject(id: string) {
    const res = await rejectExclusionRule(id);
    if (res.data) loadRules();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this exclusion rule?')) return;
    const res = await deleteExclusionRule(id);
    if (res.data) loadRules();
  }

  async function handleApplyAll() {
    setApplying(true);
    setApplyResult(null);
    const res = await applyAllExclusionRules();
    if (res.data) {
      setApplyResult({ moved: res.data.moved });
      loadRules();
    }
    setApplying(false);
  }

  async function handleAddRule(fromCategory: string) {
    if (!newWord.trim()) return;
    setSaving(true);
    const res = await createExclusionRule({
      word: newWord.trim().toLowerCase(),
      from_category: fromCategory,
      to_category: newToCategory,
      apply_now: applyNow,
    });
    if (res.data) {
      setNewWord('');
      setAddingTo(null);
      loadRules();
    } else {
      setError(res.error || 'Failed to create rule');
    }
    setSaving(false);
  }

  function toggleCategory(cat: string) {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#F2993D] animate-spin" />
      </div>
    );
  }

  const activeRules = data?.active_rules || {};
  const suggestedRules = data?.suggested_rules || [];
  const recentLogs = data?.recent_audit_log || [];
  const categoriesWithRules = Object.keys(activeRules).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#2A2A2A]">Category Exclusions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Words that should never appear in a category. Applied automatically on catalog upload.
          </p>
        </div>
        <Button
          onClick={handleApplyAll}
          disabled={applying}
          className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
        >
          {applying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Apply All
        </Button>
      </div>

      {applyResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-sm text-green-700">
            Moved {applyResult.moved} product{applyResult.moved !== 1 ? 's' : ''} to correct categories.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button className="text-xs text-red-500 underline mt-1" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {/* Suggested Rules */}
      {suggestedRules.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">
            Suggested by System ({suggestedRules.length})
          </h3>
          <div className="space-y-2">
            {suggestedRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-100">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-[#2A2A2A]">"{rule.word}"</span>
                  <span className="text-gray-400">in</span>
                  <span className="text-red-600">{rule.from_category}</span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="text-green-600">{rule.to_category}</span>
                  <span className="text-xs text-gray-400">({rule.products_affected} products)</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleApprove(rule.id)}
                    className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleReject(rule.id)}
                    className="p-1.5 rounded hover:bg-red-100 text-red-400 transition-colors"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Rules by Category */}
      {categoriesWithRules.map((cat) => {
        const rules = activeRules[cat] || [];
        const expanded = expandedCategories[cat] ?? false;

        return (
          <div key={cat} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-semibold text-[#2A2A2A] capitalize">{cat}</span>
                <span className="text-xs text-gray-400">({rules.length} rule{rules.length !== 1 ? 's' : ''})</span>
              </div>
            </button>

            {expanded && (
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {rules.map((rule) => (
                    <span
                      key={rule.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                    >
                      <span className="text-[#2A2A2A]">{rule.word}</span>
                      <span className="text-gray-400">&rarr;</span>
                      <span className="text-gray-600">{rule.to_category}</span>
                      <span className="text-xs text-gray-400">({rule.source})</span>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {addingTo === cat ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      placeholder="Word..."
                      className="w-36 h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddRule(cat); }}
                    />
                    <span className="text-xs text-gray-400">&rarr;</span>
                    <select
                      value={newToCategory}
                      onChange={(e) => setNewToCategory(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm h-8"
                    >
                      {CATEGORIES.filter(c => c !== cat).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={applyNow}
                        onChange={(e) => setApplyNow(e.target.checked)}
                      />
                      Apply now
                    </label>
                    <Button
                      size="sm"
                      onClick={() => handleAddRule(cat)}
                      disabled={saving || !newWord.trim()}
                      className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white h-8 px-3"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                    </Button>
                    <button
                      onClick={() => { setAddingTo(null); setNewWord(''); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingTo(cat); setNewWord(''); setNewToCategory('dry_goods'); }}
                    className="flex items-center gap-1 text-xs text-[#7FAEC2] hover:text-[#6A9AB0] font-medium mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add exclusion
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add sections for categories without rules yet */}
      {['produce', 'dairy'].filter(c => !categoriesWithRules.includes(c)).map(cat => (
        <div key={cat} className="border border-dashed border-gray-300 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 capitalize">{cat} — no rules yet</span>
            <button
              onClick={() => { setAddingTo(cat); setNewWord(''); setNewToCategory('dry_goods'); setExpandedCategories(prev => ({ ...prev, [cat]: true })); }}
              className="flex items-center gap-1 text-xs text-[#7FAEC2] hover:text-[#6A9AB0] font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add exclusion
            </button>
          </div>
        </div>
      ))}

      {/* Recent Changes */}
      {recentLogs.length > 0 && (
        <div className="border border-gray-200 rounded-lg">
          <button
            onClick={() => setShowRecentChanges(!showRecentChanges)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {showRecentChanges ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-[#2A2A2A]">Recent Changes</span>
              <span className="text-xs text-gray-400">({recentLogs.length})</span>
            </div>
          </button>

          {showRecentChanges && (
            <div className="px-4 pb-4">
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs text-gray-600 py-1">
                    <div>
                      <span className="font-medium text-[#2A2A2A]">{log.product_name}</span>
                      {': '}
                      <span className="text-red-500">{log.from_category}</span>
                      {' \u2192 '}
                      <span className="text-green-600">{log.to_category}</span>
                      {log.rule_word && <span className="text-gray-400"> (rule: {log.rule_word})</span>}
                    </div>
                    <span className="text-gray-400 whitespace-nowrap ml-3">{timeAgo(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
