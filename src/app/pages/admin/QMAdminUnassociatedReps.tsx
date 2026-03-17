import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Building2, AlertTriangle } from 'lucide-react';
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
  assignDistributor,
  searchDistributors,
  AdminUser,
} from '../../services/adminApi';

type SortField = 'name' | 'email' | 'distributor_name' | 'created_at';
type SortDir = 'asc' | 'desc';

export function QMAdminUnassociatedReps() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Assign drawer
  const [assignUser, setAssignUser] = useState<AdminUser | null>(null);
  const [distQuery, setDistQuery] = useState('');
  const [distResults, setDistResults] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDist, setSelectedDist] = useState<{ id: string; name: string } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const debounceRef = useRef<number>();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const res = await getAdminUsers();
    if (res.data) {
      // Filter to unassociated reps client-side
      setUsers(res.data.filter((u) => u.rep_profile && !u.rep_profile.distributor_id));
    } else {
      setError(res.error || 'Failed to load');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (distQuery.length < 2) {
      setDistResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const res = await searchDistributors(distQuery);
      if (res.data) setDistResults(res.data);
    }, 300);
  }, [distQuery]);

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
        case 'name': cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`); break;
        case 'email': cmp = a.email.localeCompare(b.email); break;
        case 'distributor_name': cmp = (a.distributor_name || '').localeCompare(b.distributor_name || ''); break;
        case 'created_at': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [users, search, sortField, sortDir]);

  async function handleAssign() {
    if (!assignUser || !selectedDist) return;
    setAssigning(true);
    const res = await assignDistributor(assignUser.id, selectedDist.id);
    setAssigning(false);
    if (res.data) {
      setAssignUser(null);
      setSelectedDist(null);
      setDistQuery('');
      loadUsers();
    } else {
      setError(res.error || 'Failed to assign distributor');
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <h1 className="text-2xl font-bold text-[#2A2A2A] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
        Unassociated Reps
      </h1>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reps..." className="pl-9" />
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} reps</span>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No unassociated reps</p>
          <p className="text-sm mt-1">All reps are associated with a distributor.</p>
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
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('email')}>
                    <div className="flex items-center gap-1">Email <SortIcon field="email" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('distributor_name')}>
                    <div className="flex items-center gap-1">Claimed Distributor <SortIcon field="distributor_name" /></div>
                  </TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center gap-1">Signup Date <SortIcon field="created_at" /></div>
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className={u.flagged_for_review ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                    <TableCell className="font-medium text-[#2A2A2A]">{u.first_name} {u.last_name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{u.email}</TableCell>
                    <TableCell className="text-sm">{u.distributor_name || '—'}</TableCell>
                    <TableCell>
                      {u.flagged_for_review && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle size={14} />
                          <span className="text-xs">{u.flag_reason || 'Flagged'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          setAssignUser(u);
                          setSelectedDist(null);
                          setDistQuery('');
                          setDistResults([]);
                        }}
                        className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white text-xs"
                      >
                        <Building2 size={14} className="mr-1" /> Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Assign Drawer / Modal */}
      {assignUser && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-[#2A2A2A] text-lg mb-1">Assign to Distributor</h3>
            <p className="text-sm text-gray-500 mb-4">
              {assignUser.first_name} {assignUser.last_name} ({assignUser.email})
              {assignUser.distributor_name && (
                <span className="block mt-1 text-xs">Claimed: <strong>{assignUser.distributor_name}</strong></span>
              )}
            </p>

            <div className="relative mb-3">
              <Input
                value={distQuery}
                onChange={(e) => {
                  setDistQuery(e.target.value);
                  setSelectedDist(null);
                }}
                placeholder="Search distributors..."
                autoFocus
              />
              {distResults.length > 0 && !selectedDist && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {distResults.map((d) => (
                    <button
                      key={d.id}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      onClick={() => {
                        setSelectedDist(d);
                        setDistQuery(d.name);
                        setDistResults([]);
                      }}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedDist && (
              <div className="bg-[#7FAEC2]/10 border border-[#7FAEC2]/30 rounded-lg px-3 py-2 mb-4 text-sm">
                Assign to: <strong>{selectedDist.name}</strong>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setAssignUser(null)}>Cancel</Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedDist || assigning}
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
              >
                {assigning ? 'Assigning...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
