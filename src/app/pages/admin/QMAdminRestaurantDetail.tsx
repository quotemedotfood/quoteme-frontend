import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { getAdminRestaurant, AdminRestaurantDetail } from '../../services/adminApi';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';

export function QMAdminRestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<AdminRestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await getAdminRestaurant(id!);
      if (res.data) setRestaurant(res.data);
      else setError(res.error || 'Not found');
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="p-10 text-gray-400">Loading...</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!restaurant) return null;

  const addressParts = [
    restaurant.address_line_1,
    restaurant.address_line_2,
    [restaurant.city, restaurant.state].filter(Boolean).join(', '),
    restaurant.zip,
  ].filter(Boolean);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      draft: 'bg-yellow-100 text-yellow-700',
      sent: 'bg-blue-100 text-blue-700',
      accepted: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <Link to="/qm-admin/restaurants" className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Back to Restaurants
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {restaurant.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#4F4F4F] mt-1">
          {addressParts.length > 0 && <span>{addressParts.join(' ')}</span>}
          {restaurant.restaurant_group && (
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-[#7FAEC2]/10 text-[#7FAEC2] font-medium">
              {restaurant.restaurant_group.name}
            </span>
          )}
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${restaurant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {restaurant.status}
          </span>
        </div>
        {restaurant.phone && <p className="text-sm text-gray-500 mt-1">{restaurant.phone}</p>}
        {restaurant.website && (
          <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#7FAEC2] hover:underline mt-1 inline-block">
            {restaurant.website}
          </a>
        )}
      </div>

      {/* Contacts */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Contacts</h2>
        {restaurant.contacts.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No contacts yet</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Primary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurant.contacts.map((c) => (
                  <TableRow key={c.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-[#2A2A2A]">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{c.email || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{c.phone || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{c.role || '—'}</TableCell>
                    <TableCell>
                      {c.is_primary && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-[#7FAEC2]/10 text-[#7FAEC2] font-medium">
                          Primary
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Quote History */}
      <section>
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Quote History</h2>
        {restaurant.recent_quotes.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No quote history</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurant.recent_quotes.map((q) => (
                  <TableRow key={q.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-[#2A2A2A]">{q.working_label || 'Untitled'}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(q.status)}`}>
                        {q.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
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
