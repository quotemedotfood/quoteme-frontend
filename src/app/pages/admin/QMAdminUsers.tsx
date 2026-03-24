import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, UserPlus, X } from 'lucide-react';
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
  getAdminUsers,
  updateAdminUser,
  inviteAdminUser,
  AdminUser,
} from '../../services/adminApi';

type SortField = 'name' | 'email' | 'status' | 'last_login_at' | 'created_at';
type SortDir = 'asc' | 'desc';

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function QMAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('quoteme_admin');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Action loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    const res = await getAdminUsers({ role: 'quoteme_admin' });
    if (res.data) setUsers(res.data);
    else setError(res.error || 'Failed to load users');
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDir(field === 'created_at' || field === 'last_login_at' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const filtered = useMemo(() => {
    let result = [...users];

    // Hide archived unless toggled
    if (!includeArchived) {
      result = result.filter((u) => u.status !== 'archived');
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          break;
        case 'email':
          cmp = a.email.localeCompare(b.email);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'last_login_at': {
          const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
          const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
          cmp = aTime - bTime;
          break;
        }
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [users, search, sortField, sortDir, includeArchived]);

  async function handleStatusChange(userId: string, newStatus: string) {
    setActionLoading(userId);
    const res = await updateAdminUser(userId, { status: newStatus });
    if (res.data) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
    }
    setActionLoading(null);
  }

  async function handleInvite() {
    if (!inviteFirstName.trim() || !inviteLastName.trim() || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    const res = await inviteAdminUser({
      first_name: inviteFirstName.trim(),
      last_name: inviteLastName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
    });
    if (res.error) {
      setInviteError(res.error);
      setInviting(false);
      return;
    }
    setInviteFirstName('');
    setInviteLastName('');
    setInviteEmail('');
    setInviteRole('quoteme_admin');
    setShowInvite(false);
    setInviting(false);
    loadUsers();
  }

  const statusBadge = (status: string) => {
    const styles =
      status === 'active'
        ? 'bg-green-100 text-green-700'
        : status === 'inactive'
        ? 'bg-yellow-100 text-yellow-700'
        : status === 'archived'
        ? 'bg-gray-100 text-gray-500'
        : 'bg-gray-100 text-gray-600';
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold text-[#2A2A2A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Admin Users
        </h1>
        <Button
          onClick={() => setShowInvite(true)}
          className="bg-[#7FAEC2] hover:bg-[#6a9ab0] text-white"
        >
          <UserPlus size={16} />
          Invite Admin
        </Button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-bold text-[#2A2A2A]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Invite Admin
              </h2>
              <button
                onClick={() => {
                  setShowInvite(false);
                  setInviteError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#4F4F4F] mb-1">First Name</label>
                  <Input
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Last Name</label>
                  <Input
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Email</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@quoteme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4F4F4F] mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="quoteme_admin">QM Admin</option>
                  <option value="distributor_admin">Distributor Admin</option>
                </select>
              </div>
              {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInvite(false);
                    setInviteError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteFirstName.trim() || !inviteLastName.trim() || !inviteEmail.trim()}
                  className="bg-[#7FAEC2] hover:bg-[#6a9ab0] text-white"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#4F4F4F] cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-gray-300"
          />
          Include Archived
        </label>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} users</span>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading admin users...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No admin users found</p>
          <p className="text-sm mt-1">Invite admins using the button above.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1">
                      Name <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('email')}>
                    <div className="flex items-center gap-1">
                      Email <SortIcon field="email" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>
                    <div className="flex items-center gap-1">
                      Status <SortIcon field="status" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => toggleSort('last_login_at')}
                  >
                    <div className="flex items-center gap-1">
                      Last Login <SortIcon field="last_login_at" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center gap-1">
                      Created <SortIcon field="created_at" />
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-[#2A2A2A]">
                      {u.first_name} {u.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-[#4F4F4F]">{u.email}</TableCell>
                    <TableCell>{statusBadge(u.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatRelativeTime(u.last_login_at)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {u.status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === u.id}
                              onClick={() => handleStatusChange(u.id, 'inactive')}
                              className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                            >
                              Deactivate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === u.id}
                              onClick={() => handleStatusChange(u.id, 'archived')}
                              className="text-gray-500 border-gray-300 hover:bg-gray-50"
                            >
                              Archive
                            </Button>
                          </>
                        )}
                        {u.status === 'inactive' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === u.id}
                              onClick={() => handleStatusChange(u.id, 'active')}
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              Activate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === u.id}
                              onClick={() => handleStatusChange(u.id, 'archived')}
                              className="text-gray-500 border-gray-300 hover:bg-gray-50"
                            >
                              Archive
                            </Button>
                          </>
                        )}
                        {u.status === 'archived' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === u.id}
                            onClick={() => handleStatusChange(u.id, 'active')}
                            className="text-green-600 border-green-300 hover:bg-green-50"
                          >
                            Unarchive
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
