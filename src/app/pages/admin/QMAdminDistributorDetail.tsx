import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Package, Users, UtensilsCrossed, UserCheck, UserPlus, X, Upload } from 'lucide-react';
import {
  getAdminDistributor,
  updateAdminDistributor,
  inviteAdminUser,
  assignDistributorAdmin,
  getAdminUsers,
  AdminDistributorDetail,
  AdminUser,
  uploadAdminDistributorLogo,
} from '../../services/adminApi';

const LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
import { distinctUserCount } from '../../utils/userCount';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { handleImpersonate } from '../../utils/impersonate';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL',
  'GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

// ─── StatesServedEditor ───────────────────────────────────────────────────────
// Chip-based multi-select for the 50 US states + DC.
// Saves via PATCH /api/v1/admin/distributors/:id.

interface StatesServedEditorProps {
  distributorId: string;
  initialStates: string[];
  primaryState: string | null;
  onSaved: (updated: AdminDistributorDetail) => void;
}

function StatesServedEditor({ distributorId, initialStates, primaryState, onSaved }: StatesServedEditorProps) {
  const [selected, setSelected] = useState<string[]>(initialStates);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function toggle(state: string) {
    setSelected((prev) => {
      const next = prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state].sort();
      setDirty(true);
      return next;
    });
  }

  function remove(state: string) {
    setSelected((prev) => prev.filter((s) => s !== state));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const res = await updateAdminDistributor(distributorId, { service_states: selected });
    setSaving(false);
    if (res.data) {
      setDirty(false);
      onSaved(res.data);
    } else {
      setSaveError(res.error || 'Failed to save');
    }
  }

  const available = US_STATES.filter((s) => !selected.includes(s));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          States Served
        </h2>
        {primaryState && (
          <span className="text-xs text-gray-500">
            Primary: <span className="font-medium text-[#2A2A2A]">{primaryState}</span>
          </span>
        )}
      </div>

      {/* Chips for selected states */}
      {selected.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">No states configured yet. Add states below.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#7FAEC2]/15 text-[#4A7A92] border border-[#7FAEC2]/30"
            >
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                className="hover:text-[#2A2A2A] transition-colors"
                aria-label={`Remove ${s}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add dropdown */}
      {available.length > 0 && (
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Add a state</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#7FAEC2]/40"
            value=""
            onChange={(e) => { if (e.target.value) toggle(e.target.value); }}
          >
            <option value="">Select state…</option>
            {available.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}

      {dirty && (
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white text-sm"
        >
          {saving ? 'Saving…' : 'Save states'}
        </Button>
      )}
    </div>
  );
}

// ─── QMAdminDistributorDetailPage ────────────────────────────────────────────

export function QMAdminDistributorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dist, setDist] = useState<AdminDistributorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Logo upload state (B-181). These were referenced but never declared,
  // so the page threw ReferenceError on load and hung on "Loading…".
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Add Admin modal state
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [addAdminTab, setAddAdminTab] = useState<'invite' | 'assign'>('invite');
  // Invite-new state
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  // Assign-existing state
  const [existingUsers, setExistingUsers] = useState<AdminUser[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingSearch, setExistingSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await getAdminDistributor(id!);
      if (res.data) {
        setDist(res.data);
        setLogoUrl(res.data.logo_url ?? null);
      } else {
        setError(res.error || 'Not found');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    e.target.value = '';

    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      setLogoError('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError('Image must be 5 MB or smaller.');
      return;
    }

    setLogoError(null);
    setLogoUploading(true);
    const res = await uploadAdminDistributorLogo(id, file);
    setLogoUploading(false);

    if (res.error) {
      setLogoError(res.error);
      return;
    }
    setLogoUrl(res.data!.logo_url);
  }

  // Load distributor_admin users when assign tab is open
  useEffect(() => {
    if (!showAddAdmin || addAdminTab !== 'assign') return;
    setExistingLoading(true);
    getAdminUsers({ role: 'distributor_admin' }).then((res) => {
      setExistingUsers(res.data ?? []);
      setExistingLoading(false);
    });
  }, [showAddAdmin, addAdminTab]);

  function closeAddAdmin() {
    setShowAddAdmin(false);
    setInviteFirst(''); setInviteLast(''); setInviteEmail('');
    setInviteMsg(null); setInviteError(null); setInviteSubmitting(false);
    setExistingSearch(''); setSelectedUserId('');
    setAssignMsg(null); setAssignError(null); setAssignSubmitting(false);
    setAddAdminTab('invite');
  }

  async function handleInviteAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setInviteError(null);
    if (!inviteFirst.trim() || !inviteLast.trim() || !inviteEmail.trim()) {
      setInviteError('All fields are required.');
      return;
    }
    setInviteSubmitting(true);
    // Path (a): create new user as distributor_admin linked to this distributor
    const res = await inviteAdminUser({
      first_name: inviteFirst.trim(),
      last_name: inviteLast.trim(),
      email: inviteEmail.trim(),
      role: 'distributor_admin',
      distributor_id: id,
    });
    setInviteSubmitting(false);
    if (res.error) { setInviteError(res.error); return; }
    setInviteMsg(`Invite sent to ${inviteEmail.trim()}.`);
    // Refresh distributor detail
    const refreshed = await getAdminDistributor(id);
    if (refreshed.data) setDist(refreshed.data);
    setTimeout(() => closeAddAdmin(), 2000);
  }

  async function handleAssignAdmin() {
    if (!id || !selectedUserId) return;
    setAssignError(null);
    setAssignSubmitting(true);
    // Path (b): assign existing user as distributor_admin via dedicated endpoint
    const res = await assignDistributorAdmin(id, selectedUserId);
    setAssignSubmitting(false);
    if (res.error) { setAssignError(res.error); return; }
    setAssignMsg('Admin assigned.');
    const refreshed = await getAdminDistributor(id);
    if (refreshed.data) setDist(refreshed.data);
    setTimeout(() => closeAddAdmin(), 2000);
  }

  const filteredExisting = existingUsers.filter(
    (u) =>
      !existingSearch ||
      u.email.toLowerCase().includes(existingSearch.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(existingSearch.toLowerCase())
  );

  if (loading) return <div className="p-10 text-gray-400">Loading...</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!dist) return null;

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <Link to="/qm-admin/distributors" className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Back to Distributors
      </Link>

      <div className="flex items-center gap-4 mb-8">
        {/* Logo preview + upload control */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-12 h-12 rounded-lg object-contain border border-gray-200" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#7FAEC2]/20 flex items-center justify-center text-[#7FAEC2] text-lg font-bold">
              {dist.name.charAt(0).toUpperCase()}
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoFileChange}
            disabled={logoUploading}
          />
          <button
            type="button"
            title={logoUrl ? 'Replace logo' : 'Upload logo'}
            className="flex items-center gap-1 text-xs text-[#7FAEC2] hover:text-[#6A9AB0] disabled:opacity-50"
            style={{ background: 'transparent', border: 'none', cursor: logoUploading ? 'not-allowed' : 'pointer', padding: 0 }}
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
          >
            <Upload size={11} />
            {logoUploading ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
          </button>
          {logoError && (
            <p className="text-xs text-red-500 max-w-[80px] text-center leading-tight">{logoError}</p>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {dist.name}
          </h1>
          <div className="flex items-center gap-3 text-sm text-[#4F4F4F] mt-1">
            {dist.email_domain && <span>{dist.email_domain}</span>}
            {dist.region && <span>· {dist.region}</span>}
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${dist.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {dist.status}
            </span>
            {dist.unclaimed && (
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: 999, background: '#F3F4F6', color: '#6B7280',
                border: '1px solid #E5E7EB'
              }}>Unclaimed</span>
            )}
          </div>
          {dist.branding_slug && (
            <a
              href={`/d/${dist.branding_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#7FAEC2] hover:text-[#6A9AB0] mt-1"
            >
              Cold-landing page: /d/{dist.branding_slug} ↗
            </a>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Users size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{distinctUserCount(dist.admins, dist.reps)}</div>
            <div className="text-xs text-gray-500">Users</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Package size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{dist.catalog?.product_count ?? 0}</div>
            <div className="text-xs text-gray-500">Active Products</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <UtensilsCrossed size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{dist.restaurants?.length ?? 0}</div>
            <div className="text-xs text-gray-500">Customers</div>
          </div>
        </div>
      </div>

      {/* States Served editor */}
      <StatesServedEditor
        distributorId={dist.id}
        initialStates={dist.service_states ?? []}
        primaryState={dist.primary_state ?? null}
        onSaved={(updated) => setDist(updated)}
      />

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Add Distributor Admin
              </h2>
              <button onClick={closeAddAdmin} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-gray-200 mb-5">
              <button
                type="button"
                onClick={() => setAddAdminTab('invite')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  addAdminTab === 'invite'
                    ? 'text-[#7FAEC2] border-b-2 border-[#7FAEC2]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Invite new user
              </button>
              <button
                type="button"
                onClick={() => setAddAdminTab('assign')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  addAdminTab === 'assign'
                    ? 'text-[#7FAEC2] border-b-2 border-[#7FAEC2]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Assign existing user
              </button>
            </div>

            {/* Invite tab */}
            {addAdminTab === 'invite' && (
              <form onSubmit={handleInviteAdmin} className="space-y-4">
                {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
                {inviteMsg && <p className="text-sm text-green-600">{inviteMsg}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#4F4F4F] mb-1">First Name</label>
                    <Input value={inviteFirst} onChange={(e) => setInviteFirst(e.target.value)} placeholder="First name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Last Name</label>
                    <Input value={inviteLast} onChange={(e) => setInviteLast(e.target.value)} placeholder="Last name" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Email</label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="admin@distributor.com" />
                </div>
                <p className="text-xs text-gray-400">
                  Will be created as <span className="font-medium">distributor_admin</span> linked to {dist.name}.
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" type="button" onClick={closeAddAdmin}>Cancel</Button>
                  <Button
                    type="submit"
                    disabled={inviteSubmitting || !inviteFirst.trim() || !inviteLast.trim() || !inviteEmail.trim()}
                    className="bg-[#7FAEC2] hover:bg-[#6a9ab0] text-white"
                  >
                    {inviteSubmitting ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </form>
            )}

            {/* Assign existing tab */}
            {addAdminTab === 'assign' && (
              <div className="space-y-4">
                {assignError && <p className="text-sm text-red-500">{assignError}</p>}
                {assignMsg && <p className="text-sm text-green-600">{assignMsg}</p>}
                <div>
                  <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Search by email or name</label>
                  <Input
                    value={existingSearch}
                    onChange={(e) => { setExistingSearch(e.target.value); setSelectedUserId(''); }}
                    placeholder="Filter distributor admins..."
                  />
                </div>
                {existingLoading && <p className="text-sm text-gray-400">Loading users...</p>}
                {!existingLoading && filteredExisting.length === 0 && (
                  <p className="text-sm text-gray-400">No distributor_admin users found.</p>
                )}
                {!existingLoading && filteredExisting.length > 0 && (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {filteredExisting.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                          selectedUserId === u.id
                            ? 'bg-[#A5CFDD]/15 border-l-2 border-[#7FAEC2]'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#2A2A2A] truncate">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" type="button" onClick={closeAddAdmin}>Cancel</Button>
                  <Button
                    type="button"
                    disabled={!selectedUserId || assignSubmitting}
                    onClick={handleAssignAdmin}
                    className="bg-[#7FAEC2] hover:bg-[#6a9ab0] text-white"
                  >
                    {assignSubmitting ? 'Assigning...' : 'Assign Admin'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admins */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>Admins</h2>
          <Button
            size="sm"
            onClick={() => setShowAddAdmin(true)}
            className="bg-[#7FAEC2] hover:bg-[#6a9ab0] text-white text-xs"
          >
            <UserPlus size={14} className="mr-1" />
            Add Admin
          </Button>
        </div>
        {!dist.admins?.length ? (
          <p className="text-sm text-gray-400 py-4">No admin user yet</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dist.admins || []).map((a) => (
                  <TableRow key={a.user_id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{a.email}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
                        disabled={impersonating === a.user_id}
                        onClick={() => handleImpersonate(a.user_id, a.name, setImpersonating, setError)}
                      >
                        <UserCheck size={14} className="mr-1" />
                        {impersonating === a.user_id ? 'Switching...' : 'Impersonate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Reps */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Reps</h2>
        {!dist.reps?.length ? (
          <p className="text-sm text-gray-400 py-4">No reps yet</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dist.reps || []).map((r) => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.email}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.phone || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.territory || '—'}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
                        disabled={impersonating === r.user_id}
                        onClick={() => handleImpersonate(r.user_id, r.name, setImpersonating, setError)}
                      >
                        <UserCheck size={14} className="mr-1" />
                        {impersonating === r.user_id ? 'Switching...' : 'Impersonate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Customers */}
      <section>
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Customers</h2>
        {!dist.restaurants?.length ? (
          <p className="text-sm text-gray-400 py-4">No customers yet</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dist.restaurants || []).map((r) => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.city || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.state || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Catalog History (Justin) — read-only upload log */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Catalog History</h2>
        {!dist.catalogs?.length ? (
          <p className="text-sm text-gray-400 py-4">No catalogs uploaded yet</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Uploaded</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>% Uncategorized</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dist.catalogs || []).map((c) => (
                  <TableRow key={c.id} className="hover:bg-gray-50">
                    <TableCell className="text-sm text-gray-500">{c.uploaded_at ? new Date(c.uploaded_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="font-medium">{c.original_filename || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{c.uploaded_by || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{c.product_count?.toLocaleString() ?? '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{c.pct_uncategorized != null ? `${c.pct_uncategorized}%` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
