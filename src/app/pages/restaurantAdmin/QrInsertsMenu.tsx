// "DOWNLOAD INSERT QR CODES", on the restaurant admin's home, under the PairMe
// link and QR code.
//
// Moose, 2026-10-14: "a button in the dashboard for the restaurant admin.
// Download Insert QR codes (arrow down) / Horizontal / Vertical. Have the
// standard verbiage but make sure to have the Restaurant name in there". The
// PDF is made on the server (BE Pairme::QrInsertsPdf): cut-out cards with the
// standard wording, this restaurant's name and its own QR. Vertical is 9 to a
// sheet, horizontal 12.
import { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { downloadRestaurantAdminQrInserts, type QrInsertLayout } from '../../services/api';

/** "<slug>-qr-inserts-<layout>.pdf", the slug taken from the PairMe link. */
export function qrInsertsFilename(flowUrl: string, layout: QrInsertLayout) {
  const slug = flowUrl.split('/').filter(Boolean).pop() || 'restaurant';
  return `${slug}-qr-inserts-${layout}.pdf`;
}

const OPTIONS: Array<{ layout: QrInsertLayout; label: string; note: string }> = [
  { layout: 'horizontal', label: 'Horizontal', note: '12 per sheet' },
  { layout: 'vertical', label: 'Vertical', note: '9 per sheet' },
];

export function QrInsertsMenu({ restaurantId, flowUrl }: { restaurantId: string; flowUrl: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<QrInsertLayout | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(layout: QrInsertLayout) {
    setOpen(false);
    setBusy(layout);
    setError(null);
    const res = await downloadRestaurantAdminQrInserts(restaurantId, layout);
    setBusy(null);
    if (!res.blob) {
      setError(res.error || 'Could not download the inserts');
      return;
    }
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = qrInsertsFilename(flowUrl, layout);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mb-8" data-testid="ra-qr-inserts">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
        Table inserts
      </h2>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-[#4F4F4F] mb-3">
          Cut-out cards with your QR code and your restaurant's name, to slip into your wine list or set on the table.
          Print on US Letter and cut along the dashed lines.
        </p>
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            disabled={busy !== null}
            aria-haspopup="menu"
            aria-expanded={open}
            data-testid="ra-qr-inserts-toggle"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border border-gray-200 text-[#2A2A2A] hover:border-gray-400 disabled:opacity-50"
          >
            {busy ? 'Preparing…' : 'Download insert QR codes'} <ArrowDown size={13} />
          </button>
          {open ? (
            <div role="menu" className="absolute left-0 mt-1 z-10 min-w-full bg-white border border-gray-200 rounded shadow-sm">
              {OPTIONS.map((o) => (
                <button
                  key={o.layout}
                  type="button"
                  role="menuitem"
                  onClick={() => download(o.layout)}
                  data-testid={`ra-qr-inserts-${o.layout}`}
                  className="block w-full text-left px-3 py-2 text-xs text-[#2A2A2A] hover:bg-gray-50 whitespace-nowrap"
                >
                  {o.label} <span className="text-gray-400">({o.note})</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="text-sm text-red-500 mt-2" data-testid="ra-qr-inserts-error">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
