import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Archive, ArchiveRestore } from 'lucide-react';
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
import { getAdminUsers, updateAdminUser, AdminUser } from '../../services/adminApi';
import { userStatusPill } from '../../utils/userDisplayStatus';
import { AdminEmptyState } from './_adminEmptyState';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import { userLabel } from '../../utils/userLabel';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../components/ui/alert-dialog';

// Every role the backend will accept. Source of truth is the inclusion
// validation on User (app/models/user.rb:17); keep this list in step with it.
//
// The filter used to hard-code only the first four, so group_admin, brand,
// buyer and restaurant_admin rows were unreachable through it: on Test that
// is 12 of 49 users hidden behind a control that looks complete. buyer in
// particular is created by the guest-conversion and registration paths, so
// it appears without anyone choosing it.
const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'rep', label: 'Rep' },
  { value: 'chef', label: 'Chef' },
  { value: 'distributor_admin', label: 'Dist Admin' },
  { value: 'quoteme_admin', label: 'QM Admin' },
  { value: 'group_admin', label: 'Group Admin' },
  { value: 'restaurant_admin', label: 'Restaurant Admin' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'brand', label: 'Brand' },
];

type SortField = 'name' | 'email' | 'role' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

export function QMAdminSignups() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Holds the user whose archive confirm is open; null when none is pending.
  const [confirmArchive, setConfirmArchive] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [includeArchived, setIncludeArchived] = useState(false);

  useEffect(() => {
    // Check URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('flagged') === 'true') setFlaggedFilter(true);
  }, []);

  async function loadUsers() {
    setLoading(true);
    const res = await getAdminUsers({
      role: roleFilter || undefined,
      flagged: flaggedFilter || undefined,
      include_archived: includeArchived || undefined,
    });
    if (res.data) setUsers(res.data);
    else setError(res.error || 'Failed to load users');
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, [roleFilter, flaggedFilter, includeArchived]);

  // Only the confirm's action reaches the API.
  async function performArchive(userId: string) {
    setConfirmArchive(null);
    const res = await updateAdminUser(userId, { status: 'archived' });
    if (res.data) loadUsers();
    else setError(res.error || 'Failed to archive user');
  }

  async function handleUnarchive(userId: string) {
    const res = await updateAdminUser(userId, { status: 'active' });
    if (res.data) loadUsers();
    else setError(res.error || 'Failed to unarchive user');
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDir(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const filtered = useMemo(() => {
    let result = [...users];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.distributor_name || '').toLowerCase().includes(q)
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
        case 'role':
          cmp = a.role.localeCompare(b.role);
          break;
        case 'status':
          // Sort by the label the operator can actually see. The Status cell
          // renders userStatusPill(u), which reads the derived display_status
          // ("Invite sent" for an account nobody has ever signed into), while
          // the raw `status` column is set to "active" the moment an admin
          // creates the user. Sorting on the raw column grouped every
          // never-signed-in account under Active, so the header reordered the
          // table by a value that appears nowhere on screen.
          cmp = userStatusPill(a).label.localeCompare(userStatusPill(b).label);
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [users, search, sortField, sortDir]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  function formatRelativeTime(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Never';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  }

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1
        className="text-2xl font-bold text-[#2A2A2A] mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Signup Pipeline
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, distributor..."
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-[#4F4F4F] cursor-pointer">
          <input
            type="checkbox"
            checked={flaggedFilter}
            onChange={(e) => setFlaggedFilter(e.target.checked)}
            className="rounded border-gray-300"
          />
          Flagged only
        </label>
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

      {loading && <p className="text-sm text-gray-400 py-8">Loading users...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && filtered.length === 0 && <AdminEmptyState label="users" />}

      {!loading && filtered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('email')}>
                    <div className="flex items-center gap-1">Email <SortIcon field="email" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('role')}>
                    <div className="flex items-center gap-1">Role <SortIcon field="role" /></div>
                  </TableHead>
                  <TableHead>Distributor</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>
                    <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center gap-1">Signed Up <SortIcon field="created_at" /></div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow
                    key={u.id}
                    className={u.flagged_for_review ? 'bg-amber-50' : 'hover:bg-gray-50'}
                  >
                    <TableCell className="font-medium text-[#2A2A2A]">
                      {u.first_name} {u.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-[#4F4F4F]">{u.email}</TableCell>
                    <TableCell>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.distributor_name || '-'}
                      {u.distributor_name && !u.claimed_distributor_id && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                          New Distributor Request
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.flagged_for_review && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle size={14} />
                          <span className="text-xs">{u.flag_reason || 'Flagged'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Feature 2 Slice 1: honest status pill. See userStatusPill
                          for why a never-logged-in signup renders "Invite sent"
                          instead of "Active". Slice 2 pairs a genuinely active
                          pill with a truthful last-sign-in date. */}
                      {(() => {
                        const pill = userStatusPill(u);
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${pill.className} w-fit`}
                            >
                              {pill.label}
                            </span>
                            {pill.lastSignInLabel && (
                              <span className="text-[10px] text-gray-400">{pill.lastSignInLabel}</span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatRelativeTime((u as any).last_login_at)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      {u.status === 'archived' ? (
                        <button
                          onClick={() => handleUnarchive(u.id)}
                          className="text-xs text-[#7FAEC2] hover:underline flex items-center gap-1"
                          aria-label={`Unarchive ${userLabel(u)}`}
                          title={`Unarchive ${userLabel(u)}`}
                        >
                          <ArchiveRestore size={12} /> Unarchive
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmArchive(u)}
                          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                          aria-label={`Archive ${userLabel(u)}`}
                          title={`Archive ${userLabel(u)}`}
                        >
                          <Archive size={12} /> Archive
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Archive confirm. Unlike the brand-rule delete, this one IS reversible
          and the reverse control is on the same row: handleArchive sets
          status 'archived' and handleUnarchive sets it back to 'active', and
          the two render in mutually exclusive branches. So the copy says so.
          The Team page confirm stays silent about recovery because no
          re-enable exists there; here it exists and the operator can see it. */}
      <AlertDialog
        open={!!confirmArchive}
        onOpenChange={(open) => { if (!open) setConfirmArchive(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive {confirmArchive ? userLabel(confirmArchive) : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They lose access and drop out of the default list. Nothing is
              deleted, and you can bring them back with Unarchive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => confirmArchive && performArchive(confirmArchive.id)}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
