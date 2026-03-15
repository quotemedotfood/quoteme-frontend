import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Phone, Mail, Building2, ChefHat, Tag, Radio, User, X, Camera, Mic, MicOff,
  Upload, Loader2, CheckCircle, ArrowRight, Trash2, Clock, TrendingUp, Users, Zap,
  CreditCard, Eye, Pencil, Save
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  getConferenceLeads,
  createConferenceLead,
  updateConferenceLead,
  convertConferenceLead,
  deleteConferenceLead,
  ocrConferenceCard,
  ConferenceLead,
} from '../../services/adminApi';

// ─── Constants ───────────────────────────────────────────────────

const LEAD_TYPE_COLORS: Record<string, { bg: string; text: string; icon: typeof Building2; label: string }> = {
  distributor: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Building2, label: 'Distributor' },
  brand: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Tag, label: 'Brand' },
  chef: { bg: 'bg-green-100', text: 'text-green-700', icon: ChefHat, label: 'Chef' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700', icon: User, label: 'Other' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  new: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  contacted: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  converted: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  dismissed: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const POLL_INTERVAL = 30_000;
const BANNER_STORAGE_KEY = 'qm_conference_banner_dismissed';

// ─── Helpers ─────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ─── Main Component ──────────────────────────────────────────────

export function QMAdminConferenceCommand() {
  const [leads, setLeads] = useState<ConferenceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<ConferenceLead | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(BANNER_STORAGE_KEY) === 'true'
  );

  // Load leads + polling
  const loadLeads = useCallback(async () => {
    const res = await getConferenceLeads();
    if (res.data) {
      setLeads(res.data);
      // Update selected lead if it's in the new data
      setSelectedLead((prev) => {
        if (!prev) return null;
        return res.data!.find((l) => l.id === prev.id) || null;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
    const interval = setInterval(loadLeads, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadLeads]);

  const filteredLeads = leads.filter((l) => {
    if (filterType && l.lead_type !== filterType) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    converted: leads.filter((l) => l.status === 'converted').length,
  };

  const todayCount = leads.filter((l) => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;

  async function handleStatusChange(lead: ConferenceLead, newStatus: string) {
    const res = await updateConferenceLead(lead.id, { status: newStatus } as Partial<ConferenceLead>);
    if (res.data) {
      loadLeads();
    }
  }

  async function handleConvert(lead: ConferenceLead, convertTo: string) {
    if (!confirm(`Convert ${lead.company_name || 'this lead'} to ${convertTo}?`)) return;
    const res = await convertConferenceLead(lead.id, convertTo);
    if (res.data) {
      loadLeads();
    } else {
      alert(res.error || 'Conversion failed');
    }
  }

  async function handleDelete(lead: ConferenceLead) {
    if (!confirm(`Delete lead for ${lead.company_name || lead.contact_name || 'this lead'}?`)) return;
    await deleteConferenceLead(lead.id);
    if (selectedLead?.id === lead.id) setSelectedLead(null);
    loadLeads();
  }

  async function handleUpdate(lead: ConferenceLead, data: Partial<ConferenceLead>) {
    const res = await updateConferenceLead(lead.id, data);
    if (res.data) {
      setSelectedLead(res.data);
      loadLeads();
    }
  }

  function dismissBanner() {
    setBannerDismissed(true);
    localStorage.setItem(BANNER_STORAGE_KEY, 'true');
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Conference Banner */}
      {!bannerDismissed && (
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] text-white px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium">SENA 2026 — Live</span>
            <span className="text-xs text-white/70 hidden sm:inline">
              {todayCount} leads captured today
            </span>
          </div>
          <button onClick={dismissBanner} className="p-1 hover:bg-white/10 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="p-4 md:p-6 lg:p-8 flex-1 min-h-0 overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Conference Command Center
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Radio size={14} className="text-[#7FAEC2]" />
              <span className="text-sm text-[#4F4F4F]">Live Feed</span>
              <span className="text-[10px] text-gray-400">Auto-refreshes every 30s</span>
            </div>
          </div>
          <Button
            onClick={() => setShowCapture(true)}
            className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white shadow-sm"
          >
            <Plus size={16} className="mr-1" /> Capture Lead
          </Button>
        </div>

        {/* Analytics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-[#2A2A2A]' },
            { label: 'New', value: stats.new, icon: Zap, color: 'text-blue-600' },
            { label: 'Contacted', value: stats.contacted, icon: Phone, color: 'text-yellow-600' },
            { label: 'Converted', value: stats.converted, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-[#7FAEC2]' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} className={s.color} />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</span>
              </div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Types</option>
            <option value="distributor">Distributor</option>
            <option value="brand">Brand</option>
            <option value="chef">Chef</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filteredLeads.length} leads</span>
        </div>

        {loading && <p className="text-sm text-gray-400 py-8 text-center">Loading leads...</p>}

        {/* Two-column layout: feed + detail */}
        {!loading && (
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Left: Feed */}
            <div className="flex-1 min-w-0">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
                  <Radio size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No leads yet</p>
                  <p className="text-sm mt-1">Capture your first conference lead to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLeads.map((lead) => {
                    const typeStyle = LEAD_TYPE_COLORS[lead.lead_type] || LEAD_TYPE_COLORS.other;
                    const statusStyle = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
                    const TypeIcon = typeStyle.icon;
                    const isSelected = selectedLead?.id === lead.id;
                    return (
                      <button
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-all ${
                          isSelected ? 'border-[#7FAEC2] shadow-sm ring-1 ring-[#7FAEC2]/20' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${typeStyle.bg}`}>
                              <TypeIcon size={14} className={typeStyle.text} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-[#2A2A2A] text-sm truncate">
                                {lead.company_name || lead.contact_name || 'Unnamed Lead'}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lead.contact_name && lead.company_name && (
                                  <span className="text-xs text-gray-500 truncate">{lead.contact_name}</span>
                                )}
                                <span className="text-[10px] text-gray-400 flex-shrink-0">{formatRelativeTime(lead.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {lead.voice_note_transcript && (
                              <Mic size={12} className="text-gray-400" title="Has voice note" />
                            )}
                            {lead.card_photo_url && (
                              <CreditCard size={12} className="text-gray-400" title="Has business card" />
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                              {lead.status}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Detail Panel */}
            {selectedLead ? (
              <LeadDetailPanel
                lead={selectedLead}
                onStatusChange={handleStatusChange}
                onConvert={handleConvert}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onClose={() => setSelectedLead(null)}
              />
            ) : (
              <div className="hidden lg:flex w-96 flex-shrink-0 bg-white border border-gray-200 rounded-xl items-center justify-center text-gray-400 text-sm p-8">
                <div className="text-center">
                  <Eye size={24} className="mx-auto mb-2 text-gray-300" />
                  <p>Select a lead to view details</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Capture Lead Drawer */}
      {showCapture && (
        <CaptureLeadDrawer
          onClose={() => setShowCapture(false)}
          onCaptured={() => {
            setShowCapture(false);
            loadLeads();
            // Re-fetch after 3s to pick up async OCR/transcription results
            setTimeout(loadLeads, 3000);
          }}
        />
      )}

      {/* Mobile Detail Overlay */}
      {selectedLead && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedLead(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />
            <LeadDetailPanel
              lead={selectedLead}
              onStatusChange={handleStatusChange}
              onConvert={handleConvert}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onClose={() => setSelectedLead(null)}
              mobile
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lead Detail Panel ───────────────────────────────────────────

function LeadDetailPanel({
  lead,
  onStatusChange,
  onConvert,
  onDelete,
  onUpdate,
  onClose,
  mobile,
}: {
  lead: ConferenceLead;
  onStatusChange: (lead: ConferenceLead, status: string) => void;
  onConvert: (lead: ConferenceLead, convertTo: string) => void;
  onDelete: (lead: ConferenceLead) => void;
  onUpdate: (lead: ConferenceLead, data: Partial<ConferenceLead>) => Promise<void> | void;
  onClose: () => void;
  mobile?: boolean;
}) {
  const typeStyle = LEAD_TYPE_COLORS[lead.lead_type] || LEAD_TYPE_COLORS.other;
  const TypeIcon = typeStyle.icon;
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    company_name: lead.company_name || '',
    contact_name: lead.contact_name || '',
    contact_email: lead.contact_email || '',
    contact_phone: lead.contact_phone || '',
    contact_title: lead.contact_title || '',
    lead_type: lead.lead_type || 'other',
    conference_name: lead.conference_name || '',
    notes: lead.notes || '',
  });
  const [saving, setSaving] = useState(false);

  // Reset edit data when lead changes
  useEffect(() => {
    setEditData({
      company_name: lead.company_name || '',
      contact_name: lead.contact_name || '',
      contact_email: lead.contact_email || '',
      contact_phone: lead.contact_phone || '',
      contact_title: lead.contact_title || '',
      lead_type: lead.lead_type || 'other',
      conference_name: lead.conference_name || '',
      notes: lead.notes || '',
    });
    setEditing(false);
  }, [lead.id]);

  async function handleSave() {
    setSaving(true);
    await onUpdate(lead, editData);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className={mobile ? 'p-5' : 'w-96 flex-shrink-0 bg-white border border-gray-200 rounded-xl p-5 sticky top-4 self-start hidden lg:block'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeStyle.bg}`}>
            <TypeIcon size={18} className={typeStyle.text} />
          </div>
          <div>
            <h3 className="font-semibold text-[#2A2A2A] text-base">{lead.company_name || 'Unnamed Lead'}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
              {typeStyle.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(!editing)}
            className={`p-1.5 rounded-lg transition-colors ${editing ? 'bg-[#7FAEC2]/10 text-[#7FAEC2]' : 'text-gray-400 hover:bg-gray-100 hover:text-[#7FAEC2]'}`}
            title="Edit lead"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(lead)}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
            title="Delete lead"
          >
            <Trash2 size={14} />
          </button>
          {mobile && (
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={16} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editing ? (
        <div className="space-y-3 text-sm mb-5">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Company</label>
            <Input value={editData.company_name} onChange={(e) => setEditData({ ...editData, company_name: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Contact Name</label>
            <Input value={editData.contact_name} onChange={(e) => setEditData({ ...editData, contact_name: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Title</label>
            <Input value={editData.contact_title} onChange={(e) => setEditData({ ...editData, contact_title: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Email</label>
            <Input type="email" value={editData.contact_email} onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Phone</label>
            <Input type="tel" value={editData.contact_phone} onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Lead Type</label>
            <select
              value={editData.lead_type}
              onChange={(e) => setEditData({ ...editData, lead_type: e.target.value })}
              className="w-full h-8 text-sm border border-gray-200 rounded-md px-2 bg-white"
            >
              <option value="distributor">Distributor</option>
              <option value="brand">Brand</option>
              <option value="chef">Chef</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Conference</label>
            <Input value={editData.conference_name} onChange={(e) => setEditData({ ...editData, conference_name: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
            <textarea
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm min-h-[60px] resize-y"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="flex-1 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 text-xs bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white">
              <Save size={12} className="mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
      /* Contact Info */
      <div className="space-y-3 text-sm mb-5">
        {lead.contact_name && (
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Contact</span>
            <div className="text-[#2A2A2A] font-medium">{lead.contact_name}</div>
          </div>
        )}
        {lead.contact_title && (
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Title</span>
            <div className="text-[#2A2A2A]">{lead.contact_title}</div>
          </div>
        )}
        {lead.contact_email && (
          <a href={`mailto:${lead.contact_email}`} className="flex items-center gap-2 text-[#7FAEC2] hover:underline">
            <Mail size={14} /><span>{lead.contact_email}</span>
          </a>
        )}
        {lead.contact_phone && (
          <a href={`tel:${lead.contact_phone}`} className="flex items-center gap-2 text-[#7FAEC2] hover:underline">
            <Phone size={14} /><span>{lead.contact_phone}</span>
          </a>
        )}
        {lead.conference_name && (
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Conference</span>
            <div className="text-[#2A2A2A] text-xs">{lead.conference_name}</div>
          </div>
        )}
        {lead.notes && (
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Notes</span>
            <div className="text-[#2A2A2A] whitespace-pre-wrap text-xs mt-1">{lead.notes}</div>
          </div>
        )}
      </div>
      )}

      {/* Voice Transcript */}
      {lead.voice_note_transcript && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Mic size={12} className="text-gray-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Voice Transcript</span>
          </div>
          <div className="text-[#2A2A2A] whitespace-pre-wrap text-xs bg-gray-50 rounded-lg p-3 border border-gray-100">
            {lead.voice_note_transcript}
          </div>
        </div>
      )}

      {/* Card Photo */}
      {lead.card_photo_url && (
        <div className="mb-5">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5">Business Card</span>
          <img
            src={lead.card_photo_url}
            alt="Business card"
            className="w-full rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(lead.card_photo_url!, '_blank')}
          />
        </div>
      )}

      {/* Booth Photo */}
      {lead.booth_photo_url && (
        <div className="mb-5">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5">Booth Photo</span>
          <img
            src={lead.booth_photo_url}
            alt="Booth"
            className="w-full rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(lead.booth_photo_url!, '_blank')}
          />
        </div>
      )}

      {/* Captured By + Time */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-4">
        <span>{lead.captured_by?.name || 'Unknown'}</span>
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {formatDate(lead.created_at)}
        </span>
      </div>

      {/* Status Actions */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          {['new', 'contacted', 'converted', 'dismissed'].map((s) => {
            const style = STATUS_COLORS[s] || STATUS_COLORS.new;
            const isActive = s === lead.status;
            return (
              <button
                key={s}
                onClick={() => !isActive && onStatusChange(lead, s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? `${style.bg} ${style.text} ring-2 ring-current/20`
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Convert Actions */}
      {lead.status !== 'converted' && lead.status !== 'dismissed' && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Convert To</p>
          <div className="flex gap-2">
            {['distributor', 'brand', 'rep'].map((t) => (
              <Button
                key={t}
                size="sm"
                variant="outline"
                onClick={() => onConvert(lead, t)}
                className="text-xs capitalize flex-1"
              >
                <ArrowRight size={12} className="mr-1" />
                {t}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Converted badge */}
      {lead.status === 'converted' && lead.converted_to_type && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle size={16} />
            <span>Converted to <strong className="capitalize">{lead.converted_to_type}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Capture Lead Drawer ─────────────────────────────────────────

function CaptureLeadDrawer({
  onClose,
  onCaptured,
}: {
  onClose: () => void;
  onCaptured: () => void;
}) {
  const [data, setData] = useState({
    conference_name: 'SENA 2026',
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_title: '',
    lead_type: 'other',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [boothFile, setBoothFile] = useState<File | null>(null);
  const [boothPreview, setBoothPreview] = useState<string | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cardInputRef = useRef<HTMLInputElement>(null);
  const boothInputRef = useRef<HTMLInputElement>(null);

  function handleCardSelect(file: File) {
    setCardFile(file);
    setCardPreview(URL.createObjectURL(file));
    setOcrDone(false);
    // Auto-run OCR
    runOCR(file);
  }

  async function runOCR(file: File) {
    setOcrLoading(true);
    const res = await ocrConferenceCard(file);
    setOcrLoading(false);
    if (res.data) {
      setOcrDone(true);
      setData((prev) => ({
        ...prev,
        company_name: res.data!.company_name || prev.company_name,
        contact_name: res.data!.contact_name || prev.contact_name,
        contact_email: res.data!.contact_email || prev.contact_email,
        contact_phone: res.data!.contact_phone || prev.contact_phone,
        contact_title: res.data!.contact_title || prev.contact_title,
      }));
    }
  }

  function handleBoothSelect(file: File) {
    setBoothFile(file);
    setBoothPreview(URL.createObjectURL(file));
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const options = mimeType ? { mimeType } : undefined;
      console.log('[VoiceMemo] Starting recording, mimeType:', mimeType || 'browser default');
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        console.log('[VoiceMemo] ondataavailable, size:', e.data.size);
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const ext = actualMime.includes('mp4') ? 'mp4' : 'webm';
        console.log('[VoiceMemo] onstop, chunks:', chunksRef.current.length, 'mime:', actualMime);
        const blob = new Blob(chunksRef.current, { type: actualMime });
        console.log('[VoiceMemo] blob size:', blob.size);
        if (blob.size === 0) {
          console.error('[VoiceMemo] Recording produced empty blob');
          return;
        }
        const file = new File([blob], `voice_note.${ext}`, { type: actualMime });
        setVoiceFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };

      // Request data every second so chunks accumulate during recording
      mediaRecorder.start(1000);
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error('[VoiceMemo] startRecording error:', err);
      alert('Microphone access denied. Please allow microphone access to record voice notes.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function formatRecordingTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function handleSubmit() {
    setSubmitting(true);
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v) formData.append(`conference_lead[${k}]`, v);
    });
    if (cardFile) formData.append('card_photo', cardFile);
    if (boothFile) formData.append('booth_photo', boothFile);
    if (voiceFile) {
      console.log('[VoiceMemo] Attaching voice file to FormData:', voiceFile.name, 'size:', voiceFile.size, 'type:', voiceFile.type);
      formData.append('voice_note', voiceFile);
    } else {
      console.log('[VoiceMemo] No voice file to attach');
    }

    try {
      const res = await createConferenceLead(formData);
      setSubmitting(false);
      if (res.data) {
        console.log('[VoiceMemo] Lead created, voice_note_url:', res.data.voice_note_url);
        onCaptured();
      } else {
        console.error('[VoiceMemo] Create failed:', res.error);
        alert(res.error || 'Failed to capture lead');
      }
    } catch (err) {
      console.error('[VoiceMemo] Submit error:', err);
      setSubmitting(false);
      alert('Failed to capture lead');
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-[#f8fbfc] to-white">
          <div>
            <h2 className="text-lg font-semibold text-[#2A2A2A]">Capture Lead</h2>
            <p className="text-xs text-gray-500 mt-0.5">Snap a card, record a note, or fill in manually</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Business Card Scan */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Business Card (auto-fills form)</label>
            <input
              ref={cardInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCardSelect(e.target.files[0])}
            />
            {cardPreview ? (
              <div className="relative">
                <img src={cardPreview} alt="Card" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                {ocrLoading && (
                  <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-[#7FAEC2]">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Reading card...</span>
                    </div>
                  </div>
                )}
                {ocrDone && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                    <CheckCircle size={14} />
                  </div>
                )}
                <button
                  onClick={() => { setCardFile(null); setCardPreview(null); setOcrDone(false); }}
                  className="absolute top-2 left-2 bg-black/50 text-white rounded-full p-1"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => cardInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#7FAEC2] hover:bg-[#7FAEC2]/5 transition-colors"
              >
                <Camera size={24} className="mx-auto mb-2 text-gray-400" />
                <span className="text-sm text-gray-500">Tap to scan business card</span>
              </button>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Company *</label>
              <Input
                value={data.company_name}
                onChange={(e) => setData({ ...data, company_name: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Lead Type</label>
              <select
                value={data.lead_type}
                onChange={(e) => setData({ ...data, lead_type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="distributor">Distributor</option>
                <option value="brand">Brand</option>
                <option value="chef">Chef</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Contact Name</label>
              <Input
                value={data.contact_name}
                onChange={(e) => setData({ ...data, contact_name: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Title</label>
              <Input
                value={data.contact_title}
                onChange={(e) => setData({ ...data, contact_title: e.target.value })}
                placeholder="VP Sales"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <Input
                value={data.contact_email}
                onChange={(e) => setData({ ...data, contact_email: e.target.value })}
                placeholder="jane@company.com"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phone</label>
              <Input
                value={data.contact_phone}
                onChange={(e) => setData({ ...data, contact_phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Conference</label>
            <Input
              value={data.conference_name}
              onChange={(e) => setData({ ...data, conference_name: e.target.value })}
              placeholder="SENA 2026"
            />
          </div>

          {/* Voice Note */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Voice Note</label>
            {voiceFile ? (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                <Mic size={16} className="text-[#7FAEC2]" />
                <span className="text-sm text-[#2A2A2A] flex-1">{voiceFile.name}</span>
                <button
                  onClick={() => setVoiceFile(null)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ) : recording ? (
              <button
                onClick={stopRecording}
                className="w-full flex items-center justify-center gap-3 bg-red-50 border-2 border-red-200 rounded-lg px-4 py-4 transition-colors"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-700 font-medium">Recording... {formatRecordingTime(recordingTime)}</span>
                <MicOff size={16} className="text-red-500 ml-2" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg px-4 py-4 hover:border-[#7FAEC2] hover:bg-[#7FAEC2]/5 transition-colors"
              >
                <Mic size={18} className="text-gray-400" />
                <span className="text-sm text-gray-500">Tap to record voice note</span>
              </button>
            )}
          </div>

          {/* Booth Photo */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Booth Photo (optional)</label>
            <input
              ref={boothInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleBoothSelect(e.target.files[0])}
            />
            {boothPreview ? (
              <div className="relative">
                <img src={boothPreview} alt="Booth" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                <button
                  onClick={() => { setBoothFile(null); setBoothPreview(null); }}
                  className="absolute top-2 left-2 bg-black/50 text-white rounded-full p-1"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => boothInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-500"
              >
                <Upload size={14} />
                <span>Add booth photo</span>
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <textarea
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
              placeholder="Quick notes about this lead..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[80px] resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-white">
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !data.company_name}
              className="flex-1 bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                'Capture Lead'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
