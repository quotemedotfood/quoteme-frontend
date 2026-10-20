import { useState, useEffect, Fragment } from 'react';
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
  createAdminRestaurantGroup,
  updateAdminRestaurantGroup,
  AdminRestaurantGroup,
} from '../../services/adminApi';
import { RestaurantGroupDetail } from './_restaurantGroupDetail';

/** The group's PairMe plan in a word or two, for the list. */
function planLabel(status: string | null | undefined): string {
  if (!status) return 'None';
  if (status === 'active') return 'Paid';
  if (status === 'incomplete' || status === 'incomplete_expired') return 'Link sent';
  if (status === 'past_due' || status === 'unpaid') return 'Payment failed';
  if (status === 'canceled') return 'Canceled';
  return status;
}
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';

export function QMAdminRestaurantGroups() {
  const [groups, setGroups] = useState<AdminRestaurantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Create new group
  const [newName, setNewName] = useState('');
  // The group admin, required for every new group (Moose, 2026-10-20:
  // "let's make sure that groups have admin's name, phone (optional), and
  // emails going forward"). The backend refuses a group without name and email.
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // The open group (its restaurants, adding and removing, and its plan)
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    if (!canCreate) return;
    setCreating(true);
    setCreateError(null);
    const phone = newAdminPhone.trim();
    const res = await createAdminRestaurantGroup({
      name: trimmed,
      status: 'active',
      admin_name: newAdminName.trim(),
      admin_email: newAdminEmail.trim(),
      ...(phone ? { admin_phone: phone } : {}),
    });
    if (res.data) {
      setGroups((prev) => [res.data!, ...prev]);
      setNewName('');
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPhone('');
    } else {
      setCreateError(res.error || 'Failed to create');
    }
    setCreating(false);
  }

  const canCreate = !!(newName.trim() && newAdminName.trim() && newAdminEmail.trim());

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
      setEditingId(null);
    }
    setSaving(false);
  }

  function toggleExpand(groupId: string) {
    setExpandedId((prev) => (prev === groupId ? null : groupId));
  }

  function setCount(groupId: string, count: number) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, restaurant_count: count } : g)));
  }

  const filtered = groups.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1
        className="text-2xl font-bold text-[#2A2A2A] mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Restaurant Groups
      </h1>

      {/* Create new group */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New group name…"
          aria-label="New group name"
          className="max-w-xs"
        />
        <Input
          value={newAdminName}
          onChange={(e) => setNewAdminName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Group admin"
          aria-label="Group admin"
          className="max-w-[12rem]"
        />
        <Input
          type="email"
          value={newAdminEmail}
          onChange={(e) => setNewAdminEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Email"
          aria-label="Email"
          className="max-w-[14rem]"
        />
        <Input
          type="tel"
          value={newAdminPhone}
          onChange={(e) => setNewAdminPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Phone (optional)"
          aria-label="Phone (optional)"
          className="max-w-[10rem]"
        />
        <Button
          onClick={handleCreate}
          disabled={creating || !canCreate}
          className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white flex items-center gap-1.5"
        >
          <Plus size={15} />
          {creating ? 'Creating…' : 'New Group'}
        </Button>
        {createError && <span role="alert" className="basis-full text-xs text-red-500">{createError}</span>}
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
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((group) => (
                <Fragment key={group.id}>
                  <TableRow
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

                    {/* PairMe plan for the whole group */}
                    <TableCell className="text-sm text-gray-600">{planLabel(group.billing_status)}</TableCell>

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
                      <TableCell colSpan={6} className="py-4 px-6">
                        <RestaurantGroupDetail groupId={group.id} onCountChange={(n) => setCount(group.id, n)} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
