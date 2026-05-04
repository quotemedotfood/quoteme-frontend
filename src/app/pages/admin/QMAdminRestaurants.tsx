import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, UserCheck, Plus, UserPlus, UserCog } from 'lucide-react';
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
import { getAdminRestaurants, impersonateUser, AdminRestaurant } from '../../services/adminApi';
import { AddRestaurantModal } from './_addRestaurantModal';
import { ManageAdminDrawer } from './_manageAdminDrawer';

type SortField = 'name' | 'city' | 'status' | 'contact_count' | 'created_at';
type SortDir = 'asc' | 'desc';

export function QMAdminRestaurants() {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Feature 1: Add Restaurant modal
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Feature 2: Manage Admin drawer
  const [manageAdminTarget, setManageAdminTarget] = useState<AdminRestaurant | null>(null);

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

  async function loadRestaurants() {
    const res = await getAdminRestaurants();
    if (res.data) setRestaurants(res.data);
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

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
    let result = [...restaurants];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.city || '').toLowerCase().includes(q) ||
          (r.restaurant_group?.name || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'city': cmp = (a.city || '').localeCompare(b.city || ''); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'contact_count': cmp = a.contact_count - b.contact_count; break;
        case 'created_at': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [restaurants, search, sortField, sortDir]);

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <h1 className="text-2xl font-bold text-[#2A2A2A] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
        Restaurants & Groups
      </h1>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search restaurants, groups..." className="pl-9" />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} restaurants</span>
        <Button
          onClick={() => setAddModalOpen(true)}
          className="ml-auto bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white flex items-center gap-1.5"
        >
          <Plus size={15} />
          Add Restaurant
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No restaurants yet</p>
          <p className="text-sm mt-1">Restaurants will appear here when reps create them.</p>
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
                  <TableHead>Group</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('city')}>
                    <div className="flex items-center gap-1">City <SortIcon field="city" /></div>
                  </TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('contact_count')}>
                    <div className="flex items-center justify-end gap-1">Contacts <SortIcon field="contact_count" /></div>
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
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <Link to={`/qm-admin/restaurants/${r.id}`} className="text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline">
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.restaurant_group ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-[#7FAEC2]/10 text-[#7FAEC2] font-medium">
                          {r.restaurant_group.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">Ungrouped</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{r.city || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.state || '-'}</TableCell>
                    <TableCell className="text-sm text-right">{r.contact_count}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Manage Admin button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
                          onClick={() => setManageAdminTarget(r)}
                          title={r.restaurant_admin_id ? 'Manage admin user' : 'Add admin user'}
                        >
                          {r.restaurant_admin_id ? (
                            <UserCog size={14} className="mr-1" />
                          ) : (
                            <UserPlus size={14} className="mr-1" />
                          )}
                          {r.restaurant_admin_id ? 'Manage Admin' : 'Add Admin'}
                        </Button>

                        {/* Impersonate button */}
                        {r.admin_user_id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
                            disabled={impersonating === r.admin_user_id}
                            onClick={() => handleImpersonate(r.admin_user_id!, r.admin_user_name || r.name)}
                          >
                            <UserCheck size={14} className="mr-1" />
                            {impersonating === r.admin_user_id ? 'Switching...' : 'Impersonate'}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400 px-2">No user</span>
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

      {/* Add Restaurant modal */}
      <AddRestaurantModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={() => {
          loadRestaurants();
        }}
      />

      {/* Manage Admin drawer */}
      <ManageAdminDrawer
        open={Boolean(manageAdminTarget)}
        restaurant={manageAdminTarget}
        onClose={() => setManageAdminTarget(null)}
        onAssigned={() => {
          loadRestaurants();
        }}
      />
    </div>
  );
}
