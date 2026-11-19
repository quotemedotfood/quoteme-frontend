// QM admin Sticker codes (QuoteMe #934). Blank stickers for stores: printed
// in bulk before anyone knows which store or spot they will mark, then
// attached by scanning on the store's tablet (or by code on the store's page
// here).
//
// Reads GET /api/v1/admin/pairit_codes (the batches) and ?batch= (one batch's
// codes). Writes POST /api/v1/admin/pairit_codes { count, batch }.
//
// THE PRINTER'S SHEET is a CSV made in the browser from the batch's codes:
// one row per sticker with its code and its link. The printer turns each
// link into a QR code. Nothing else is in it.
import { useEffect, useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  getAdminPairitBatches,
  getAdminPairitBatch,
  createAdminPairitCodes,
  AdminPairitBatch,
  AdminPairitBatchDetail,
  AdminPairitCode,
} from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';

export const MAX_CODES_PER_BATCH = 500;

/** The printer's sheet: a header and one row per sticker. Codes and links hold no commas or quotes. */
export function printerSheet(codes: Pick<AdminPairitCode, 'code' | 'url'>[]): string {
  return ['code,link', ...codes.map((c) => `${c.code},${c.url}`)].join('\n') + '\n';
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function QMAdminStickerCodes() {
  const [batches, setBatches] = useState<AdminPairitBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<AdminPairitBatchDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const [count, setCount] = useState('100');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function load() {
    const res = await getAdminPairitBatches();
    if (res.data) {
      setBatches(res.data.batches);
      setError(null);
    } else {
      setError(res.error || 'Failed to load');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const n = Number(count);
  const countOk = Number.isInteger(n) && n >= 1 && n <= MAX_CODES_PER_BATCH;
  const canCreate = countOk && !!name.trim();

  async function create() {
    if (!canCreate || creating) return;
    setCreating(true);
    setCreateError(null);
    const res = await createAdminPairitCodes(n, name.trim());
    setCreating(false);
    if (res.data) {
      setName('');
      await load();
      await openBatch(res.data.batch);
    } else {
      setCreateError(res.error || 'Failed to make the batch');
    }
  }

  async function openBatch(batch: string) {
    setOpening(batch);
    const res = await getAdminPairitBatch(batch);
    setOpening(null);
    if (res.data) setOpen(res.data);
    else setError(res.error || 'Failed to load the batch');
  }

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1
        className="text-2xl font-bold text-[#2A2A2A] mb-2"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Sticker codes
      </h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Blank stickers for stores. Make a batch, send its sheet to the printer, and hand the stickers out. A store puts one up, scans it on its tablet and names the spot.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Input
          value={count}
          onChange={(e) => setCount(e.target.value)}
          inputMode="numeric"
          aria-label="How many stickers"
          className="max-w-[6rem]"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder="Batch name, for example pilot-2026-11"
          aria-label="Batch name"
          className="max-w-xs"
        />
        <Button
          onClick={create}
          disabled={creating || !canCreate}
          className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white flex items-center gap-1.5"
        >
          <Plus size={15} />
          {creating ? 'Making…' : 'Make a batch'}
        </Button>
      </div>
      {!countOk && <p className="text-xs text-amber-700 mb-2" role="status">A batch is 1 to {MAX_CODES_PER_BATCH} stickers.</p>}
      {createError && <p role="alert" className="text-xs text-red-500 mb-2">{createError}</p>}

      {loading && <p className="text-sm text-gray-400 py-8">Loading…</p>}
      {error && <p className="text-sm text-red-500 py-4" role="alert">{error}</p>}
      {!loading && !error && batches.length === 0 && (
        <p className="text-sm text-gray-400 py-8">No batches yet. Make one above.</p>
      )}

      {batches.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto mt-4 max-w-2xl">
          <table className="w-full text-sm" data-testid="sticker-batches">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Batch</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">Stickers</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">On a store</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">Blank</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batch ?? '(none)'} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{b.batch || '(no name)'}</td>
                  <td className="px-4 py-2 text-right">{b.total.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{b.attached.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{(b.total - b.attached).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    {b.batch && (
                      <Button variant="ghost" size="sm" className="text-xs text-[#7FAEC2] h-7" disabled={opening === b.batch} onClick={() => openBatch(b.batch as string)}>
                        {opening === b.batch ? 'Opening…' : 'Open'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="mt-6 space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              {open.batch}: {open.total.toLocaleString()} stickers, {open.attached.toLocaleString()} on a store
            </p>
            <Button
              size="sm"
              className="bg-[#7FAEC2] hover:bg-[#6a9aae] text-white text-xs h-8 flex items-center gap-1.5"
              onClick={() => download(`stickers-${open.batch}.csv`, printerSheet(open.codes))}
            >
              <Download size={13} />
              Download the printer's sheet
            </Button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-auto max-h-[28rem]">
            <table className="w-full text-sm" data-testid="sticker-codes">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Code</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Link</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Spot</th>
                </tr>
              </thead>
              <tbody>
                {open.codes.map((c) => (
                  <tr key={c.code} className="border-t border-gray-100">
                    <td className="px-4 py-1.5 font-mono">{c.code}</td>
                    <td className="px-4 py-1.5 text-xs text-gray-500 break-all">{c.url}</td>
                    <td className="px-4 py-1.5 text-gray-600">{c.name || (c.restaurant_id ? 'On a store' : 'Blank')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
