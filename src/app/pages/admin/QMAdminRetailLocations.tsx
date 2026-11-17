// QM admin Retail locations list (QuoteMe #902). A retail location is a
// store: a restaurant row marked retail, with no menu, tables, servers or
// food. Reads GET /api/v1/admin/retail_locations (search on name or city)
// and writes POST /api/v1/admin/retail_locations. A new store needs a name,
// a city and a state, and starts as a prospect: it answers no shopper until
// someone marks it live on its own page.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, Plus } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { getAdminRetailLocations, createAdminRetailLocation, AdminRetailLocation } from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';

/** Live or Prospect, from restaurants.status ("active" is live). */
export function retailStatusLabel(status: string): string {
  if (status === 'active') return 'Live';
  if (status === 'prospect') return 'Prospect';
  return status;
}

export function RetailStatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {retailStatusLabel(status)}
    </span>
  );
}

export function QMAdminRetailLocations() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<AdminRetailLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Search runs on the server (name or city), a moment after typing stops.
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await getAdminRetailLocations(search);
      if (!live) return;
      if (res.data) {
        setStores(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to load');
      }
      setLoading(false);
    }, search ? 250 : 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [search]);

  const canCreate = !!(newName.trim() && newCity.trim() && newState.trim());

  async function handleCreate() {
    if (!canCreate || creating) return;
    setCreating(true);
    setCreateError(null);
    const res = await createAdminRetailLocation({
      name: newName.trim(),
      city: newCity.trim(),
      state: newState.trim(),
    });
    setCreating(false);
    if (res.data) {
      navigate(`/qm-admin/retail-locations/${res.data.id}`);
    } else {
      setCreateError(res.error || 'Failed to create');
    }
  }

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1
        className="text-2xl font-bold text-[#2A2A2A] mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Retail locations
      </h1>

      {/* New store: a name, a city and a state. The rest is on its page. */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New store name…"
          aria-label="New store name"
          className="max-w-xs"
        />
        <Input
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="City"
          aria-label="City"
          className="max-w-[10rem]"
        />
        <Input
          value={newState}
          onChange={(e) => setNewState(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="State"
          aria-label="State"
          maxLength={2}
          className="max-w-[5rem]"
        />
        <Button
          onClick={handleCreate}
          disabled={creating || !canCreate}
          className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white flex items-center gap-1.5"
        >
          <Plus size={15} />
          {creating ? 'Adding…' : 'New store'}
        </Button>
        {createError && <span role="alert" className="basis-full text-xs text-red-500">{createError}</span>}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or city…"
            aria-label="Search retail locations"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-gray-400">{stores.length} stores</span>
      </div>

      {loading && stores.length === 0 && <p className="text-sm text-gray-400 py-8">Loading…</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && stores.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">{search ? 'No stores match.' : 'No stores yet.'}</p>
          {!search && <p className="text-sm mt-1">Add one above with its name, city and state.</p>}
        </div>
      )}

      {stores.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Co-branded</TableHead>
                <TableHead>Catalog</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((s) => (
                <TableRow key={s.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <Link to={`/qm-admin/retail-locations/${s.id}`} className="text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{s.city || '-'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{s.state || '-'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{s.restaurant_group?.name || '-'}</TableCell>
                  <TableCell><RetailStatusPill status={s.status} /></TableCell>
                  <TableCell className="text-sm text-gray-600">{s.co_branded ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{s.catalog_id ? 'Set' : 'None yet'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
