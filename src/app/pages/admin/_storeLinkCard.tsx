// THE STORE MANAGER'S LINK, BY TEXT (Moose 2026-11-19, Q109: by hand only,
// from QM admin). A QM admin types the manager's mobile number and QuoteMe
// texts the store's manager page link (QuoteMe #1000, Pairme::StoreLink).
// The store's staff PIN opens the page; the PIN is never in the text. The
// number is not kept, here or on the server.
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<AdminStoreLinkSent | null>(null);

  async function send() {
    const to = phone.trim();
    if (!to || busy) return;
    setBusy(true);
    setError(null);
    setSent(null);
    const res = await textAdminStoreLink(storeId, to);
    setBusy(false);
    if (res.data) {
      setPhone('');
      setSent(res.data);
    } else {
      setError(res.error || 'The text did not go out');
    }
  }

  return (
    <div className={card} data-testid="store-link">
      <p className={heading}>Manager link by text</p>
      <p className="text-sm text-gray-500">
        Texts the manager a link to this store's page, where they choose Store picks. The staff PIN opens it. The PIN is not in the text.
      </p>
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
        <Button size="sm" className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8" disabled={busy || !phone.trim()} onClick={send}>
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
