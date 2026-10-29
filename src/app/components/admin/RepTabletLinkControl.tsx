// Send tablet link control for one rep on the QM admin distributor detail
// reps table (Option A, Moose 2026-10-29). Email or Text, then the last sent
// date and the "signed in until" date from the reps payload. The sign-in link
// itself never reaches this page; on SMS_NOT_CONFIGURED, NO_PHONE or any other
// error the server's message is shown as is.
import { useState } from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { sendRepTabletLink, TabletLinkVia } from '../../services/adminApi';

export interface RepTabletLinkRep {
  user_id: string;
  name: string;
  tablet_link_last_sent_at?: string | null;
  signed_in_until?: string | null;
}

interface Props {
  rep: RepTabletLinkRep;
  /** Called after a send (or a link written without a send) so the page can refetch. */
  onSent?: () => void;
}

export function formatTabletDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RepTabletLinkControl({ rep, onSent }: Props) {
  const [busy, setBusy] = useState<TabletLinkVia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function send(via: TabletLinkVia) {
    if (busy) return;
    setBusy(via);
    setError(null);
    setNotice(null);
    const res = await sendRepTabletLink(rep.user_id, via);
    setBusy(null);
    if (res.error) {
      setError(res.error);
      // SMS_NOT_CONFIGURED still writes the link (nothing is sent), so the
      // dates may have moved.
      if (res.error_code === 'SMS_NOT_CONFIGURED') onSent?.();
      return;
    }
    setNotice(via === 'email' ? 'Sent by email.' : 'Sent by text.');
    onSent?.();
  }

  const lastSent = formatTabletDate(rep.tablet_link_last_sent_at);
  const signedInUntil = formatTabletDate(rep.signed_in_until);

  return (
    <div className="mt-1 space-y-1" data-testid={`tablet-link-${rep.user_id}`}>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <span>Send tablet link</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
          disabled={busy !== null}
          onClick={() => send('email')}
          aria-label={`Email ${rep.name} their tablet link`}
        >
          <Mail size={12} className="mr-1" />
          {busy === 'email' ? 'Sending...' : 'Email'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
          disabled={busy !== null}
          onClick={() => send('sms')}
          aria-label={`Text ${rep.name} their tablet link`}
        >
          <MessageSquare size={12} className="mr-1" />
          {busy === 'sms' ? 'Sending...' : 'Text'}
        </Button>
      </div>
      <div className="text-xs text-gray-400">
        {lastSent ? `Last sent ${lastSent}` : 'Never sent'}
        {signedInUntil ? ` · Signed in until ${signedInUntil}` : ' · Not signed in'}
      </div>
      {notice && <div className="text-xs text-green-700">{notice}</div>}
      {error && (
        <div role="alert" className="text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
