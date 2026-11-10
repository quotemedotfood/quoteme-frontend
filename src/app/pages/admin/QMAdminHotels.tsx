// QM admin Hotels list (MEPs + Hotels, step 1). A hotel is a small
// restaurant group: its outlets (restaurant, bar, catering, events, room
// service) are restaurants with hotel_id set. Reads GET /api/v1/admin/hotels
// (search on name or city) and writes POST /api/v1/admin/hotels. A hotel is
// keyed on its Google Place ID, so the form asks for one; the name is only
// what people read.
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
import { getAdminHotels, createAdminHotel, AdminHotel } from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';

/** Room service in a word: Yes, No, or Unknown (null). */
export function roomServiceLabel(v: boolean | null | undefined): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return 'Unknown';
}

export function QMAdminHotels() {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<AdminHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [newName, setNewName] = useState('');
  const [newPlaceId, setNewPlaceId] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Search runs on the server (name or city), a moment after typing stops.
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await getAdminHotels(search);
      if (!live) return;
      if (res.data) {
        setHotels(res.data);
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

  const canCreate = !!(newName.trim() && newPlaceId.trim());

  async function handleCreate() {
    if (!canCreate || creating) return;
    setCreating(true);
    setCreateError(null);
    const city = newCity.trim();
    const state = newState.trim();
    const res = await createAdminHotel({
      name: newName.trim(),
      google_place_id: newPlaceId.trim(),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
    });
    setCreating(false);
    if (res.data) {
      navigate(`/qm-admin/hotels/${res.data.id}`);
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
        Hotels
      </h1>

      {/* New hotel: a name and its Google Place ID. */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New hotel name…"
          aria-label="New hotel name"
          className="max-w-xs"
        />
        <Input
          value={newPlaceId}
          onChange={(e) => setNewPlaceId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Google Place ID"
          aria-label="Google Place ID"
          className="max-w-[16rem]"
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
          className="max-w-[5rem]"
        />
        <Button
          onClick={handleCreate}
          disabled={creating || !canCreate}
          className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white flex items-center gap-1.5"
        >
          <Plus size={15} />
          {creating ? 'Adding…' : 'New Hotel'}
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
            aria-label="Search hotels"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-gray-400">{hotels.length} hotels</span>
      </div>

      {loading && hotels.length === 0 && <p className="text-sm text-gray-400 py-8">Loading…</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && hotels.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">{search ? 'No hotels match.' : 'No hotels yet.'}</p>
          {!search && <p className="text-sm mt-1">Add one above with its Google Place ID.</p>}
        </div>
      )}

      {hotels.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Room service</TableHead>
                <TableHead className="text-right">Outlets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotels.map((h) => (
                <TableRow key={h.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <Link to={`/qm-admin/hotels/${h.id}`} className="text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline">
                      {h.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{h.city || '-'}</TableCell>
                  <TableCell className="text-sm text-gray-600">{h.state || '-'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        h.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {h.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{roomServiceLabel(h.has_room_service)}</TableCell>
                  <TableCell className="text-sm text-right">{h.outlet_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
