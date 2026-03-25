import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation2 } from '../contexts/LocationContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MapPin, Plus, Users, Mail, ChevronRight } from 'lucide-react';
import {
  getLocations,
  addLocationToGroup,
  getLocationMembers,
  inviteLocationMember,
  type LocationItem,
} from '../services/api';

interface LocationMember {
  id: string;
  user_id: string | null;
  role: string;
  status: string;
  name: string | null;
  email: string;
  invited_email?: string;
  phone?: string | null;
  title?: string | null;
}

export function LocationPage() {
  const { user } = useAuth();
  const { locations, selectedLocation, isMultiLocation, refreshLocations } = useLocation2();
  const isGroupAdmin = user?.role === 'group_admin';

  // For multi-location: which location is drilled into (null = card list view)
  const [detailLocationId, setDetailLocationId] = useState<string | null>(null);

  // Single location or drilled-in location
  const activeLocation = isMultiLocation
    ? (detailLocationId ? locations.find((l) => l.id === detailLocationId) : null)
    : selectedLocation;

  if (isMultiLocation && !detailLocationId) {
    return (
      <LocationListView
        locations={locations}
        isGroupAdmin={isGroupAdmin}
        onSelect={(id) => setDetailLocationId(id)}
        onLocationAdded={refreshLocations}
      />
    );
  }

  if (!activeLocation) return null;

  return (
    <LocationDetailView
      location={activeLocation}
      isGroupAdmin={isGroupAdmin}
      showBack={isMultiLocation}
      onBack={() => setDetailLocationId(null)}
      onLocationAdded={refreshLocations}
    />
  );
}

/* ─── Card list for multi-location ─── */

function LocationListView({
  locations,
  isGroupAdmin,
  onSelect,
  onLocationAdded,
}: {
  locations: LocationItem[];
  isGroupAdmin: boolean;
  onSelect: (id: string) => void;
  onLocationAdded: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [concept, setConcept] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name.trim() || !locations[0]?.location_group_id) return;
    setAdding(true);
    setError(null);
    try {
      await addLocationToGroup(locations[0].location_group_id, {
        name: name.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        concept_type: concept.trim() || undefined,
      });
      setName('');
      setCity('');
      setState('');
      setConcept('');
      setShowAdd(false);
      onLocationAdded();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to add location');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#2A2A2A]">Locations</h1>
        {isGroupAdmin && !showAdd && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        )}
      </div>

      {/* Add Location Form */}
      {isGroupAdmin && showAdd && (
        <div className="border border-[#7FAEC2] rounded-lg p-4 bg-[#F8FCFD] mb-6">
          {locations.length === 1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                Adding a second location starts your group plan at $50/month. Your first location stays free.
              </p>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-[#4F4F4F] mb-1">Location Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Downtown Location" className="bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">City</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="bg-white" />
              </div>
              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">State</label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g., CA" className="bg-white" maxLength={2} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[#4F4F4F] mb-1">Concept Type</label>
              <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="e.g., Fine Dining, Fast Casual" className="bg-white" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleAdd} disabled={adding || !name.trim()} className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white">
                {adding ? 'Adding...' : 'Add Location'}
              </Button>
              <Button variant="outline" onClick={() => { setShowAdd(false); setError(null); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Location Cards */}
      <div className="space-y-3">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => onSelect(loc.id)}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-[#7FAEC2] transition-colors text-left"
          >
            <MapPin className="w-5 h-5 text-[#7FAEC2] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#2A2A2A] truncate">{loc.name}</p>
              <p className="text-sm text-[#4F4F4F]">
                {[loc.city, loc.state].filter(Boolean).join(', ')}
                {loc.concept_type ? ` · ${loc.concept_type}` : ''}
              </p>
            </div>
            {loc.membership_role === 'group_admin' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex-shrink-0">Admin</span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Detail view for a single location ─── */

function LocationDetailView({
  location,
  isGroupAdmin,
  showBack,
  onBack,
  onLocationAdded,
}: {
  location: LocationItem;
  isGroupAdmin: boolean;
  showBack: boolean;
  onBack: () => void;
  onLocationAdded: () => Promise<void>;
}) {
  const { locations } = useLocation2();
  const [members, setMembers] = useState<LocationMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteRole, setInviteRole] = useState<'buyer' | 'group_admin'>('buyer');
  const [inviteLocationIds, setInviteLocationIds] = useState<string[]>([location.id]);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [location.id]);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const data = await getLocationMembers(location.id);
      setMembers(data);
    } catch {
      // silently fail
    } finally {
      setLoadingMembers(false);
    }
  };

  const resetInviteForm = () => {
    setInviteFirstName('');
    setInviteLastName('');
    setInviteEmail('');
    setInvitePhone('');
    setInviteTitle('');
    setInviteRole('buyer');
    setInviteLocationIds([location.id]);
    setInviteError(null);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteFirstName.trim() || !inviteLastName.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await inviteLocationMember(location.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
        first_name: inviteFirstName.trim(),
        last_name: inviteLastName.trim(),
        phone: invitePhone.trim() || undefined,
        title: inviteTitle.trim() || undefined,
        location_ids: inviteLocationIds.length > 1 ? inviteLocationIds : undefined,
      });
      const name = `${inviteFirstName.trim()} ${inviteLastName.trim()}`;
      setInviteSuccess(`Invitation sent to ${name} (${inviteEmail.trim()})`);
      resetInviteForm();
      setShowInvite(false);
      fetchMembers();
    } catch (e: any) {
      setInviteError(e?.response?.data?.error || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const toggleLocationId = (id: string) => {
    setInviteLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {showBack && (
        <button onClick={onBack} className="text-sm text-[#7FAEC2] hover:underline mb-4 flex items-center gap-1">
          ← All Locations
        </button>
      )}

      {/* Location Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <MapPin className="w-6 h-6 text-[#7FAEC2] mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-xl font-semibold text-[#2A2A2A]">{location.name}</h1>
            <p className="text-sm text-[#4F4F4F] mt-1">
              {[location.city, location.state].filter(Boolean).join(', ')}
              {location.concept_type ? ` · ${location.concept_type}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-[#4F4F4F]">Team</h2>
          {isGroupAdmin && !showInvite && (
            <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
              <Mail className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>

        {/* Invite Form */}
        {showInvite && (
          <div className="border border-[#7FAEC2] rounded-lg p-4 bg-[#F8FCFD] mb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#4F4F4F] mb-1">First Name *</label>
                  <Input
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="Jane"
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#4F4F4F] mb-1">Last Name *</label>
                  <Input
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Smith"
                    className="bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">Email Address *</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="team@example.com"
                  className="bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#4F4F4F] mb-1">
                    Phone <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <Input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#4F4F4F] mb-1">
                    Title <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <Input
                    value={inviteTitle}
                    onChange={(e) => setInviteTitle(e.target.value)}
                    placeholder="e.g., Sous Chef, GM"
                    className="bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'buyer' | 'group_admin')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="buyer">Buyer</option>
                  <option value="group_admin">Admin</option>
                </select>
              </div>
              {/* Multi-location select */}
              {locations.length > 1 && (
                <div>
                  <label className="block text-sm text-[#4F4F4F] mb-2">Locations</label>
                  <div className="space-y-1.5">
                    {locations.map((loc) => (
                      <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inviteLocationIds.includes(loc.id)}
                          onChange={() => toggleLocationId(loc.id)}
                          className="rounded border-gray-300 text-[#7FAEC2] focus:ring-[#7FAEC2]"
                          style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}
                        />
                        <span className="text-sm text-[#2A2A2A]">{loc.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim() || !inviteFirstName.trim() || !inviteLastName.trim() || inviteLocationIds.length === 0}
                  className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </Button>
                <Button variant="outline" onClick={() => { setShowInvite(false); resetInviteForm(); }}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {inviteSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">{inviteSuccess}</p>
          </div>
        )}

        {/* Members list */}
        {loadingMembers ? (
          <div className="text-center py-6 text-sm text-[#4F4F4F]">Loading team...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-[#4F4F4F]">No team members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-[#7FAEC2] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {(m.name || m.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#2A2A2A] text-sm truncate">{m.name || m.invited_email || m.email}</p>
                  <p className="text-xs text-[#4F4F4F] truncate">
                    {m.title ? `${m.title} · ` : ''}{m.email || m.invited_email}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  m.role === 'group_admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {m.role === 'group_admin' ? 'Admin' : 'Buyer'}
                </span>
                {m.status === 'invited' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Invited</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Location — group_admin only, single-location view */}
      {isGroupAdmin && !showBack && <AddLocationSection location={location} onLocationAdded={onLocationAdded} />}
    </div>
  );
}

/* ─── Add Location section for single-location detail view ─── */

function AddLocationSection({
  location,
  onLocationAdded,
}: {
  location: LocationItem;
  onLocationAdded: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [concept, setConcept] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name.trim() || !location.location_group_id) return;
    setAdding(true);
    setError(null);
    try {
      await addLocationToGroup(location.location_group_id, {
        name: name.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        concept_type: concept.trim() || undefined,
      });
      setName('');
      setCity('');
      setState('');
      setConcept('');
      setShowForm(false);
      await onLocationAdded();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to add location');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-6">
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg text-[#4F4F4F] mb-4">Add Location</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800">
              Adding a second location starts your group plan at $50/month. Your first location stays free.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-[#4F4F4F] mb-1">Location Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Downtown Location" className="bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">City *</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="bg-white" />
              </div>
              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">State *</label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g., CA" className="bg-white" maxLength={2} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[#4F4F4F] mb-1">
                Concept Type <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="e.g., Fine Dining, Fast Casual" className="bg-white" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAdd}
                disabled={adding || !name.trim() || !city.trim() || !state.trim()}
                className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
              >
                {adding ? 'Adding...' : 'Add Location'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
