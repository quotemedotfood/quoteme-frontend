import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, ExternalLink, CheckCircle2 } from 'lucide-react';
import {
  getAdminRestaurant,
  AdminRestaurantDetail,
  resendInvite,
  resendWelcome,
  getAdminRestaurantGroups,
  addRestaurantToGroup,
  AdminRestaurantGroup,
} from '../../services/adminApi';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { stripSeedPrefix } from '../../utils/format';

export function QMAdminRestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<AdminRestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- reset / welcome button feedback ---
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [welcomeStatus, setWelcomeStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [welcomeMsg, setWelcomeMsg] = useState<string | null>(null);

  // --- add-to-group ---
  const [groups, setGroups] = useState<AdminRestaurantGroup[] | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupStatus, setGroupStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [groupMsg, setGroupMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await getAdminRestaurant(id!);
      if (res.data) setRestaurant(res.data);
      else setError(res.error || 'Not found');
      setLoading(false);
    }
    load();

    // Fetch groups in parallel for the add-to-group control
    setGroupsLoading(true);
    getAdminRestaurantGroups().then((res) => {
      setGroups(res.data ?? []);
      setGroupsLoading(false);
    });
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

  async function handlePasswordReset() {
    if (!restaurant?.restaurant_admin_id) return;
    setResetStatus('loading');
    setResetMsg(null);
    const res = await resendInvite(restaurant.restaurant_admin_id);
    if (res.error) {
      setResetStatus('error');
      setResetMsg(res.error);
    } else {
      setResetStatus('ok');
      setResetMsg(res.data?.message || 'Password reset sent.');
    }
  }

  async function handleResendWelcome() {
    if (!restaurant?.restaurant_admin_id) return;
    setWelcomeStatus('loading');
    setWelcomeMsg(null);
    const res = await resendWelcome(restaurant.restaurant_admin_id);
    if (res.error) {
      setWelcomeStatus('error');
      setWelcomeMsg(res.error);
    } else {
      setWelcomeStatus('ok');
      setWelcomeMsg(`Welcome email sent to ${res.data?.sent_to ?? 'admin'}.`);
    }
  }

  async function handleAddToGroup() {
    if (!selectedGroupId || !restaurant) return;
    setGroupStatus('loading');
    setGroupMsg(null);
    const res = await addRestaurantToGroup(selectedGroupId, { restaurant_id: restaurant.id });
    if (res.error) {
      setGroupStatus('error');
      setGroupMsg(res.error);
    } else {
      setGroupStatus('ok');
      const gName = groups?.find((g) => g.id === selectedGroupId)?.name ?? selectedGroupId;
      setGroupMsg(`Added to "${gName}".`);
      // Refresh restaurant detail to reflect new group
      const refreshed = await getAdminRestaurant(restaurant.id);
      if (refreshed.data) setRestaurant(refreshed.data);
    }
  }

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
          {/* Address verified badge */}
          {restaurant.address_verified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 size={11} />
              Address verified
            </span>
          )}
        </div>
        {restaurant.phone && <p className="text-sm text-gray-500 mt-1">{restaurant.phone}</p>}
        {restaurant.website && (
          <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#7FAEC2] hover:underline mt-1 inline-block">
            {restaurant.website}
          </a>
        )}
        {/* Google profile link */}
        {restaurant.google_place_id && (
          <div className="mt-2">
            <a
              href={`https://www.google.com/maps/place/?q=place_id:${restaurant.google_place_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#7FAEC2] hover:underline"
            >
              <ExternalLink size={13} />
              View on Google
            </a>
          </div>
        )}
      </div>

      {/* ── Admin user section ─────────────────────────────────── */}
      {(restaurant.restaurant_admin_id || restaurant.restaurant_admin_name) && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Admin user
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#2A2A2A]">
                {restaurant.restaurant_admin_name ?? '—'}
              </p>
              {restaurant.restaurant_admin_id && (
                <p className="text-xs text-gray-400 mt-0.5">ID: {restaurant.restaurant_admin_id}</p>
              )}
            </div>
            {/* Buttons — only shown when a user is linked */}
            {restaurant.restaurant_admin_id && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={resetStatus === 'loading'}
                  onClick={handlePasswordReset}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-[#2A2A2A] disabled:opacity-50 transition-colors"
                >
                  {resetStatus === 'loading' ? 'Sending…' : 'Send password reset'}
                </button>
                <button
                  type="button"
                  disabled={welcomeStatus === 'loading'}
                  onClick={handleResendWelcome}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-[#2A2A2A] disabled:opacity-50 transition-colors"
                >
                  {welcomeStatus === 'loading' ? 'Sending…' : 'Resend welcome'}
                </button>
              </div>
            )}
          </div>
          {/* Inline feedback */}
          {resetMsg && (
            <p className={`mt-2 text-xs ${resetStatus === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {resetMsg}
            </p>
          )}
          {welcomeMsg && (
            <p className={`mt-2 text-xs ${welcomeStatus === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {welcomeMsg}
            </p>
          )}
        </section>
      )}

      {/* ── Add to restaurant group ─────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Restaurant group
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          {restaurant.restaurant_group ? (
            <p className="text-sm text-[#2A2A2A] mb-3">
              Currently in group:{' '}
              <span className="font-medium">{restaurant.restaurant_group.name}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 mb-3">Not assigned to any group.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              disabled={groupsLoading || groupStatus === 'loading'}
              className="text-sm border border-gray-200 rounded px-3 py-1.5 text-[#2A2A2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2A2A2A]/10 disabled:opacity-50"
            >
              <option value="">
                {groupsLoading ? 'Loading groups…' : '— Select a group —'}
              </option>
              {(groups ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedGroupId || groupStatus === 'loading'}
              onClick={handleAddToGroup}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#7FAEC2] hover:bg-[#6a9aae] text-white disabled:opacity-50 transition-colors"
            >
              {groupStatus === 'loading' ? 'Saving…' : restaurant.restaurant_group ? 'Change group' : 'Add to group'}
            </button>
          </div>
          {groupMsg && (
            <p className={`mt-2 text-xs ${groupStatus === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {groupMsg}
            </p>
          )}
        </div>
      </section>

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
                    <TableCell className="font-medium text-[#2A2A2A]">{stripSeedPrefix(q.working_label) || 'Untitled'}</TableCell>
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
