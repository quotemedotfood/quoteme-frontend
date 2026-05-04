import { useState, useEffect } from 'react';
import { X, Loader2, Check, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  assignRestaurantAdminNewUser,
  assignRestaurantAdminExistingUser,
  getAdminUsers,
  type AdminUser,
  type AdminRestaurant,
} from '../../services/adminApi';

type Tab = 'invite' | 'assign';

interface Props {
  open: boolean;
  restaurant: AdminRestaurant | null;
  onClose: () => void;
  onAssigned: () => void;
}

export function ManageAdminDrawer({ open, restaurant, onClose, onAssigned }: Props) {
  const [tab, setTab] = useState<Tab>('invite');
  const [replacing, setReplacing] = useState(false);

  // Invite tab state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Assign tab state
  const [existingUsers, setExistingUsers] = useState<AdminUser[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingSearch, setExistingSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset on open
  useEffect(() => {
    if (open) {
      setTab('invite');
      setReplacing(false);
      resetInvite();
      resetAssign();
    }
  }, [open]);

  // Load existing restaurant_admin users when assign tab is mounted
  useEffect(() => {
    if (tab !== 'assign' || !open) return;
    setExistingLoading(true);
    // Request role=restaurant_admin filter; if BE doesn't support it we fall back to all users
    // and the client-side email filter still works correctly
    getAdminUsers({ role: 'restaurant_admin' }).then((res) => {
      if (res.data) {
        setExistingUsers(res.data);
      } else {
        // Fallback: fetch all users and filter client-side
        getAdminUsers().then((fallback) => {
          if (fallback.data) {
            setExistingUsers(fallback.data.filter((u) => u.role === 'restaurant_admin'));
          }
        });
      }
      setExistingLoading(false);
    });
  }, [tab, open]);

  function resetInvite() {
    setInviteEmail('');
    setInviteFirst('');
    setInviteLast('');
    setInviteSubmitting(false);
    setInviteError('');
    setInviteSuccess('');
  }

  function resetAssign() {
    setExistingUsers([]);
    setExistingSearch('');
    setSelectedUserId('');
    setAssignSubmitting(false);
    setAssignError('');
    setAssignSuccess('');
  }

  function handleClose() {
    if (inviteSubmitting || assignSubmitting) return;
    onClose();
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail.trim() || !inviteFirst.trim() || !inviteLast.trim()) {
      setInviteError('All fields are required.');
      return;
    }
    if (!restaurant) return;
    setInviteSubmitting(true);
    const res = await assignRestaurantAdminNewUser(restaurant.id, {
      email: inviteEmail.trim(),
      first_name: inviteFirst.trim(),
      last_name: inviteLast.trim(),
    });
    setInviteSubmitting(false);
    if (res.error) {
      setInviteError(res.error);
      return;
    }
    setInviteSuccess(`Invited ${inviteEmail.trim()}. Password reset email sent.`);
    onAssigned();
    setTimeout(() => {
      resetInvite();
      onClose();
    }, 2000);
  }

  async function handleAssignSubmit() {
    setAssignError('');
    if (!selectedUserId) {
      setAssignError('Please select a user.');
      return;
    }
    if (!restaurant) return;
    setAssignSubmitting(true);
    const res = await assignRestaurantAdminExistingUser(restaurant.id, selectedUserId);
    setAssignSubmitting(false);
    if (res.error) {
      setAssignError(res.error);
      return;
    }
    const adminName = res.data?.restaurant_admin?.name || 'User';
    setAssignSuccess(`${adminName} assigned as restaurant admin.`);
    onAssigned();
    setTimeout(() => {
      resetAssign();
      onClose();
    }, 2000);
  }

  const filteredUsers = existingUsers.filter((u) =>
    !existingSearch ||
    u.email.toLowerCase().includes(existingSearch.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(existingSearch.toLowerCase())
  );

  const hasCurrentAdmin = Boolean(restaurant?.restaurant_admin_id);
  const showAssignForm = !hasCurrentAdmin || replacing;

  if (!open || !restaurant) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-[#7FAEC2]" />
            <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {hasCurrentAdmin ? 'Manage Admin' : 'Add Admin'}: {restaurant.name}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* Current admin section */}
          {hasCurrentAdmin && !replacing && (
            <div className="mb-5 p-4 bg-[#A5CFDD]/10 border border-[#A5CFDD]/30 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Current Admin</p>
              <p className="text-sm font-medium text-[#2A2A2A]">{restaurant.restaurant_admin_name || 'Unknown'}</p>
              <button
                onClick={() => setReplacing(true)}
                className="mt-2 text-xs text-[#7FAEC2] underline hover:text-[#5C94AE]"
              >
                Replace admin
              </button>
            </div>
          )}

          {/* Assign form */}
          {showAssignForm && (
            <>
              {/* Tab switcher */}
              <div className="flex border-b border-gray-200 mb-5">
                <button
                  type="button"
                  onClick={() => { setTab('invite'); setInviteError(''); setAssignError(''); }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    tab === 'invite'
                      ? 'text-[#7FAEC2] border-b-2 border-[#7FAEC2]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Invite new user
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('assign'); setInviteError(''); setAssignError(''); }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    tab === 'assign'
                      ? 'text-[#7FAEC2] border-b-2 border-[#7FAEC2]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Assign existing user
                </button>
              </div>

              {/* Invite tab */}
              {tab === 'invite' && (
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  {inviteError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {inviteError}
                    </div>
                  )}
                  {inviteSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                      <Check size={14} />
                      {inviteSuccess}
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-[#4F4F4F]">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="chef@restaurant.com"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium text-[#4F4F4F]">
                        First name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={inviteFirst}
                        onChange={(e) => setInviteFirst(e.target.value)}
                        placeholder="Jane"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[#4F4F4F]">
                        Last name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={inviteLast}
                        onChange={(e) => setInviteLast(e.target.value)}
                        placeholder="Doe"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    The new user will receive a password reset email to set their password.
                  </p>
                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      disabled={inviteSubmitting || Boolean(inviteSuccess)}
                      className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
                    >
                      {inviteSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Inviting...
                        </>
                      ) : (
                        'Send Invite'
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* Assign existing tab */}
              {tab === 'assign' && (
                <div className="space-y-4">
                  {assignError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {assignError}
                    </div>
                  )}
                  {assignSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                      <Check size={14} />
                      {assignSuccess}
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-[#4F4F4F]">Search by email or name</Label>
                    <Input
                      value={existingSearch}
                      onChange={(e) => { setExistingSearch(e.target.value); setSelectedUserId(''); }}
                      placeholder="Filter restaurant admins..."
                      className="mt-1"
                    />
                  </div>

                  {existingLoading && (
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Loading users...
                    </p>
                  )}

                  {!existingLoading && filteredUsers.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">No restaurant admin users found.</p>
                  )}

                  {!existingLoading && filteredUsers.length > 0 && (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedUserId(u.id)}
                          className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                            selectedUserId === u.id
                              ? 'bg-[#A5CFDD]/15 border-l-2 border-[#7FAEC2]'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#2A2A2A] truncate">
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                          {selectedUserId === u.id && (
                            <Check size={14} className="text-[#7FAEC2] mt-0.5 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      disabled={!selectedUserId || assignSubmitting || Boolean(assignSuccess)}
                      onClick={handleAssignSubmit}
                      className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
                    >
                      {assignSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        'Assign'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
