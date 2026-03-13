import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Package, Users, UtensilsCrossed } from 'lucide-react';
import { getAdminDistributor, AdminDistributorDetail } from '../../services/adminApi';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';

export function QMAdminDistributorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dist, setDist] = useState<AdminDistributorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await getAdminDistributor(id!);
      if (res.data) setDist(res.data);
      else setError(res.error || 'Not found');
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="p-10 text-gray-400">Loading...</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!dist) return null;

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <Link to="/qm-admin/distributors" className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Back to Distributors
      </Link>

      <div className="flex items-center gap-4 mb-8">
        {dist.logo_url && <img src={dist.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
        <div>
          <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {dist.name}
          </h1>
          <div className="flex items-center gap-3 text-sm text-[#4F4F4F] mt-1">
            {dist.email_domain && <span>{dist.email_domain}</span>}
            {dist.region && <span>· {dist.region}</span>}
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${dist.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {dist.status}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Users size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{dist.reps.length}</div>
            <div className="text-xs text-gray-500">Reps</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Package size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{dist.catalog?.product_count ?? 0}</div>
            <div className="text-xs text-gray-500">Active Products</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <UtensilsCrossed size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{dist.restaurants.length}</div>
            <div className="text-xs text-gray-500">Restaurants</div>
          </div>
        </div>
      </div>

      {/* Reps */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Reps</h2>
        {dist.reps.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No reps yet</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dist.reps.map((r) => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.email}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.phone || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.territory || '—'}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Restaurants */}
      <section>
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Restaurants</h2>
        {dist.restaurants.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No restaurants yet</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dist.restaurants.map((r) => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.city || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.state || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
