import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Package, Users, UtensilsCrossed, UserCheck, X } from 'lucide-react';
import { getAdminDistributor, updateAdminDistributor, AdminDistributorDetail } from '../../services/adminApi';
import { distinctUserCount } from '../../utils/userCount';
import { Button } from '../../components/ui/button';
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

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await getAdminDistributor(id!);
      if (res.data) setDist(res.data);
      else setError(res.error || 'Not found');
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="p-10 text-gray-400">Loading...</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!dist) return null;

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <Link to="/qm-admin/distributors" className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Back to Distributors
      </Link>

      <div className="flex items-center gap-4 mb-8">
        {dist.logo_url && <img src={dist.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
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
            <div className="text-xs text-gray-500">Restaurants</div>
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

      {/* Admins */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Admins</h2>
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

      {/* Restaurants */}
      <section>
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Restaurants</h2>
        {!dist.restaurants?.length ? (
          <p className="text-sm text-gray-400 py-4">No restaurants yet</p>
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
    </div>
  );
}
