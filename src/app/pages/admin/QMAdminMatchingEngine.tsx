import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  ChevronDown, ChevronRight, Download, Send, Trash2, ArrowUpCircle, Paperclip, X,
  Beaker, Fish, Wine, Coffee, GlassWater, Filter, BookOpen, Lock, RefreshCw,
  CheckCircle, AlertTriangle, XCircle, RotateCcw, Save, Search, Microscope,
  GraduationCap, Plus, ArrowUp, ArrowDown, Undo2, Edit3, Shield, Loader2, Check,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ExclusionRulesPanel } from '../../components/ExclusionRulesPanel';
import { ClusterListTab } from './_clusterListTab';
import {
  getMatchingEngineRules,
  getMatchingEngineLogs,
  sendMatchingEngineChat,
  saveMatchingEngineRules,
  deleteMatchingEngineRule,
  promoteCorrection,
  getMatchingEngineExportUrl,
  getMatchingEngineConcepts,
  testMatchingEngineConcept,
  getAdminStockQuotes,
  createAdminStockQuote,
  deleteAdminStockQuote,
  getDiagnosticsEnabled,
  getDiagnosticsCatalogs,
  runDiagnostic,
  runTeachAnalysis,
  runTeachPreview,
  applyTeachRules,
  undoTeachSession,
  type MatchingEngineRules,
  type MatchingEngineLog,
  type AdminStockQuote,
  type ConceptLabel,
  type ConceptTestResult,
  type RuleValidation,
  type DiagnosticResult,
  type DiagnosticCatalog,
  type ProductBrief,
  type ScoredCandidate,
  type TeachResult,
  type TeachProposedRule,
  type TeachPreviewCandidate,
  type TeachConflict,
  type TeachApplyResult,
  type TeachExistingRule,
  getDiagnosticsCatalogs as getAdminCatalogs,
  getAdminCatalogStats,
  getAdminCatalogProducts,
  adminReclassifyOthers,
  adminBulkUpdateCategory,
  type DiagnosticCatalog,
  type AdminCatalogStats,
  type AdminCatalogProductsResponse,
} from '../../services/adminApi';

type Tab = 'rules' | 'synonyms' | 'training' | 'concepts' | 'changelog' | 'diagnose' | 'catalogs' | 'exclusions' | 'cluster_list';

function toTitleCase(str: string) {
  const normalized = str.replace(/_/g, ' ');
  if (/[^\x00-\x7F]/.test(normalized)) return normalized;
  return normalized.replace(/\b\w/g, c => c.toUpperCase());
}

function TimeAgo({ date }: { date: string }) {
  const d = new Date(date);
  return <span className="text-xs text-gray-400">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>;
}

// ═══════════════════════════════════════════════════════════════════════
// Expandable section component
// ═══════════════════════════════════════════════════════════════════════
function RuleSection({ title, icon: Icon, count, children, defaultOpen = false }: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        <Icon size={18} className="text-[#7FAEC2]" />
        <span className="font-medium text-sm text-[#2A2A2A]">{title}</span>
        <span className="ml-auto text-xs font-medium text-[#7FAEC2] bg-[#7FAEC2]/10 px-2 py-0.5 rounded-full">{count}</span>
      </button>
      {open && <div className="px-4 pb-3 border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Rules Tab
// ═══════════════════════════════════════════════════════════════════════
function RulesTab({ rules, onRefresh }: { rules: MatchingEngineRules | null; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('Deactivate this rule? It can be re-enabled later.')) return;
    setDeleting(id);
    await deleteMatchingEngineRule(type, id);
    setDeleting(null);
    onRefresh();
  };

  const handlePromote = async (id: string) => {
    setPromoting(id);
    await promoteCorrection(id);
    setPromoting(null);
    onRefresh();
  };

  const handleExport = async () => {
    const token = localStorage.getItem('quoteme_token');
    const url = getMatchingEngineExportUrl();
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `quoteme-matching-rules-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
  };

  if (!rules) return <div className="p-8 text-center text-gray-400">Loading rules...</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[#4F4F4F]">Live state of every matching rule in the engine.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw size={14} className="mr-1" /> Refresh</Button>
          <Button size="sm" onClick={handleExport} className="bg-[#7FAEC2] text-white hover:bg-[#6b9ab0]"><Download size={14} className="mr-1" /> Export All Rules</Button>
        </div>
      </div>

      {/* Sauce Expansions */}
      <RuleSection title="Sauce Expansions" icon={Beaker} count={rules.sauce_expansions.length}>
        <div className="space-y-2 pt-2">
          {rules.sauce_expansions.map(s => (
            <div key={s.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-[#2A2A2A]">{toTitleCase(s.sauce_name)}</span>
                <span className="text-xs text-gray-400 ml-2">→ {s.components.join(', ')}</span>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">behavior: {s.default_behavior}</span>
                  {s.prepared_sku_blocked && <span className="text-xs text-red-500 font-medium">prepared SKU blocked</span>}
                </div>
              </div>
              <button onClick={() => handleDelete('sauce_expansion', s.id)} disabled={deleting === s.id} className="text-gray-300 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </RuleSection>

      {/* Protein Families */}
      <RuleSection title="Protein Families" icon={Fish} count={rules.protein_families.length}>
        <div className="space-y-2 pt-2">
          {rules.protein_families.map(p => (
            <div key={p.family} className="py-1.5 border-b border-gray-50 last:border-0">
              <span className="font-medium text-sm text-[#2A2A2A]">{toTitleCase(p.family)}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {p.terms.map(t => (
                  <span key={t} className={`text-xs px-1.5 py-0.5 rounded ${p.locked_species.some(ls => t.replace(/ /g, '_').includes(ls)) ? 'bg-red-50 text-red-600 font-medium' : 'bg-gray-100 text-gray-600'}`}>{t}</span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 italic pt-1">Protein families are hardcoded — edit in ProteinIntelligenceService</p>
        </div>
      </RuleSection>

      {/* Cocktail Locks */}
      <RuleSection title="Cocktail Iconic Locks" icon={GlassWater} count={rules.cocktail_locks.length}>
        <div className="space-y-1.5 pt-2">
          {rules.cocktail_locks.map(c => (
            <div key={c.term} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
              <Lock size={12} className="text-red-400" />
              <span className="font-medium text-sm text-[#2A2A2A]">{toTitleCase(c.term)}</span>
              <span className="text-xs text-gray-400">→ {c.canonical}</span>
            </div>
          ))}
          <p className="text-xs text-gray-400 italic pt-1">Iconic locks are hardcoded — edit in CocktailIntelligenceService</p>
        </div>
      </RuleSection>

      {/* Wine Protected */}
      <RuleSection title="Wine Protected" icon={Wine} count={rules.wine_protected.class_a.length + rules.wine_protected.class_b.length + rules.wine_protected.class_c.length}>
        <div className="space-y-3 pt-2">
          <div>
            <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Class A — Hard Locked</h4>
            {rules.wine_protected.class_a.map(w => (
              <div key={w.term} className="flex items-center gap-2 py-1">
                <Lock size={12} className="text-red-400" />
                <span className="text-sm font-medium text-[#2A2A2A]">{toTitleCase(w.term)}</span>
                {w.notes && <span className="text-xs text-gray-400">— {w.notes}</span>}
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Class B — Classification Preserved</h4>
            <div className="flex flex-wrap gap-1">
              {rules.wine_protected.class_b.map(w => (
                <span key={w.term} className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{toTitleCase(w.term)}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Class C — Region Flexible</h4>
            <div className="flex flex-wrap gap-1">
              {rules.wine_protected.class_c.map(w => (
                <span key={w.term} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{toTitleCase(w.term)}</span>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 italic">Wine classes are hardcoded — edit in SommelierWineService</p>
        </div>
      </RuleSection>

      {/* Chef Beverage */}
      <RuleSection title="Chef Beverage Locks" icon={Coffee} count={rules.chef_beverage.length}>
        <div className="space-y-1.5 pt-2">
          {rules.chef_beverage.map(cb => (
            <div key={cb.term} className="py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-[#2A2A2A]">{toTitleCase(cb.term)}</span>
                <span className="text-xs text-red-500">blocks: {cb.blocked.join(', ')}</span>
              </div>
              {cb.notes && <p className="text-xs text-gray-400 mt-0.5">{cb.notes}</p>}
            </div>
          ))}
          <p className="text-xs text-gray-400 italic pt-1">Fortified locks are hardcoded — edit in ChefBeverageService</p>
        </div>
      </RuleSection>

      {/* Format Gates */}
      <RuleSection title="Format Gates" icon={Filter} count={rules.format_gates.length}>
        <div className="space-y-1.5 pt-2">
          {rules.format_gates.map(fg => (
            <div key={fg.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <span className="font-medium text-sm text-[#2A2A2A]">{fg.ingredient_pattern}</span>
                <span className="text-xs text-gray-400 ml-2">→ {fg.format_tag}</span>
                {fg.blocked_in_roles.length > 0 && <span className="text-xs text-red-500 ml-2">blocked in: {fg.blocked_in_roles.join(', ')}</span>}
              </div>
              <button onClick={() => handleDelete('format_gate', fg.id)} disabled={deleting === fg.id} className="text-gray-300 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </RuleSection>

      {/* Synonym Families */}
      <RuleSection title="Synonym Families" icon={BookOpen} count={rules.synonym_families.length}>
        <div className="space-y-1.5 pt-2">
          {rules.synonym_families.map(sf => (
            <div key={sf.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <span className="font-medium text-sm text-[#2A2A2A]">{sf.canonical_name}</span>
                <span className="text-xs text-gray-400 ml-2">({sf.category})</span>
                {sf.synonyms.length > 0 && <span className="text-xs text-[#7FAEC2] ml-2">= {sf.synonyms.join(', ')}</span>}
              </div>
              <button onClick={() => handleDelete('synonym', sf.id)} disabled={deleting === sf.id} className="text-gray-300 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </RuleSection>

      {/* Identity Locks */}
      <RuleSection title="Identity Locks" icon={Lock} count={rules.identity_locks.length}>
        <div className="space-y-1.5 pt-2">
          {rules.identity_locks.map(il => (
            <div key={il.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <span className="font-medium text-sm text-[#2A2A2A]">{il.ingredient_pattern}</span>
                <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${il.sensitivity === 'locked' ? 'bg-red-50 text-red-600' : il.sensitivity === 'sensitive' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>{il.sensitivity}</span>
                {il.notes && <p className="text-xs text-gray-400 mt-0.5">{il.notes}</p>}
              </div>
              <button onClick={() => handleDelete('identity_lock', il.id)} disabled={deleting === il.id} className="text-gray-300 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </RuleSection>

      {/* Match Corrections */}
      <RuleSection title="Match Corrections" icon={ArrowUpCircle} count={rules.match_corrections.length}>
        <div className="space-y-2 pt-2">
          {rules.match_corrections.length === 0 && <p className="text-xs text-gray-400 italic">No corrections recorded yet.</p>}
          {rules.match_corrections.map(mc => (
            <div key={mc.id} className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TimeAgo date={mc.created_at} />
                  <span className="text-sm font-medium text-[#2A2A2A]">{mc.ingredient_name || 'Unknown'}</span>
                  <span className="text-xs text-gray-400">→</span>
                  <span className="text-xs text-green-600">{mc.corrected_product?.name || '?'}</span>
                  <span className="text-xs text-gray-300">(was: {mc.original_product?.name || '?'})</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">by {mc.user?.name || 'system'}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{mc.correction_type}</span>
                </div>
              </div>
              {!mc.promoted ? (
                <Button variant="outline" size="sm" onClick={() => handlePromote(mc.id)} disabled={promoting === mc.id} className="text-xs flex-shrink-0">
                  {promoting === mc.id ? 'Promoting...' : 'Promote to Rule'}
                </Button>
              ) : (
                <span className="text-xs text-green-600 font-medium flex-shrink-0">Promoted</span>
              )}
            </div>
          ))}
        </div>
      </RuleSection>

      {/* Stock Quotes */}
      <StockQuotesSection />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Stock Quotes Section (in Rules tab)
// ═══════════════════════════════════════════════════════════════════════
function StockQuotesSection() {
  const [quotes, setQuotes] = useState<AdminStockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    setLoading(true);
    const res = await getAdminStockQuotes();
    if (res.data) setQuotes(res.data);
    setLoading(false);
  }

  const systemQuotes = quotes.filter(q => q.is_system);

  return (
    <RuleSection title="Stock Quotes" icon={BookOpen} count={systemQuotes.length}>
      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading...</p>
      ) : systemQuotes.length === 0 && !showCreate ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400 mb-3">No stock quote templates yet</p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white">
            Create Template
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {systemQuotes.map(sq => (
            <div key={sq.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#2A2A2A]">{sq.name}</span>
                {sq.restaurant_type && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{sq.restaurant_type}</span>
                )}
                <div className="text-xs text-gray-400 mt-0.5">
                  {sq.dish_count} dishes, {sq.component_count} components
                  {sq.updated_at && <> &middot; Updated <TimeAgo date={sq.updated_at} /></>}
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${sq.name}"?`)) return;
                  await deleteAdminStockQuote(sq.id);
                  loadQuotes();
                }}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!showCreate && (
            <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="w-full mt-2">
              + Add Template
            </Button>
          )}
          {showCreate && (
            <div className="border border-[#7FAEC2] rounded-lg p-4 space-y-3 bg-[#7FAEC2]/5">
              <Input
                placeholder="Template name (e.g. Italian Fine Dining)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select restaurant type</option>
                {['Italian', 'Steakhouse', 'Sushi Bar', 'Bar/Grill', 'Spanish', 'Brewery', 'Coffee Shop', 'Mexican', 'Asian Fusion', 'French'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); setNewType(''); }}>Cancel</Button>
                <Button
                  size="sm"
                  className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                  disabled={!newName.trim()}
                  onClick={async () => {
                    await createAdminStockQuote({ name: newName, restaurant_type: newType });
                    setShowCreate(false);
                    setNewName('');
                    setNewType('');
                    loadQuotes();
                  }}
                >
                  Create
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </RuleSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Training Chat Tab
// ═══════════════════════════════════════════════════════════════════════
interface ChatMessage {
  role: 'user' | 'system';
  text: string;
  rules?: string[];
  validation?: RuleValidation;
  originalMessage?: string;
  timestamp: string;
}

function ValidationBadge({ validation, onSave, onRetry, saving }: {
  validation: RuleValidation;
  onSave: () => void;
  onRetry: () => void;
  saving: boolean;
}) {
  const badge = {
    pass: { bg: 'bg-green-50 border-green-200', icon: <CheckCircle size={14} className="text-green-600" />, label: 'Validated', color: 'text-green-700' },
    warn: { bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle size={14} className="text-amber-600" />, label: 'Warnings', color: 'text-amber-700' },
    reject: { bg: 'bg-red-50 border-red-200', icon: <XCircle size={14} className="text-red-600" />, label: 'Rejected', color: 'text-red-700' },
  }[validation.status];

  return (
    <div className={`mt-2 p-3 rounded-lg border ${badge.bg}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {badge.icon}
        <span className={`text-xs font-semibold ${badge.color}`}>{badge.label}</span>
        <span className="text-xs text-gray-500 ml-1">{validation.rules.length} rule(s)</span>
      </div>
      {validation.warnings.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {validation.warnings.map((w, i) => <p key={i} className="text-xs text-amber-600">⚠ {w}</p>)}
        </div>
      )}
      {validation.rejections.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {validation.rejections.map((r, i) => <p key={i} className="text-xs text-red-600">✕ {r}</p>)}
        </div>
      )}
      {validation.rules.length > 0 && (
        <div className="mt-2 space-y-1">
          {validation.rules.map((rule, i) => (
            <div key={i} className="text-xs font-mono bg-white/60 rounded px-2 py-1">
              {(rule as Record<string, unknown>).type}: {(rule as Record<string, unknown>).ingredient_pattern || (rule as Record<string, unknown>).canonical_name || (rule as Record<string, unknown>).sauce_name || JSON.stringify(rule)}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        {validation.status !== 'reject' && validation.rules.length > 0 && (
          <Button size="sm" onClick={onSave} disabled={saving} className="bg-green-600 text-white hover:bg-green-700 text-xs h-7 px-3">
            <Save size={12} className="mr-1" /> {saving ? 'Saving...' : 'Save Rules'}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onRetry} className="text-xs h-7 px-3">
          <RotateCcw size={12} className="mr-1" /> Retry
        </Button>
      </div>
    </div>
  );
}

function TrainingTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (overrideMsg?: string) => {
    const msgToSend = overrideMsg || input.trim();
    if ((!msgToSend && !attachedFile) || sending) return;
    const userMsg = msgToSend || (attachedFile ? `Uploaded: ${attachedFile.name}` : '');
    const file = overrideMsg ? null : attachedFile;
    if (!overrideMsg) { setInput(''); setAttachedFile(null); }
    const displayText = file ? `${userMsg}\n📎 ${file.name}` : userMsg;
    setMessages(prev => [...prev, { role: 'user', text: displayText, timestamp: new Date().toISOString() }]);
    setSending(true);

    const res = await sendMatchingEngineChat(userMsg, file || undefined);
    setSending(false);

    if (res.data) {
      setMessages(prev => [...prev, {
        role: 'system',
        text: res.data!.confirmation,
        rules: res.data!.rules_applied,
        validation: res.data!.validation,
        originalMessage: userMsg,
        timestamp: res.data!.timestamp,
      }]);
    } else {
      setMessages(prev => [...prev, { role: 'system', text: res.error || 'Something went wrong', timestamp: new Date().toISOString() }]);
    }
  };

  const handleSaveRules = async (rules: Record<string, unknown>[], msgIndex: number) => {
    setSaving(true);
    const res = await saveMatchingEngineRules(rules);
    setSaving(false);
    if (res.data) {
      setMessages(prev => prev.map((m, i) => i === msgIndex ? {
        ...m,
        validation: undefined,
        rules: res.data!.rules_applied,
        text: m.text + '\n\n✓ Rules saved successfully.',
      } : m));
    } else {
      setMessages(prev => [...prev, { role: 'system', text: `Failed to save: ${res.error}`, timestamp: new Date().toISOString() }]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      <p className="text-sm text-[#4F4F4F] mb-3">Type natural language instructions to create or update matching rules. Rules are validated before saving — review and confirm.</p>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 border border-gray-200 rounded-lg bg-white p-4 mb-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-sm font-medium mb-2">No messages yet</p>
            <p className="text-xs">Try: "Hokkaido scallop should always match to dry sea scallop U10"</p>
            <p className="text-xs mt-1">Or: "Add a synonym: rocket = arugula"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2.5 ${msg.role === 'user' ? 'bg-[#7FAEC2] text-white' : 'bg-gray-100 text-[#2A2A2A]'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.rules && msg.rules.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200/50">
                  {msg.rules.map((r, j) => (
                    <p key={j} className="text-xs opacity-80">→ {r}</p>
                  ))}
                </div>
              )}
              {msg.validation && (
                <ValidationBadge
                  validation={msg.validation}
                  onSave={() => handleSaveRules(msg.validation!.rules, i)}
                  onRetry={() => handleSend(msg.originalMessage)}
                  saving={saving}
                />
              )}
            </div>
            <TimeAgo date={msg.timestamp} />
          </div>
        ))}
        {sending && (
          <div className="flex items-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2.5">
              <p className="text-sm text-gray-400 animate-pulse">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      {attachedFile && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-blue-50 rounded text-sm text-[#4F4F4F]">
          <Paperclip size={14} />
          <span className="truncate flex-1">{attachedFile.name}</span>
          <button onClick={() => setAttachedFile(null)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.csv,.json,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setAttachedFile(file);
          e.target.value = '';
        }}
      />
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="shrink-0"
          title="Attach file (.txt, .csv, .json, .xlsx)"
        >
          <Paperclip size={16} />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about matching logic or type an instruction..."
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" disabled={(!input.trim() && !attachedFile) || sending} className="bg-[#7FAEC2] text-white hover:bg-[#6b9ab0]">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Change Log Tab
// ═══════════════════════════════════════════════════════════════════════
function ChangeLogTab() {
  const [logs, setLogs] = useState<MatchingEngineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [sourceFilter]);

  const loadLogs = async () => {
    setLoading(true);
    const res = await getMatchingEngineLogs({ source: sourceFilter || undefined, limit: 200 });
    if (res.data) setLogs(res.data);
    setLoading(false);
  };

  const sourceLabels: Record<string, string> = {
    training_chat: 'Training Chat',
    manual_edit: 'Manual Edit',
    rep_correction: 'Rep Correction',
    system_seed: 'System Seed',
  };

  const sourceColor: Record<string, string> = {
    training_chat: 'bg-blue-50 text-blue-600',
    manual_edit: 'bg-purple-50 text-purple-600',
    rep_correction: 'bg-amber-50 text-amber-600',
    system_seed: 'bg-gray-100 text-gray-500',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-[#4F4F4F] flex-1">Every change to matching rules, chronologically.</p>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white"
        >
          <option value="">All sources</option>
          <option value="training_chat">Training Chat</option>
          <option value="manual_edit">Manual Edit</option>
          <option value="rep_correction">Rep Correction</option>
          <option value="system_seed">System Seed</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No log entries found.</div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="border border-gray-200 rounded-lg bg-white px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <TimeAgo date={log.created_at} />
                <span className="text-sm font-medium text-[#2A2A2A]">{log.user?.name || 'System'}</span>
                {log.source && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${sourceColor[log.source] || 'bg-gray-100 text-gray-500'}`}>
                    {sourceLabels[log.source] || log.source}
                  </span>
                )}
              </div>
              {log.message && <p className="text-sm text-[#4F4F4F] italic mb-1">"{log.message}"</p>}
              {log.response && <p className="text-sm text-[#2A2A2A]">{log.response}</p>}
              {log.rules_applied && log.rules_applied.length > 0 && (
                <div className="mt-1.5">
                  {log.rules_applied.map((r, i) => (
                    <p key={i} className="text-xs text-[#7FAEC2]">→ {r}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Menu Concepts Tab
// ═══════════════════════════════════════════════════════════════════════
function ConceptsTab() {
  const [labels, setLabels] = useState<ConceptLabel[]>([]);
  const [profileConcepts, setProfileConcepts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<ConceptTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getMatchingEngineConcepts();
      if (res.data) {
        setLabels(res.data.labels);
        setProfileConcepts(res.data.profile_concepts);
      }
      setLoading(false);
    })();
  }, []);

  const handleTest = async () => {
    if (!testInput.trim() || testing) return;
    setTesting(true);
    const res = await testMatchingEngineConcept(testInput.trim());
    if (res.data) setTestResult(res.data);
    setTesting(false);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading concepts...</div>;

  const withProfile = labels.filter(l => l.has_profile);
  const withoutProfile = labels.filter(l => !l.has_profile);

  return (
    <div className="space-y-6">
      {/* Test Concept Input */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-[#2A2A2A] mb-2">Test Concept Detection</h3>
        <p className="text-xs text-[#4F4F4F] mb-3">Type any input to see if it's recognized as a concept.</p>
        <form onSubmit={(e) => { e.preventDefault(); handleTest(); }} className="flex gap-2">
          <Input
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder='Try "italian deli" or "sushi restaurant"...'
            className="flex-1"
          />
          <Button type="submit" disabled={!testInput.trim() || testing} className="bg-[#7FAEC2] text-white hover:bg-[#6b9ab0]">
            Test
          </Button>
        </form>
        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.is_concept ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="font-medium">{testResult.is_concept ? 'Recognized as concept' : 'Not recognized as concept'}</p>
            {testResult.profile && (
              <p className="text-xs mt-1">Concept: <span className="font-mono">{testResult.profile.concept}</span> | Cuisine: {testResult.profile.cuisine || 'N/A'} | Format: {testResult.profile.format}</p>
            )}
            {testResult.profile_data && (
              <div className="mt-2 text-xs space-y-1">
                <p>Strong fit: {testResult.profile_data.strong_fit.length} items ({testResult.profile_data.strong_fit.slice(0, 5).join(', ')}{testResult.profile_data.strong_fit.length > 5 ? '...' : ''})</p>
                <p>Likely fit: {testResult.profile_data.likely_fit.length} items ({testResult.profile_data.likely_fit.slice(0, 5).join(', ')}{testResult.profile_data.likely_fit.length > 5 ? '...' : ''})</p>
                <p>Manual review: {testResult.profile_data.manual.length} items</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[#2A2A2A]">{labels.length}</p>
          <p className="text-xs text-[#4F4F4F]">Recognized Labels</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[#2A2A2A]">{profileConcepts.length}</p>
          <p className="text-xs text-[#4F4F4F]">Concept Profiles</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[#2A2A2A]">{withoutProfile.length}</p>
          <p className="text-xs text-[#4F4F4F]">Labels Without Profile</p>
        </div>
      </div>

      {/* Labels with profiles */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">Concepts with Profiles ({withProfile.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-[#4F4F4F]">
                <th className="pb-2 pr-4">Label</th>
                <th className="pb-2 pr-4">Concept</th>
                <th className="pb-2 pr-4">Cuisine</th>
                <th className="pb-2 pr-4">Format</th>
                <th className="pb-2 pr-4 text-center">Strong</th>
                <th className="pb-2 pr-4 text-center">Likely</th>
                <th className="pb-2 text-center">Manual</th>
              </tr>
            </thead>
            <tbody>
              {withProfile.map((l, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium">{l.label}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{l.concept}</td>
                  <td className="py-2 pr-4">{l.cuisine || '—'}</td>
                  <td className="py-2 pr-4 text-xs">{l.format}</td>
                  <td className="py-2 pr-4 text-center">{l.strong_fit_count}</td>
                  <td className="py-2 pr-4 text-center">{l.likely_fit_count}</td>
                  <td className="py-2 text-center">{l.manual_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Labels without profiles */}
      {withoutProfile.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-700 mb-3">Labels Without Profiles ({withoutProfile.length})</h3>
          <p className="text-xs text-[#4F4F4F] mb-3">These labels are recognized but don't have ingredient profiles yet. They'll fall through to menu parsing.</p>
          <div className="flex flex-wrap gap-2">
            {withoutProfile.map((l, i) => (
              <span key={i} className="px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs">
                {l.label} <span className="text-amber-500">({l.cuisine || l.format})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Diagnose Tab (Fix 119)
// ═══════════════════════════════════════════════════════════════════════

function DiagProductRow({ p, status }: { p: ProductBrief; status: 'pass' | 'fail' | 'neutral' }) {
  const bg = status === 'pass' ? 'bg-green-50' : status === 'fail' ? 'bg-red-50' : 'bg-gray-50';
  const dotColor = status === 'pass' ? 'bg-green-500' : status === 'fail' ? 'bg-red-500' : 'bg-gray-400';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs ${bg}`}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
      <span className="font-medium text-[#2A2A2A]">{p.brand} {p.product_name}</span>
      <span className="text-gray-400">({p.category})</span>
      {p.normalized_category && <span className="text-blue-400">[{p.normalized_category}]</span>}
      {p.pack_size && <span className="text-gray-400">{p.pack_size}</span>}
    </div>
  );
}

function DiagSection({ title, open: defaultOpen = false, count, color, children }: {
  title: string; open?: boolean; count?: number; color?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-gray-50">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className={`text-sm font-semibold ${color || 'text-[#2A2A2A]'}`}>{title}</span>
        {count !== undefined && <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>}
      </button>
      {open && <div className="px-4 pb-3 border-t border-gray-100 space-y-2 pt-2">{children}</div>}
    </div>
  );
}

function ScoreBar({ label, value, max = 1.0 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-gray-500 text-right">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-gray-600 font-mono">{value.toFixed(2)}</span>
    </div>
  );
}

function DiagnoseTab() {
  const [catalogs, setCatalogs] = useState<DiagnosticCatalog[]>([]);
  const [catalogId, setCatalogId] = useState('');
  const [component, setComponent] = useState('');
  const [category, setCategory] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState('');

  // Teach mode state
  const [teachMode, setTeachMode] = useState(false);
  const [userPicks, setUserPicks] = useState<Record<number, string>>({}); // position -> product_id
  const [teachResult, setTeachResult] = useState<TeachResult | null>(null);
  const [teachStep, setTeachStep] = useState<'pick' | 'review' | 'applied'>('pick');
  const [teachLoading, setTeachLoading] = useState(false);
  const [appliedResult, setAppliedResult] = useState<TeachApplyResult | null>(null);
  const [editedRules, setEditedRules] = useState<TeachProposedRule[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lastSavedRuleIds, setLastSavedRuleIds] = useState<string[]>([]);

  useEffect(() => {
    getDiagnosticsCatalogs().then(res => {
      if (res.data?.catalogs) {
        setCatalogs(res.data.catalogs);
        if (res.data.catalogs.length > 0) setCatalogId(res.data.catalogs[0].id);
      }
    });
  }, []);

  const resetTeach = () => {
    setTeachMode(false);
    setUserPicks({});
    setTeachResult(null);
    setTeachStep('pick');
    setAppliedResult(null);
    setEditedRules([]);
    setLastSavedRuleIds([]);
  };

  const handleRun = async () => {
    if (!component.trim() || !catalogId) return;
    setRunning(true);
    setError('');
    setResult(null);
    resetTeach();
    const res = await runDiagnostic(component.trim(), catalogId, category.trim() || undefined);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setResult(res.data);
    }
    setRunning(false);
  };

  const togglePick = (position: number, productId: string) => {
    setUserPicks(prev => {
      const next = { ...prev };
      // If this product is already at this position, deselect
      if (next[position] === productId) {
        delete next[position];
        return next;
      }
      // Remove product from any other position
      for (const p of [1, 2, 3]) {
        if (next[p] === productId) delete next[p];
      }
      next[position] = productId;
      return next;
    });
  };

  const getPickPosition = (productId: string): number | null => {
    for (const [pos, pid] of Object.entries(userPicks)) {
      if (pid === productId) return Number(pos);
    }
    return null;
  };

  const handleAnalyze = async () => {
    if (!result || Object.keys(userPicks).length === 0) return;
    setTeachLoading(true);
    const picks = Object.entries(userPicks).map(([pos, pid]) => ({ position: Number(pos), product_id: pid }));
    const res = await runTeachAnalysis(
      component.trim(), catalogId, picks,
      result.scoring.candidates, category.trim() || undefined
    );
    if (res.data) {
      setTeachResult(res.data);
      setEditedRules([...res.data.proposed_rules]);
      setTeachStep('review');
    }
    setTeachLoading(false);
  };

  const handleEditRule = (idx: number, field: keyof TeachProposedRule, value: string) => {
    setEditedRules(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleDeleteRule = (idx: number) => {
    setEditedRules(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddRule = () => {
    setEditedRules(prev => [...prev, {
      rule_type: 'product_prefer',
      target_name: '',
      replacement_name: null,
      reason: `Manual rule for '${component.trim()}'`,
      affects_positions: []
    }]);
  };

  const handleRefreshPreview = async () => {
    if (!result) return;
    setPreviewLoading(true);
    const res = await runTeachPreview(component.trim(), catalogId, editedRules, result.scoring.candidates);
    if (res.data && teachResult) {
      setTeachResult({ ...teachResult, preview: res.data.preview, conflicts: res.data.conflicts });
    }
    setPreviewLoading(false);
  };

  const handleApply = async () => {
    if (!result || editedRules.length === 0) return;
    setTeachLoading(true);
    const picks = Object.entries(userPicks).map(([pos, pid]) => ({ position: Number(pos), product_id: pid }));
    const res = await applyTeachRules(
      component.trim(), catalogId, editedRules, picks,
      result.scoring.candidates, category.trim() || undefined
    );
    if (res.data) {
      setAppliedResult(res.data);
      setLastSavedRuleIds(res.data.saved_rule_ids);
      setTeachStep('applied');
    }
    setTeachLoading(false);
  };

  const handleUndo = async () => {
    if (lastSavedRuleIds.length === 0) return;
    setTeachLoading(true);
    await undoTeachSession(lastSavedRuleIds);
    setLastSavedRuleIds([]);
    resetTeach();
    // Re-run diagnostic to show reverted state
    const res = await runDiagnostic(component.trim(), catalogId, category.trim() || undefined);
    if (res.data) setResult(res.data);
    setTeachLoading(false);
  };

  const ruleTypeOptions = [
    { value: 'product_prefer', label: 'Prefer Product' },
    { value: 'product_exclude', label: 'Exclude Product' },
    { value: 'brand_prefer', label: 'Prefer Brand' },
    { value: 'brand_exclude', label: 'Exclude Brand' },
    { value: 'ingredient_prefer', label: 'Prefer Ingredient' },
    { value: 'ingredient_exclude', label: 'Exclude Ingredient' },
  ];

  return (
    <div className="space-y-6">
      {/* Input form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Microscope size={18} className="text-[#7FAEC2]" />
          <span className="font-semibold text-sm text-[#2A2A2A]">Matching Diagnostic</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ingredient name</label>
            <Input
              value={component}
              onChange={e => setComponent(e.target.value)}
              placeholder="e.g. burrata, basil, hamachi"
              onKeyDown={e => e.key === 'Enter' && handleRun()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Catalog</label>
            <select
              value={catalogId}
              onChange={e => setCatalogId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {catalogs.map(c => (
                <option key={c.id} value={c.id}>
                  {c.distributor_name}{c.is_demo ? ' (Demo)' : ''} — {c.product_count} products
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category override (optional)</label>
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. dairy, produce"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={handleRun} disabled={running || !component.trim()} className="bg-[#7FAEC2] hover:bg-[#6A9BB0] text-white">
            {running ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Search size={14} className="mr-2" />}
            {running ? 'Running...' : 'Run Diagnostic'}
          </Button>
          {!teachMode && result && result.scoring.candidates && result.scoring.candidates.length > 0 && teachStep === 'pick' && (
            <Button onClick={() => setTeachMode(true)} variant="outline" className="text-[#7FAEC2] border-[#7FAEC2]">
              <GraduationCap size={14} className="mr-2" /> Teach the Engine
            </Button>
          )}
          {teachMode && teachStep === 'pick' && (
            <>
              <Button
                onClick={handleAnalyze}
                disabled={Object.keys(userPicks).length === 0 || teachLoading}
                className="bg-[#7FAEC2] hover:bg-[#6A9BB0] text-white"
              >
                {teachLoading ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Search size={14} className="mr-2" />}
                Analyze Gaps
              </Button>
              <Button onClick={resetTeach} variant="outline" className="text-gray-500">Cancel</Button>
              <p className="text-xs text-gray-500">Click 1st/2nd/3rd on your preferred products, then analyze.</p>
            </>
          )}
          {lastSavedRuleIds.length > 0 && teachStep !== 'applied' && (
            <Button onClick={handleUndo} variant="outline" className="text-orange-600 border-orange-300">
              <Undo2 size={14} className="mr-1" /> Undo Last Teach
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-1">
          {/* Active rule count badge */}
          {(result.active_rule_count ?? 0) > 0 && (
            <div className={`rounded-lg p-3 mb-2 border ${(result.active_rule_count ?? 0) > 5 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-2 text-xs">
                <Shield size={14} className={(result.active_rule_count ?? 0) > 5 ? 'text-amber-600' : 'text-blue-500'} />
                <span className="font-medium">{result.active_rule_count} active rule(s)</span>
                {(result.active_rule_count ?? 0) > 5 && <span className="text-amber-600">— Consider consolidating</span>}
              </div>
              {result.active_rules && result.active_rules.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.active_rules.map((r, i) => (
                    <div key={i} className="text-xs text-gray-500 pl-5">
                      <span className="font-mono">{r.rule_type}</span>: {r.target_name}
                      {r.source && <span className="text-gray-400"> ({r.source})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Final result banner */}
          {result.final_result.match ? (
            <div className={`rounded-lg p-4 mb-4 ${
              result.final_result.match.quality === 'strong' ? 'bg-green-50 border border-green-200' :
              result.final_result.match.quality === 'moderate' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-orange-50 border border-orange-200'
            }`}>
              <div className="flex items-center gap-3">
                {result.final_result.match.quality === 'strong' ? <CheckCircle size={20} className="text-green-600" /> :
                 result.final_result.match.quality === 'moderate' ? <AlertTriangle size={20} className="text-yellow-600" /> :
                 <AlertTriangle size={20} className="text-orange-600" />}
                <div>
                  <p className="font-semibold text-sm">
                    Match: {result.final_result.match.brand} {result.final_result.match.product_name}
                  </p>
                  <p className="text-xs text-gray-600">
                    Score: {(result.final_result.match.score * 100).toFixed(0)}% ({result.final_result.match.quality}) •
                    {result.final_result.alternates_count} alternates •
                    {result.final_result.total_scored} total scored
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg p-4 mb-4 bg-red-50 border border-red-200">
              <div className="flex items-center gap-3">
                <XCircle size={20} className="text-red-600" />
                <div>
                  <p className="font-semibold text-sm text-red-800">No Match (Clean Miss)</p>
                  <p className="text-xs text-red-600">{result.final_result.reason}</p>
                  {result.final_result.best_score !== undefined && (
                    <p className="text-xs text-red-500">Best score: {(result.final_result.best_score * 100).toFixed(0)}%</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Input */}
          <DiagSection title="Step 1 — Input" open={true} color="text-blue-700">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <div><span className="text-gray-500">Component:</span> <span className="font-medium">{result.input.component_name}</span></div>
              <div><span className="text-gray-500">Normalized:</span> <span className="font-mono">{result.input.normalized_name}</span></div>
              <div><span className="text-gray-500">Category:</span> <span className="font-medium">{result.input.inferred_category}</span></div>
              <div><span className="text-gray-500">Format:</span> <span className="font-medium">{result.input.detected_format || '(none)'}</span></div>
              <div><span className="text-gray-500">Synonyms:</span> <span className="font-mono">{result.input.synonyms_expanded.join(', ')}</span></div>
              <div><span className="text-gray-500">Family:</span> <span className="font-mono">{result.input.synonym_family || '(none)'}</span></div>
              <div><span className="text-gray-500">Adjacency allowed:</span> <span className="font-mono">{result.input.adjacency_allowed?.join(', ') || '(none)'}</span></div>
              <div><span className="text-gray-500">Absurd blocked:</span> <span className="font-mono text-red-500">{result.input.absurd_blocked?.length ? result.input.absurd_blocked.join(', ') : '(none)'}</span></div>
              <div>
                <span className="text-gray-500">Identity Lock:</span>{' '}
                {result.input.identity_locked ? <span className="text-red-600 font-semibold">LOCKED</span> :
                 result.input.identity_semi_locked ? <span className="text-yellow-600 font-semibold">SEMI-LOCKED</span> :
                 <span className="text-green-600">unlocked</span>}
              </div>
            </div>
          </DiagSection>

          {/* Step 2 — RetrievalGuard */}
          <DiagSection title="Step 2 — RetrievalGuard" count={result.retrieval_guard.final_candidates.length} color="text-purple-700">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Synonym/Text Matches ({result.retrieval_guard.synonym_text_matches.count})</p>
                {result.retrieval_guard.synonym_text_matches.token_fallback_used && (
                  <p className="text-xs text-orange-500 mb-1">Fix 126: Full phrase got 0 hits — token fallback used: [{result.retrieval_guard.synonym_text_matches.token_fallback_tokens?.join(', ')}]</p>
                )}
                <div className="space-y-1">
                  {result.retrieval_guard.synonym_text_matches.top_10.map((p, i) => (
                    <DiagProductRow key={i} p={p} status="neutral" />
                  ))}
                  {result.retrieval_guard.synonym_text_matches.count === 0 && (
                    <p className="text-xs text-gray-400 italic">No products matched synonym/text search</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Absurd Category Block (Tier 1) — {result.retrieval_guard.absurd_category_block?.survived ?? result.retrieval_guard.category_gating?.survived ?? 0} survived
                  {result.retrieval_guard.absurd_category_block?.absurd_pairs?.length > 0 && (
                    <span className="text-gray-400 font-normal"> | blocked pairs: [{result.retrieval_guard.absurd_category_block.absurd_pairs.join(', ')}]</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 italic mb-1">Category adjacency boost (+20%) applied in scoring, not as a filter</p>
                {(result.retrieval_guard.absurd_category_block?.removed ?? result.retrieval_guard.category_gating?.removed ?? []).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-600 mb-1">Filtered out:</p>
                    {(result.retrieval_guard.absurd_category_block?.removed ?? result.retrieval_guard.category_gating?.removed ?? []).map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-red-50">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                        <span className="font-medium">{r.product.brand} {r.product.product_name}</span>
                        <span className="text-gray-400">[{r.product.normalized_category}]</span>
                        <span className="text-red-500">— {r.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {result.retrieval_guard.format_blocking.removed.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Format Blocked ({result.retrieval_guard.format_blocking.removed.length} removed)</p>
                  <div className="space-y-1">
                    {result.retrieval_guard.format_blocking.removed.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-red-50">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                        <span className="font-medium">{r.product.brand} {r.product.product_name}</span>
                        <span className="text-red-500">— {r.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.retrieval_guard.prep_state_gate && result.retrieval_guard.prep_state_gate.removed.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Prep State Gate — {result.retrieval_guard.prep_state_gate.removed.length} prepared_finished blocked</p>
                  <div className="space-y-1">
                    {result.retrieval_guard.prep_state_gate.removed.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-red-50">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                        <span className="font-medium">{r.product.brand} {r.product.product_name}</span>
                        <span className="text-red-500">— {r.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Final Guard Candidates ({result.retrieval_guard.final_candidates.length})</p>
                <div className="space-y-1">
                  {result.retrieval_guard.final_candidates.map((p, i) => (
                    <DiagProductRow key={i} p={p} status="pass" />
                  ))}
                  {result.retrieval_guard.final_candidates.length === 0 && (
                    <p className="text-xs text-orange-500 font-medium">Guard returned empty → fallback path triggered</p>
                  )}
                </div>
              </div>
            </div>
          </DiagSection>

          {/* Step 3 — Fallback */}
          <DiagSection title="Step 3 — Fallback Path" color={result.fallback_path.triggered ? 'text-orange-600' : 'text-green-700'}>
            {!result.fallback_path.triggered ? (
              <p className="text-xs text-green-600">{result.fallback_path.reason}</p>
            ) : (
              <div className="space-y-2 text-xs">
                {result.fallback_path.guard_fallback_fired && (
                  <p className="text-orange-600 font-medium">Guard fallback fired — {result.fallback_path.guard_fallback_count} candidates via token search</p>
                )}
                {result.fallback_path.absurd_blocked_fallback && (
                  <>
                    <p className="text-orange-600 font-medium">Absurd-pair fallback (Fix 125)</p>
                    {result.fallback_path.absurd_pairs_excluded?.length > 0 && (
                      <p className="text-gray-500">Excluded absurd categories: [{result.fallback_path.absurd_pairs_excluded.join(', ')}]</p>
                    )}
                    <p className="text-gray-500">Pool size: {result.fallback_path.pool_size} products</p>
                  </>
                )}
                {result.fallback_path.category_constrained_fallback && (
                  <>
                    <p className="text-orange-600 font-medium">Category-constrained fallback (Fix 111)</p>
                    <p className="text-gray-500">Searched categories: [{result.fallback_path.searched_categories?.join(', ')}]</p>
                    <p className="text-gray-500">Pool size: {result.fallback_path.pool_size} products</p>
                  </>
                )}
                {result.fallback_path.clean_miss && (
                  <p className="text-red-600 font-semibold">Clean miss — no match. {result.fallback_path.reason}</p>
                )}
                {result.fallback_path.candidates_found && result.fallback_path.candidates_found.length > 0 && (
                  <div className="space-y-1">
                    {result.fallback_path.candidates_found.map((p, i) => (
                      <DiagProductRow key={i} p={p} status="pass" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </DiagSection>

          {/* Step 4 — Scoring with teach mode pick buttons */}
          <DiagSection title="Step 4 — Alignment Scoring" count={result.scoring.candidates?.length} color="text-indigo-700">
            <div className="text-xs text-gray-500 mb-2 space-x-4">
              <span>Sensitivity: <strong>{result.scoring.sensitivity}</strong></span>
              <span>Role: <strong>{result.scoring.role}</strong></span>
              <span>Floor: <strong>{(result.scoring.floor * 100).toFixed(0)}%</strong></span>
              <span>Locked: <strong>{result.scoring.locked ? 'YES' : 'no'}</strong></span>
              {result.scoring.identity_family && <span>Family: <strong>{result.scoring.identity_family}</strong></span>}
            </div>
            {result.scoring.note && <p className="text-xs text-gray-400 italic">{result.scoring.note}</p>}
            <div className="space-y-3">
              {result.scoring.candidates?.map((c, i) => {
                const pickPos = getPickPosition(c.product_id);
                return (
                  <div key={i} className={`border rounded-lg p-3 ${
                    pickPos ? 'border-green-400 bg-green-50 ring-1 ring-green-300' :
                    c.above_floor ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                        <span className="text-sm font-semibold text-[#2A2A2A]">{c.brand} {c.product_name}</span>
                        <span className="text-xs text-gray-400">({c.category})</span>
                        {c.normalized_category && <span className="text-xs text-blue-400">[{c.normalized_category}]</span>}
                        {c.pack_size && <span className="text-xs text-gray-400">{c.pack_size}</span>}
                        {pickPos && <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Your #{pickPos}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {teachMode && teachStep === 'pick' && (
                          <div className="flex gap-1">
                            {[1, 2, 3].map(pos => (
                              <button
                                key={pos}
                                onClick={() => togglePick(pos, c.product_id)}
                                className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                                  userPicks[pos] === c.product_id
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {pos === 1 ? '1st' : pos === 2 ? '2nd' : '3rd'}
                              </button>
                            ))}
                          </div>
                        )}
                        <span className={`text-sm font-bold ${c.above_floor ? 'text-green-700' : 'text-red-600'}`}>
                          {(c.scores.total * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <ScoreBar label="Exact Identity" value={c.scores.exact_identity} />
                      <ScoreBar label="Name Similarity" value={c.scores.name_similarity} />
                      <ScoreBar label="Category Fit" value={c.scores.category_fit} />
                      <ScoreBar label="Role Fit" value={c.scores.role_fit} />
                      <ScoreBar label="Keyword Overlap" value={c.scores.keyword_overlap} />
                      <ScoreBar label="Pack Plausibility" value={c.scores.pack_plausibility} />
                      <ScoreBar label="Concept Fit" value={c.scores.concept_fit} />
                      <ScoreBar label="Format Fit" value={c.scores.format_fit} />
                      {c.scores.name_boost > 0 && <ScoreBar label="Name Boost" value={c.scores.name_boost} max={0.25} />}
                      {c.scores.category_boost > 0 && <ScoreBar label="Category Boost (Fix 125)" value={c.scores.category_boost} max={0.20} />}
                    </div>
                  </div>
                );
              })}
            </div>

          </DiagSection>

          {/* Teach mode: Review panel */}
          {teachResult && teachStep === 'review' && (
            <DiagSection title="Teach — Gap Analysis & Rules" open={true} color="text-[#7FAEC2]">
              <div className="space-y-4">
                {/* Gap analysis */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Gap Analysis ({teachResult.gaps.agreement_count}/{teachResult.gaps.total_positions} already correct)</p>
                  <div className="space-y-2">
                    {teachResult.gaps.gaps.map((g, i) => (
                      <div key={i} className={`rounded-lg p-3 text-xs ${g.already_correct ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">Position #{g.position}</span>
                          {g.already_correct ? (
                            <span className="text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Already correct</span>
                          ) : (
                            <span className="text-orange-600">Needs adjustment</span>
                          )}
                        </div>
                        {!g.already_correct && (
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                              <span className="text-gray-500">Engine picked:</span> <span className="font-medium">{g.engine_pick?.product_name}</span>
                              <span className="text-gray-400 ml-1">({((g.engine_pick?.engine_score ?? 0) * 100).toFixed(0)}%)</span>
                            </div>
                            <div>
                              <span className="text-gray-500">You picked:</span> <span className="font-medium">{g.user_pick.product_name}</span>
                              <span className="text-gray-400 ml-1">({(g.user_pick.engine_score * 100).toFixed(0)}% at #{g.user_pick.engine_rank})</span>
                            </div>
                            {Object.keys(g.factor_deltas).length > 0 && (
                              <div className="col-span-2 text-gray-400">
                                Key deltas: {Object.entries(g.factor_deltas).map(([f, d]) => `${f}: ${d > 0 ? '+' : ''}${(d * 100).toFixed(0)}%`).join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editable rules */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-600">Proposed Rules ({editedRules.length})</p>
                    <button onClick={handleAddRule} className="flex items-center gap-1 text-xs text-[#7FAEC2] hover:text-[#6A9BB0]">
                      <Plus size={12} /> Add Rule
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{teachResult.explanation}</p>
                  <div className="space-y-2">
                    {editedRules.map((rule, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <select
                                value={rule.rule_type}
                                onChange={e => handleEditRule(idx, 'rule_type', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-xs"
                              >
                                {ruleTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <input
                                value={rule.target_name}
                                onChange={e => handleEditRule(idx, 'target_name', e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                                placeholder="Target product/brand name"
                              />
                            </div>
                            <input
                              value={rule.reason}
                              onChange={e => handleEditRule(idx, 'reason', e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-gray-500"
                              placeholder="Reason"
                            />
                          </div>
                          <button onClick={() => handleDeleteRule(idx)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {rule.affects_positions.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">Affects position(s): {rule.affects_positions.join(', ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleRefreshPreview} disabled={previewLoading} variant="outline" className="mt-2 text-xs">
                    {previewLoading ? <RefreshCw size={12} className="animate-spin mr-1" /> : <RefreshCw size={12} className="mr-1" />}
                    Refresh Preview
                  </Button>
                </div>

                {/* Conflicts */}
                {teachResult.conflicts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-orange-600 mb-2">Conflicts Detected ({teachResult.conflicts.length})</p>
                    <div className="space-y-2">
                      {teachResult.conflicts.map((c, i) => (
                        <div key={i} className={`rounded-lg p-2 text-xs border ${
                          c.type === 'contradiction' ? 'bg-red-50 border-red-200' :
                          c.warning ? 'bg-amber-50 border-amber-200' :
                          'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-center gap-1">
                            <AlertTriangle size={12} className={c.type === 'contradiction' ? 'text-red-500' : 'text-amber-500'} />
                            <span className="font-medium capitalize">{c.type.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-gray-600 mt-1">{c.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview */}
                {teachResult.preview.candidates.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Preview — Projected Ranking</p>
                    <div className="space-y-1">
                      {teachResult.preview.candidates.slice(0, 10).map((c, i) => {
                        const moved = c.new_rank < c.original_rank;
                        const dropped = c.new_rank > c.original_rank;
                        const isUserPick = Object.values(userPicks).includes(c.product_id);
                        return (
                          <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded text-xs ${
                            isUserPick ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                          }`}>
                            <span className="font-bold text-gray-400 w-6">#{c.new_rank}</span>
                            {moved && <ArrowUp size={12} className="text-green-500" />}
                            {dropped && <ArrowDown size={12} className="text-red-400" />}
                            {!moved && !dropped && <span className="w-3" />}
                            <span className="font-medium flex-1">{c.brand} {c.product_name}</span>
                            <span className="text-gray-400">was #{c.original_rank}</span>
                            <span className={`font-bold ${c.adjusted_score > c.original_score ? 'text-green-600' : c.adjusted_score < c.original_score ? 'text-red-600' : 'text-gray-600'}`}>
                              {(c.adjusted_score * 100).toFixed(0)}%
                            </span>
                            {c.rules_applied.length > 0 && (
                              <span className="text-xs text-blue-400">[{c.rules_applied.join(', ')}]</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Apply / Cancel */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                  <Button
                    onClick={handleApply}
                    disabled={teachLoading || editedRules.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {teachLoading ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                    Apply {editedRules.length} Rule(s)
                  </Button>
                  <Button onClick={resetTeach} variant="outline" className="text-gray-500">Cancel</Button>
                </div>
              </div>
            </DiagSection>
          )}

          {/* Teach mode: Applied confirmation */}
          {appliedResult && teachStep === 'applied' && (
            <DiagSection title="Teach — Rules Applied" open={true} color="text-green-700">
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm font-semibold text-green-800">{lastSavedRuleIds.length} rule(s) saved</span>
                  </div>
                </div>

                {/* Confirmed ranking */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Confirmed Ranking (fresh diagnostic)</p>
                  <div className="space-y-1">
                    {appliedResult.confirmed_result.scoring.candidates?.slice(0, 10).map((c, i) => {
                      const isUserPick = Object.values(userPicks).includes(c.product_id);
                      const userPos = getPickPosition(c.product_id);
                      const posMatch = userPos === i + 1;
                      return (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded text-xs ${
                          isUserPick && posMatch ? 'bg-green-50 border border-green-300' :
                          isUserPick ? 'bg-yellow-50 border border-yellow-200' :
                          'bg-gray-50'
                        }`}>
                          <span className="font-bold text-gray-400 w-6">#{i + 1}</span>
                          {isUserPick && posMatch && <CheckCircle size={12} className="text-green-500" />}
                          {isUserPick && !posMatch && <AlertTriangle size={12} className="text-amber-500" />}
                          <span className="font-medium flex-1">{c.brand} {c.product_name}</span>
                          <span className={`font-bold ${c.above_floor ? 'text-green-700' : 'text-red-600'}`}>
                            {(c.scores.total * 100).toFixed(0)}%
                          </span>
                          {userPos && <span className="text-xs text-gray-400">(your #{userPos})</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                  <Button onClick={handleUndo} variant="outline" className="text-orange-600 border-orange-300">
                    <Undo2 size={14} className="mr-1" /> Undo
                  </Button>
                  <Button onClick={resetTeach} variant="outline" className="text-gray-500">Done</Button>
                </div>
              </div>
            </DiagSection>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Catalogs Tab — Admin catalog classification
// ═══════════════════════════════════════════════════════════════════════

const ADMIN_CATEGORIES = [
  'produce', 'meat', 'poultry', 'seafood', 'dairy', 'cheese', 'dry_goods',
  'frozen', 'bakery', 'beverage', 'prepared', 'non_food', 'other',
];

const CAT_COLORS: Record<string, string> = {
  produce: 'bg-green-100 text-green-700',
  meat: 'bg-red-100 text-red-700',
  poultry: 'bg-red-50 text-red-600',
  seafood: 'bg-blue-100 text-blue-700',
  dairy: 'bg-yellow-50 text-yellow-600',
  cheese: 'bg-yellow-100 text-yellow-700',
  dry_goods: 'bg-amber-100 text-amber-700',
  frozen: 'bg-cyan-100 text-cyan-700',
  bakery: 'bg-pink-100 text-pink-700',
  beverage: 'bg-purple-100 text-purple-700',
  prepared: 'bg-teal-100 text-teal-700',
  non_food: 'bg-slate-100 text-slate-700',
  other: 'bg-gray-100 text-gray-500',
  // Legacy categories (for catalogs classified before framework update)
  protein: 'bg-red-100 text-red-700',
  oils_condiments: 'bg-orange-100 text-orange-700',
  spice: 'bg-rose-100 text-rose-700',
  beverage_bar: 'bg-purple-100 text-purple-700',
  tomatoes: 'bg-red-50 text-red-600',
  sauce: 'bg-orange-50 text-orange-600',
  charcuterie: 'bg-rose-100 text-rose-800',
};

function CatalogsTab() {
  const [searchParams] = useSearchParams();
  const urlCatalogId = searchParams.get('catalog_id') || '';
  const urlBrand = searchParams.get('brand') || '';
  const urlCategory = searchParams.get('category') || '';

  const [catalogs, setCatalogs] = useState<DiagnosticCatalog[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState(urlCatalogId);
  const [stats, setStats] = useState<AdminCatalogStats | null>(null);
  const [products, setProducts] = useState<AdminCatalogProductsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterCat, setFilterCat] = useState(urlCategory);
  const [filterBrand, setFilterBrand] = useState(urlBrand);
  const [searchInput, setSearchInput] = useState(urlBrand);
  const [search, setSearch] = useState(urlBrand);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCat, setBulkCat] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  useEffect(() => {
    getAdminCatalogs().then(res => {
      if (res.data?.catalogs) {
        setCatalogs(res.data.catalogs);
        // Auto-select catalog from URL param, or first active catalog if brand filter is set
        if (urlCatalogId) {
          setSelectedCatalogId(urlCatalogId);
        } else if ((urlBrand || urlCategory) && res.data.catalogs.length > 0) {
          const active = res.data.catalogs.find((c: any) => c.status === 'active') || res.data.catalogs[0];
          setSelectedCatalogId(active.id);
        }
      }
    });
  }, []);

  const loadStats = async (catId: string) => {
    setLoading(true);
    const res = await getAdminCatalogStats(catId);
    if (res.data) setStats(res.data);
    setLoading(false);
  };

  const loadProducts = async () => {
    if (!selectedCatalogId) return;
    const res = await getAdminCatalogProducts(selectedCatalogId, page, 50, {
      category: filterCat || undefined,
      search: search || undefined,
      brand: filterBrand || undefined,
    });
    if (res.data) setProducts(res.data);
  };

  useEffect(() => {
    if (selectedCatalogId) {
      loadStats(selectedCatalogId);
      setPage(1);
      setFilterCat('');
      setFilterBrand('');
      setSearch('');
      setSearchInput('');
      setSelected(new Set());
    }
  }, [selectedCatalogId]);

  useEffect(() => { loadProducts(); }, [selectedCatalogId, page, filterCat, filterBrand, search]);
  useEffect(() => { setSelected(new Set()); }, [page, filterCat, filterBrand, search]);

  // Poll during reclassification
  useEffect(() => {
    if (!reclassifying || !selectedCatalogId) return;
    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      const res = await getAdminCatalogStats(selectedCatalogId);
      if (res.data) {
        setStats(res.data);
        // "complete" means done — or if we've polled 3+ times and it's still not "classifying",
        // the thread likely finished before we started polling
        if (res.data.classification_status === 'complete' || (pollCount >= 3 && res.data.classification_status !== 'classifying')) {
          clearInterval(interval);
          setReclassifying(false);
          loadProducts();
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [reclassifying, selectedCatalogId]);

  const allCats = () => {
    const s = new Set(ADMIN_CATEGORIES);
    if (stats?.by_category) Object.keys(stats.by_category).forEach(c => s.add(c));
    return Array.from(s);
  };

  const handleReclassify = async () => {
    setReclassifying(true);
    const res = await adminReclassifyOthers(selectedCatalogId);
    if (res.error) {
      setReclassifying(false);
      return;
    }
    // Force stats to show classifying state immediately
    if (stats) {
      setStats({ ...stats, classification_status: 'classifying', classification_progress: 0, classification_total: res.data?.other_count || 0 });
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkCat || selected.size === 0) return;
    setBulkSaving(true);
    await adminBulkUpdateCategory(selectedCatalogId, Array.from(selected), bulkCat);
    setSelected(new Set());
    setBulkCat('');
    setBulkSaving(false);
    await loadStats(selectedCatalogId);
    loadProducts();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (!products) return;
    const ids = products.products.map(p => p.id);
    const all = ids.every(id => selected.has(id));
    setSelected(prev => { const n = new Set(prev); ids.forEach(id => all ? n.delete(id) : n.add(id)); return n; });
  };

  const sortedCats = stats?.by_category
    ? Object.entries(stats.by_category).sort((a, b) => a[0] === 'other' ? 1 : b[0] === 'other' ? -1 : b[1] - a[1])
    : [];

  const otherCount = stats?.by_category?.other || 0;
  const pageIds = products?.products.map(p => p.id) || [];
  const allSel = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const someSel = pageIds.some(id => selected.has(id));

  return (
    <div>
      {/* Catalog selector */}
      <div className="mb-6">
        <label className="text-xs text-gray-500 block mb-1">Select Catalog</label>
        <select
          value={selectedCatalogId}
          onChange={e => setSelectedCatalogId(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-[#A5CFDD]"
        >
          <option value="">Choose a catalog...</option>
          {catalogs.map(c => (
            <option key={c.id} value={c.id}>
              {c.distributor_name} — {c.product_count} products {c.is_demo ? '(demo)' : ''}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}

      {stats && !loading && (
        <>
          {/* Classification banner */}
          {(stats.classification_status === 'classifying' || reclassifying) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />
              <p className="text-sm font-medium text-blue-800">
                Classifying... {stats.classification_progress} / {stats.classification_total}
              </p>
            </div>
          )}

          {/* Stats + category chips */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#2A2A2A]">
                {stats.distributor_name} — {stats.total_products.toLocaleString()} products
              </p>
              {filterCat && (
                <button onClick={() => { setFilterCat(''); setPage(1); }} className="text-xs text-[#A5CFDD] hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear filter
                </button>
              )}
            </div>

            {/* Bar */}
            <div className="flex h-6 rounded-lg overflow-hidden mb-3">
              {sortedCats.map(([cat, count]) => {
                const pct = (count / stats.total_products) * 100;
                if (pct < 0.5) return null;
                const bg = (CAT_COLORS[cat] || 'bg-indigo-100 text-indigo-700').split(' ')[0];
                return (
                  <div key={cat} className={`${bg} cursor-pointer hover:opacity-80 relative`} style={{ width: `${pct}%` }}
                    onClick={() => { setFilterCat(cat === filterCat ? '' : cat); setPage(1); }}
                    title={`${toTitleCase(cat)}: ${count}`}>
                    {pct > 8 && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium truncate px-1">{toTitleCase(cat)}</span>}
                  </div>
                );
              })}
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-1.5">
              {sortedCats.map(([cat, count]) => {
                const colors = CAT_COLORS[cat] || 'bg-indigo-100 text-indigo-700';
                return (
                  <button key={cat} onClick={() => { setFilterCat(cat === filterCat ? '' : cat); setPage(1); }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${colors} ${filterCat === cat ? 'ring-2 ring-[#A5CFDD] ring-offset-1' : 'hover:opacity-80'}`}>
                    {toTitleCase(cat)} <span className="font-bold">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Uncategorized banner + Reclassify */}
            {otherCount > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    <span className="font-bold text-orange-600">{otherCount}</span> uncategorized
                  </span>
                  <button
                    onClick={() => { setFilterCat(filterCat === 'other' ? '' : 'other'); setPage(1); }}
                    className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                      filterCat === 'other'
                        ? 'bg-orange-100 text-orange-700 border-orange-300'
                        : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    {filterCat === 'other' ? 'Showing Uncategorized' : 'Show Uncategorized'}
                  </button>
                </div>
                {!reclassifying && stats.classification_status !== 'classifying' && (
                  <Button onClick={handleReclassify} className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reclassify Others
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="bg-[#2A2A2A] text-white rounded-xl p-3 mb-4 flex items-center justify-between gap-3 shadow-lg sticky top-4 z-10">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{selected.size} selected</span>
                <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-white underline">Clear</button>
              </div>
              <div className="flex items-center gap-2">
                <select value={bulkCat} onChange={e => {
                  if (e.target.value === '__new__') setShowNewCat(true);
                  else setBulkCat(e.target.value);
                }} className="text-xs bg-white border border-gray-200 rounded px-2 py-1.5 text-[#2A2A2A]">
                  <option value="">Category...</option>
                  {allCats().map(c => <option key={c} value={c}>{toTitleCase(c)}</option>)}
                  <option value="__new__">+ New Category</option>
                </select>
                <Button onClick={handleBulkAssign} disabled={bulkSaving || !bulkCat} className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8">
                  {bulkSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />} Apply
                </Button>
              </div>
            </div>
          )}

          {/* New category modal */}
          {showNewCat && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-72 shadow-xl">
                <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">New Category</h3>
                <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g. Charcuterie" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && newCatName.trim()) { setBulkCat(newCatName.trim().toLowerCase().replace(/\s+/g, '_')); setNewCatName(''); setShowNewCat(false); }}}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#A5CFDD]" />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowNewCat(false); setNewCatName(''); }} className="text-xs h-8">Cancel</Button>
                  <Button onClick={() => { setBulkCat(newCatName.trim().toLowerCase().replace(/\s+/g, '_')); setNewCatName(''); setShowNewCat(false); }}
                    disabled={!newCatName.trim()} className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8">Create</Button>
                </div>
              </div>
            </div>
          )}

          {/* Product table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#2A2A2A]">
                  {filterCat ? toTitleCase(filterCat) : 'All Products'} ({products?.total || 0})
                </span>
                {(filterCat || filterBrand) && (
                  <button onClick={() => { setFilterCat(''); setFilterBrand(''); setPage(1); }}
                    className="text-[10px] text-[#A5CFDD] hover:underline flex items-center gap-0.5">
                    <X className="w-3 h-3" /> Clear filters
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                {/* Brand filter */}
                <select
                  value={filterBrand}
                  onChange={e => { setFilterBrand(e.target.value); setPage(1); }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#A5CFDD] max-w-[160px]"
                >
                  <option value="">All Brands</option>
                  {(products?.brands || []).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput.trim()); setPage(1); }}}
                    placeholder="Search..." className="w-full text-xs border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#A5CFDD]" />
                  <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                {search && <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-left text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2 w-8">
                      <input type="checkbox" checked={allSel}
                        ref={el => { if (el) el.indeterminate = someSel && !allSel; }}
                        onChange={toggleAll} className="rounded border-gray-300 text-[#A5CFDD]" />
                    </th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Brand</th>
                    <th className="px-3 py-2">Pack</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Subcategory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products?.products.map(p => (
                    <tr key={p.id} className={`hover:bg-gray-50/50 ${selected.has(p.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                          className="rounded border-gray-300 text-[#A5CFDD]" />
                      </td>
                      <td className="px-3 py-2 text-[#2A2A2A] font-medium">{p.product_name}</td>
                      <td className="px-3 py-2 text-gray-500">{p.brand || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{p.pack_size || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${CAT_COLORS[p.category] || 'bg-indigo-100 text-indigo-700'}`}>
                          {toTitleCase(p.category)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-gray-400 max-w-[180px] truncate" title={p.standard_subcategory || p.subcategory || ''}>
                        {toTitleCase(p.standard_subcategory || p.subcategory || '—')}
                      </td>
                    </tr>
                  ))}
                  {(!products?.products || products.products.length === 0) && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No products</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {products && products.total_pages > 1 && (
              <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Page {products.page}/{products.total_pages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="px-2 py-1 rounded border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50">Prev</button>
                  <button onClick={() => setPage(p => Math.min(products.total_pages, p + 1))} disabled={page >= products.total_pages}
                    className="px-2 py-1 rounded border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Synonyms Tab
// ═══════════════════════════════════════════════════════════════════════
function SynonymsTab({ rules }: { rules: MatchingEngineRules | null }) {
  const [search, setSearch] = useState('');

  if (!rules) {
    return <p className="text-sm text-gray-400">Loading synonyms…</p>;
  }

  const families = rules.synonym_families ?? [];

  const filtered = search.trim()
    ? families.filter(sf =>
        sf.canonical_name.toLowerCase().includes(search.toLowerCase()) ||
        sf.synonyms.some(s => s.toLowerCase().includes(search.toLowerCase()))
      )
    : families;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search families or synonyms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
          />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} of {families.length} families</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-6 text-center">No synonym families found.</p>
      ) : (() => {
        // Group by category
        const grouped: Record<string, typeof filtered> = {};
        filtered.forEach(sf => {
          const cat = sf.category || 'uncategorized';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(sf);
        });
        const categoryOrder = ['produce', 'cheese', 'dairy', 'meat', 'poultry', 'seafood', 'dry_goods', 'bakery', 'prepared', 'frozen', 'beverage', 'non_food', 'other', 'uncategorized'];
        const sortedCategories = Object.keys(grouped).sort((a, b) => {
          const ai = categoryOrder.indexOf(a);
          const bi = categoryOrder.indexOf(b);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        return (
          <div className="space-y-3">
            {sortedCategories.map(cat => (
              <details key={cat} open={sortedCategories.length <= 5 || cat !== 'uncategorized'}>
                <summary className="cursor-pointer px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors">
                  <span className="text-sm font-semibold text-[#2A2A2A] capitalize">{cat.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-400">{grouped[cat].length} families</span>
                </summary>
                <div className="border border-gray-200 border-t-0 rounded-b-lg bg-white divide-y divide-gray-50 mt-0">
                  {grouped[cat].map(sf => (
                    <div key={sf.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <span className="font-medium text-sm text-[#2A2A2A]">{toTitleCase(sf.canonical_name)}</span>
                      {sf.synonyms.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">{sf.synonyms.map(toTitleCase).join(' · ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════
export function QMAdminMatchingEngine() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'catalogs' ? 'catalogs' : 'training';
  const [tab, setTab] = useState<Tab>(initialTab as Tab);
  const [rules, setRules] = useState<MatchingEngineRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosticsAvailable, setDiagnosticsAvailable] = useState(false);

  const loadRules = async () => {
    setLoading(true);
    const res = await getMatchingEngineRules();
    if (res.data) setRules(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadRules();
    getDiagnosticsEnabled().then(res => {
      if (res.data?.enabled) setDiagnosticsAvailable(true);
    });
  }, []);

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'rules', label: 'Rules' },
    { key: 'synonyms', label: 'Synonyms' },
    { key: 'training', label: 'Training Chat' },
    { key: 'concepts', label: 'Menu Concepts' },
    { key: 'changelog', label: 'Change Log' },
    ...(diagnosticsAvailable ? [{ key: 'diagnose' as Tab, label: 'Diagnose' }] : []),
    { key: 'exclusions' as Tab, label: 'Corpus Intelligence' },
    { key: 'cluster_list' as Tab, label: 'Cluster List' },
    { key: 'catalogs' as Tab, label: 'Catalogs' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-[#2A2A2A] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Matching Engine</h1>
      <p className="text-sm text-[#4F4F4F] mb-6">Manage matching rules, train the engine, and review changes.</p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-[#7FAEC2] text-[#7FAEC2]'
                : 'border-transparent text-[#4F4F4F] hover:text-[#2A2A2A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'rules' && <RulesTab rules={rules} onRefresh={loadRules} />}
      {tab === 'synonyms' && <SynonymsTab rules={rules} />}
      {tab === 'training' && <TrainingTab />}
      {tab === 'concepts' && <ConceptsTab />}
      {tab === 'changelog' && <ChangeLogTab />}
      {tab === 'diagnose' && <DiagnoseTab />}
      {tab === 'catalogs' && <CatalogsTab />}
      {tab === 'exclusions' && <ExclusionRulesPanel />}
      {tab === 'cluster_list' && <ClusterListTab />}
    </div>
  );
}
