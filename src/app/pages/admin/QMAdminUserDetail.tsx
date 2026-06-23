import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import {
  getAdminUser,
  resendInvite,
  resendWelcome,
  AdminUser,
} from '../../services/adminApi';
import { Button } from '../../components/ui/button';

const ROLE_BADGE: Record<string, string> = {
  quoteme_admin: 'bg-purple-100 text-purple-700',
  distributor_admin: 'bg-blue-100 text-blue-700',
  rep: 'bg-sky-100 text-sky-700',
  chef: 'bg-amber-100 text-amber-700',
  buyer: 'bg-orange-100 text-orange-700',
  group_admin: 'bg-teal-100 text-teal-700',
  brand: 'bg-pink-100 text-pink-700',
};

const ROLE_LABEL: Record<string, string> = {
  quoteme_admin: 'QM Admin',
  distributor_admin: 'Distributor Admin',
  rep: 'Rep',
  chef: 'Chef',
  buyer: 'Buyer',
  group_admin: 'Group Admin',
  brand: 'Brand',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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

const RESTAURANT_ROLES = ['chef', 'buyer', 'group_admin'];

export function QMAdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await getAdminUser(id!);
      if (res.data) setUser(res.data);
      else setError(res.error || 'Not found');
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleResendInvite() {
    if (!user) return;
    setActionLoading('invite');
    setActionMsg(null);
    setActionError(null);
    const res = await resendInvite(user.id);
    if (res.data) setActionMsg(`Invite resent to ${user.email}`);
    else setActionError(res.error || 'Failed to resend invite');
    setActionLoading(null);
  }

  async function handleResendWelcome() {
    if (!user) return;
    setActionLoading('welcome');
    setActionMsg(null);
    setActionError(null);
    const res = await resendWelcome(user.id);
    if (res.data) setActionMsg(`Welcome email sent to ${res.data.sent_to || user.email}`);
    else setActionError(res.error || 'Failed to resend welcome');
    setActionLoading(null);
  }

  if (loading) return <div className="p-10 text-gray-400">Loading...</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!user) return null;

  const roleCls = ROLE_BADGE[user.role] || 'bg-gray-100 text-gray-600';
  const roleLabel = ROLE_LABEL[user.role] || user.role;

  const statusCls =
    user.status === 'active'
      ? 'bg-green-100 text-green-700'
      : user.status === 'inactive'
      ? 'bg-yellow-100 text-yellow-700'
      : user.status === 'archived'
      ? 'bg-gray-100 text-gray-500'
      : 'bg-gray-100 text-gray-600';

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link
        to="/qm-admin/users"
        className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-4"
      >
        <ArrowLeft size={14} /> Back to Users
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-[#2A2A2A]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {user.first_name} {user.last_name}
          </h1>
          <p className="text-sm text-[#4F4F4F] mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* Detail cards */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 mb-6">
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-[#4F4F4F]">Role</span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${roleCls}`}>
            {roleLabel}
          </span>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-[#4F4F4F]">Status</span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusCls}`}>
            {user.status}
          </span>
        </div>
        {user.distributor_name && (
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-sm font-medium text-[#4F4F4F]">Distributor</span>
            <span className="text-sm text-[#2A2A2A]">{user.distributor_name}</span>
          </div>
        )}
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-[#4F4F4F]">Last Login</span>
          <span className="text-sm text-gray-500">{formatRelativeTime(user.last_login_at)}</span>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-[#4F4F4F]">Created</span>
          <span className="text-sm text-gray-500">{formatDate(user.created_at)}</span>
        </div>
        {user.rep_profile && (
          <>
            {user.rep_profile.phone && (
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-medium text-[#4F4F4F]">Phone</span>
                <span className="text-sm text-gray-500">{user.rep_profile.phone}</span>
              </div>
            )}
            {user.rep_profile.territory && (
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-medium text-[#4F4F4F]">Territory</span>
                <span className="text-sm text-gray-500">{user.rep_profile.territory}</span>
              </div>
            )}
          </>
        )}
        {user.flagged_for_review && (
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-sm font-medium text-red-500">Flagged for Review</span>
            <span className="text-sm text-red-500">{user.flag_reason || 'No reason given'}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!user.last_login_at && user.status === 'active' && (
          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading === 'invite'}
            onClick={handleResendInvite}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            {actionLoading === 'invite' ? 'Sending...' : 'Resend Invite'}
          </Button>
        )}
        {user.status === 'active' && RESTAURANT_ROLES.includes(user.role) && (
          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading === 'welcome'}
            onClick={handleResendWelcome}
            className="text-teal-600 border-teal-300 hover:bg-teal-50"
          >
            {actionLoading === 'welcome' ? 'Sending...' : 'Resend Welcome'}
          </Button>
        )}
      </div>

      {actionMsg && <p className="mt-3 text-sm text-green-600">{actionMsg}</p>}
      {actionError && <p className="mt-3 text-sm text-red-500">{actionError}</p>}
    </div>
  );
}
