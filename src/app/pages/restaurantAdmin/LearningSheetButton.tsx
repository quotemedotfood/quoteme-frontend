// THE WINE LEARNING SHEET DOWNLOAD, on the restaurant admin's home.
//
// Moose, 2026-10-14: "make a download button in the admin for a Learning
// Sheet", landscape, with each wine's color, grapes, vintage, country, a short
// tasting note and how to say it, for staff learning the list in English. The
// server (BE Pairme::LearningSheetPdf) drafts any missing notes on the first
// download and keeps them, so that one takes longer. Shown only once the
// restaurant is paired; the server answers not found before then.
import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { downloadRestaurantAdminLearningSheet } from '../../services/api';

/** "<slug>-learning-sheet-YYYY-MM.pdf", the slug taken from the PairMe link. */
export function learningSheetFilename(flowUrl: string, today: Date = new Date()) {
  const slug = flowUrl.split('/').filter(Boolean).pop() || 'restaurant';
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${slug}-learning-sheet-${today.getFullYear()}-${month}.pdf`;
}

export function LearningSheetButton({ restaurantId, flowUrl }: { restaurantId: string; flowUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    const res = await downloadRestaurantAdminLearningSheet(restaurantId);
    setBusy(false);
    if (!res.blob) {
      setError(res.error || 'Could not download the learning sheet');
      return;
    }
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = learningSheetFilename(flowUrl);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mb-8" data-testid="ra-learning-sheet">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
        Wine learning sheet
      </h2>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-[#4F4F4F] mb-3">
          Every wine on your list with its grapes, vintage, country, a short tasting note and how to say it, for your
          staff to study. The first download writes the tasting notes, so it can take a minute.
        </p>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          data-testid="ra-learning-sheet-download"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border border-gray-200 text-[#2A2A2A] hover:border-gray-400 disabled:opacity-50"
        >
          <FileDown size={13} /> {busy ? 'Preparing, this can take a minute…' : 'Download learning sheet (PDF)'}
        </button>
        {error ? (
          <p className="text-sm text-red-500 mt-2" data-testid="ra-learning-sheet-error">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
