// SEND PAIRME INFO from the QM admin restaurant page (Assemblage, approved by
// Moose 2026-10-29).
//
// A button that opens a small form: pick one of this restaurant's contacts,
// or type a name and email. Nothing is preselected, and the Send button
// stays off until a recipient is chosen. Writes
// POST /api/v1/admin/restaurants/:id/send_pairme_info (QuoteMe
// Pairme::InfoSend), which never picks a recipient by itself. Shows the
// server's message on failure and who it went to on success.
import { useState } from 'react';
import { sendPairmeInfo, type SendPairmeInfoInput } from '../../services/adminApi';

export interface SendPairmeInfoContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

type Mode = 'contact' | 'typed';

export function SendPairmeInfo({ restaurantId, contacts }: { restaurantId: string; contacts: SendPairmeInfoContact[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [contactId, setContactId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const withEmail = contacts.filter((c) => (c.email ?? '').trim() !== '');
  const ready = (mode === 'contact' && contactId !== '') || (mode === 'typed' && email.trim() !== '');

  function reset() {
    setMode(null);
    setContactId('');
    setName('');
    setEmail('');
    setStatus('idle');
    setMessage(null);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    const input: SendPairmeInfoInput =
      mode === 'contact'
        ? { restaurant_contact_id: contactId }
        : { recipient_name: name.trim(), recipient_email: email.trim() };
    setStatus('sending');
    setMessage(null);
    const res = await sendPairmeInfo(restaurantId, input);
    if (res.error || !res.data) {
      setStatus('error');
      setMessage(res.error || 'Could not send. Try again.');
      return;
    }
    setStatus('sent');
    setMessage(`Sent to ${res.data.recipient_email}.`);
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => {
          if (open) reset();
          setOpen((v) => !v);
        }}
        className="px-3 py-1.5 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-[#2A2A2A] transition-colors"
      >
        {open ? 'Cancel' : 'Send PairMe info'}
      </button>

      {open && (
        <form
          onSubmit={handleSend}
          aria-label="Send PairMe info"
          className="bg-white border border-gray-200 rounded-xl px-5 py-4 mt-3 flex flex-col gap-3"
        >
          <p className="text-sm text-gray-600">Who should get it?</p>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="pairme-info-recipient"
              checked={mode === 'contact'}
              disabled={withEmail.length === 0}
              onChange={() => setMode('contact')}
            />
            <span>One of this restaurant&apos;s contacts</span>
          </label>
          {mode === 'contact' && (
            <select
              aria-label="Contact"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">Pick a contact</option>
              {withEmail.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.first_name} ${c.last_name}`.trim()} ({c.email})
                </option>
              ))}
            </select>
          )}
          {withEmail.length === 0 && (
            <p className="text-xs text-gray-400">No contact here has an email address.</p>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="pairme-info-recipient"
              checked={mode === 'typed'}
              onChange={() => setMode('typed')}
            />
            <span>Someone else</span>
          </label>
          {mode === 'typed' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                aria-label="Name"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
              <input
                aria-label="Email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {status === 'error' && message && (
            <p role="alert" className="text-sm text-red-600">{message}</p>
          )}
          {status === 'sent' && message && (
            <p role="status" className="text-sm text-green-700">{message}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={!ready || status === 'sending'}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#7FAEC2] hover:bg-[#6a9aae] text-white disabled:opacity-50 transition-colors"
            >
              {status === 'sending' ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
