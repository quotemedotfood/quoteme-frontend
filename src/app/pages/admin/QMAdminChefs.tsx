import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, UserCheck } from 'lucide-react';
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
import { getAdminUsers, AdminUser } from '../../services/adminApi';
import { impersonateChef } from '../../services/api';

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

export function QMAdminChefs() {
  const [chefs, setChefs] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Impersonation state
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [showReasonFor, setShowReasonFor] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getAdminUsers({ role: 'chef' });
      if (res.data) setChefs(res.data);
      else setError(res.error || 'Failed to load chefs');
      setLoading(false);
    }
    load();
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
    let result = [...chefs];
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
  }, [chefs, search, sortField, sortDir]);

  async function handleImpersonate(chef: AdminUser) {
    setImpersonatingId(chef.id);
    const fullName = `${chef.first_name} ${chef.last_name}`;

    const res = await impersonateChef(chef.id);

    if (res.data?.token) {
      // Store admin credentials for restore on exit
      localStorage.setItem('quoteme_admin_token', localStorage.getItem('quoteme_token') || '');
      // Store chef display info so the banner can read it
      localStorage.setItem('quoteme_chef_impersonating', fullName);
      localStorage.setItem('quoteme_chef_impersonation_event_id', res.data.event_id);
      // Swap the session token
      localStorage.setItem('quoteme_token', res.data.token);
      // Navigate to the chef dashboard. Previously '/chef' routed to the
      // guest-quote create path, which 404'd on auth-mismatch polling
      // (c51 — guest endpoint requires X-Guest-Token, impersonation issues
      // a JWT). Dashboard is the correct landing for an already-impersonated
      // chef session.
      window.location.href = '/dashboard';
    } else {
      setError(res.error || 'Failed to impersonate chef');
      setImpersonatingId(null);
    }

    setShowReasonFor(null);
  }

  const statusBadge = (status: string) => {
    const styles =
      status === 'active'
        ? 'bg-green-100 text-green-700'
        : status === 'inactive'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-gray-100 text-gray-500';
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
          Chef Accounts
        </h1>
        <span className="text-sm text-gray-400">{filtered.length} chefs</span>
      </div>

      {/* Reason modal */}
      {showReasonFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <h2
              className="text-lg font-bold text-[#2A2A2A] mb-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Impersonate Chef
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              You'll switch into this chef's account. Your QM Admin session is restored when you
              exit impersonation.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowReasonFor(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={!!impersonatingId}
                style={{ backgroundColor: '#F39839' }}
                className="text-white hover:opacity-90"
                onClick={() => {
                  const chef = chefs.find((c) => c.id === showReasonFor);
                  if (chef) handleImpersonate(chef);
                }}
              >
                {impersonatingId ? 'Switching...' : 'Impersonate'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
      </div>

      {error && <p className="text-sm text-red-500 py-4">{error}</p>}
      {loading && <p className="text-sm text-gray-400 py-8">Loading chef accounts...</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No chef accounts found</p>
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
                      Joined <SortIcon field="created_at" />
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((chef) => (
                  <TableRow key={chef.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-[#2A2A2A]">
                      {chef.first_name} {chef.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-[#4F4F4F]">{chef.email}</TableCell>
                    <TableCell>{statusBadge(chef.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatRelativeTime(chef.last_login_at)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatRelativeTime(chef.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={impersonatingId === chef.id}
                        onClick={() => setShowReasonFor(chef.id)}
                        style={{
                          borderColor: '#F39839',
                          color: '#F39839',
                        }}
                        className="hover:opacity-80 flex items-center gap-1"
                        data-testid={`impersonate-btn-${chef.id}`}
                      >
                        <UserCheck size={14} />
                        {impersonatingId === chef.id ? 'Switching...' : 'Impersonate'}
                      </Button>
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
