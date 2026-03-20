import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronRight, Download, Send, Trash2, ArrowUpCircle, Paperclip, X,
  Beaker, Fish, Wine, Coffee, GlassWater, Filter, BookOpen, Lock, RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  getMatchingEngineRules,
  getMatchingEngineLogs,
  sendMatchingEngineChat,
  deleteMatchingEngineRule,
  promoteCorrection,
  getMatchingEngineExportUrl,
  getAdminStockQuotes,
  createAdminStockQuote,
  deleteAdminStockQuote,
  type MatchingEngineRules,
  type MatchingEngineLog,
  type AdminStockQuote,
} from '../../services/adminApi';

type Tab = 'rules' | 'training' | 'changelog';

function toTitleCase(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
function TrainingTab() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'system'; text: string; rules?: string[]; timestamp: string }>>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || sending) return;
    const userMsg = input.trim() || (attachedFile ? `Uploaded: ${attachedFile.name}` : '');
    const file = attachedFile;
    setInput('');
    setAttachedFile(null);
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
        timestamp: res.data!.timestamp,
      }]);
    } else {
      setMessages(prev => [...prev, { role: 'system', text: res.error || 'Something went wrong', timestamp: new Date().toISOString() }]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      <p className="text-sm text-[#4F4F4F] mb-3">Type natural language instructions to create or update matching rules. The engine interprets your intent and applies changes immediately.</p>

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
// Main page
// ═══════════════════════════════════════════════════════════════════════
export function QMAdminMatchingEngine() {
  const [tab, setTab] = useState<Tab>('training');
  const [rules, setRules] = useState<MatchingEngineRules | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRules = async () => {
    setLoading(true);
    const res = await getMatchingEngineRules();
    if (res.data) setRules(res.data);
    setLoading(false);
  };

  useEffect(() => { loadRules(); }, []);

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'rules', label: 'Rules' },
    { key: 'training', label: 'Training Chat' },
    { key: 'changelog', label: 'Change Log' },
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
      {tab === 'training' && <TrainingTab />}
      {tab === 'changelog' && <ChangeLogTab />}
    </div>
  );
}
