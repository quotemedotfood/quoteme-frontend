// "PAIRME INFO SENT" on the QM admin restaurant page, under the Send PairMe
// info control (Moose 2026-10-30, "ok new table is fine").
//
// Reads GET /api/v1/admin/restaurants/:id/pairme_info_sends (QM admin only):
// the rows the backend's Pairme::InfoSend#record_sent wrote, one per send
// that went out, newest first, for THIS restaurant only. Shows them in the
// order the server sent; nothing here sorts, filters or adds a row of its
// own. The page bumps refreshKey after a successful send so the new row
// appears without a reload.
import { useEffect, useState } from 'react';
import { getPairmeInfoSends, type PairmeInfoSendRow } from '../../services/adminApi';

function formatSentAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function linksLine(row: PairmeInfoSendRow): string {
  const links = [
    row.pairings_link_included ? 'pairings' : null,
    row.deck_link_included ? 'deck' : null,
    row.faq_link_included ? 'FAQ' : null,
  ].filter(Boolean);
  return links.length ? `Links: ${links.join(', ')}` : 'No links';
}

export function PairmeInfoSent({ restaurantId, refreshKey = 0 }: { restaurantId: string; refreshKey?: number }) {
  const [rows, setRows] = useState<PairmeInfoSendRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getPairmeInfoSends(restaurantId).then((res) => {
      if (!live) return;
      if (res.error || !res.data) {
        setError(res.error || 'Could not load.');
        return;
      }
      setError(null);
      setRows(res.data.pairme_info_sends);
    });
    return () => {
      live = false;
    };
  }, [restaurantId, refreshKey]);

  return (
    <section aria-label="PairMe info sent" className="mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">PairMe info sent</h3>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && rows === null && <p className="text-xs text-gray-400">Loading...</p>}
      {!error && rows !== null && rows.length === 0 && (
        <p className="text-xs text-gray-400">Not sent to anyone yet.</p>
      )}
      {!error && rows !== null && rows.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li key={row.id} className="text-sm text-[#2A2A2A]">
              <span className="font-medium">
                {row.recipient_name ? `${row.recipient_name} (${row.recipient_email})` : row.recipient_email}
              </span>
              <span className="block text-xs text-gray-500">
                {formatSentAt(row.sent_at)}
                {row.sent_by_name ? ` by ${row.sent_by_name}` : ''}
                {row.restaurant_contact_id ? ', a contact here' : ', typed'}
                {`. ${linksLine(row)}.`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
