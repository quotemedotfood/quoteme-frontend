import { useState, useEffect } from 'react';
import { Plus, Phone, Mail, Building2, ChefHat, Tag, Radio, User } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  getConferenceLeads,
  createConferenceLead,
  updateConferenceLead,
  convertConferenceLead,
  ConferenceLead,
} from '../../services/adminApi';

const LEAD_TYPE_COLORS: Record<string, { bg: string; text: string; icon: typeof Building2 }> = {
  distributor: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Building2 },
  brand: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Tag },
  chef: { bg: 'bg-green-100', text: 'text-green-700', icon: ChefHat },
  other: { bg: 'bg-gray-100', text: 'text-gray-700', icon: User },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-700' },
  contacted: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  converted: { bg: 'bg-green-100', text: 'text-green-700' },
  dismissed: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function QMAdminConferenceCommand() {
  const [leads, setLeads] = useState<ConferenceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<ConferenceLead | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Capture form
  const [captureData, setCaptureData] = useState({
    conference_name: '',
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_title: '',
    lead_type: 'other',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    const res = await getConferenceLeads();
    if (res.data) setLeads(res.data);
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }

  const filteredLeads = leads.filter((l) => {
    if (filterType && l.lead_type !== filterType) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    return true;
  });

  // Stats
  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    converted: leads.filter((l) => l.status === 'converted').length,
  };

  async function handleCapture() {
    setSubmitting(true);
    const formData = new FormData();
    Object.entries(captureData).forEach(([k, v]) => {
      if (v) formData.append(`conference_lead[${k}]`, v);
    });

    const res = await createConferenceLead(formData);
    setSubmitting(false);
    if (res.data) {
      setShowCapture(false);
      setCaptureData({
        conference_name: '',
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        contact_title: '',
        lead_type: 'other',
        notes: '',
      });
      loadLeads();
    } else {
      alert(res.error || 'Failed to capture lead');
    }
  }

  async function handleStatusChange(lead: ConferenceLead, newStatus: string) {
    const res = await updateConferenceLead(lead.id, { status: newStatus } as Partial<ConferenceLead>);
    if (res.data) {
      loadLeads();
      if (selectedLead?.id === lead.id) setSelectedLead(res.data);
    }
  }

  async function handleConvert(lead: ConferenceLead, convertTo: string) {
    const res = await convertConferenceLead(lead.id, convertTo);
    if (res.data) {
      loadLeads();
      setSelectedLead(res.data);
    } else {
      alert(res.error || 'Conversion failed');
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Conference Command Center
          </h1>
          <div className="flex items-center gap-1 mt-1">
            <Radio size={14} className="text-[#7FAEC2]" />
            <span className="text-sm text-[#4F4F4F]">Live Feed</span>
          </div>
        </div>
        <Button
          onClick={() => setShowCapture(true)}
          className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
        >
          <Plus size={16} className="mr-1" /> Capture Lead
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Leads', value: stats.total },
          { label: 'New', value: stats.new },
          { label: 'Contacted', value: stats.contacted },
          { label: 'Converted', value: stats.converted },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
            <div className="text-xl font-bold text-[#2A2A2A]">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
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

      {loading && <p className="text-sm text-gray-400 py-8">Loading leads...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {/* Two-column layout: feed + detail */}
      {!loading && (
        <div className="flex gap-5">
          {/* Left: Feed */}
          <div className="flex-1 min-w-0">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-medium">No leads yet</p>
                <p className="text-sm mt-1">Capture your first conference lead.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLeads.map((lead) => {
                  const typeStyle = LEAD_TYPE_COLORS[lead.lead_type] || LEAD_TYPE_COLORS.other;
                  const statusStyle = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
                  const TypeIcon = typeStyle.icon;
                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow ${
                        selectedLead?.id === lead.id ? 'border-[#7FAEC2] shadow-sm' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${typeStyle.bg}`}>
                            <TypeIcon size={14} className={typeStyle.text} />
                          </div>
                          <div>
                            <div className="font-medium text-[#2A2A2A] text-sm">{lead.company_name || lead.contact_name || 'Unnamed'}</div>
                            <div className="text-xs text-gray-400">{lead.conference_name || 'No conference'}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(lead.created_at)}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Detail */}
          {selectedLead && (
            <div className="w-96 flex-shrink-0 bg-white border border-gray-200 rounded-xl p-5 sticky top-4 self-start">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${(LEAD_TYPE_COLORS[selectedLead.lead_type] || LEAD_TYPE_COLORS.other).bg}`}>
                  {(() => { const Icon = (LEAD_TYPE_COLORS[selectedLead.lead_type] || LEAD_TYPE_COLORS.other).icon; return <Icon size={16} className={(LEAD_TYPE_COLORS[selectedLead.lead_type] || LEAD_TYPE_COLORS.other).text} />; })()}
                </div>
                <div>
                  <h3 className="font-semibold text-[#2A2A2A]">{selectedLead.company_name || 'Unnamed'}</h3>
                  <span className="text-xs text-gray-400">{selectedLead.lead_type}</span>
                </div>
              </div>

              <div className="space-y-3 text-sm mb-5">
                {selectedLead.contact_name && (
                  <div><span className="text-gray-400 text-xs">Contact</span><div className="text-[#2A2A2A]">{selectedLead.contact_name}</div></div>
                )}
                {selectedLead.contact_title && (
                  <div><span className="text-gray-400 text-xs">Title</span><div className="text-[#2A2A2A]">{selectedLead.contact_title}</div></div>
                )}
                {selectedLead.contact_email && (
                  <div className="flex items-center gap-2"><Mail size={14} className="text-gray-400" /><span>{selectedLead.contact_email}</span></div>
                )}
                {selectedLead.contact_phone && (
                  <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /><span>{selectedLead.contact_phone}</span></div>
                )}
                {selectedLead.notes && (
                  <div><span className="text-gray-400 text-xs">Notes</span><div className="text-[#2A2A2A] whitespace-pre-wrap">{selectedLead.notes}</div></div>
                )}
                {selectedLead.voice_note_transcript && (
                  <div><span className="text-gray-400 text-xs">Voice Transcript</span><div className="text-[#2A2A2A] whitespace-pre-wrap text-xs bg-gray-50 rounded p-2">{selectedLead.voice_note_transcript}</div></div>
                )}
              </div>

              {/* Status actions */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 mb-2">Change Status</p>
                <div className="flex flex-wrap gap-2">
                  {['new', 'contacted', 'converted', 'dismissed'].filter(s => s !== selectedLead.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selectedLead, s)}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${(STATUS_COLORS[s] || STATUS_COLORS.new).bg} ${(STATUS_COLORS[s] || STATUS_COLORS.new).text}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Convert actions */}
              {selectedLead.status !== 'converted' && selectedLead.status !== 'dismissed' && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <p className="text-xs text-gray-400 mb-2">Convert To</p>
                  <div className="flex gap-2">
                    {['distributor', 'brand', 'rep'].map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant="outline"
                        onClick={() => handleConvert(selectedLead, t)}
                        className="text-xs capitalize"
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Capture Lead Modal */}
      {showCapture && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg text-[#2A2A2A] mb-4">Capture Lead</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Conference</label>
                <Input
                  value={captureData.conference_name}
                  onChange={(e) => setCaptureData({ ...captureData, conference_name: e.target.value })}
                  placeholder="NRA Show 2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Company *</label>
                  <Input
                    value={captureData.company_name}
                    onChange={(e) => setCaptureData({ ...captureData, company_name: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Lead Type</label>
                  <select
                    value={captureData.lead_type}
                    onChange={(e) => setCaptureData({ ...captureData, lead_type: e.target.value })}
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
                    value={captureData.contact_name}
                    onChange={(e) => setCaptureData({ ...captureData, contact_name: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Title</label>
                  <Input
                    value={captureData.contact_title}
                    onChange={(e) => setCaptureData({ ...captureData, contact_title: e.target.value })}
                    placeholder="VP Sales"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email</label>
                  <Input
                    value={captureData.contact_email}
                    onChange={(e) => setCaptureData({ ...captureData, contact_email: e.target.value })}
                    placeholder="jane@company.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                  <Input
                    value={captureData.contact_phone}
                    onChange={(e) => setCaptureData({ ...captureData, contact_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <textarea
                  value={captureData.notes}
                  onChange={(e) => setCaptureData({ ...captureData, notes: e.target.value })}
                  placeholder="Quick notes about this lead..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[80px] resize-y"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button variant="ghost" onClick={() => setShowCapture(false)}>Cancel</Button>
              <Button
                onClick={handleCapture}
                disabled={submitting || !captureData.company_name}
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
              >
                {submitting ? 'Saving...' : 'Capture'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
