// THE SERVER CHEAT SHEET DOWNLOAD, on the restaurant admin's home.
//
// Moose, 2026-10-13: "can you make a button on the dashboard for the admin to
// download this pdf". The PDF is built on the server from this restaurant's
// pairings in the locked Aquitaine format (BE Pairme::CheatSheetPdf), so it
// is always current. Shown only once the restaurant is paired, beside its
// PairMe link; the server answers not found before then.
import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { downloadRestaurantAdminCheatSheet } from '../../services/api';

/** "<slug>-server-cheat-sheet.pdf", the slug taken from the PairMe link. */
export function cheatSheetFilename(flowUrl: string) {
  const slug = flowUrl.split('/').filter(Boolean).pop() || 'restaurant';
  return `${slug}-server-cheat-sheet.pdf`;
}

export function ServerCheatSheetButton({ restaurantId, flowUrl }: { restaurantId: string; flowUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    const res = await downloadRestaurantAdminCheatSheet(restaurantId);
    setBusy(false);
    if (!res.blob) {
      setError(res.error || 'Could not download the cheat sheet');
      return;
    }
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cheatSheetFilename(flowUrl);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mb-8" data-testid="ra-cheat-sheet">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
        Server cheat sheet
      </h2>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-[#4F4F4F] mb-3">
          Every dish on your menu with one pour and why, for your servers to carry. It is built from your pairings, so a
          fresh download is always current.
        </p>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          data-testid="ra-cheat-sheet-download"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border border-gray-200 text-[#2A2A2A] hover:border-gray-400 disabled:opacity-50"
        >
          <FileDown size={13} /> {busy ? 'Preparing…' : 'Download cheat sheet (PDF)'}
        </button>
        {error ? (
          <p className="text-sm text-red-500 mt-2" data-testid="ra-cheat-sheet-error">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
