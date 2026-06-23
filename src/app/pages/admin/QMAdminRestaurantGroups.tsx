import { useState, useEffect } from 'react';
import { Search, Plus, ChevronRight, ChevronDown, Pencil, Check, X } from 'lucide-react';
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
import {
  getAdminRestaurantGroups,
  getAdminRestaurantGroup,
  createAdminRestaurantGroup,
  updateAdminRestaurantGroup,
  addRestaurantToGroup,
  AdminRestaurantGroup,
  AdminRestaurantGroupDetail,
} from '../../services/adminApi';

export function QMAdminRestaurantGroups() {
  const [groups, setGroups] = useState<AdminRestaurantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Create new group
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Expanded group detail
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminRestaurantGroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Add restaurant to group
  const [addingRestaurantId, setAddingRestaurantId] = useState<string | null>(null);
  const [restaurantIdInput, setRestaurantIdInput] = useState('');
  const [addingRestaurant, setAddingRestaurant] = useState(false);
  const [addRestaurantError, setAddRestaurantError] = useState<string | null>(null);

  async function loadGroups() {
    setLoading(true);
    const res = await getAdminRestaurantGroups();
    if (res.data) setGroups(res.data);
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    setCreateError(null);
    const res = await createAdminRestaurantGroup({ name: trimmed, status: 'active' });
    if (res.data) {
      setGroups((prev) => [res.data!, ...prev]);
      setNewName('');
    } else {
      setCreateError(res.error || 'Failed to create');
    }
    setCreating(false);
  }

  function startEdit(group: AdminRestaurantGroup) {
    setEditingId(group.id);
    setEditName(group.name);
    setEditStatus(group.status);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditStatus('');
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await updateAdminRestaurantGroup(id, { name: editName.trim(), status: editStatus });
    if (res.data) {
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: res.data!.name, status: res.data!.status } : g)));
      // If this group is expanded and its name changed, update detail too
      if (detail && detail.id === id) {
        setDetail((prev) => prev ? { ...prev, name: res.data!.name, status: res.data!.status } : prev);
      }
      setEditingId(null);
    }
    setSaving(false);
  }

  async function toggleExpand(groupId: string) {
    if (expandedId === groupId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(groupId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setAddingRestaurantId(null);
    const res = await getAdminRestaurantGroup(groupId);
    if (res.data) setDetail(res.data);
    else setDetailError(res.error || 'Failed to load group');
    setDetailLoading(false);
  }

  async function handleAddRestaurant(groupId: string) {
    const trimmed = restaurantIdInput.trim();
    if (!trimmed) return;
    setAddingRestaurant(true);
    setAddRestaurantError(null);
    const res = await addRestaurantToGroup(groupId, { restaurant_id: trimmed });
    if (res.data) {
      setDetail(res.data);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, restaurant_count: res.data!.restaurant_count } : g)));
      setRestaurantIdInput('');
      setAddingRestaurantId(null);
    } else {
      setAddRestaurantError(res.error || 'Failed to add restaurant');
    }
    setAddingRestaurant(false);
  }

  const filtered = groups.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <h1
        className="text-2xl font-bold text-[#2A2A2A] mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Restaurant Groups
      </h1>

      {/* Create new group */}
      <div className="flex items-center gap-2 mb-6">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New group name…"
          className="max-w-xs"
        />
        <Button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white flex items-center gap-1.5"
        >
          <Plus size={15} />
          {creating ? 'Creating…' : 'New Group'}
        </Button>
        {createError && <span className="text-xs text-red-500">{createError}</span>}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} groups</span>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading…</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No restaurant groups yet.</p>
          <p className="text-sm mt-1">Create one above to get started.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Restaurants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((group) => (
                <>
                  <TableRow
                    key={group.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (editingId !== group.id) toggleExpand(group.id);
                    }}
                  >
                    {/* Expand chevron */}
                    <TableCell className="w-8 text-gray-400">
                      {expandedId === group.id ? (
                        <ChevronDown size={15} />
                      ) : (
                        <ChevronRight size={15} />
                      )}
                    </TableCell>

                    {/* Name — inline edit */}
                    <TableCell className="font-medium">
                      {editingId === group.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(group.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="h-7 text-sm max-w-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="text-[#2A2A2A]">{group.name}</span>
                      )}
                    </TableCell>

                    {/* Status — inline edit */}
                    <TableCell>
                      {editingId === group.id ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                        >
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            group.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {group.status}
                        </span>
                      )}
                    </TableCell>

                    {/* Restaurant count */}
                    <TableCell className="text-sm text-right">{group.restaurant_count}</TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editingId === group.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-green-600 hover:text-green-700"
                              disabled={saving}
                              onClick={() => saveEdit(group.id)}
                            >
                              <Check size={14} className="mr-1" />
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-gray-500"
                              onClick={cancelEdit}
                            >
                              <X size={14} className="mr-1" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
                            onClick={() => startEdit(group)}
                          >
                            <Pencil size={14} className="mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded detail row */}
                  {expandedId === group.id && (
                    <TableRow key={`${group.id}-detail`} className="bg-gray-50/70">
                      <TableCell colSpan={5} className="py-4 px-6">
                        {detailLoading && (
                          <p className="text-sm text-gray-400">Loading restaurants…</p>
                        )}
                        {detailError && (
                          <p className="text-sm text-red-500">{detailError}</p>
                        )}
                        {detail && detail.id === group.id && (
                          <div className="space-y-3">
                            {detail.restaurants.length === 0 ? (
                              <p className="text-sm text-gray-400">No restaurants in this group yet.</p>
                            ) : (
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Name</th>
                                      <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">City</th>
                                      <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">State</th>
                                      <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail.restaurants.map((r) => (
                                      <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-[#2A2A2A]">{r.name}</td>
                                        <td className="px-4 py-2 text-gray-500">{r.city || '—'}</td>
                                        <td className="px-4 py-2 text-gray-500">{r.state || '—'}</td>
                                        <td className="px-4 py-2">
                                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {r.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Add restaurant by ID */}
                            {addingRestaurantId === group.id ? (
                              <div className="flex items-center gap-2 mt-2">
                                <Input
                                  value={restaurantIdInput}
                                  onChange={(e) => setRestaurantIdInput(e.target.value)}
                                  placeholder="Restaurant ID (UUID)…"
                                  className="max-w-xs h-8 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddRestaurant(group.id);
                                    if (e.key === 'Escape') setAddingRestaurantId(null);
                                  }}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8"
                                  disabled={addingRestaurant || !restaurantIdInput.trim()}
                                  onClick={() => handleAddRestaurant(group.id)}
                                >
                                  {addingRestaurant ? 'Adding…' : 'Add'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-gray-500 h-8"
                                  onClick={() => {
                                    setAddingRestaurantId(null);
                                    setRestaurantIdInput('');
                                    setAddRestaurantError(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                {addRestaurantError && (
                                  <span className="text-xs text-red-500">{addRestaurantError}</span>
                                )}
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0] mt-1"
                                onClick={() => {
                                  setAddingRestaurantId(group.id);
                                  setRestaurantIdInput('');
                                  setAddRestaurantError(null);
                                }}
                              >
                                <Plus size={13} className="mr-1" />
                                Add existing restaurant
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
