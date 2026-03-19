import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Check, Send, UserPlus, Users, X } from 'lucide-react';
import { inviteRep, getDistributorReps } from '../services/api';
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

  useEffect(() => {
    if (!document.getElementById('quoteme-fonts')) {
      const link = document.createElement('link');
      link.id = 'quoteme-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  async function loadReps() {
    setLoading(true);
    const res = await getDistributorReps();
    if (res.data) setReps(res.data);
    setLoading(false);
  }

  useEffect(() => { loadReps(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSending(true);
    setError('');
    setSuccessMessage('');

    const res = await inviteRep({
      name: name.trim(),
      email: email.trim(),
      territory: territory.trim() || undefined,
    });

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
            Rep Management
          </h1>
          <p
            className="text-sm text-gray-500 mt-1"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {activeReps.length} active rep{activeReps.length !== 1 ? 's' : ''}
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
                    <p className="text-sm text-gray-500">{rep.territory || '—'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <p className="text-sm text-gray-500">
                      {new Date(rep.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                </tr>
              ))}
              {invitedReps.map(rep => (
                <tr key={rep.id} className="border-b border-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {rep.first_name || '—'}
                    </p>
                    <p className="text-xs text-gray-400 sm:hidden">{rep.email}</p>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <p className="text-sm text-gray-600">{rep.email}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-500">{rep.territory || '—'}</p>
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
                    <p className="text-sm text-gray-400">{rep.territory || '—'}</p>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
