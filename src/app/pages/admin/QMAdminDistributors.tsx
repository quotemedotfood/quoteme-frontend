import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Search, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import { getAdminDistributors, createDistributor, impersonateUser, AdminDistributor } from '../../services/adminApi';
import { UserCheck } from 'lucide-react';

type SortField = 'name' | 'region' | 'status' | 'rep_count' | 'product_count' | 'created_at';
type SortDir = 'asc' | 'desc';

export function QMAdminDistributors() {
  const [distributors, setDistributors] = useState<AdminDistributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [creating, setCreating] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  async function handleImpersonate(userId: string, userName: string) {
    setImpersonating(userId);
    const res = await impersonateUser(userId);
    if (res.data?.token) {
      localStorage.setItem('quoteme_admin_token', localStorage.getItem('quoteme_token') || '');
      localStorage.setItem('quoteme_impersonating', userName);
      localStorage.setItem('quoteme_token', res.data.token);
      window.location.href = '/';
    } else {
      setError(res.error || 'Failed to impersonate');
      setImpersonating(null);
    }
  }

  useEffect(() => {
    loadDistributors();
  }, []);

  async function loadDistributors() {
    setLoading(true);
    const res = await getAdminDistributors();
    if (res.data) setDistributors(res.data);
    else setError(res.error || 'Failed to load');
    setLoading(false);
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
    let result = [...distributors];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.email_domain || '').toLowerCase().includes(q) ||
          (d.region || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
        case 'region': cmp = (a.region || '').localeCompare(b.region || ''); break;
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break;
        case 'rep_count': cmp = (a.rep_count || 0) - (b.rep_count || 0); break;
        case 'product_count': cmp = (a.product_count || 0) - (b.product_count || 0); break;
        case 'created_at': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [distributors, search, sortField, sortDir]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createDistributor({
      name: newName.trim(),
      email_domain: newDomain.trim() || undefined,
      region: newRegion.trim() || undefined,
    });
    setCreating(false);
    if (res.data) {
      setShowCreate(false);
      setNewName('');
      setNewDomain('');
      setNewRegion('');
      loadDistributors();
    } else {
      setError(res.error || 'Failed to create distributor');
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold text-[#2A2A2A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Distributors
        </h1>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
        >
          <Plus size={16} className="mr-1" /> Create Distributor
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h3 className="font-medium text-[#2A2A2A] mb-3">New Distributor</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-gray-500 mb-1 block">Name *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Sysco, US Foods..." />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-gray-500 mb-1 block">Email Domain</label>
              <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="sysco.com" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-gray-500 mb-1 block">Region</label>
              <Input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="Northeast" />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white">
              {creating ? 'Creating...' : 'Create'}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search distributors..." className="pl-9" />
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} distributors</span>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading distributors...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No distributors yet</p>
          <p className="text-sm mt-1">Create your first distributor to get started.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </TableHead>
                  <TableHead>Email Domain</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('region')}>
                    <div className="flex items-center gap-1">Region <SortIcon field="region" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('rep_count')}>
                    <div className="flex items-center justify-end gap-1">Reps <SortIcon field="rep_count" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('product_count')}>
                    <div className="flex items-center justify-end gap-1">Products <SortIcon field="product_count" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>
                    <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center gap-1">Created <SortIcon field="created_at" /></div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Link to={`/qm-admin/distributors/${d.id}`} className="font-medium text-[#7FAEC2] hover:underline">
                        {d.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{d.email_domain || 'None'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{d.region || 'None'}</TableCell>
                    <TableCell className="text-sm text-right">{d.rep_count ?? 0}</TableCell>
                    <TableCell className="text-sm text-right">{d.product_count ?? 0}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {d.status || 'unknown'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(d.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {d.admin_user_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
                          disabled={impersonating === d.admin_user_id}
                          onClick={() => handleImpersonate(d.admin_user_id!, d.admin_user_name || d.name)}
                        >
                          <UserCheck size={14} className="mr-1" />
                          {impersonating === d.admin_user_id ? 'Switching...' : 'Impersonate'}
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">No user</span>
                      )}
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
