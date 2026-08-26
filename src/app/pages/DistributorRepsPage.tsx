import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';
import { Loader2, Check, Send, UserPlus, Users, X, LogIn, RefreshCw, UserX } from 'lucide-react';
import { inviteRep, getDistributorAdminReps, impersonateRep, cancelRepInvite, resendRepInvite, disableRep } from '../services/api';
import type { DistributorRep } from '../services/api';

export function DistributorRepsPage() {
  const [reps, setReps] = useState<DistributorRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [territory, setTerritory] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [disabling, setDisabling] = useState<string | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);
  // Holds the existing rep/admin row a typed invite email matched, while the
  // confirm dialog is open. Null when no confirm is pending.
  const [confirmMatch, setConfirmMatch] = useState<DistributorRep | null>(null);
  // item 1c (BE half, PR #306 RoleConflictGuard): the BE 409s with
  // { error_code: "role_conflict_requires_confirm" } for the cross-distributor
  // case the client-side check above cannot see (an email that holds a role
  // at ANOTHER distributor this page has no visibility into). Holds the BE's
  // own generic message while that confirm is pending. Mutually exclusive
  // with confirmMatch -- only one dialog is ever shown for one add.
  const [pendingBeConfirmMessage, setPendingBeConfirmMessage] = useState<string | null>(null);

  async function loadReps() {
    setLoading(true);
    const res = await getDistributorAdminReps();
    if (res.data) {
      // B-12: dedup by user_id — admin row wins when a user appears as both admin and rep.
      // Admins have is_admin=true; iterating the raw list keeps the first seen entry per
      // user_id.  The backend already excludes admin-user rep_profile rows, but this guard
      // prevents any future double-entry from surfacing in the UI.
      const seen = new Set<string>();
      const deduped = res.data.filter((r) => {
        // Invited reps have no user_id — always include them (they can't be dups of live users).
        if (!r.user_id) return true;
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      });
      // Admin rows come first in the BE response, so admin wins automatically.
      setReps(deduped);
    }
    setLoading(false);
  }

  useEffect(() => { loadReps(); }, []);

  // Same-distributor prevention (item 1c, FE half): the BE will silently
  // attach a rep role to any existing user with no confirm, which is the
  // root cause of the dual-role bug. This checks the typed email against the
  // people already loaded for THIS distributor (the deduped admin+rep list
  // in `reps`) and, on a match, holds the submit for an explicit confirm
  // instead of posting straight through.
  //
  // Scope limit: this can only catch a match against people already loaded
  // for this distributor. It cannot see whether the email holds a role at
  // ANOTHER distributor entirely, since that requires a BE lookup this page
  // has no route for. Cross-distributor detection, the notification email,
  // and the registration-path guard are the BE half of this fix and are
  // tracked separately (BE-gated, not attempted here).
  function findExistingRepByEmail(candidateEmail: string): DistributorRep | undefined {
    const normalized = candidateEmail.trim().toLowerCase();
    if (!normalized) return undefined;
    return reps.find((r) => r.email.trim().toLowerCase() === normalized);
  }

  // `confirm` is the BE gate flag (item 1c, PR #306 RoleConflictGuard): send
  // it as true once the admin has explicitly confirmed (either via the
  // client-side same-distributor dialog below, or via the BE-driven
  // cross-distributor dialog). A first attempt always passes confirm=false
  // unless the client-side check already caught it.
  const submitInvite = async (confirm: boolean) => {
    setSending(true);
    setError('');
    setSuccessMessage('');

    const res = await inviteRep({
      name: name.trim(),
      email: email.trim(),
      territory: territory.trim() || undefined,
      confirm,
    });

    if (res.status === 409 && res.error_code === 'role_conflict_requires_confirm' && !confirm) {
      // Cross-distributor case: the client-side pre-check above only knows
      // about people already loaded for THIS distributor, so it cannot catch
      // an email that holds a role somewhere else. The BE is the only place
      // that knows that, hence the 409. Hold the submit for an explicit
      // confirm instead of failing outright.
      setSending(false);
      setPendingBeConfirmMessage(res.error || 'This email already has a role elsewhere. Add anyway?');
      return;
    }

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMessage(res.data?.message || `Invite sent to ${email.trim()}`);
      setName('');
      setEmail('');
      setTerritory('');
      // Reload reps list in case they were associated immediately
      loadReps();
    }
    setSending(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const existing = findExistingRepByEmail(email);
    if (existing) {
      // Hold the submit and ask for explicit confirmation before this
      // email gets a second role at this distributor.
      setConfirmMatch(existing);
      return;
    }

    await submitInvite(false);
  };

  const handleConfirmAddAnyway = async () => {
    setConfirmMatch(null);
    // The admin already confirmed the same-distributor match client-side --
    // send confirm:true directly so this satisfies the BE gate in one step
    // instead of round-tripping through a second BE 409 and a second dialog.
    await submitInvite(true);
  };

  const handleCancelConfirm = () => {
    setConfirmMatch(null);
  };

  const handleConfirmBeGate = async () => {
    setPendingBeConfirmMessage(null);
    await submitInvite(true);
  };

  const handleCancelBeGate = () => {
    setPendingBeConfirmMessage(null);
  };

  const handleImpersonate = async (rep: DistributorRep) => {
    setImpersonating(rep.id);
    setImpersonateError(null);
    const res = await impersonateRep(rep.id);
    if (res.data?.token) {
      const returnedUser = res.data.user;
      // Never trust the clicked row: the URL param is the rep PROFILE id,
      // not the user id, so verify the token the server actually issued
      // matches the user account this row is known to belong to before
      // touching any storage. A null rep.user_id (never-accepted invite)
      // can never match and correctly aborts too.
      if (!returnedUser || returnedUser.id !== rep.user_id) {
        setImpersonateError('Impersonation target mismatch; not switching.');
        setImpersonating(null);
        return;
      }
      // Store the distributor admin's original token so they can restore it later
      localStorage.setItem('quoteme_admin_token', localStorage.getItem('quoteme_token') || '');
      const displayName =
        [returnedUser.first_name, returnedUser.last_name].filter(Boolean).join(' ') ||
        returnedUser.email;
      localStorage.setItem('quoteme_impersonating', displayName);
      localStorage.setItem('quoteme_token', res.data.token);
      window.location.href = '/';
    } else {
      setImpersonateError(res.error || 'Failed to impersonate rep');
      setImpersonating(null);
    }
  };

  const handleCancelInvite = async (rep: DistributorRep) => {
    setCancelling(rep.id);
    setCancelError(null);
    const res = await cancelRepInvite(rep.id);
    if (res.error) {
      setCancelError(res.error);
      setCancelling(null);
    } else {
      setCancelling(null);
      loadReps();
    }
  };

  const handleResend = async (rep: DistributorRep) => {
    setResending(rep.id);
    setResendError(null);
    setResendSuccess(null);
    const res = await resendRepInvite(rep.id);
    if (res.error) {
      setResendError(res.error);
    } else {
      setResendSuccess(`Invite resent to ${rep.email}`);
      loadReps();
    }
    setResending(null);
  };

  const handleDisable = async (rep: DistributorRep) => {
    setDisabling(rep.id);
    setDisableError(null);
    const res = await disableRep(rep.id);
    if (res.data) {
      await loadReps();
    } else {
      setDisableError(res.error || 'Failed to disable rep');
    }
    setDisabling(null);
  };

  const activeReps = reps.filter(r => r.status === 'active');
  const invitedReps = reps.filter(r => r.status === 'invited');
  const inactiveReps = reps.filter(r => r.status === 'deactivated');

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold text-[#2A2A2A]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Team
          </h1>
          <p
            className="text-sm text-gray-500 mt-1"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {activeReps.length} active user{activeReps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => setShowInvite(!showInvite)}
          className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Rep
        </Button>
      </div>

      {/* Invite form (inline, slides open) */}
      {showInvite && (
        <form onSubmit={handleInvite} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold text-[#2A2A2A]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Send an Invite
            </h2>
            <button type="button" onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="inv-name" className="text-sm text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Name</Label>
              <Input id="inv-name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="inv-email" className="text-sm text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Email</Label>
              <Input id="inv-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="work@example.com" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="inv-territory" className="text-sm text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Territory <span className="text-gray-400">(optional)</span>
              </Label>
              <Input id="inv-territory" value={territory} onChange={e => setTerritory(e.target.value)} placeholder="e.g. Northeast" className="mt-1" />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          {successMessage && (
            <p className="text-green-600 text-sm mt-3 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> {successMessage}
            </p>
          )}

          <Button
            type="submit"
            disabled={sending || !name.trim() || !email.trim()}
            className="mt-4 bg-[#F2993D] hover:bg-[#E08A2E] text-white"
          >
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Invite
          </Button>
        </form>
      )}

      {impersonateError && (
        <p className="text-red-500 text-sm mb-4">{impersonateError}</p>
      )}
      {cancelError && (
        <p className="text-red-500 text-sm mb-4">{cancelError}</p>
      )}
      {resendError && (
        <p className="text-red-500 text-sm mb-4">{resendError}</p>
      )}
      {resendSuccess && (
        <p className="text-green-600 text-sm mb-4 flex items-center gap-1.5">
          <Check className="w-4 h-4" /> {resendSuccess}
        </p>
      )}
      {disableError && (
        <p className="text-red-500 text-sm mb-4">{disableError}</p>
      )}

      {/* Reps table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : reps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2
            className="text-lg font-semibold text-[#2A2A2A] mb-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            No reps yet
          </h2>
          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Invite your first rep to get started.
          </p>
          <Button
            onClick={() => setShowInvite(true)}
            className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Invite Rep
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3 hidden sm:table-cell" style={{ fontFamily: "'DM Sans', sans-serif" }}>Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3 hidden md:table-cell" style={{ fontFamily: "'DM Sans', sans-serif" }}>Territory</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3 hidden lg:table-cell" style={{ fontFamily: "'DM Sans', sans-serif" }}>Joined</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3 hidden xl:table-cell" style={{ fontFamily: "'DM Sans', sans-serif" }}>Last active</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {activeReps.map(rep => (
                <tr key={rep.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {rep.first_name} {rep.last_name}
                    </p>
                    <p className="text-xs text-gray-400 sm:hidden">{rep.email}</p>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <p className="text-sm text-gray-600">{rep.email}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-500">{rep.territory || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    {rep.is_admin ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <p className="text-sm text-gray-500">
                      {new Date(rep.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell">
                    <p className="text-sm text-gray-500">
                      {rep.last_activity_at
                        ? new Date(rep.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* Admins are managed elsewhere — no impersonate/disable on the admin's own row */}
                    {!rep.is_admin && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={impersonating === rep.id || disabling === rep.id}
                          onClick={() => handleImpersonate(rep)}
                          className="text-gray-500 hover:text-[#2A2A2A] text-xs"
                          title={`Sign in as ${rep.first_name || rep.email}`}
                        >
                          {impersonating === rep.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <LogIn className="w-3.5 h-3.5 mr-1" />
                          }
                          {impersonating === rep.id ? '' : 'Sign in as'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={disabling === rep.id || impersonating === rep.id}
                          onClick={() => handleDisable(rep)}
                          className="text-gray-400 hover:text-red-600 text-xs"
                          title={`Disable ${rep.first_name || rep.email}`}
                        >
                          {disabling === rep.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <UserX className="w-3.5 h-3.5 mr-1" />
                          }
                          {disabling === rep.id ? '' : 'Disable'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {invitedReps.map(rep => (
                <tr key={rep.id} className="border-b border-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {rep.first_name || '-'}
                    </p>
                    <p className="text-xs text-gray-400 sm:hidden">{rep.email}</p>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <p className="text-sm text-gray-600">{rep.email}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-500">{rep.territory || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                      Invited
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <p className="text-sm text-gray-500">
                      {new Date(rep.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell">
                    <p className="text-sm text-gray-500">-</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={resending === rep.id}
                        onClick={() => handleResend(rep)}
                        className="text-gray-500 hover:text-[#2A2A2A] text-xs"
                        title={`Resend invite to ${rep.email}`}
                      >
                        {resending === rep.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        }
                        {resending === rep.id ? '' : 'Resend'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={cancelling === rep.id}
                        onClick={() => handleCancelInvite(rep)}
                        className="text-gray-400 hover:text-red-600 text-xs"
                        title={`Cancel invite for ${rep.first_name || rep.email}`}
                      >
                        {cancelling === rep.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <X className="w-3.5 h-3.5 mr-1" />
                        }
                        {cancelling === rep.id ? '' : 'Cancel'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {inactiveReps.map(rep => (
                <tr key={rep.id} className="border-b border-gray-50 bg-gray-25 opacity-60">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {rep.first_name} {rep.last_name}
                    </p>
                    <p className="text-xs text-gray-400 sm:hidden">{rep.email}</p>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <p className="text-sm text-gray-400">{rep.email}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-400">{rep.territory || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Inactive
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <p className="text-sm text-gray-400">
                      {new Date(rep.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell">
                    <p className="text-sm text-gray-400">
                      {rep.last_activity_at
                        ? new Date(rep.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Single dialog for both confirm paths (client-side same-distributor
          match, and the BE-driven cross-distributor 409) -- confirmMatch and
          pendingBeConfirmMessage are mutually exclusive (submitInvite only
          reaches the BE for a 409 when the client-side check found nothing),
          so only one of these is ever set and only one dialog ever shows. */}
      <AlertDialog
        open={!!confirmMatch || !!pendingBeConfirmMessage}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmMatch(null);
            setPendingBeConfirmMessage(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add a rep role anyway?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMatch ? (
                <>
                  This email already belongs to{' '}
                  {[confirmMatch.first_name, confirmMatch.last_name].filter(Boolean).join(' ') || confirmMatch.email}
                  {' '}({confirmMatch.is_admin ? 'a distributor admin' : 'a rep'}) at this distributor. Add a rep role anyway?
                </>
              ) : (
                pendingBeConfirmMessage
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={confirmMatch ? handleCancelConfirm : handleCancelBeGate}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMatch ? handleConfirmAddAnyway : handleConfirmBeGate}>Add anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
