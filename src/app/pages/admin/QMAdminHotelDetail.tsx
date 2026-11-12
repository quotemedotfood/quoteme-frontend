// One hotel on the QM admin (MEPs + Hotels, step 1): its details and its
// outlets (restaurant, bar, catering, events, room service), which are
// restaurants with hotel_id set. Reads GET /api/v1/admin/hotels/:id; writes
// PATCH /api/v1/admin/hotels/:id, attach_outlet and detach_outlet.
//
// Outlets are attached by restaurant id, picked by a person from a search;
// nothing is linked from a name. A restaurant that is already an outlet of
// another hotel is refused by the backend; detach it there first.
//
// "+ MENU" PER OUTLET (Moose, 2026-11-12, for hotels like Madeline Telluride):
// each outlet row opens the same "+ Menu" drawer as the restaurant page, for
// that outlet's restaurant id. The drawer's rows show inside it and keep
// polling after it closes, until another outlet's drawer is opened.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  getAdminHotel,
  updateAdminHotel,
  attachHotelOutlet,
  detachHotelOutlet,
  getAdminRestaurants,
  AdminHotelDetail,
  AdminRestaurant,
} from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import { roomServiceLabel } from './QMAdminHotels';
import { AddMenuButton, MenuDrawerHost } from './_menuUploadSection';

type RoomService = 'yes' | 'no' | 'unknown';

function toRoomService(v: boolean | null | undefined): RoomService {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return 'unknown';
}

function fromRoomService(v: RoomService): boolean | null {
  if (v === 'yes') return true;
  if (v === 'no') return false;
  return null;
}

const where = (city?: string | null, state?: string | null) => [city, state].filter(Boolean).join(', ');

export function HotelDetail({ hotelId }: { hotelId: string }) {
  const [hotel, setHotel] = useState<AdminHotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // The outlet whose "+ Menu" drawer was opened last, and whether it is open.
  const [menuFor, setMenuFor] = useState<{ id: string; name: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', google_place_id: '', address_line_1: '', city: '', state: '', website: '',
    room_service: 'unknown' as RoomService, status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminRestaurant[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setHotel(null);
    getAdminHotel(hotelId).then((res) => {
      if (!live) return;
      if (res.data) setHotel(res.data);
      else setError(res.error || 'Failed to load hotel');
      setLoading(false);
    });
    return () => { live = false; };
  }, [hotelId]);

  function startEdit() {
    if (!hotel) return;
    setForm({
      name: hotel.name,
      google_place_id: hotel.google_place_id,
      address_line_1: hotel.address_line_1 ?? '',
      city: hotel.city ?? '',
      state: hotel.state ?? '',
      website: hotel.website ?? '',
      room_service: toRoomService(hotel.has_room_service),
      status: hotel.status,
    });
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const res = await updateAdminHotel(hotelId, {
      name: form.name.trim(),
      google_place_id: form.google_place_id.trim(),
      address_line_1: form.address_line_1.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      website: form.website.trim() || null,
      has_room_service: fromRoomService(form.room_service),
      status: form.status,
    });
    setSaving(false);
    if (res.data) {
      setHotel(res.data);
      setEditing(false);
    } else {
      setSaveError(res.error || 'Failed to save');
    }
  }

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    const res = await getAdminRestaurants({ page: 1, per_page: 8, q });
    setResults(res.data?.restaurants ?? []);
    setSearching(false);
  }

  async function attach(restaurantId: string) {
    setBusyId(restaurantId);
    setActionError(null);
    const res = await attachHotelOutlet(hotelId, restaurantId);
    if (res.data) {
      setHotel(res.data);
      setResults((prev) => prev.filter((r) => r.id !== restaurantId));
    } else {
      setActionError(res.error || 'Failed to add');
    }
    setBusyId(null);
  }

  async function detach(restaurantId: string) {
    setBusyId(restaurantId);
    setActionError(null);
    const res = await detachHotelOutlet(hotelId, restaurantId);
    if (res.data) setHotel(res.data);
    else setActionError(res.error || 'Failed to remove');
    setBusyId(null);
  }

  if (loading) return <p className="text-sm text-gray-400 py-8">Loading…</p>;
  if (error || !hotel) return <p className="text-sm text-red-500 py-8">{error || 'Hotel not found'}</p>;

  const outletIds = new Set(hotel.outlets.map((o) => o.id));
  const field = (key: keyof typeof form, label: string, cls = 'max-w-xs') => (
    <label className="block text-xs text-gray-600">
      {label}
      <Input
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        aria-label={label}
        className={`mt-1 h-8 text-sm ${cls}`}
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-[#2A2A2A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {hotel.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{where(hotel.city, hotel.state) || 'No city yet'}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Hotel</p>
          {!editing && (
            <Button variant="ghost" size="sm" className="text-xs text-[#7FAEC2] h-7" onClick={startEdit}>
              <Pencil size={13} className="mr-1" />
              Edit
            </Button>
          )}
        </div>
        {!editing ? (
          <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm" data-testid="hotel-facts">
            <dt className="text-gray-500">Status</dt><dd>{hotel.status}</dd>
            <dt className="text-gray-500">Room service</dt><dd>{roomServiceLabel(hotel.has_room_service)}</dd>
            <dt className="text-gray-500">Address</dt><dd>{hotel.address_line_1 || '-'}</dd>
            <dt className="text-gray-500">Website</dt><dd className="break-all">{hotel.website || '-'}</dd>
            <dt className="text-gray-500">Google Place ID</dt><dd className="break-all font-mono text-xs">{hotel.google_place_id}</dd>
          </dl>
        ) : (
          <div className="space-y-2">
            {field('name', 'Name')}
            {field('google_place_id', 'Google Place ID')}
            {field('address_line_1', 'Address')}
            <div className="flex flex-wrap gap-2">
              {field('city', 'City', 'max-w-[12rem]')}
              {field('state', 'State', 'max-w-[5rem]')}
            </div>
            {field('website', 'Website')}
            <div className="flex flex-wrap gap-4">
              <label className="block text-xs text-gray-600">
                Room service
                <select
                  value={form.room_service}
                  onChange={(e) => setForm((f) => ({ ...f, room_service: e.target.value as RoomService }))}
                  aria-label="Room service"
                  className="mt-1 block text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
                >
                  <option value="unknown">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="block text-xs text-gray-600">
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  aria-label="Status"
                  className="mt-1 block text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-[#7FAEC2] hover:bg-[#6a9aae] text-white text-xs h-8"
                disabled={saving || !form.name.trim() || !form.google_place_id.trim()}
                onClick={save}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
            {saveError && <p className="text-xs text-red-500" role="alert">{saveError}</p>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Outlets ({hotel.outlets.length})
        </p>
        {hotel.outlets.length === 0 ? (
          <p className="text-sm text-gray-400">No outlets yet. Find a restaurant below to add it.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Name</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">City</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">State</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Status</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">In hotel</th>
                </tr>
              </thead>
              <tbody>
                {hotel.outlets.map((o) => (
                  <tr key={o.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium">
                      <Link to={`/qm-admin/restaurants/${o.id}`} className="text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline">
                        {o.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{o.city || '-'}</td>
                    <td className="px-4 py-2 text-gray-500">{o.state || '-'}</td>
                    <td className="px-4 py-2 text-gray-500">{o.status}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <span className="inline-block mr-2">
                        <AddMenuButton
                          testId="outlet-add-menu"
                          label={`Add a menu to ${o.name}`}
                          onClick={() => { setMenuFor({ id: o.id, name: o.name }); setMenuOpen(true); }}
                        />
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-600 hover:text-red-700 h-7"
                        disabled={busyId === o.id}
                        onClick={() => detach(o.id)}
                        aria-label={`Remove ${o.name}${o.city ? ` (${o.city})` : ''} from the hotel`}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add an outlet: search by name or city, then add by its id. */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Find a restaurant to add…"
            className="max-w-xs h-8 text-sm"
            aria-label="Find a restaurant to add"
          />
          <Button size="sm" variant="ghost" className="text-xs h-8" disabled={searching || !query.trim()} onClick={search}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-[#2A2A2A]">{r.name}</span>
                  <span className="text-gray-500">{where(r.city, r.state) ? `, ${where(r.city, r.state)}` : ''}</span>
                </span>
                {outletIds.has(r.id) ? (
                  <span className="text-xs text-gray-400">In this hotel</span>
                ) : (
                  <Button
                    size="sm"
                    className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-7 shrink-0"
                    disabled={busyId === r.id}
                    onClick={() => attach(r.id)}
                    aria-label={`Add ${r.name}${r.city ? ` (${r.city})` : ''} to the hotel`}
                  >
                    <Plus size={13} className="mr-1" />
                    Add
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {actionError && <p className="text-xs text-red-500" role="alert">{actionError}</p>}
      </div>
      {menuFor && (
        <MenuDrawerHost
          key={menuFor.id}
          restaurantId={menuFor.id}
          restaurantName={menuFor.name}
          open={menuOpen}
          onOpenChange={setMenuOpen}
        />
      )}
    </div>
  );
}

export function QMAdminHotelDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <Link to="/qm-admin/hotels" className="inline-flex items-center gap-1 text-sm text-[#7FAEC2] hover:underline mb-4">
        <ArrowLeft size={14} />
        Hotels
      </Link>
      {id ? <HotelDetail hotelId={id} /> : <p className="text-sm text-red-500">Hotel not found</p>}
    </div>
  );
}
