// THE STORE MANAGER'S LINK, BY TEXT (Moose 2026-11-19, Q109: by hand only,
// from QM admin). A QM admin types the manager's mobile number and QuoteMe
// texts the store's manager page link (QuoteMe #1000, Pairme::StoreLink).
// The store's staff PIN opens the page. The PIN is in the text only when the
// admin ticks "Put the PIN in the text" (Q110, off by default) and types it;
// the server sends it only if it is the store's PIN now (QuoteMe #1005).
// Neither the number nor the PIN is kept, here or on the server.
import { useState } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { textAdminStoreLink, AdminStoreLinkSent } from '../../services/adminApi';

const PIN_NOTE: Record<AdminStoreLinkSent['pin'], string> = {
  none: 'This store has no staff PIN yet, so the page will not open. Set one before the manager tries it.',
  standard: 'The PIN is still the standard one. The manager can open the page, and must set a new PIN before marking picks.',
  own: 'The store has its own PIN. Give it to the manager if they do not have it.',
};

export function StoreLinkCard({ storeId, card, heading }: { storeId: string; card: string; heading: string }) {
  const [phone, setPhone] = useState('');
  const [withPin, setWithPin] = useState(true); // RED-CHECK
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<AdminStoreLinkSent | null>(null);

  async function send() {
    const to = phone.trim();
    const typedPin = pin.trim();
    if (!to || busy || (withPin && !typedPin)) return;
    setBusy(true);
    setError(null);
    setSent(null);
    const res = withPin ? await textAdminStoreLink(storeId, to, typedPin) : await textAdminStoreLink(storeId, to);
    setBusy(false);
    if (res.data) {
      setPhone('');
      setPin('');
      setWithPin(false);
      setSent(res.data);
    } else {
      setError(res.error || 'The text did not go out');
    }
  }

  return (
    <div className={card} data-testid="store-link">
      <p className={heading}>Manager link by text</p>
      <p className="text-sm text-gray-500">
        Texts the manager a link to this store's page, where they choose Store picks. The staff PIN opens it. The PIN is not in the text unless you tick the box below.
      </p>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={withPin}
          onChange={(e) => { setWithPin(e.target.checked); if (!e.target.checked) setPin(''); }}
        />
        Put the PIN in the text
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Manager's mobile"
          aria-label="Manager's mobile number"
          inputMode="tel"
          className="max-w-xs h-8 text-sm"
        />
        {withPin && (
          <Input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Store's staff PIN"
            aria-label="Store's staff PIN"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className="max-w-[10rem] h-8 text-sm"
          />
        )}
        <Button size="sm" className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8" disabled={busy || !phone.trim() || (withPin && !pin.trim())} onClick={send}>
          {busy ? 'Sending…' : 'Text the link'}
        </Button>
      </div>
      {sent && (
        <div className="text-xs text-gray-600" role="status" data-testid="store-link-sent">
          <p>Sent: <span className="font-mono break-all">{sent.url}</span></p>
          <p>{PIN_NOTE[sent.pin]}</p>
        </div>
      )}
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}
