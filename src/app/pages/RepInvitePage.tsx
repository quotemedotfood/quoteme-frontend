import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Check, Send, UserPlus } from 'lucide-react';
import { inviteRep } from '../services/api';

interface InvitedRep {
  name: string;
  email: string;
  territory?: string;
  sentAt: string;
}

export function RepInvitePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [territory, setTerritory] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [invitedReps, setInvitedReps] = useState<InvitedRep[]>([]);

  // Load fonts
  useEffect(() => {
    if (!document.getElementById('quoteme-fonts')) {
      const link = document.createElement('link');
      link.id = 'quoteme-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
      setInvitedReps(prev => [
        {
          name: name.trim(),
          email: email.trim(),
          territory: territory.trim() || undefined,
          sentAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        },
        ...prev,
      ]);
      setName('');
      setEmail('');
      setTerritory('');
    }
    setSending(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <h1
        className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-2"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Bring your reps on board.
      </h1>
      <p
        className="text-sm text-gray-500 mb-8"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Send an invite so they can start building quotes under your catalog.
      </p>

      {/* Invite form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <div className="space-y-4">
          <div>
            <Label htmlFor="rep-name" className="text-sm text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Name
            </Label>
            <Input
              id="rep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="rep-email" className="text-sm text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Email
            </Label>
            <Input
              id="rep-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="work@example.com"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="rep-territory" className="text-sm text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Territory <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="rep-territory"
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              placeholder="e.g. Northeast, Downtown"
              className="mt-1"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-4">{error}</p>
        )}

        {successMessage && (
          <p className="text-green-600 text-sm mt-4 flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            {successMessage}
          </p>
        )}

        <Button
          type="submit"
          disabled={sending || !name.trim() || !email.trim()}
          className="mt-6 bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Send Invite
        </Button>
      </form>

      {/* Already invited list */}
      {invitedReps.length > 0 && (
        <div>
          <h2
            className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Invited This Session
          </h2>
          <div className="space-y-2">
            {invitedReps.map((rep, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {rep.name}
                  </p>
                  <p className="text-xs text-gray-500">{rep.email}</p>
                  {rep.territory && (
                    <p className="text-xs text-gray-400 mt-0.5">{rep.territory}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <UserPlus className="w-3.5 h-3.5" />
                  Sent {rep.sentAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
