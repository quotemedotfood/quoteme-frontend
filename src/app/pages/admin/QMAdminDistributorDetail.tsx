import { useState, useEffect, KeyboardEvent } from 'react';
import { useParams, useLocation, Link } from 'react-router';
import { ArrowLeft, Package, Users, UtensilsCrossed, Edit2, X, Check } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  getAdminDistributor,
  getIngestedDistributor,
  updateIngestedDistributor,
  AdminDistributorDetail,
  IngestedDistributorDetail,
} from '../../services/adminApi';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';

// ── US States constant ──────────────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function catalogStateBadge(state: string | undefined) {
  if (!state) return null;
  const colors: Record<string, string> = {
    discovery: 'bg-yellow-100 text-yellow-700',
    provisional: 'bg-blue-100 text-blue-700',
    verified: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[state] ?? 'bg-gray-100 text-gray-600'}`}>
      {state}
    </span>
  );
}

function sourceBadge(source: string | undefined) {
  if (!source) return null;
  const colors: Record<string, string> = {
    ingested: 'bg-purple-100 text-purple-700',
    registered: 'bg-blue-100 text-blue-700',
    claimed: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[source] ?? 'bg-gray-100 text-gray-600'}`}>
      {source}
    </span>
  );
}

// Colored-circle fallback avatar
function DistributorAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }
  // Deterministic color based on first letter
  const hue = ((initial.charCodeAt(0) - 65) * 13 + 200) % 360;
  return (
    <div
      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-lg"
      style={{ backgroundColor: `hsl(${hue}, 55%, 55%)` }}
    >
      {initial}
    </div>
  );
}

// Tag input — comma or Enter to add
function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const unique = parts.filter((p) => !values.includes(p));
    if (unique.length > 0) onChange([...values, ...unique]);
    setDraft('');
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function removeTag(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  return (
    <div className="border border-gray-200 rounded-md px-2 py-1.5 flex flex-wrap gap-1 focus-within:ring-1 focus-within:ring-[#7FAEC2] bg-white">
      {values.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1 bg-[#7FAEC2]/10 text-[#2A2A2A] text-xs px-2 py-0.5 rounded-full">
          {v}
          <button type="button" onClick={() => removeTag(i)} className="text-gray-400 hover:text-gray-600">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => draft && commit(draft)}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
      />
    </div>
  );
}

// State multi-select as a compact checkbox grid
function StateMultiSelect({
  values,
  onChange,
}: {
  values: string[];
  onChange: (vals: string[]) => void;
}) {
  function toggle(s: string) {
    if (values.includes(s)) onChange(values.filter((v) => v !== s));
    else onChange([...values, s]);
  }
  return (
    <div className="border border-gray-200 rounded-md p-2 bg-white max-h-40 overflow-y-auto">
      <div className="grid grid-cols-6 gap-1">
        {US_STATES.map((s) => (
          <label key={s} className="flex items-center gap-0.5 cursor-pointer">
            <input
              type="checkbox"
              checked={values.includes(s)}
              onChange={() => toggle(s)}
              className="accent-[#7FAEC2] w-3 h-3"
            />
            <span className="text-xs text-gray-700">{s}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Combined type for a distributor that may have new-endpoint fields ────────
type FullDist = AdminDistributorDetail & Partial<IngestedDistributorDetail>;

// ── Main Component ───────────────────────────────────────────────────────────

export function QMAdminDistributorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [dist, setDist] = useState<FullDist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode — can be triggered from list page via router state
  const [editMode, setEditMode] = useState<boolean>(!!(location.state as any)?.editMode);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form state
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formServiceStates, setFormServiceStates] = useState<string[]>([]);
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formServesMetros, setFormServesMetros] = useState<string[]>([]);
  const [formDescription, setFormDescription] = useState('');
  const [formRegionTags, setFormRegionTags] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      // Try new endpoint first; it returns extra fields + catalog_summary
      const res = await getIngestedDistributor(id!);
      if (res.data) {
        // Merge with legacy shape if needed
        const legacyRes = await getAdminDistributor(id!);
        const merged: FullDist = { ...legacyRes.data, ...res.data } as FullDist;
        setDist(merged);
        seedForm(merged);
      } else {
        // Fall back to legacy endpoint
        const legacyRes = await getAdminDistributor(id!);
        if (legacyRes.data) {
          setDist(legacyRes.data as FullDist);
          seedForm(legacyRes.data as FullDist);
        } else {
          setError(legacyRes.error || 'Not found');
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function seedForm(d: FullDist) {
    setFormDisplayName(d.display_name ?? '');
    setFormServiceStates(d.service_states ?? []);
    setFormLogoUrl(d.logo_url ?? '');
    setFormServesMetros(d.serves_metros ?? []);
    setFormDescription(d.description ?? '');
    setFormRegionTags(d.region_tags ?? []);
  }

  function enterEdit() {
    if (dist) seedForm(dist);
    setSaveError(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setSaveError(null);
    setEditMode(false);
  }

  async function handleSave() {
    if (!id || !dist) return;
    setSaving(true);
    setSaveError(null);
    const res = await updateIngestedDistributor(id, {
      display_name: formDisplayName || undefined,
      service_states: formServiceStates,
      logo_url: formLogoUrl || null,
      serves_metros: formServesMetros,
      description: formDescription || null,
      region_tags: formRegionTags,
    });
    setSaving(false);
    if (res.data) {
      const merged: FullDist = { ...dist, ...res.data } as FullDist;
      setDist(merged);
      setEditMode(false);
    } else {
      setSaveError(res.error || 'Failed to save');
    }
  }

  if (loading) return <div className="p-10 text-gray-400">Loading...</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!dist) return null;

  const displayName = (dist as any).display_name || dist.name;
  const hasNewFields = (dist as any).source !== undefined || (dist as any).catalog_state !== undefined;

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <Link to="/qm-admin/distributors" className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Back to Distributors
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <DistributorAvatar name={displayName} logoUrl={dist.logo_url ?? null} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {displayName}
            </h1>
            {hasNewFields && sourceBadge((dist as any).source)}
            {!hasNewFields && (
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${dist.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {dist.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-[#4F4F4F] mt-1 flex-wrap">
            {dist.email_domain && <span>{dist.email_domain}</span>}
            {dist.region && <span>· {dist.region}</span>}
            {(dist as any).primary_state && <span>· {(dist as any).primary_state}</span>}
            {(dist as any).headquarters_city && <span>· {(dist as any).headquarters_city}</span>}
            {hasNewFields && catalogStateBadge((dist as any).catalog_state)}
          </div>
          {(dist as any).description && !editMode && (
            <p className="text-sm text-gray-500 mt-2 max-w-prose">{(dist as any).description}</p>
          )}
        </div>
        {!editMode && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-[#7FAEC2] hover:text-[#6A9AB0]"
            onClick={enterEdit}
          >
            <Edit2 size={15} className="mr-1" /> Edit
          </Button>
        )}
      </div>

      {/* ── EDIT FORM ──────────────────────────────────────────────────────── */}
      {editMode && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Edit Distributor
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                size="sm"
              >
                <Check size={14} className="mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                <X size={14} className="mr-1" /> Cancel
              </Button>
            </div>
          </div>

          {saveError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Display Name */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium">Display Name</label>
              <Input
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder={dist.name}
              />
              <p className="text-xs text-gray-400 mt-1">Shown to users in place of the system name.</p>
            </div>

            {/* Logo URL */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium">Logo URL</label>
              <Input
                value={formLogoUrl}
                onChange={(e) => setFormLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {formLogoUrl && (
                <img
                  src={formLogoUrl}
                  alt="preview"
                  className="mt-2 h-10 w-auto rounded object-contain border border-gray-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block font-medium">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description of this distributor..."
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
                rows={3}
              />
            </div>

            {/* Service States */}
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block font-medium">
                Service States ({formServiceStates.length} selected)
              </label>
              <StateMultiSelect values={formServiceStates} onChange={setFormServiceStates} />
            </div>

            {/* Serves Metros */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium">Serves Metros</label>
              <TagInput
                values={formServesMetros}
                onChange={setFormServesMetros}
                placeholder="Type a metro and press Enter or comma..."
              />
              <p className="text-xs text-gray-400 mt-1">E.g. "Chicago Metro", "DFW"</p>
            </div>

            {/* Region Tags */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block font-medium">Region Tags</label>
              <TagInput
                values={formRegionTags}
                onChange={setFormRegionTags}
                placeholder="Type a tag and press Enter or comma..."
              />
              <p className="text-xs text-gray-400 mt-1">E.g. "Midwest", "Southeast"</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CATALOG SUMMARY (new fields only) ─────────────────────────────── */}
      {hasNewFields && (dist as any).catalog_summary && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-[#2A2A2A] mb-3 uppercase tracking-wide">Catalog Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold text-[#2A2A2A]">{(dist as any).catalog_summary.product_count ?? 0}</div>
              <div className="text-xs text-gray-500">Products</div>
            </div>
            <div>
              <div className="text-sm font-medium text-[#2A2A2A]">{catalogStateBadge((dist as any).catalog_summary.catalog_state)}</div>
              <div className="text-xs text-gray-500 mt-1">Catalog State</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Last Updated</div>
              <div className="text-sm text-[#2A2A2A]">
                {(dist as any).catalog_summary.last_updated_at
                  ? new Date((dist as any).catalog_summary.last_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </div>
            </div>
          </div>
          {((dist as any).catalog_summary.top_categories?.length > 0) && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Top Categories</div>
              <div className="flex flex-wrap gap-1.5">
                {(dist as any).catalog_summary.top_categories.map((cat: string) => (
                  <span key={cat} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DISTRIBUTOR DETAIL FIELDS (view mode, new fields) ─────────────── */}
      {hasNewFields && !editMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Service States</div>
            {(dist as any).service_states?.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {(dist as any).service_states.map((s: string) => (
                  <span key={s} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">None set</p>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Serves Metros</div>
            {(dist as any).serves_metros?.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {(dist as any).serves_metros.map((m: string) => (
                  <span key={m} className="bg-[#7FAEC2]/10 text-[#2A2A2A] text-xs px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">None set</p>
            )}
          </div>
          {(dist as any).region_tags?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Region Tags</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(dist as any).region_tags.map((t: string) => (
                  <span key={t} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STATS ROW (legacy fields) ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Users size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{dist.reps?.length ?? 0}</div>
            <div className="text-xs text-gray-500">Reps</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Package size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">
              {(dist as any).catalog_summary?.product_count ?? dist.catalog?.product_count ?? 0}
            </div>
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

      {/* ── REPS ──────────────────────────────────────────────────────────── */}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* ── RESTAURANTS ───────────────────────────────────────────────────── */}
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
