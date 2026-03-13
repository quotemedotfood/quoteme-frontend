import { useState, useEffect, useMemo } from 'react';
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
import { getAdminBrands, createAdminBrand, AdminBrand } from '../../services/adminApi';

type SortField = 'name' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

export function QMAdminBrands() {
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    setLoading(true);
    const res = await getAdminBrands();
    if (res.data) setBrands(res.data);
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
    let result = [...brands];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'created_at': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [brands, search, sortField, sortDir]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createAdminBrand({ name: newName.trim() });
    setCreating(false);
    if (res.data) {
      setShowCreate(false);
      setNewName('');
      loadBrands();
    } else {
      alert(res.error || 'Failed to create');
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
          Brands
        </h1>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
        >
          <Plus size={16} className="mr-1" /> Create Brand
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h3 className="font-medium text-[#2A2A2A] mb-3">New Brand</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-gray-500 mb-1 block">Name *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Brand name..." />
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search brands..." className="pl-9" />
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} brands</span>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading brands...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No brands yet</p>
          <p className="text-sm mt-1">Create your first brand to get started.</p>
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
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>
                    <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center gap-1">Created <SortIcon field="created_at" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow key={b.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-[#2A2A2A]">{b.name}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(b.created_at)}</TableCell>
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
